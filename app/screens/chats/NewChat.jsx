import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { GlassContainer } from '../../components/GlassComponents';
import AnimatedBackground from '../../components/AnimatedBackground';
import { 
  wp, 
  hp, 
  fontSize, 
  spacing, 
  moderateScale,
} from '../../utils/responsive';
import { borderRadius } from '../../theme/designTokens';
import useLayout from '../../hooks/useLayout';

const NewChat = ({ navigation }) => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { contentStyle } = useLayout();

  const options = [
    {
      id: 'search',
      icon: 'search',
      title: t('chats.searchUsers'),
      subtitle: t('chats.startConversation'),
      color: '#10B981',
      onPress: () => navigation.navigate('UserSearch'),
    },
    {
      id: 'group',
      icon: 'people',
      title: t('chats.createGroup'),
      subtitle: t('chats.groupChat'),
      color: '#F59E0B',
      onPress: () => navigation.navigate('CreateGroup'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />
      
      <LinearGradient
        colors={isDarkMode 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#f0f4ff', '#d8e7ff', '#c0deff']
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        
        <AnimatedBackground particleCount={15} />
        
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Ionicons 
                name="arrow-back" 
                size={moderateScale(24)} 
                color={theme.text} 
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSize(20) }]}>
              {t('chats.newChat')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.content}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.7}
                onPress={option.onPress}>
                <GlassContainer 
                  borderRadius={borderRadius.lg}
                  style={styles.optionCard}>
                  <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
                    <Ionicons 
                      name={option.icon} 
                      size={moderateScale(28)} 
                      color={option.color} 
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: theme.text, fontSize: fontSize(16) }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.textSecondary, fontSize: fontSize(13) }]}>
                      {option.subtitle}
                    </Text>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={moderateScale(20)} 
                    color={theme.textSecondary} 
                  />
                </GlassContainer>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  placeholder: {
    width: moderateScale(40),
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  optionSubtitle: {
    fontWeight: '400',
  },
});

export default NewChat;
