import { create } from 'zustand';

// Minimal store for UI state only - no backend logic
export const useStore = create<any>((set, get) => ({
  // Settings
  settings: {
    theme: 'dark',
    uiDensity: 'normal',
    displayMode: 'telegram',
    pinEnabled: false,
    screenshotProtection: false,
    lockOnBackground: false,
    chatAppearance: {
      fontSize: 16,
      bubbleStyle: 'rounded',
      wallpaper: null,
      showTime: true,
      showStatus: true,
    },
  },
  
  // Profile
  profile: {},
  
  // Data
  chats: [],
  channels: [],
  spaces: [],
  stories: [],
  stickerPacks: [],
  
  // UI State
  isOnboarded: false,
  searchQuery: '',
  
  // Setters
  updateSettings: (s: any) => set((state: any) => ({ settings: { ...state.settings, ...s } })),
  setProfile: (p: any) => set({ profile: p }),
  setOnboarded: (v: boolean) => set({ isOnboarded: v }),
  setSearchQuery: (q: string) => set({ searchQuery: q }),
  
  // Placeholder functions - to be implemented with backend
  initKeyPair: () => ({ keyPair: { publicKey: '', secretKey: '' }, fingerprint: '' }),
  initP2P: async () => {},
  clearAllData: () => set({ profile: {}, chats: [], isOnboarded: false }),
  fetchPeerProfile: async () => ({}),
  searchUsersByUsername: async () => [],
  getOrCreateChat: (id: string) => ({ id, peerId: id, messages: [], isOnline: false }),
  addChat: () => {},
  removeChat: () => {},
  addMessage: () => {},
  sendP2PMessage: async () => '',
  startCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleVideo: () => {},
  toggleSpeaker: () => {},
}));
