declare module '@react-native-community/geolocation' {
  interface GeoPosition {
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  }

  interface GeoError {
    code: number;
    message: string;
  }

  interface GeoOptions {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
  }

  const Geolocation: {
    getCurrentPosition: (
      success: (position: GeoPosition) => void,
      error?: (error: GeoError) => void,
      options?: GeoOptions
    ) => void;
    watchPosition: (
      success: (position: GeoPosition) => void,
      error?: (error: GeoError) => void,
      options?: GeoOptions
    ) => number;
    clearWatch: (watchId: number) => void;
  };

  export default Geolocation;
}
