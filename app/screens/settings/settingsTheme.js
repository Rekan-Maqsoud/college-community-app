const SETTINGS_SCREEN_ACCENTS = {
  ProfileSettings: ({ theme }) => theme.primary,
  PersonalizationSettings: () => '#FF9500',
  ChatSettings: () => '#AF52DE',
  NotificationSettings: () => '#34C759',
  SuggestionSettings: ({ theme }) => theme.primary,
  BlockList: () => '#8E8E93',
  SavedPosts: () => '#5856D6',
  RepVoting: () => '#F59E0B',
  AccountSettings: () => '#FF3B30',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hexToRgb = (hexColor) => {
  const normalized = String(hexColor || '').replace('#', '');
  if (normalized.length !== 6) {
    return { red: 0, green: 122, blue: 255 };
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return {
    red: clamp(Number.isNaN(red) ? 0 : red, 0, 255),
    green: clamp(Number.isNaN(green) ? 122 : green, 0, 255),
    blue: clamp(Number.isNaN(blue) ? 255 : blue, 0, 255),
  };
};

const toRgba = (hexColor, alpha) => {
  const { red, green, blue } = hexToRgb(hexColor);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const getSettingsAccentColor = (screenName, theme) => {
  const resolver = SETTINGS_SCREEN_ACCENTS[screenName];
  if (!resolver) {
    return theme.primary;
  }

  return resolver({ theme });
};

export const getSettingsHeaderGradient = (screenName, { theme, isDarkMode }) => {
  const accentColor = getSettingsAccentColor(screenName, theme);

  return isDarkMode
    ? [toRgba(accentColor, 0.24), toRgba(accentColor, 0.08), 'transparent']
    : [toRgba(accentColor, 0.2), toRgba(accentColor, 0.04), 'transparent'];
};
