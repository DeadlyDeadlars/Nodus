import 'react-native-get-random-values';
import { TextEncoder, TextDecoder } from 'text-encoding';

// Polyfill TextEncoder/TextDecoder for Hermes
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Polyfill Buffer for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = {
    from: (data: any, encoding?: string) => {
      if (typeof data === 'string') {
        if (encoding === 'hex') {
          const bytes = new Uint8Array(data.length / 2);
          for (let i = 0; i < data.length; i += 2) {
            bytes[i / 2] = parseInt(data.substr(i, 2), 16);
          }
          return bytes;
        }
        // Default to UTF-8
        return new TextEncoder().encode(data);
      }
      if (data instanceof Uint8Array) {
        return data;
      }
      if (Array.isArray(data)) {
        return new Uint8Array(data);
      }
      return new Uint8Array(0);
    },
    // Add toString method for compatibility
    toString: function(encoding?: string) {
      if (encoding === 'hex') {
        return Array.from(this).map((b: number) => b.toString(16).padStart(2, '0')).join('');
      }
      return new TextDecoder().decode(this);
    }
  };
}

// Add URL polyfill for React Native
if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    protocol: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    href: string;

    constructor(url: string, base?: string) {
      this.href = url;
      
      // Parse URL manually
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const protocolEnd = url.indexOf('://');
        this.protocol = url.substring(0, protocolEnd + 1);
        
        const afterProtocol = url.substring(protocolEnd + 3);
        const pathStart = afterProtocol.indexOf('/');
        const queryStart = afterProtocol.indexOf('?');
        const hashStart = afterProtocol.indexOf('#');
        
        let hostPart = afterProtocol;
        if (pathStart !== -1) hostPart = afterProtocol.substring(0, pathStart);
        else if (queryStart !== -1) hostPart = afterProtocol.substring(0, queryStart);
        else if (hashStart !== -1) hostPart = afterProtocol.substring(0, hashStart);
        
        const portIndex = hostPart.lastIndexOf(':');
        if (portIndex !== -1 && /^\d+$/.test(hostPart.substring(portIndex + 1))) {
          this.hostname = hostPart.substring(0, portIndex);
          this.port = hostPart.substring(portIndex + 1);
        } else {
          this.hostname = hostPart;
          this.port = this.protocol === 'https:' ? '443' : '80';
        }
        
        this.pathname = pathStart !== -1 ? afterProtocol.substring(pathStart) : '/';
        if (queryStart !== -1) {
          this.search = afterProtocol.substring(queryStart);
          this.pathname = this.pathname.substring(0, this.pathname.indexOf('?'));
        } else {
          this.search = '';
        }
        
        if (hashStart !== -1) {
          this.hash = afterProtocol.substring(hashStart);
          if (this.search) this.search = this.search.substring(0, this.search.indexOf('#'));
          else this.pathname = this.pathname.substring(0, this.pathname.indexOf('#'));
        } else {
          this.hash = '';
        }
      } else {
        this.protocol = '';
        this.hostname = '';
        this.port = '';
        this.pathname = '/';
        this.search = '';
        this.hash = '';
      }
    }

    toString() {
      return this.href;
    }
  };
}

// Disable console in production
if (!__DEV__) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
}

import {AppRegistry} from 'react-native';
import AppWrapper from './src/AppWrapper';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => AppWrapper);
