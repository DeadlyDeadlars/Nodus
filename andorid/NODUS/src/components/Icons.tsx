import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const ChatIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15C21 16.1 20.1 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z"
      stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const GroupIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={2} />
    <Path d="M3 21V19C3 16.8 4.8 15 7 15H11C13.2 15 15 16.8 15 19V21" stroke={color} strokeWidth={2} />
    <Circle cx="17" cy="7" r="2.5" stroke={color} strokeWidth={2} />
    <Path d="M21 21V19.5C21 18 19.7 16.5 18 16.5" stroke={color} strokeWidth={2} />
  </Svg>
);

export const SettingsIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    <Path d="M19.4 15A1.7 1.7 0 0 0 19.8 17L21 18.2L18.2 21L17 19.8A1.7 1.7 0 0 0 15 19.4A1.7 1.7 0 0 0 13 20V22H11V20A1.7 1.7 0 0 0 9 19.4A1.7 1.7 0 0 0 7 19.8L5.8 21L3 18.2L4.2 17A1.7 1.7 0 0 0 4.6 15A1.7 1.7 0 0 0 4 13H2V11H4A1.7 1.7 0 0 0 4.6 9A1.7 1.7 0 0 0 4.2 7L3 5.8L5.8 3L7 4.2A1.7 1.7 0 0 0 9 4.6A1.7 1.7 0 0 0 11 4V2H13V4A1.7 1.7 0 0 0 15 4.6A1.7 1.7 0 0 0 17 4.2L18.2 3L21 5.8L19.8 7A1.7 1.7 0 0 0 19.4 9A1.7 1.7 0 0 0 20 11H22V13H20A1.7 1.7 0 0 0 19.4 15Z"
      stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const MoreIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="5" cy="12" r="1.5" fill={color} />
    <Circle cx="12" cy="12" r="1.5" fill={color} />
    <Circle cx="19" cy="12" r="1.5" fill={color} />
  </Svg>
);

export const SendIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const VoiceIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 1C10.3 1 9 2.3 9 4V12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12V4C15 2.3 13.7 1 12 1Z" stroke={color} strokeWidth={2} />
    <Path d="M19 10V12C19 15.9 15.9 19 12 19C8.1 19 5 15.9 5 12V10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 19V23M8 23H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const VideoIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 7L16 12L23 17V7Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Rect x="1" y="5" width="15" height="14" rx="2" stroke={color} strokeWidth={2} />
  </Svg>
);

export const SmileIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M8 14C8.5 15.5 10 17 12 17C14 17 15.5 15.5 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="9" cy="9" r="1" fill={color} />
    <Circle cx="15" cy="9" r="1" fill={color} />
  </Svg>
);

export const CloseIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const CheckIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DoubleCheckIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="18 6 9 17 6 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22 6 13 17" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const BackIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ForwardIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PlusIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SearchIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const PhoneIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92V19.92C22 20.48 21.56 20.93 21 20.98C20.45 21.03 19.89 21.05 19.33 21.05C10.19 21.05 2.95 13.81 2.95 4.67C2.95 4.11 2.97 3.55 3.02 3C3.07 2.44 3.52 2 4.08 2H7.08C7.56 2 7.97 2.34 8.05 2.81C8.14 3.35 8.29 3.88 8.49 4.38C8.63 4.72 8.54 5.11 8.27 5.38L6.62 7.03C8.06 9.91 10.42 12.27 13.3 13.71L14.95 12.06C15.22 11.79 15.61 11.7 15.95 11.84C16.45 12.04 16.98 12.19 17.52 12.28C17.99 12.36 18.33 12.77 18.33 13.25V16.25C18.33 16.81 17.89 17.26 17.33 17.31C16.77 17.36 16.21 17.38 15.65 17.38" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const AttachIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21.44 11.05L12.25 20.24C10.45 22.04 7.51 22.04 5.71 20.24C3.91 18.44 3.91 15.5 5.71 13.7L14.9 4.51C16.03 3.38 17.87 3.38 19 4.51C20.13 5.64 20.13 7.48 19 8.61L9.81 17.8C9.25 18.36 8.33 18.36 7.77 17.8C7.21 17.24 7.21 16.32 7.77 15.76L16.96 6.57" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CopyIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>📋</Text>
);

