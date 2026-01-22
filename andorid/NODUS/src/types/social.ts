// Social Network Types - P2P + Relay Anonymous

export interface SocialPost {
  id: string;
  authorId: string;        // fingerprint (anonymous)
  authorAlias?: string;
  authorAvatar?: string;
  content: string;
  mediaUri?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
  likes: string[];         // fingerprints who liked
  reposts: string[];       // fingerprints who reposted
  comments: SocialComment[];
  repostOf?: string;       // original post id if repost
  originalAuthorId?: string;
  isAnonymous: boolean;
  signature?: string;      // cryptographic signature
  relayId?: string;        // relay node that distributed
}

export interface SocialComment {
  id: string;
  authorId: string;
  authorAlias?: string;
  authorAvatar?: string;
  content: string;
  timestamp: number;
  likes: string[];
  replyTo?: string;        // parent comment id
  isAnonymous: boolean;
}

export interface SocialProfile {
  oderId: string;          // fingerprint
  alias: string;
  username?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isPrivate: boolean;
  lastSeen?: number;
  isOnline?: boolean;
  createdAt: number;
  publicKey?: string;
}

export interface SocialFeed {
  posts: SocialPost[];
  lastSync: number;
  hasMore: boolean;
}

export interface FollowRelation {
  followerId: string;
  followingId: string;
  timestamp: number;
}
