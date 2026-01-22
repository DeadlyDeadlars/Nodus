declare module 'react-native-audio-recorder-player' {
  export default class AudioRecorderPlayer {
    startRecorder(path?: string, audioSet?: Record<string, any>, meteringEnabled?: boolean): Promise<string>;
    stopRecorder(): Promise<string>;
    startPlayer(path?: string): Promise<void>;
    stopPlayer(): Promise<void>;
    addPlayBackListener(callback: (e: any) => void): void;
    removePlayBackListener(): void;
  }
}
