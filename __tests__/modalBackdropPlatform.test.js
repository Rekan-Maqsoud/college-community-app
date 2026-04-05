import React from 'react';
import { Text, Platform } from 'react-native';
import renderer, { act } from 'react-test-renderer';

const mockBlurView = jest.fn();

jest.mock('expo-blur', () => {
  const ReactModule = require('react');
  return {
    BlurView: (props) => {
      mockBlurView(props);
      return ReactModule.createElement('blur-view-mock', props, null);
    },
  };
});

const ModalBackdrop = require('../app/components/ModalBackdrop').default;

const runWithPlatform = async (platform, callback) => {
  const originalOsDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
  const originalPlatformOs = Platform.OS;

  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => platform,
  });

  try {
    await callback();
  } finally {
    if (originalOsDescriptor) {
      Object.defineProperty(Platform, 'OS', originalOsDescriptor);
    } else {
      Platform.OS = originalPlatformOs;
    }
  }
};

describe('ModalBackdrop platform blur behavior', () => {
  beforeEach(() => {
    mockBlurView.mockClear();
  });

  it('renders blur when useBlur is true on iOS', async () => {
    await runWithPlatform('ios', async () => {
      await act(async () => {
        renderer.create(
          <ModalBackdrop useBlur onPress={jest.fn()}>
            <Text>modal content</Text>
          </ModalBackdrop>
        );
      });
    });

    expect(mockBlurView).toHaveBeenCalled();
  });

  it('skips blur when useBlur is true on Android', async () => {
    await runWithPlatform('android', async () => {
      await act(async () => {
        renderer.create(
          <ModalBackdrop useBlur onPress={jest.fn()}>
            <Text>modal content</Text>
          </ModalBackdrop>
        );
      });
    });

    expect(mockBlurView).not.toHaveBeenCalled();
  });
});
