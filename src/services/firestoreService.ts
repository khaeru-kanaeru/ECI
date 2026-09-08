import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { StorageService } from './storageService';
import { Post, Comment } from '../types';

const POSTS_COLLECTION = 'posts';
const LOCAL_POSTS_CACHE_KEY = 'workplace_firebase_posts_cache_v3';

export class FirestoreService {
  /**
   * Real-time subscription to feed posts ordered by creation time
   */
  static subscribeToPosts(
    onPostsUpdate: (posts: Post[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const postsQuery = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Post;
          // Filter out legacy placeholder IDs
          if (
            ['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(docSnap.id) ||
            docSnap.id.startsWith('archive-post-')
          ) {
            // Delete legacy placeholder document in the background
            deleteDoc(docSnap.ref).catch(() => {});
            return;
          }

          // Ensure arrays and default values
          posts.push({
            ...data,
            id: docSnap.id,
            upvotedBy: data.upvotedBy || [],
            upvotesCount: data.upvotesCount ?? (data.upvotedBy?.length || 0),
            comments: data.comments || [],
            commentsCount: data.commentsCount ?? (data.comments?.length || 0),
            tags: data.tags || [],
            mentions: data.mentions || [],
            imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          });
        });

        // Cache locally for instant loading
        try {
          localStorage.setItem(LOCAL_POSTS_CACHE_KEY, JSON.stringify(posts));
        } catch {
          // ignore quota error
        }

        onPostsUpdate(posts);
      },
      (error) => {
        const msg = String((error as any)?.message || error);
        console.warn('Firestore subscription status:', msg);
        onError?.(error);
        try {
          handleFirestoreError(error, OperationType.GET, POSTS_COLLECTION);
        } catch {
          // Handled to ensure seamless offline fallback
        }
      }
    );

    return unsubscribe;
  }

  /**
   * Get cached posts from local storage for initial instant render
   */
  static getCachedPosts(): Post[] {
    try {
      const cached = localStorage.getItem(LOCAL_POSTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Filter out any legacy placeholder posts if they linger in local storage
        return parsed.filter((p: Post) => !['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(p.id));
      }
    } catch {
      // ignore
    }
    return StorageService.getPosts();
  }

  /**
   * Create a new post in Firestore and LocalStorage
   */
  static async createPost(post: Post): Promise<void> {
    // 1. Immediately persist locally
    try {
      StorageService.savePost(post);
    } catch (e) {
      console.warn('Local save warning:', e);
    }

    // 2. Sync to cloud Firestore
    try {
      const postRef = doc(db, POSTS_COLLECTION, post.id);
      await setDoc(postRef, {
        ...post,
        imageUrls: post.imageUrls || (post.imageUrl ? [post.imageUrl] : []),
        createdAt: post.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('Firestore createPost cloud sync error:', (error as any)?.message);
      try {
        handleFirestoreError(error, OperationType.CREATE, `${POSTS_COLLECTION}/${post.id}`);
      } catch {
        // Handled: local store already updated
      }
    }
  }

  /**
   * Toggle Upvote (Follow Up) on a post
   */
  static async toggleUpvote(postId: string, userId: string): Promise<void> {
    // 1. Local update
    try {
      StorageService.toggleUpvote(postId, userId);
    } catch (e) {
      console.warn('Local toggleUpvote warning:', e);
    }

    // 2. Cloud update
    try {
      const postRef = doc(db, POSTS_COLLECTION, postId);
      const snapshot = await getDocs(query(collection(db, POSTS_COLLECTION)));
      const postDoc = snapshot.docs.find((d) => d.id === postId);
      if (!postDoc) return;

      const data = postDoc.data() as Post;
      const upvotedBy: string[] = data.upvotedBy || [];
      const hasUpvoted = upvotedBy.includes(userId);

      const updatedUpvotedBy = hasUpvoted
        ? upvotedBy.filter((id) => id !== userId)
        : [...upvotedBy, userId];

      await updateDoc(postRef, {
        upvotedBy: updatedUpvotedBy,
        upvotesCount: updatedUpvotedBy.length,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('Firestore toggleUpvote cloud sync error:', (error as any)?.message);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `${POSTS_COLLECTION}/${postId}`);
      } catch {
        // Handled
      }
    }
  }

  /**
   * Add a comment to a post in Firestore
   */
  static async addComment(postId: string, comment: Comment): Promise<void> {
    // 1. Local update
    try {
      StorageService.addComment(postId, comment);
    } catch (e) {
      console.warn('Local addComment warning:', e);
    }

    // 2. Cloud update
    try {
      const commentRef = doc(db, POSTS_COLLECTION, postId, 'comments', comment.id);
      await setDoc(commentRef, comment);

      const snapshot = await getDocs(query(collection(db, POSTS_COLLECTION)));
      const postDoc = snapshot.docs.find((d) => d.id === postId);
      if (postDoc) {
        const data = postDoc.data() as Post;
        const currentComments = data.comments || [];
        const updatedComments = [...currentComments, comment];

        await updateDoc(doc(db, POSTS_COLLECTION, postId), {
          comments: updatedComments,
          commentsCount: updatedComments.length,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.warn('Firestore addComment cloud sync error:', (error as any)?.message);
      try {
        handleFirestoreError(error, OperationType.CREATE, `${POSTS_COLLECTION}/${postId}/comments/${comment.id}`);
      } catch {
        // Handled
      }
    }
  }

  /**
   * Delete post
   */
  static async deletePost(postId: string): Promise<void> {
    // 1. Local update
    try {
      StorageService.deletePost(postId);
    } catch (e) {
      console.warn('Local deletePost warning:', e);
    }

    // 2. Cloud update
    try {
      await deleteDoc(doc(db, POSTS_COLLECTION, postId));
    } catch (error) {
      console.warn('Firestore deletePost cloud sync error:', (error as any)?.message);
      try {
        handleFirestoreError(error, OperationType.DELETE, `${POSTS_COLLECTION}/${postId}`);
      } catch {
        // Handled
      }
    }
  }

  /**
   * Clean up any legacy placeholder posts from Firestore and LocalStorage
   */
  static async cleanLegacyPlaceholders(): Promise<void> {
    // 1. Clear legacy localStorage keys
    const keysToRemove = [
      'enterprise_network_posts_v2',
      'enterprise_network_posts_v1',
      'enterprise_network_posts_clean_v1',
      'workplace_posts_v1',
      'workplace_firebase_posts_cache_v3',
      'workplace_firebase_posts_cache_v2',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 2. Query Firestore and remove any leftover placeholder posts
    try {
      const snap = await getDocs(collection(db, POSTS_COLLECTION));
      const placeholderIds = ['post-1', 'post-2', 'post-3', 'post-4', 'post-5'];
      for (const docSnap of snap.docs) {
        if (
          placeholderIds.includes(docSnap.id) ||
          docSnap.id.startsWith('archive-post-') ||
          docSnap.id.startsWith('post-')
        ) {
          await deleteDoc(docSnap.ref).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }
}
