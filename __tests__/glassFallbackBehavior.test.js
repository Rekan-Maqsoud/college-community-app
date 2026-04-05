import React from 'react';
import { Text, Platform, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';

const mockBlurView = jest.fn();
const mockLiquidGlassView = jest.fn();

jest.mock('expo-blur', () => {
  const ReactModule = require('react');
  return {
    BlurView: (props) => {
      mockBlurView(props);
      return ReactModule.createElement('blur-view-mock', props, null);
    },
  };
});

jest.mock('../app/components/LiquidGlassViewCompat', () => {
  const ReactModule = require('react');
  return (props) => {
    mockLiquidGlassView(props);
    return ReactModule.createElement('liquid-view-mock', props, props.children);
  };
});

jest.mock('../app/context/AppSettingsContext', () => ({
  useAppSettingsSafe: () => ({ isDarkMode: false, theme: {} }),
}));

jest.mock('../app/utils/glassSupport', () => ({
  isLiquidGlassEnabled: false,
}));

import { GlassContainer } from '../app/components/GlassComponents';

describe('Glass fallback behavior', () => {
  beforeEach(() => {
    mockBlurView.mockClear();
    mockLiquidGlassView.mockClear();
  });

  it('renders BlurView fallback and skips liquid-glass wrapper when disabled', async () => {
    await act(async () => {
      renderer.create(
        <GlassContainer>
          <Text>content</Text>
        </GlassContainer>
      );
    });

    expect(mockBlurView).toHaveBeenCalled();
    expect(mockLiquidGlassView).not.toHaveBeenCalled();
  });

  it('uses stable non-blur fallback on android', async () => {
    const originalOsDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
    const originalPlatformOs = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });

    try {
      await act(async () => {
        renderer.create(
          <GlassContainer>
            <Text>content</Text>
          </GlassContainer>
        );
      });

      expect(mockBlurView).not.toHaveBeenCalled();
      expect(mockLiquidGlassView).not.toHaveBeenCalled();
    } finally {
      if (originalOsDescriptor) {
        Object.defineProperty(Platform, 'OS', originalOsDescriptor);
      } else {
        Platform.OS = originalPlatformOs;
      }
    }
  });

  it('applies padding prop on the container style', async () => {
    let testRenderer;

    await act(async () => {
      testRenderer = renderer.create(
        <GlassContainer padding={22}>
          <Text>content</Text>
        </GlassContainer>
      );
    });

    const tree = testRenderer.toJSON();
    expect(tree).toBeTruthy();
    const flattenedStyle = StyleSheet.flatten(tree.props.style);
    expect(flattenedStyle.padding).toBe(22);
  });
});
