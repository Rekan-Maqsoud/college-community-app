import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import SearchBar from '../app/components/SearchBar';
import { searchUsers } from '../database/users';
import { searchPosts } from '../database/posts';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View {...props} />;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data = [], renderItem }) => {
    const React = require('react');
    const { View } = require('react-native');
    return (
      <View>
        {data.map((item, index) => (
          <View key={`${item.type || 'item'}-${index}`}>
            {renderItem({ item, index })}
          </View>
        ))}
      </View>
    );
  },
}));

jest.mock('../app/context/AppSettingsContext', () => ({
  useAppSettings: () => ({
    t: (key) => ({
      'search.all': 'All',
      'search.people': 'People',
      'search.posts': 'Posts',
      'search.hashtags': 'Tags',
      'search.placeholder': 'Search',
      'search.searching': 'Searching',
      'search.noResults': 'No results',
      'search.users': 'Users',
      'search.taggedPosts': 'Tagged Posts',
    }[key] || key),
    theme: {
      primary: '#0057FF',
      text: '#111111',
      textSecondary: '#666666',
      border: '#DDDDDD',
    },
    isDarkMode: false,
    reduceMotion: true,
  }),
}));

jest.mock('../app/context/UserContext', () => ({
  useUser: () => ({
    user: {
      $id: 'user-1',
      department: 'cs',
      major: 'engineering',
    },
  }),
}));

jest.mock('../app/components/GlassComponents', () => ({
  GlassContainer: ({ children }) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  GlassInput: ({ children }) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  GlassIconButton: ({ children, onPress }) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
}));

jest.mock('../app/components/UserCard', () => () => {
  const React = require('react');
  const { View } = require('react-native');
  return <View />;
});

jest.mock('../app/components/PostCard', () => () => {
  const React = require('react');
  const { View } = require('react-native');
  return <View />;
});

jest.mock('../database/users', () => ({
  searchUsers: jest.fn().mockResolvedValue([]),
}));

jest.mock('../database/posts', () => ({
  searchPosts: jest.fn().mockResolvedValue([]),
  enrichPostsWithUserData: jest.fn((posts) => posts),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('clears a pending search timeout when the query is cleared', () => {
    let tree;

    act(() => {
      tree = renderer.create(<SearchBar />);
    });

    const openButton = tree.root.findAll((node) => typeof node.props?.onPress === 'function')[0];

    act(() => {
      openButton.props.onPress();
    });

    const searchInput = tree.root.findByType(TextInput);

    act(() => {
      searchInput.props.onChangeText('algorithms');
    });

    expect(tree.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);

    const clearButton = tree.root.findAll((node) => (
      node.type === TouchableOpacity
      && node.findAll((child) => child.props?.name === 'close-circle').length > 0
    ))[0];

    act(() => {
      clearButton.props.onPress();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(searchUsers).not.toHaveBeenCalled();
    expect(searchPosts).not.toHaveBeenCalled();
    expect(tree.root.findAllByType(ActivityIndicator).length).toBe(0);

    act(() => {
      tree.unmount();
    });
  });
});