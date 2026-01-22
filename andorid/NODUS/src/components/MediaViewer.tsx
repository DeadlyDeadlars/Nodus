import React, { useState } from 'react';
import { Modal, View, Image, TouchableOpacity, Text, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  uri: string;
  type: 'image' | 'video';
  onClose: () => void;
}

export const MediaViewer: React.FC<Props> = ({ visible, uri, type, onClose }) => {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }} onPress={onClose}>
          <Text style={{ color: '#fff', fontSize: 28 }}>✕</Text>
        </TouchableOpacity>
        {loading && <ActivityIndicator size="large" color="#fff" style={{ position: 'absolute' }} />}
        {type === 'image' ? (
          <Image source={{ uri }} style={{ width, height }} resizeMode="contain" onLoad={() => setLoading(false)} />
        ) : (
          <TouchableOpacity activeOpacity={1} onPress={() => setPaused(!paused)} style={{ width, height, justifyContent: 'center' }}>
            <Video
              source={{ uri }}
              style={{ width, height }}
              resizeMode="contain"
              repeat
              paused={paused}
              onLoad={() => setLoading(false)}
            />
            {paused && (
              <View style={{ position: 'absolute', alignSelf: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 0, height: 0, borderLeftWidth: 20, borderTopWidth: 12, borderBottomWidth: 12, borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent', marginLeft: 5 }} />
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};
