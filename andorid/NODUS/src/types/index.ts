export interface Message {
  id: string;
  text?: string;
  timestamp: number;
  isOutgoing: boolean;
  isDirect: boolean;
  isTemporary?: boolean;
  expiresAt?: number;
  silent?: boolean;
  type: 'text' | 'voice' | 'video' | 'file' | 'sticker' | 'gif' | 'image' | 'videoMessage' | 'location' | 'delete' | 'reaction' | 'edit' | 'channel_post' | 'story' | 'poll';
  mediaUri?: string;
  mediaDuration?: number;
  stickerEmoji?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: string;
  reactions?: { [emoji: string]: string[] };
  editedAt?: number;
  // File message fields
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileUri?: string;
  // Location
  latitude?: number;
  longitude?: number;
  // Link preview
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  };
  // Poll
  poll?: {
    question: string;
    options: string[];
    votes: { [optionIndex: number]: string[] }; // userId[]
    isAnonymous?: boolean;
    isMultiple?: boolean;
    isClosed?: boolean;
  };
  // Bot
  isBot?: boolean;
  botId?: string;
}

export interface Bot {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  description?: string;
  commands: BotCommand[];
  webhookUrl?: string;
  isEnabled: boolean;
  createdAt: number;
}

export interface BotCommand {
  command: string;
  description: string;
  response?: string;
  action?: 'weather' | 'time' | 'random' | 'echo' | 'webhook';
}

export interface Chat {
  id: string;
  peerId: string;
  fingerprint?: string;  // New format identity (preferred for calls)
  publicKey?: string;  // Peer's public key for ECDH
  alias?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  isOnline: boolean;
  lastSeen?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isHidden?: boolean;
  folder?: string;
  draft?: string;
  pinnedMessageId?: string;
  messages: Message[];
  unreadCount?: number;
  isTyping?: boolean;
  isRecording?: boolean;
  isMuted?: boolean;
  isBlocked?: boolean;

  isGroup?: boolean;
  groupId?: string;
  groupKey?: string;
  lastGroupTimestamp?: number;
}

export interface GroupMember {
  oderId: string;
  odername?: string;
  alias?: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  permissions?: GroupPermissions;
}

export interface GroupPermissions {
  canSendMessages?: boolean;
  canSendMedia?: boolean;
  canAddMembers?: boolean;
  canPinMessages?: boolean;
  canDeleteMessages?: boolean;
  canEditInfo?: boolean;
}

export interface Space {
  id: string;
  name: string;
  username?: string;
  description?: string;
  avatar?: string;
  fingerprint: string;
  nodeCount: number;
  hasVoice?: boolean;
  groupKey?: string;
  expiresAt?: number;
  createdAt: number;
  ownerId?: string;
  isPublic?: boolean;
  inviteLink?: string;
  members?: GroupMember[];
  pinnedMessageId?: string;
}

export interface UserProfile {
  fingerprint: string;
  alias: string;
  username?: string;
  bio?: string;
  avatar?: string;
  publicKey: string;
  privateKeyEncrypted?: string;
  createdAt: number;
}

export interface TrustedRelay {
  id: string;
  address: string;
  name: string;
  addedAt: number;
}

export interface ChatAppearance {
  fontSize: number;
  bubbleStyle: 'rounded' | 'sharp' | 'minimal';
  wallpaper: string | null;
  showTime: boolean;
  showStatus: boolean;
}

export interface Settings {
  relayEnabled: boolean;
  trustedRelays: TrustedRelay[];
  connectionPriority: 'direct' | 'relay' | 'auto';
  tempMessagesByDefault: boolean;
  tempMessageDuration: number;
  autoDeleteMessages: boolean;
  stripMetadata: boolean;
  uiDensity: 'compact' | 'normal' | 'comfortable';
  displayMode: 'telegram' | 'discord';
  theme: 'dark' | 'light' | 'system' | 'amoled' | 'midnight' | 'stealth' | 'hacker';
  chatAppearance: ChatAppearance;
  pinCode?: string;
  pinEnabled?: boolean;
  biometricEnabled?: boolean;
  hideNotificationContent?: boolean;
  accentColor?: string;
  folders?: string[];
  hiddenChatPin?: string;
  screenshotProtection?: boolean;
  lockOnBackground?: boolean;
  // Privacy
  hideLastSeen?: boolean;
  blockedPeerIds?: string[];
  mutedChatIds?: string[];
  autoDeleteAllAfter?: number;
  fakePin?: string;
  panicPin?: string;
  proxyEnabled?: boolean;
  proxyHost?: string;
  proxyPort?: number;
  // Sync
  cloudSync?: boolean;
  pushNotifications?: boolean;
  // Notifications
  notificationSound?: boolean;
  notificationVibration?: boolean;
  // Call sounds
  callRingtone?: boolean;
  callRingback?: boolean;
  callSounds?: boolean;
}

export interface UserSearchResult {
  peerId: string;
  username: string;
  alias?: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
}

export interface ChannelAdmin {
  oderId: string;
  odername?: string;
  alias?: string;
  avatar?: string;
  role: 'owner' | 'admin';
  addedAt: number;
  permissions?: ChannelPermissions;
}

export interface ChannelPermissions {
  canPost?: boolean;
  canEditInfo?: boolean;
  canDeletePosts?: boolean;
  canManageSubscribers?: boolean;
  canAddAdmins?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  username?: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  subscriberCount: number;
  isPublic: boolean;
  createdAt: number;
  posts: ChannelPost[];
  admins?: ChannelAdmin[];
  inviteLink?: string;
}

export interface ChannelPost {
  id: string;
  content: string;
  mediaUri?: string;
  mediaType?: 'image' | 'video' | 'file';
  timestamp: number;
  views: number;
  reactions?: { [emoji: string]: string[] };
}

export interface Story {
  id: string;
  peerId: string;
  mediaUri: string;
  mediaType: 'image' | 'video';
  caption?: string;
  timestamp: number;
  expiresAt: number;
  viewedBy: string[];
}

export interface StickerPack {
  id: string;
  name: string;
  author?: string;
  stickers: Sticker[];
  isInstalled: boolean;
  thumbnail?: string;
}

export interface Sticker {
  id: string;
  emoji: string;
  imageUri?: string;
}

// Re-export social types
export * from './social';
