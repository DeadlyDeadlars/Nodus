declare module 'react-native-incall-manager' {
  const InCallManager: {
    start(opts?: any): void;
    stop(): void;
    setSpeakerphoneOn(on: boolean): void;
  };
  export default InCallManager;
}
