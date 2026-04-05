import { Platform } from 'react-native';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';

// Hard-disable liquid glass on Android; allow only on supported iOS devices.
export const isLiquidGlassEnabled = Platform.OS === 'ios' && isLiquidGlassSupported;