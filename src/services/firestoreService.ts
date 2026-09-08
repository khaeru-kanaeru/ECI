import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, ensureFirebaseAuth } from './firebase';
import { StorageService } from './storageService';
import { Post, Comment, User, ChatMessage } from '../types';

const POSTS_COLLECTION = 'posts';
const USERS_COLLECTION = 'users';
const MESSAGES_COLLECTION = 'messages';
const LOCAL_POSTS_CACHE_KEY = 'workplace_firebase_posts_cache_v3';

/**
 * Strips all undefined fields recursively so Firestore setDoc / updateDoc
 * will never fail with "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class FirestoreService {
  /**
   * Real-time subscription to feed posts ordered by creation time
   */
  static subscribeToPosts(
    onPostsUpdate: (posts: Post[]) => void,
    onError?: (error: any) => void
  ): () => void {
    ensureFirebaseAuth().catch(() => {});

    const postsQuery = query(collection(db, POSTS_COLLECTION), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Post;
          // Filter out ONLY exact legacy dummy IDs
          if (
            ['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(docSnap.id) ||
            docSnap.id.startsWith('archive-post-')
          ) {
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

        // Cache locally for instant loading on page refresh
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
      const current = this.getCachedPosts();
      const updated = [post, ...current.filter((p) => p.id !== post.id)];
      localStorage.setItem(LOCAL_POSTS_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local save warning:', e);
    }

    // 2. Ensure Firebase authentication is established
    await ensureFirebaseAuth();

    // 3. Sync to cloud Firestore with sanitized fields
    try {
      const postRef = doc(db, POSTS_COLLECTION, post.id);
      const cleanData = sanitizeForFirestore({
        ...post,
        imageUrls: post.imageUrls || (post.imageUrl ? [post.imageUrl] : []),
        createdAt: post.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      await setDoc(postRef, cleanData);
    } catch (error) {
      console.error('Firestore createPost cloud sync error:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, `${POSTS_COLLECTION}/${post.id}`);
      } catch {
        throw error;
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
      await ensureFirebaseAuth();
      const postRef = doc(db, POSTS_COLLECTION, postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;

      const data = postSnap.data() as Post;
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
      await ensureFirebaseAuth();
      const cleanComment = sanitizeForFirestore(comment);
      const commentRef = doc(db, POSTS_COLLECTION, postId, 'comments', comment.id);
      await setDoc(commentRef, cleanComment);

      const postRef = doc(db, POSTS_COLLECTION, postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const data = postSnap.data() as Post;
        const currentComments = data.comments || [];
        const updatedComments = [...currentComments, cleanComment as Comment];

        await updateDoc(postRef, {
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
      const current = this.getCachedPosts();
      const updated = current.filter((p) => p.id !== postId);
      localStorage.setItem(LOCAL_POSTS_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local deletePost warning:', e);
    }

    // 2. Cloud update
    try {
      await ensureFirebaseAuth();
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
   * Save or update employee user in Firestore
   */
  static async saveUser(user: User): Promise<void> {
    try {
      await ensureFirebaseAuth();
      const userRef = doc(db, USERS_COLLECTION, user.id);
      const clean = sanitizeForFirestore(user);
      await setDoc(userRef, clean, { merge: true });
    } catch (error) {
      console.warn('Firestore saveUser error:', error);
    }
  }

  /**
   * Real-time subscription to employee users collection
   */
  static subscribeToUsers(onUsersUpdate: (users: User[]) => void): () => void {
    ensureFirebaseAuth().catch(() => {});

    const usersQuery = query(collection(db, USERS_COLLECTION));
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const cloudUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          const u = docSnap.data() as User;
          cloudUsers.push({ ...u, id: docSnap.id });
        });
        if (cloudUsers.length > 0) {
          onUsersUpdate(cloudUsers);
        }
      },
      (err) => {
        console.warn('Firestore users subscription status:', err);
      }
    );

    return unsubscribe;
  }

  /**
   * Save a chat message in Firestore
   */
  static async saveChatMessage(msg: ChatMessage): Promise<void> {
    try {
      await ensureFirebaseAuth();
      const msgRef = doc(db, MESSAGES_COLLECTION, msg.id);
      const clean = sanitizeForFirestore(msg);
      await setDoc(msgRef, clean);
    } catch (error) {
      console.warn('Firestore saveChatMessage error:', error);
    }
  }

  /**
   * Subscribe to chat messages in Firestore between two users
   */
  static subscribeToChatMessages(
    userId1: string,
    userId2: string,
    onMessagesUpdate: (msgs: ChatMessage[]) => void
  ): () => void {
    ensureFirebaseAuth().catch(() => {});

    const msgsQuery = query(collection(db, MESSAGES_COLLECTION), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      msgsQuery,
      (snapshot) => {
        const relevant: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const m = docSnap.data() as ChatMessage;
          const isMatch =
            (m.senderId === userId1 && m.recipientId === userId2) ||
            (m.senderId === userId2 && m.recipientId === userId1);
          if (isMatch) {
            relevant.push({ ...m, id: docSnap.id });
          }
        });
        if (relevant.length > 0) {
          onMessagesUpdate(relevant);
        }
      },
      (err) => {
        console.warn('Firestore messages subscription status:', err);
      }
    );

    return unsubscribe;
  }

  /**
   * Sync existing local posts and users into Firestore so nothing is lost
   */
  static async syncLocalDataToFirestore(): Promise<void> {
    try {
      await ensureFirebaseAuth();
      
      // 1. Sync local posts
      const localPosts = StorageService.getPosts();
      for (const p of localPosts) {
        if (!['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(p.id) && !p.id.startsWith('archive-post-')) {
          const ref = doc(db, POSTS_COLLECTION, p.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, sanitizeForFirestore(p));
          }
        }
      }

      // 2. Sync local users
      const localUsers = StorageService.getUsers();
      for (const u of localUsers) {
        const uRef = doc(db, USERS_COLLECTION, u.id);
        const uSnap = await getDoc(uRef);
        if (!uSnap.exists()) {
          await setDoc(uRef, sanitizeForFirestore(u));
        }
      }
    } catch (e) {
      console.warn('syncLocalDataToFirestore warning:', e);
    }
  }

  /**
   * Clean up any legacy placeholder posts from Firestore and LocalStorage
   * NEVER deletes real user posts!
   */
  static async cleanLegacyPlaceholders(): Promise<void> {
    // 1. Clear obsolete legacy keys (NEVER clear LOCAL_POSTS_CACHE_KEY!)
    const keysToRemove = [
      'enterprise_network_posts_v2',
      'enterprise_network_posts_v1',
      'enterprise_network_posts_clean_v1',
      'workplace_posts_v1',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 2. Query Firestore and remove ONLY specific dummy IDs
    try {
      await ensureFirebaseAuth();
      const snap = await getDocs(collection(db, POSTS_COLLECTION));
      const placeholderIds = new Set([
        'post-1',
        'post-2',
        'post-3',
        'post-4',
        'post-5',
        'archive-post-1',
        'archive-post-2',
        'archive-post-3',
      ]);
      for (const docSnap of snap.docs) {
        if (placeholderIds.has(docSnap.id) || docSnap.id.startsWith('archive-post-')) {
          await deleteDoc(docSnap.ref).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }
}