export const QRIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Text style={{ fontSize: size, color, fontFamily: 'monospace' }}>⬜</Text>
);

export const PollIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Text style={{ fontSize: size, color }}>📊</Text>
);

export const AddIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Text style={{ fontSize: size, color, fontWeight: 'bold' }}>+</Text>
);

export const ShareIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={2} />
    <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={2} />
    <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={2} />
    <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke={color} strokeWidth={2} />
    <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke={color} strokeWidth={2} />
  </Svg>
);

export const DeleteIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="3 6 5 6 21 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const EditIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4C2.9 4 2 4.9 2 6V20C2 21.1 2.9 22 4 22H18C19.1 22 20 21.1 20 20V13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5C19.33 1.67 20.67 1.67 21.5 2.5C22.33 3.33 22.33 4.67 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PinIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 17L12 22" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M5 12H19L17 7H7L5 12Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M7 7V4C7 2.9 7.9 2 9 2H15C16.1 2 17 2.9 17 4V7" stroke={color} strokeWidth={2} />
  </Svg>
);

export const MuteIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 5L6 9H2V15H6L11 19V5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Line x1="23" y1="9" x2="17" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="17" y1="9" x2="23" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const ClockIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UserIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    <Path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const LockIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7C7 4.2 9.2 2 12 2C14.8 2 17 4.2 17 7V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const ImageIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
    <Path d="M21 15L16 10L5 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DebugIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M2 17L12 22L22 17" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 12L12 17L22 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ReplyIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 17L4 12L9 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20 18V15C20 12.8 18.2 11 16 11H4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ForwardMsgIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 17L20 12L15 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 18V15C4 12.8 5.8 11 8 11H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const TrashIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6H5H21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 6V20C19 20.6 18.6 21 18 21H6C5.4 21 5 20.6 5 20V6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const KeyIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="8" cy="15" r="5" stroke={color} strokeWidth={2} />
    <Path d="M11.5 11.5L21 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M18 5L21 2L18 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 8L17 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const ShieldIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const RefreshIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 4V10H17" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1 20V14H7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3.51 9C4.01 7.6 4.8 6.3 5.88 5.2C8.69 2.4 13.1 2 16.4 4.2L23 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.49 15C19.99 16.4 19.2 17.7 18.12 18.8C15.31 21.6 10.9 22 7.6 19.8L1 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const BellIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15.1 2.6 13.6 2 12 2C10.4 2 8.9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.7 21C13.5 21.3 13.3 21.6 12.9 21.8C12.6 22 12.3 22 12 22C11.7 22 11.4 22 11.1 21.8C10.7 21.6 10.5 21.3 10.3 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const BellOffIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13.7 21C13.5 21.3 13.3 21.6 12.9 21.8C12.6 22 12.3 22 12 22C11.7 22 11.4 22 11.1 21.8C10.7 21.6 10.5 21.3 10.3 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.6 13C18.9 14.3 19.4 15.5 20.1 16.5C20.4 16.8 20.5 17 21 17H3C3 17 6 15 6 8C6 6.8 6.3 5.6 6.9 4.6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8.3 3.2C9.3 2.4 10.6 2 12 2C13.6 2 15.1 2.6 16.2 3.8C17.4 4.9 18 6.4 18 8V11" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="1" y1="1" x2="23" y2="23" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const GlobeIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M2 12H22" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M12 2C14.5 4.7 16 8.2 16 12C16 15.8 14.5 19.3 12 22C9.5 19.3 8 15.8 8 12C8 8.2 9.5 4.7 12 2Z" stroke={color} strokeWidth={2} />
  </Svg>
);

export const UploadIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17 8 12 3 7 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="3" x2="12" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const DownloadIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="7 10 12 15 17 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const CameraIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
  </Svg>
);

