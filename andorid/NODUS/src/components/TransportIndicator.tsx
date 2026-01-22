/**
 * Transport Mode Indicator
 * Shows P2P (green) or Relay (yellow) connection status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// TODO: Replace with actual transport mode hook
const useTransportMode = () => 'relay' as 'p2p' | 'relay' | 'offline';
import { P2PIcon, RelayIcon } from './Icons';

interface Props {
  size?: number;
  showLabel?: boolean;
}

export const TransportIndicator: React.FC<Props> = ({ size = 16, showLabel = false }) => {
  const mode = useTransportMode();

  const color = mode === 'p2p' ? '#4CAF50' : mode === 'relay' ? '#FFC107' : '#9E9E9E';
  const label = mode === 'p2p' ? 'P2P' : mode === 'relay' ? 'Relay' : '...';

  return (
    <View style={styles.container}>
      {mode === 'p2p' ? (
        <P2PIcon size={size} color={color} />
      ) : (
        <RelayIcon size={size} color={color} />
      )}
      {showLabel && <Text style={[styles.label, { color }]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default TransportIndicator;
