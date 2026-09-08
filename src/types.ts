export type Department =
  | 'Semua Departemen'
  | 'Produksi Export'
  | 'HA Export'
  | 'VCFP Export'
  | 'QAM'
  | 'Engineering'
  | 'Staff'
  | 'Administration'
  | 'Human Resource';

export type PostCategory =
  | 'Regular/Information Only'
  | 'Urgent'
  | 'Top Urgent';

export interface ActionButton {
  label: string;
  url: string;
  type?: 'primary' | 'secondary' | 'accent';
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatar: string;
  authorDepartment: Department;
  content: string;
  createdAt: number;
  mentions?: string[];
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatar: string;
  authorDepartment: Department;
  authorRole: string;
  targetDepartment: Department;
  category: PostCategory;
  title?: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  actionButton?: ActionButton;
  tags: string[];
  mentions: string[];
  upvotesCount: number;
  upvotedBy: string[]; // array of userIds
  commentsCount: number;
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  recommendationScore: number;
  isArchivedLocally?: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  department: Department;
  role: string;
  avatar: string;
  bio?: string;
  password?: string;
  joinedAt: number;
  isOnline?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  recipientId: string;
  recipientUsername: string;
  content: string;
  createdAt: number;
  read: boolean;
}

export interface QuotaStats {
  totalPostsInSystem: number;
  totalCachedLocally: number;
  cloudReadsSaved: number;
  cacheHitRatio: number;
  lastSyncedTimestamp: number;
  deltaSyncCount: number;
  bandwidthSavedKB: number;
  estimatedCostReductionPct: number;
}