export const GalleryIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
    <Path d="M21 15L16 10L5 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const FileIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const PaletteIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Circle cx="12" cy="7" r="1.5" fill={color} />
    <Circle cx="7.5" cy="10.5" r="1.5" fill={color} />
    <Circle cx="9" cy="15" r="1.5" fill={color} />
    <Circle cx="16.5" cy="10.5" r="1.5" fill={color} />
  </Svg>
);

export const GridIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
  </Svg>
);

export const WifiIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5C8.5 9 15.5 9 19 12.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M8 15.5C10 13.5 14 13.5 16 15.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="19" r="1.5" fill={color} />
  </Svg>
);

export const MoonIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SunIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={2} />
    <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const InfoIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="8" r="1" fill={color} />
  </Svg>
);

export const LogoutIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const LinkIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const EyeIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);

export const CloudIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 10H17.74C17.36 7.68 15.38 6 13 6C11.08 6 9.44 7.19 8.74 8.88C6.56 9.33 5 11.25 5 13.5C5 16.04 7.02 18 9.5 18H18C20.21 18 22 16.21 22 14C22 11.79 20.21 10 18 10Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const StorageIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="3" width="20" height="6" rx="2" stroke={color} strokeWidth={2} />
    <Rect x="2" y="15" width="20" height="6" rx="2" stroke={color} strokeWidth={2} />
    <Circle cx="6" cy="6" r="1" fill={color} />
    <Circle cx="6" cy="18" r="1" fill={color} />
  </Svg>
);

export const LanguageIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
    <Path d="M12 2C14.5 4.7 16 8.2 16 12C16 15.8 14.5 19.3 12 22C9.5 19.3 8 15.8 8 12C8 8.2 9.5 4.7 12 2Z" stroke={color} strokeWidth={2} />
  </Svg>
);

export const HelpIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M9 9C9 7.3 10.3 6 12 6C13.7 6 15 7.3 15 9C15 10.7 13.7 12 12 12V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="18" r="1" fill={color} />
  </Svg>
);

export const NotificationIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15.1 2.6 13.6 2 12 2C10.4 2 8.9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.7 21C13.5 21.3 13.3 21.6 12.9 21.8C12.6 22 12.3 22 12 22C11.7 22 11.4 22 11.1 21.8C10.7 21.6 10.5 21.3 10.3 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PrivacyIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12L11 14L15 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChatBubbleIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 11.5C21 16.2 16.97 20 12 20C10.64 20 9.35 19.75 8.18 19.29L3 21L4.71 15.82C4.25 14.65 4 13.36 4 12C4 7.03 7.8 3 12.5 3C17.2 3 21 6.8 21 11.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CircleIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
  </Svg>
);

export const ArchiveIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="3" width="20" height="5" rx="1" stroke={color} strokeWidth={2} />
    <Path d="M4 8V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V8" stroke={color} strokeWidth={2} />
    <Path d="M10 12H14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const FolderIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 19C22 20.1 21.1 21 20 21H4C2.9 21 2 20.1 2 19V5C2 3.9 2.9 3 4 3H9L11 6H20C21.1 6 22 6.9 22 8V19Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const LocationIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" stroke={color} strokeWidth={2} />
    <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth={2} />
  </Svg>
);

export const MegaphoneIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 11V13C3 14.1 3.9 15 5 15H6L8 21H10L8 15H9L18 19V5L9 9H5C3.9 9 3 9.9 3 11Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M21 10V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const WarningIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 22H22L12 2Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="17" r="1" fill={color} />
  </Svg>
);

export const AcceptIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Polyline points="8 12 11 15 16 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DeclineIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);


export const UsersIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={2} />
    <Path d="M3 21V19C3 16.8 4.8 15 7 15H11C13.2 15 15 16.8 15 19V21" stroke={color} strokeWidth={2} />
    <Circle cx="17" cy="7" r="2.5" stroke={color} strokeWidth={2} />
    <Path d="M21 21V19.5C21 18 19.7 16.5 18 16.5" stroke={color} strokeWidth={2} />
  </Svg>
);

