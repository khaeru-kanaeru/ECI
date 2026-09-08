import { Post, User, Comment, ChatMessage, AppNotification, QuotaStats } from '../types';
import { INITIAL_POSTS, INITIAL_USERS } from '../data/initialData';
import { generateInitialsAvatar } from '../utils/avatarUtils';

const POSTS_STORAGE_KEY = 'enterprise_network_posts_clean_v3';
const USERS_STORAGE_KEY = 'enterprise_network_users_v2';
const CHATS_STORAGE_KEY = 'enterprise_network_chats_v2';
const NOTIFICATIONS_STORAGE_KEY = 'enterprise_network_notifications_v1';
const QUOTA_STORAGE_KEY = 'enterprise_network_quota_v2';
const LAST_SYNC_KEY = 'enterprise_network_last_sync_v2';

export class StorageService {
  // Initialize storage if empty
  static initialize(): void {
    // Purge any legacy keys that previously held dummy posts
    ['enterprise_network_posts_v2', 'enterprise_network_posts_v1', 'workplace_posts_v1'].forEach((k) => {
      localStorage.removeItem(k);
    });

    const demoUsernames = new Set([
      'budi_prod', 'rian_ha', 'maya_vcfp', 'clara_qam',
      'hendra_eng', 'agus_staff', 'linda_admin', 'siti_hr'
    ]);

    // Purge demo users and replace any legacy Unsplash placeholder avatars with clean initials
    try {
      const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (rawUsers) {
        const users: User[] = JSON.parse(rawUsers);
        const filteredUsers = users
          .filter((u) => {
            const isDemoName = demoUsernames.has(u.username?.toLowerCase());
            const isDemoId = typeof u.id === 'string' && /^usr-[1-8]$/.test(u.id);
            return !isDemoName && !isDemoId;
          })
          .map((u) => {
            // Replace unsplash placeholder with clean initials avatar
            if (!u.avatar || u.avatar.includes('images.unsplash.com')) {
              u.avatar = generateInitialsAvatar(u.fullName, u.department);
            }
            return u;
          });
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filteredUsers));
      } else {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([]));
      }
    } catch {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([]));
    }

    // Purge demo user from active login session if currently logged in as demo
    try {
      const currentRaw = localStorage.getItem('enterprise_network_current_user_v1');
      if (currentRaw) {
        const curr = JSON.parse(currentRaw);
        if (demoUsernames.has(curr.username?.toLowerCase()) || (typeof curr.id === 'string' && /^usr-[1-8]$/.test(curr.id))) {
          localStorage.removeItem('enterprise_network_current_user_v1');
        } else if (!curr.avatar || curr.avatar.includes('images.unsplash.com')) {
          curr.avatar = generateInitialsAvatar(curr.fullName, curr.department);
          localStorage.setItem('enterprise_network_current_user_v1', JSON.stringify(curr));
        }
      }
    } catch {}

    // Clean up any placeholder avatars in posts and comments
    try {
      const rawPosts = localStorage.getItem(POSTS_STORAGE_KEY);
      if (rawPosts) {
        const parsed: Post[] = JSON.parse(rawPosts);
        let changed = false;
        parsed.forEach((p) => {
          if (!p.authorAvatar || p.authorAvatar.includes('images.unsplash.com')) {
            p.authorAvatar = generateInitialsAvatar(p.authorName, p.authorDepartment);
            changed = true;
          }
          if (Array.isArray(p.comments)) {
            p.comments.forEach((c) => {
              if (!c.authorAvatar || c.authorAvatar.includes('images.unsplash.com')) {
                c.authorAvatar = generateInitialsAvatar(c.authorName, c.authorDepartment);
                changed = true;
              }
            });
          }
        });
        if (changed) {
          localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch {}

    if (!localStorage.getItem(POSTS_STORAGE_KEY)) {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(LAST_SYNC_KEY)) {
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    }
    if (!localStorage.getItem(QUOTA_STORAGE_KEY)) {
      const initialQuota: QuotaStats = {
        totalPostsInSystem: 0,
        totalCachedLocally: 0,
        cloudReadsSaved: 0,
        cacheHitRatio: 1.0,
        lastSyncedTimestamp: Date.now(),
        deltaSyncCount: 0,
        bandwidthSavedKB: 0,
        estimatedCostReductionPct: 98,
      };
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(initialQuota));
    }
  }

  // Clear all posts manually
  static clearAllPosts(): void {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify([]));
  }

  // USERS
  static getUsers(): User[] {
    this.initialize();
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  static getUserByUsername(username: string): User | undefined {
    const users = this.getUsers();
    return users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  }

  static getUserById(id: string): User | undefined {
    const users = this.getUsers();
    return users.find((u) => u.id === id);
  }

  static createUser(user: User): User {
    const users = this.getUsers();
    // Check if username taken
    const exists = users.some((u) => u.username.toLowerCase() === user.username.toLowerCase());
    if (exists) {
      throw new Error(`Username @${user.username} sudah digunakan oleh karyawan lain.`);
    }
    users.push(user);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return user;
  }

  // Reset password directly without requiring previous password
  static resetPassword(username: string, newPassword: string): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (index === -1) {
      throw new Error(`Karyawan dengan username @${username} tidak ditemukan.`);
    }
    users[index].password = newPassword;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return users[index];
  }

  // POSTS & CACHE MANAGEMENT (Quota-Saver Mechanism)
  static getPosts(): Post[] {
    this.initialize();
    try {
      const raw = localStorage.getItem(POSTS_STORAGE_KEY);
      const rawPosts: Post[] = raw ? JSON.parse(raw) : [];
      
      // Filter out any legacy dummy posts
      const posts = rawPosts.filter(
        (p) =>
          !['post-1', 'post-2', 'post-3', 'post-4', 'post-5'].includes(p.id) &&
          !p.id.startsWith('archive-post-')
      );

      // Update Quota Saver stats on each read from local cache
      this.recordCacheRead(posts.length);
      
      // Sort, sanitize fields, and recalculate recommendation score
      return posts.map(p => ({
        ...p,
        authorId: p.authorId || 'usr-anonymous',
        authorUsername: p.authorUsername || (p as any).username || 'karyawan',
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
        recommendationScore: this.calculateRecommendationScore(p)
      }));
    } catch {
      return [];
    }
  }

  // Recommendation algorithm: Upvotes (Follow Up) heavily weighted + comments + freshness
  static calculateRecommendationScore(post: Post): number {
    const upvoteWeight = 3.5;
    const commentWeight = 2.0;
    const ageInHours = Math.max(1, (Date.now() - post.createdAt) / 3600000);
    // Gravity factor slows down score decay for posts with high upvotes
    const freshnessMultiplier = Math.max(0.2, 1 / Math.pow(ageInHours / 24 + 1, 0.65));
    const baseScore = (post.upvotesCount * upvoteWeight) + (post.commentsCount * commentWeight);
    return Math.round(baseScore * freshnessMultiplier * 10) + (post.isPinned ? 50 : 0);
  }

  static savePost(post: Post): Post {
    const posts = this.getPosts();
    posts.unshift(post);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    
    // Update quota stats
    this.recordDeltaSync(1);
    return post;
  }

  static toggleUpvote(postId: string, userId: string): { post: Post; hasUpvoted: boolean } {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      throw new Error('Postingan tidak ditemukan.');
    }

    const post = posts[postIndex];
    const upvoterIndex = post.upvotedBy.indexOf(userId);
    let hasUpvoted = false;

    if (upvoterIndex > -1) {
      // Remove upvote
      post.upvotedBy.splice(upvoterIndex, 1);
      post.upvotesCount = Math.max(0, post.upvotesCount - 1);
      hasUpvoted = false;
    } else {
      // Add upvote
      post.upvotedBy.push(userId);
      post.upvotesCount += 1;
      hasUpvoted = true;
    }

    post.updatedAt = Date.now();
    post.recommendationScore = this.calculateRecommendationScore(post);
    posts[postIndex] = post;

    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    this.recordDeltaSync(1); // only 1 document write
    return { post, hasUpvoted };
  }

  static addComment(postId: string, comment: Comment): Post {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      throw new Error('Postingan tidak ditemukan.');
    }

    const post = posts[postIndex];
    post.comments = post.comments || [];
    post.comments.push(comment);
    post.commentsCount = post.comments.length;
    post.updatedAt = Date.now();
    post.recommendationScore = this.calculateRecommendationScore(post);

    posts[postIndex] = post;
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    this.recordDeltaSync(1);
    return post;
  }

  static deletePost(postId: string): void {
    const posts = this.getPosts();
    const filtered = posts.filter((p) => p.id !== postId);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(filtered));
  }

  static updateUserBio(userId: string, bio: string): User {
    return this.updateUserProfile(userId, { bio });
  }

  static updateUserProfile(
    userId: string,
    updates: Partial<Pick<User, 'fullName' | 'avatar' | 'bio' | 'department' | 'role'>>
  ): User {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const updated = {
      ...users[userIndex],
      ...updates,
    };
    users[userIndex] = updated;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Also update active session if it matches this user
    try {
      const currRaw = localStorage.getItem('enterprise_network_current_user_v1');
      if (currRaw) {
        const curr: User = JSON.parse(currRaw);
        if (curr.id === userId) {
          localStorage.setItem('enterprise_network_current_user_v1', JSON.stringify(updated));
        }
      }
    } catch {}

    // Update avatar and authorName on user's local posts so feed is immediately in sync
    try {
      const posts = this.getPosts();
      let changed = false;
      const updatedPosts = posts.map((p) => {
        if (
          p.authorId === userId ||
          (Boolean(p.authorUsername && updated.username) &&
            p.authorUsername.toLowerCase() === updated.username.toLowerCase())
        ) {
          changed = true;
          return {
            ...p,
            authorName: updates.fullName || p.authorName,
            authorAvatar: updates.avatar || p.authorAvatar,
            authorDepartment: updates.department || p.authorDepartment,
            authorRole: updates.role || p.authorRole,
          };
        }
        return p;
      });
      if (changed) {
        localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts));
      }
    } catch {}

    return updated;
  }

  // FIREBASE QUOTA SAVER ENGINE
  // Records how reading from local cache prevents Firebase cloud reads
  static recordCacheRead(itemCount: number): void {
    try {
      const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (!raw) return;
      const stats: QuotaStats = JSON.parse(raw);
      // Each locally served post is 1 cloud read saved!
      stats.cloudReadsSaved += itemCount;
      stats.bandwidthSavedKB += Math.round(itemCount * 1.8); // avg 1.8KB per post doc
      stats.totalCachedLocally = itemCount;
      
      const totalRequests = stats.cloudReadsSaved + (stats.deltaSyncCount * 3);
      stats.cacheHitRatio = totalRequests > 0 ? (stats.cloudReadsSaved / totalRequests) : 0.95;
      stats.estimatedCostReductionPct = Math.min(99.2, parseFloat((stats.cacheHitRatio * 100).toFixed(1)));
      
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }

  static recordDeltaSync(docsFetched: number): void {
    try {
      const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (!raw) return;
      const stats: QuotaStats = JSON.parse(raw);
      stats.deltaSyncCount += 1;
      stats.lastSyncedTimestamp = Date.now();
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(stats));
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  static getQuotaStats(): QuotaStats {
    this.initialize();
    try {
      const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
      const posts = this.getPosts();
      const stats: QuotaStats = raw ? JSON.parse(raw) : {
        totalPostsInSystem: posts.length,
        totalCachedLocally: posts.length,
        cloudReadsSaved: 1420,
        cacheHitRatio: 0.965,
        lastSyncedTimestamp: Date.now(),
        deltaSyncCount: 38,
        bandwidthSavedKB: 4850,
        estimatedCostReductionPct: 96.5,
      };
      stats.totalPostsInSystem = posts.length;
      stats.totalCachedLocally = posts.length;
      return stats;
    } catch {
      return {
        totalPostsInSystem: 5,
        totalCachedLocally: 5,
        cloudReadsSaved: 1420,
        cacheHitRatio: 0.965,
        lastSyncedTimestamp: Date.now(),
        deltaSyncCount: 38,
        bandwidthSavedKB: 4850,
        estimatedCostReductionPct: 96.5,
      };
    }
  }

  // Perform Delta Sync: Simulates cloud query with where('updatedAt', '>', lastSyncTimestamp)
  // Ensures older posts stay visible permanently without re-reading them from Firebase
  static performDeltaSync(): { newOrUpdatedCount: number; oldPostsPreserved: number } {
    const posts = this.getPosts();
    const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY) || Date.now() - 3600000);
    
    // In our delta sync mechanism:
    // Only documents where updatedAt > lastSync are transferred over network
    const changed = posts.filter(p => p.updatedAt > lastSync);
    const oldPreserved = posts.length - changed.length;

    // Update sync timestamp
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    this.recordDeltaSync(changed.length);

    return {
      newOrUpdatedCount: changed.length,
      oldPostsPreserved: oldPreserved,
    };
  }

  // CHAT MESSAGES
  static getChatMessages(
    userId1: string,
    userId2: string,
    user1Username?: string,
    user2Username?: string
  ): ChatMessage[] {
    try {
      const raw = localStorage.getItem(CHATS_STORAGE_KEY);
      const allChats: ChatMessage[] = raw ? JSON.parse(raw) : [];
      const u1U = (user1Username || '').toLowerCase();
      const u2U = (user2Username || '').toLowerCase();

      return allChats
        .filter((m) => {
          const sU = (m.senderUsername || '').toLowerCase();
          const rU = (m.recipientUsername || '').toLowerCase();

          const match1to2 =
            (m.senderId === userId1 || (u1U && sU === u1U)) &&
            (m.recipientId === userId2 || (u2U && rU === u2U));
          const match2to1 =
            (m.senderId === userId2 || (u2U && sU === u2U)) &&
            (m.recipientId === userId1 || (u1U && rU === u1U));

          return match1to2 || match2to1;
        })
        .sort((a, b) => a.createdAt - b.createdAt);
    } catch {
      return [];
    }
  }

  static sendChatMessage(message: Omit<ChatMessage, 'id' | 'createdAt' | 'read'>): ChatMessage {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    const allChats: ChatMessage[] = raw ? JSON.parse(raw) : [];
    const newMsg: ChatMessage = {
      ...message,
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      read: false,
    };
    allChats.push(newMsg);
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(allChats));
    return newMsg;
  }

  static mergeChatMessages(newMsgs: ChatMessage[]): void {
    if (!newMsgs || newMsgs.length === 0) return;
    try {
      const raw = localStorage.getItem(CHATS_STORAGE_KEY);
      const allChats: ChatMessage[] = raw ? JSON.parse(raw) : [];
      const map = new Map<string, ChatMessage>();
      allChats.forEach((m) => map.set(m.id, m));
      newMsgs.forEach((m) => map.set(m.id, m));
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
    } catch {
      // ignore
    }
  }

  static markChatMessagesAsRead(myId: string, myUsername?: string, peerId?: string, peerUsername?: string): void {
    try {
      const raw = localStorage.getItem(CHATS_STORAGE_KEY);
      if (!raw) return;
      const allChats: ChatMessage[] = JSON.parse(raw);
      const myU = (myUsername || '').toLowerCase();
      const pU = (peerUsername || '').toLowerCase();

      let changed = false;
      const updated = allChats.map((m) => {
        const isRecipient = m.recipientId === myId || (myU && (m.recipientUsername || '').toLowerCase() === myU);
        const isFromPeer = !peerId || m.senderId === peerId || (pU && (m.senderUsername || '').toLowerCase() === pU);
        if (isRecipient && isFromPeer && !m.read) {
          changed = true;
          return { ...m, read: true };
        }
        return m;
      });

      if (changed) {
        localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }

  static getUnreadChatCount(myId: string, myUsername?: string): number {
    try {
      const raw = localStorage.getItem(CHATS_STORAGE_KEY);
      if (!raw) return 0;
      const allChats: ChatMessage[] = JSON.parse(raw);
      const myU = (myUsername || '').toLowerCase();
      return allChats.filter((m) => {
        const isForMe = m.recipientId === myId || (myU && (m.recipientUsername || '').toLowerCase() === myU);
        return isForMe && !m.read;
      }).length;
    } catch {
      return 0;
    }
  }

  // NOTIFICATIONS
  static getNotifications(username: string): AppNotification[] {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const allNotifs: AppNotification[] = raw ? JSON.parse(raw) : [];
      const cleanU = username.trim().toLowerCase().replace(/^@/, '');
      return allNotifs
        .filter((n) => n.recipientUsername.toLowerCase() === cleanU)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  static saveNotification(notification: AppNotification): void {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const allNotifs: AppNotification[] = raw ? JSON.parse(raw) : [];
      // avoid duplicates by ID
      const existsIndex = allNotifs.findIndex((n) => n.id === notification.id);
      if (existsIndex >= 0) {
        allNotifs[existsIndex] = notification;
      } else {
        allNotifs.unshift(notification);
      }
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(allNotifs));
    } catch {
      // ignore
    }
  }

  static mergeNotifications(notifications: AppNotification[]): void {
    if (!notifications || notifications.length === 0) return;
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      const allNotifs: AppNotification[] = raw ? JSON.parse(raw) : [];
      const map = new Map<string, AppNotification>();
      allNotifs.forEach((n) => map.set(n.id, n));
      notifications.forEach((n) => map.set(n.id, n));
      localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt))
      );
    } catch {
      // ignore
    }
  }

  static markNotificationAsRead(notifId: string): void {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) return;
      const allNotifs: AppNotification[] = JSON.parse(raw);
      const updated = allNotifs.map((n) => (n.id === notifId ? { ...n, read: true } : n));
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  static markAllNotificationsAsRead(username: string): void {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) return;
      const allNotifs: AppNotification[] = JSON.parse(raw);
      const cleanU = username.trim().toLowerCase().replace(/^@/, '');
      const updated = allNotifs.map((n) =>
        n.recipientUsername.toLowerCase() === cleanU ? { ...n, read: true } : n
      );
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  static getUnreadNotificationsCount(username: string): number {
    try {
      const notifs = this.getNotifications(username);
      return notifs.filter((n) => !n.read).length;
    } catch {
      return 0;
    }
  }
}
