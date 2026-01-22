declare module '@notifee/react-native' {
  export enum AndroidImportance {
    DEFAULT = 3,
    HIGH = 4,
    LOW = 2,
    MIN = 1,
    NONE = 0,
  }

  export enum AndroidStyle {
    BIGPICTURE = 0,
    BIGTEXT = 1,
    INBOX = 2,
    MESSAGING = 3,
  }

  export enum EventType {
    UNKNOWN = -1,
    DISMISSED = 0,
    PRESS = 1,
    ACTION_PRESS = 2,
    DELIVERED = 3,
    APP_BLOCKED = 4,
    CHANNEL_BLOCKED = 5,
    CHANNEL_GROUP_BLOCKED = 6,
    TRIGGER_NOTIFICATION_CREATED = 7,
  }

  interface NotificationAndroid {
    channelId: string;
    smallIcon?: string;
    largeIcon?: string;
    pressAction?: { id: string };
    style?: { type: AndroidStyle; text?: string };
    ongoing?: boolean;
    actions?: Array<{ title: string; pressAction: { id: string } }>;
  }

  interface Notification {
    id?: string;
    title?: string;
    body?: string;
    data?: Record<string, string>;
    android?: NotificationAndroid;
  }

  interface Channel {
    id: string;
    name: string;
    importance?: AndroidImportance;
    sound?: string;
    vibration?: boolean;
  }

  interface Event {
    type: EventType;
    detail: {
      notification?: Notification;
      pressAction?: { id: string };
      input?: string;
    };
  }

  const notifee: {
    createChannel(channel: Channel): Promise<string>;
    displayNotification(notification: Notification): Promise<string>;
    cancelNotification(id: string): Promise<void>;
    cancelAllNotifications(): Promise<void>;
    onForegroundEvent(callback: (event: Event) => Promise<void>): () => void;
    onBackgroundEvent(callback: (event: Event) => Promise<void>): void;
  };

  export default notifee;
}