export const ChannelIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 11V13C3 14.1 3.9 15 5 15H6L8 21H10L8 15H9L18 19V5L9 9H5C3.9 9 3 9.9 3 11Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M21 10V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const DraftIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 20H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M16.5 3.5C17.33 2.67 18.67 2.67 19.5 3.5C20.33 4.33 20.33 5.67 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const EncryptedIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7C7 4.2 9.2 2 12 2C14.8 2 17 4.2 17 7V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="16" r="1.5" fill={color} />
  </Svg>
);

export const P2PIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const RelayIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="3" stroke={color} strokeWidth={2} />
    <Circle cx="5" cy="19" r="3" stroke={color} strokeWidth={2} />
    <Circle cx="19" cy="19" r="3" stroke={color} strokeWidth={2} />
    <Path d="M12 8V11M12 11L7 16M12 11L17 16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const BoxIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="3" width="20" height="5" rx="1" stroke={color} strokeWidth={2} />
    <Path d="M4 8V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V8" stroke={color} strokeWidth={2} />
    <Path d="M10 12H14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const BotIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="8" width="18" height="12" rx="2" stroke={color} strokeWidth={2} />
    <Circle cx="9" cy="14" r="1.5" fill={color} />
    <Circle cx="15" cy="14" r="1.5" fill={color} />
    <Path d="M12 2V5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="2" r="1" fill={color} />
  </Svg>
);

export const BroomIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L12 8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M8 8H16L18 22H6L8 8Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M9 12V18M12 12V18M15 12V18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const BlockIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke={color} strokeWidth={2} />
  </Svg>
);

export const UnpinIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 17L12 22" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M5 12H19L17 7H7L5 12Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M7 7V4C7 2.9 7.9 2 9 2H15C16.1 2 17 2.9 17 4V7" stroke={color} strokeWidth={2} />
    <Line x1="3" y1="3" x2="21" y2="21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SettingsGearIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    <Path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const ArrowLeftIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ArrowRightIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CopyClipboardIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke={color} strokeWidth={2} />
  </Svg>
);

export const ShareExternalIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M16 6L12 2L8 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 2V15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const PublicIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M2 12H22" stroke={color} strokeWidth={2} />
    <Path d="M12 2C14.5 4.7 16 8.2 16 12C16 15.8 14.5 19.3 12 22C9.5 19.3 8 15.8 8 12C8 8.2 9.5 4.7 12 2Z" stroke={color} strokeWidth={2} />
  </Svg>
);

export const VoiceChatIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" fill={color} />
    <Path d="M12 5V7M12 17V19M5 12H7M17 12H19" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const TimerIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={2} />
    <Path d="M12 9V13L15 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M9 2H15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const BookmarkIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 21L12 16L5 21V5C5 4.4 5.4 4 6 4H18C18.6 4 19 4.4 19 5V21Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

export const ChartIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 20V10M12 20V4M6 20V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SlowModeIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M12 6V12L16 14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SilentIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8C18 6.4 17.4 4.9 16.2 3.8C15.1 2.6 13.6 2 12 2C10.4 2 8.9 2.6 7.8 3.8C6.6 4.9 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.7 21C13.5 21.3 13.3 21.6 12.9 21.8C12.6 21.9 12.3 22 12 22C11.7 22 11.4 21.9 11.1 21.8C10.7 21.6 10.5 21.3 10.3 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="3" x2="21" y2="21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);


export const HeartIcon = ({ size = 24, color = 'currentColor', filled = false }: IconProps & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path d="M20.84 4.61C20.33 4.1 19.72 3.7 19.05 3.44C18.38 3.18 17.67 3.04 16.95 3.04C16.23 3.04 15.52 3.18 14.85 3.44C14.18 3.7 13.57 4.1 13.06 4.61L12 5.67L10.94 4.61C9.9 3.57 8.5 2.99 7.05 2.99C5.6 2.99 4.2 3.57 3.16 4.61C2.12 5.65 1.54 7.05 1.54 8.5C1.54 9.95 2.12 11.35 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.35 11.88 21.75 11.27 22.01 10.6C22.27 9.93 22.41 9.22 22.41 8.5C22.41 7.78 22.27 7.07 22.01 6.4C21.75 5.73 21.35 5.12 20.84 4.61Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
