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
import { Post, Comment, User, ChatMessage, AppNotification } from '../types';

const POSTS_COLLECTION = 'posts';
const USERS_COLLECTION = 'users';
const MESSAGES_COLLECTION = 'messages';
const NOTIFICATIONS_COLLECTION = 'notifications';
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

          // Ensure arrays and default values with robust fallbacks
          posts.push({
            ...data,
            id: docSnap.id,
            authorId: data.authorId || 'usr-anonymous',
            authorUsername: data.authorUsername || (data as any).username || 'karyawan',
            authorName: data.authorName || data.authorUsername || 'Karyawan ECI',
            authorAvatar: data.authorAvatar || '',
            authorDepartment: data.authorDepartment || 'Semua Departemen',
            authorRole: data.authorRole || 'Staf',
            targetDepartment: data.targetDepartment || 'Semua Departemen',
            category: data.category || 'Regular/Information Only',
            title: data.title || undefined,
            content: data.content || '',
            upvotedBy: data.upvotedBy || [],
            upvotesCount: data.upvotesCount ?? (data.upvotedBy?.length || 0),
            comments: (data.comments || []).map((c: any) => ({
              ...c,
              authorUsername: c.authorUsername || 'karyawan',
              authorName: c.authorName || 'Karyawan ECI',
              content: c.content || '',
            })),
            commentsCount: data.commentsCount ?? (data.comments?.length || 0),
            tags: data.tags || [],
            mentions: data.mentions || [],
            imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
            recommendationScore: data.recommendationScore ?? 15,
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
        return parsed
          .filter((p: Post) => !['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(p.id))
          .map((p: any) => ({
            ...p,
            authorId: p.authorId || 'usr-anonymous',
            authorUsername: p.authorUsername || p.username || 'karyawan',
            authorName: p.authorName || p.authorUsername || 'Karyawan ECI',
            authorAvatar: p.authorAvatar || '',
            authorDepartment: p.authorDepartment || 'Semua Departemen',
            authorRole: p.authorRole || 'Staf',
            targetDepartment: p.targetDepartment || 'Semua Departemen',
            category: p.category || 'Regular/Information Only',
            title: p.title || undefined,
            content: p.content || '',
            tags: p.tags || [],
            mentions: p.mentions || [],
            upvotesCount: p.upvotesCount || 0,
            upvotedBy: p.upvotedBy || [],
            commentsCount: p.commentsCount || 0,
            comments: (p.comments || []).map((c: any) => ({
              ...c,
              authorUsername: c.authorUsername || 'karyawan',
              authorName: c.authorName || 'Karyawan ECI',
              content: c.content || '',
            })),
          }));
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
    try {
      StorageService.savePost(post);
      const current = this.getCachedPosts();
      const updated = [post, ...current.filter((p) => p.id !== post.id)];
      localStorage.setItem(LOCAL_POSTS_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local save warning:', e);
    }

    await ensureFirebaseAuth();

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
    try {
      StorageService.toggleUpvote(postId, userId);
    } catch (e) {
      console.warn('Local toggleUpvote warning:', e);
    }

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
    try {
      StorageService.addComment(postId, comment);
    } catch (e) {
      console.warn('Local addComment warning:', e);
    }

    try {
      await ensureFirebaseAuth();
      const cleanComment = sanitizeForFirestore(comment);
      const commentRef = doc(db, POSTS_COLLECTION, postId, 'comments', comment.id);
      await setDoc(commentRef, cleanComment);
    } catch (error) {
      console.warn('Firestore addComment cloud sync error:', (error as any)?.message);
    }
  }

  /**
   * Delete post from Firestore and LocalStorage
   */
  static async deletePost(postId: string): Promise<void> {
    try {
      StorageService.deletePost(postId);
      const current = this.getCachedPosts();
      const updated = current.filter((p) => p.id !== postId);
      localStorage.setItem(LOCAL_POSTS_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local deletePost warning:', e);
    }

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
   * Save a chat message in Firestore and local storage
   */
  static async saveChatMessage(msg: ChatMessage): Promise<void> {
    try {
      await ensureFirebaseAuth();
      const msgRef = doc(db, MESSAGES_COLLECTION, msg.id);
      const clean = sanitizeForFirestore({
        ...msg,
        createdAt: msg.createdAt || Date.now(),
        read: Boolean(msg.read),
      });
      await setDoc(msgRef, clean, { merge: true });
      StorageService.mergeChatMessages([msg]);
    } catch (error) {
      console.warn('Firestore saveChatMessage error:', error);
      StorageService.mergeChatMessages([msg]);
    }
  }

  /**
   * Subscribe to chat messages in Firestore between two users
   */
  static subscribeToChatMessages(
    userId1: string,
    userId2: string,
    user1Username: string | undefined,
    user2Username: string | undefined,
    onMessagesUpdate: (msgs: ChatMessage[]) => void
  ): () => void {
    ensureFirebaseAuth().catch(() => {});

    // Query messages collection without restrictive orderBy so no docs are dropped
    const msgsQuery = query(collection(db, MESSAGES_COLLECTION));
    const u1U = (user1Username || '').toLowerCase();
    const u2U = (user2Username || '').toLowerCase();

    const unsubscribe = onSnapshot(
      msgsQuery,
      (snapshot) => {
        const relevant: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const m = docSnap.data() as any;
          const sId = m.senderId;
          const rId = m.recipientId;
          const sU = (m.senderUsername || '').toLowerCase();
          const rU = (m.recipientUsername || '').toLowerCase();

          const match1to2 =
            (sId === userId1 || (Boolean(u1U && sU) && sU === u1U)) &&
            (rId === userId2 || (Boolean(u2U && rU) && rU === u2U));
          const match2to1 =
            (sId === userId2 || (Boolean(u2U && sU) && sU === u2U)) &&
            (rId === userId1 || (Boolean(u1U && rU) && rU === u1U));

          if (match1to2 || match2to1) {
            relevant.push({
              id: docSnap.id,
              senderId: sId || '',
              senderUsername: m.senderUsername || '',
              senderName: m.senderName || 'Rekan Kerja',
              recipientId: rId || '',
              recipientUsername: m.recipientUsername || '',
              content: m.content || '',
              createdAt: Number(m.createdAt || m.timestamp || Date.now()),
              read: Boolean(m.read || m.isRead),
            });
          }
        });

        relevant.sort((a, b) => a.createdAt - b.createdAt);
        StorageService.mergeChatMessages(relevant);
        onMessagesUpdate(relevant);
      },
      (err) => {
        console.warn('Firestore messages subscription status:', err);
      }
    );

    return unsubscribe;
  }

  /**
   * Mark all messages between user and peer as read
   */
  static async markChatMessagesAsRead(myId: string, peerId: string): Promise<void> {
    try {
      await ensureFirebaseAuth();
      const q = query(collection(db, MESSAGES_COLLECTION));
      const snap = await getDocs(q);
      const updates: Promise<void>[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.recipientId === myId && data.senderId === peerId && !data.read) {
          updates.push(updateDoc(doc(db, MESSAGES_COLLECTION, d.id), { read: true }));
        }
      });
      await Promise.all(updates);
    } catch {
      // ignore
    }
  }

  /**
   * Subscribe to all messages where user is sender or recipient (for unread badges)
   */
  static subscribeToUserMessages(
    myId: string,
    myUsername: string,
    onMessagesUpdate: (msgs: ChatMessage[]) => void
  ): () => void {
    ensureFirebaseAuth().catch(() => {});
    const msgsQuery = query(collection(db, MESSAGES_COLLECTION));
    const myU = (myUsername || '').toLowerCase();

    return onSnapshot(
      msgsQuery,
      (snapshot) => {
        const relevant: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const m = docSnap.data() as any;
          const sU = (m.senderUsername || '').toLowerCase();
          const rU = (m.recipientUsername || '').toLowerCase();
          const isRelated =
            m.senderId === myId ||
            m.recipientId === myId ||
            (Boolean(myU && sU) && sU === myU) ||
            (Boolean(myU && rU) && rU === myU);

          if (isRelated) {
            relevant.push({
              id: docSnap.id,
              senderId: m.senderId || '',
              senderUsername: m.senderUsername || '',
              senderName: m.senderName || 'Rekan Kerja',
              recipientId: m.recipientId || '',
              recipientUsername: m.recipientUsername || '',
              content: m.content || '',
              createdAt: Number(m.createdAt || m.timestamp || Date.now()),
              read: Boolean(m.read || m.isRead),
            });
          }
        });
        StorageService.mergeChatMessages(relevant);
        onMessagesUpdate(relevant);
      },
      (err) => {
        console.warn('User messages subscription error:', err);
      }
    );
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Save a mention or activity notification to Firestore & localStorage
   */
  static async saveNotification(notification: AppNotification): Promise<void> {
    try {
      StorageService.saveNotification(notification);
      await ensureFirebaseAuth();
      const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notification.id);
      const clean = sanitizeForFirestore(notification);
      await setDoc(notifRef, clean);
    } catch (error) {
      console.warn('Firestore saveNotification error:', error);
    }
  }

  /**
   * Real-time subscription to notifications targeted at a specific username
   */
  static subscribeToUserNotifications(
    username: string,
    onNotificationsUpdate: (notifs: AppNotification[]) => void
  ): () => void {
    ensureFirebaseAuth().catch(() => {});
    const cleanU = (username || '').trim().toLowerCase().replace(/^@/, '');
    if (!cleanU) return () => {};

    const notifQuery = query(collection(db, NOTIFICATIONS_COLLECTION));
    return onSnapshot(
      notifQuery,
      (snapshot) => {
        const relevant: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          const n = docSnap.data() as any;
          const targetU = (n.recipientUsername || '').toLowerCase().replace(/^@/, '');
          if (targetU === cleanU) {
            relevant.push({
              id: docSnap.id,
              recipientUsername: targetU,
              recipientId: n.recipientId,
              type: n.type || 'mention_post',
              senderUsername: n.senderUsername || 'rekan',
              senderName: n.senderName || 'Rekan Kerja',
              senderAvatar: n.senderAvatar || '',
              postId: n.postId,
              postTitle: n.postTitle,
              commentId: n.commentId,
              snippet: n.snippet || '',
              createdAt: Number(n.createdAt || Date.now()),
              read: Boolean(n.read),
            });
          }
        });

        relevant.sort((a, b) => b.createdAt - a.createdAt);
        StorageService.mergeNotifications(relevant);
        onNotificationsUpdate(relevant);
      },
      (err) => {
        console.warn('Firestore notifications subscription status:', err);
      }
    );
  }

  /**
   * Mark a single notification as read
   */
  static async markNotificationAsRead(notifId: string): Promise<void> {
    try {
      StorageService.markNotificationAsRead(notifId);
      await ensureFirebaseAuth();
      const ref = doc(db, NOTIFICATIONS_COLLECTION, notifId);
      await updateDoc(ref, { read: true });
    } catch {
      // ignore
    }
  }

  /**
   * Mark all notifications for a username as read
   */
  static async markAllNotificationsAsRead(username: string): Promise<void> {
    try {
      StorageService.markAllNotificationsAsRead(username);
      await ensureFirebaseAuth();
      const cleanU = (username || '').trim().toLowerCase().replace(/^@/, '');
      const q = query(collection(db, NOTIFICATIONS_COLLECTION));
      const snap = await getDocs(q);
      const updates: Promise<void>[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if ((data.recipientUsername || '').toLowerCase() === cleanU && !data.read) {
          updates.push(updateDoc(doc(db, NOTIFICATIONS_COLLECTION, d.id), { read: true }));
        }
      });
      await Promise.all(updates);
    } catch {
      // ignore
    }
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
    const keysToRemove = [
      'enterprise_network_posts_v2',
      'enterprise_network_posts_v1',
      'enterprise_network_posts_clean_v1',
      'workplace_posts_v1',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));

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
