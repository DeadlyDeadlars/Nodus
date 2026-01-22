declare module 'react-native-webrtc' {
  import * as React from 'react';

  export class RTCIceCandidate {
    constructor(candidateInitDict: any);
  }

  export class RTCSessionDescription {
    constructor(descriptionInitDict: any);
  }

  export class RTCPeerConnection {
    constructor(configuration?: any);
    localDescription: any;
    remoteDescription: any;
    connectionState: string;
    onicecandidate: ((ev: any) => void) | null;
    ontrack: ((ev: any) => void) | null;
    onconnectionstatechange: (() => void) | null;
    addTrack(track: any, stream: any): void;
    createOffer(options?: any): Promise<any>;
    createAnswer(options?: any): Promise<any>;
    setLocalDescription(desc: any): Promise<void>;
    setRemoteDescription(desc: any): Promise<void>;
    addIceCandidate(candidate: any): Promise<void>;
    close(): void;
  }

  export const mediaDevices: {
    getUserMedia(constraints: any): Promise<any>;
  };

  export class RTCView extends React.Component<any> {}
}
