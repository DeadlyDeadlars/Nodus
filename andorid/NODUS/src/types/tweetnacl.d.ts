declare module 'tweetnacl' {
  export const secretbox: {
    (msg: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
    open(box: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
    keyLength: number;
    nonceLength: number;
    overheadLength: number;
  };

  export function randomBytes(n: number): Uint8Array;

  export const box: {
    (msg: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array;
    open(box: Uint8Array, nonce: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array | null;
    before(publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array;
    after(msg: Uint8Array, nonce: Uint8Array, sharedKey: Uint8Array): Uint8Array;
    keyPair(): { publicKey: Uint8Array; secretKey: Uint8Array };
    publicKeyLength: number;
    secretKeyLength: number;
    sharedKeyLength: number;
    nonceLength: number;
    overheadLength: number;
  };

  export const sign: {
    (msg: Uint8Array, secretKey: Uint8Array): Uint8Array;
    open(signedMsg: Uint8Array, publicKey: Uint8Array): Uint8Array | null;
    detached: {
      (msg: Uint8Array, secretKey: Uint8Array): Uint8Array;
      verify(msg: Uint8Array, sig: Uint8Array, publicKey: Uint8Array): boolean;
    };
    keyPair: {
      (): { publicKey: Uint8Array; secretKey: Uint8Array };
      fromSeed(seed: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array };
    };
    publicKeyLength: number;
    secretKeyLength: number;
    signatureLength: number;
  };

  export const hash: (msg: Uint8Array) => Uint8Array;
}
