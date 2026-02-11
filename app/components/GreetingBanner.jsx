import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import safeStorage from '../utils/safeStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';
import { useUser } from '../context/UserContext';
import { wp, hp, normalize, moderateScale, spacing } from '../utils/responsive';
import { borderRadius } from '../theme/designTokens';

const LAST_GREETING_KEY = '@last_greeting_index';
const LAST_GREETING_DATE_KEY = '@last_greeting_date';

const GreetingBanner = () => {
  const { t, theme, isDarkMode } = useAppSettings();
  const { user } = useUser();
  const [greeting, setGreeting] = useState({ text: '', icon: 'sunny-outline' });
  
  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get time-based context
  const getTimeContext = useCallback(() => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 5 || day === 6; // Friday, Saturday, Sunday
    
    if (hour >= 5 && hour < 12) return { period: 'morning', isWeekend };
    if (hour >= 12 && hour < 17) return { period: 'afternoon', isWeekend };
    if (hour >= 17 && hour < 21) return { period: 'evening', isWeekend };
    return { period: 'night', isWeekend };
  }, []);

  // Get greeting icon based on context
  const getGreetingIcon = useCallback((period, greetingType) => {
    const icons = {
      morning: ['sunny-outline', 'cafe-outline', 'flower-outline', 'alarm-outline', 'sparkles-outline', 'heart-outline'],
      afternoon: ['partly-sunny-outline', 'book-outline', 'bulb-outline', 'flash-outline', 'trending-up-outline', 'fitness-outline'],
      evening: ['moon-outline', 'star-outline', 'home-outline', 'cloudy-night-outline', 'wine-outline', 'heart-outline'],
      night: ['moon-outline', 'star-outline', 'bed-outline', 'cloudy-night-outline', 'sparkles-outline', 'planet-outline'],
      weekend: ['game-controller-outline', 'musical-notes-outline', 'heart-outline', 'pizza-outline', 'airplane-outline', 'sunny-outline', 'film-outline'],
      motivation: ['rocket-outline', 'trophy-outline', 'flame-outline', 'sparkles-outline', 'diamond-outline', 'medal-outline', 'ribbon-outline', 'flash-outline', 'trending-up-outline', 'star-outline'],
      welcome: ['hand-right-outline', 'happy-outline', 'sparkles-outline', 'heart-outline', 'thumbs-up-outline', 'people-outline'],
      study: ['school-outline', 'book-outline', 'library-outline', 'bulb-outline', 'glasses-outline', 'laptop-outline', 'pencil-outline', 'document-text-outline'],
    };

    const categoryIcons = icons[greetingType] || icons[period] || icons.motivation;
    return categoryIcons[Math.floor(Math.random() * categoryIcons.length)];
  }, []);

  // Get random greeting that's different from the last one
  const getRandomGreeting = useCallback(async () => {
    const { period, isWeekend } = getTimeContext();
    const firstName = user?.name?.split(' ')[0] || '';
    
    // Build greeting categories based on context
    const greetings = [];
    
    // Time-based greetings - Morning
    if (period === 'morning') {
      greetings.push(
        { key: 'greetings.morning.riseAndShine', type: 'morning' },
        { key: 'greetings.morning.freshStart', type: 'morning' },
        { key: 'greetings.morning.newDay', type: 'morning' },
        { key: 'greetings.morning.morningVibes', type: 'morning' },
        { key: 'greetings.morning.earlyBird', type: 'morning' },
        { key: 'greetings.morning.sunnyDay', type: 'morning' },
        { key: 'greetings.morning.coffeTime', type: 'morning' },
        { key: 'greetings.morning.readyToLearn', type: 'morning' },
        { key: 'greetings.morning.morningMagic', type: 'morning' },
        { key: 'greetings.morning.seizeTheDay', type: 'morning' },
        { key: 'greetings.morning.topOfTheMorning', type: 'morning' },
        { key: 'greetings.morning.beautifulMorning', type: 'morning' },
        { key: 'greetings.morning.morningEnergy', type: 'morning' },
        { key: 'greetings.morning.newBeginning', type: 'morning' },
        { key: 'greetings.morning.morningMotivation', type: 'morning' },
        { key: 'greetings.morning.sunriseHustle', type: 'morning' },
        { key: 'greetings.morning.morningBlessing', type: 'morning' },
        { key: 'greetings.morning.wakeUpWin', type: 'morning' },
        { key: 'greetings.morning.morningMindset', type: 'morning' },
        { key: 'greetings.morning.greetTheDay', type: 'morning' },
        { key: 'greetings.morning.dawnOfSuccess', type: 'morning' },
        { key: 'greetings.morning.morningPower', type: 'morning' },
        { key: 'greetings.morning.brightAndEarly', type: 'morning' },
        { key: 'greetings.morning.morningGlory', type: 'morning' },
      );
    } else if (period === 'afternoon') {
      greetings.push(
        { key: 'greetings.afternoon.keepGoing', type: 'afternoon' },
        { key: 'greetings.afternoon.halfwayThere', type: 'afternoon' },
        { key: 'greetings.afternoon.stayFocused', type: 'afternoon' },
        { key: 'greetings.afternoon.youreDoingGreat', type: 'afternoon' },
        { key: 'greetings.afternoon.lunchBreak', type: 'afternoon' },
        { key: 'greetings.afternoon.powerThrough', type: 'afternoon' },
        { key: 'greetings.afternoon.productiveDay', type: 'afternoon' },
        { key: 'greetings.afternoon.afternoonBoost', type: 'afternoon' },
        { key: 'greetings.afternoon.crushingIt', type: 'afternoon' },
        { key: 'greetings.afternoon.keepClimbing', type: 'afternoon' },
        { key: 'greetings.afternoon.afternoonVibes', type: 'afternoon' },
        { key: 'greetings.afternoon.stayStrong', type: 'afternoon' },
        { key: 'greetings.afternoon.midDayMagic', type: 'afternoon' },
        { key: 'greetings.afternoon.unstoppable', type: 'afternoon' },
        { key: 'greetings.afternoon.afternoonHustle', type: 'afternoon' },
        { key: 'greetings.afternoon.onFire', type: 'afternoon' },
        { key: 'greetings.afternoon.progressNotPerfection', type: 'afternoon' },
        { key: 'greetings.afternoon.keepShining', type: 'afternoon' },
        { key: 'greetings.afternoon.momentumBuilder', type: 'afternoon' },
        { key: 'greetings.afternoon.afternoonWarrior', type: 'afternoon' },
        { key: 'greetings.afternoon.neverSettle', type: 'afternoon' },
        { key: 'greetings.afternoon.peakPerformance', type: 'afternoon' },
        { key: 'greetings.afternoon.winningAttitude', type: 'afternoon' },
        { key: 'greetings.afternoon.afternoonAchiever', type: 'afternoon' },
      );
    } else if (period === 'evening') {
      greetings.push(
        { key: 'greetings.evening.windingDown', type: 'evening' },
        { key: 'greetings.evening.greatDay', type: 'evening' },
        { key: 'greetings.evening.eveningReflection', type: 'evening' },
        { key: 'greetings.evening.almostDone', type: 'evening' },
        { key: 'greetings.evening.relaxTime', type: 'evening' },
        { key: 'greetings.evening.sunsetVibes', type: 'evening' },
        { key: 'greetings.evening.eveningPeace', type: 'evening' },
        { key: 'greetings.evening.goldenHour', type: 'evening' },
        { key: 'greetings.evening.eveningGlow', type: 'evening' },
        { key: 'greetings.evening.dayWellSpent', type: 'evening' },
        { key: 'greetings.evening.eveningCalm', type: 'evening' },
        { key: 'greetings.evening.twilightTime', type: 'evening' },
        { key: 'greetings.evening.eveningReward', type: 'evening' },
        { key: 'greetings.evening.peacefulEvening', type: 'evening' },
        { key: 'greetings.evening.reflectAndRest', type: 'evening' },
        { key: 'greetings.evening.eveningBliss', type: 'evening' },
        { key: 'greetings.evening.sunsetDreams', type: 'evening' },
        { key: 'greetings.evening.dayDone', type: 'evening' },
        { key: 'greetings.evening.eveningGratitude', type: 'evening' },
        { key: 'greetings.evening.restWell', type: 'evening' },
        { key: 'greetings.evening.eveningSerenity', type: 'evening' },
        { key: 'greetings.evening.closeTheDay', type: 'evening' },
      );
    } else {
      greetings.push(
        { key: 'greetings.night.lateNightOwl', type: 'night' },
        { key: 'greetings.night.burnMidnight', type: 'night' },
        { key: 'greetings.night.quietHours', type: 'night' },
        { key: 'greetings.night.starryNight', type: 'night' },
        { key: 'greetings.night.nightStudy', type: 'night' },
        { key: 'greetings.night.moonlitMind', type: 'night' },
        { key: 'greetings.night.nightHustle', type: 'night' },
        { key: 'greetings.night.silentProgress', type: 'night' },
        { key: 'greetings.night.nightDreamer', type: 'night' },
        { key: 'greetings.night.midnightMagic', type: 'night' },
        { key: 'greetings.night.nightVibes', type: 'night' },
        { key: 'greetings.night.afterHours', type: 'night' },
        { key: 'greetings.night.nightShift', type: 'night' },
        { key: 'greetings.night.stargazer', type: 'night' },
        { key: 'greetings.night.peacefulNight', type: 'night' },
        { key: 'greetings.night.nightWarrior', type: 'night' },
        { key: 'greetings.night.lateNightGenius', type: 'night' },
        { key: 'greetings.night.nightInspiration', type: 'night' },
        { key: 'greetings.night.dreamChaser', type: 'night' },
        { key: 'greetings.night.nightlyDedication', type: 'night' },
      );
    }

    // Weekend greetings
    if (isWeekend) {
      greetings.push(
        { key: 'greetings.weekend.weekendMode', type: 'weekend' },
        { key: 'greetings.weekend.enjoyWeekend', type: 'weekend' },
        { key: 'greetings.weekend.relaxAndRecharge', type: 'weekend' },
        { key: 'greetings.weekend.weekendVibes', type: 'weekend' },
        { key: 'greetings.weekend.takeItEasy', type: 'weekend' },
        { key: 'greetings.weekend.weekendWarrior', type: 'weekend' },
        { key: 'greetings.weekend.funTimes', type: 'weekend' },
        { key: 'greetings.weekend.weekendBliss', type: 'weekend' },
        { key: 'greetings.weekend.chillMode', type: 'weekend' },
        { key: 'greetings.weekend.weekendJoy', type: 'weekend' },
        { key: 'greetings.weekend.restAndPlay', type: 'weekend' },
        { key: 'greetings.weekend.weekendAdventure', type: 'weekend' },
        { key: 'greetings.weekend.lazyWeekend', type: 'weekend' },
        { key: 'greetings.weekend.weekendMagic', type: 'weekend' },
        { key: 'greetings.weekend.timeToUnwind', type: 'weekend' },
        { key: 'greetings.weekend.weekendFreedom', type: 'weekend' },
        { key: 'greetings.weekend.noAlarms', type: 'weekend' },
        { key: 'greetings.weekend.weekendDreams', type: 'weekend' },
        { key: 'greetings.weekend.selfCareWeekend', type: 'weekend' },
        { key: 'greetings.weekend.weekendEscape', type: 'weekend' },
      );
    }

    // Motivational greetings (always included)
    greetings.push(
      { key: 'greetings.motivation.believeInYou', type: 'motivation' },
      { key: 'greetings.motivation.youGotThis', type: 'motivation' },
      { key: 'greetings.motivation.dreamBig', type: 'motivation' },
      { key: 'greetings.motivation.makeItCount', type: 'motivation' },
      { key: 'greetings.motivation.stayAwesome', type: 'motivation' },
      { key: 'greetings.motivation.neverGiveUp', type: 'motivation' },
      { key: 'greetings.motivation.chaseGoals', type: 'motivation' },
      { key: 'greetings.motivation.sparkleOn', type: 'motivation' },
      { key: 'greetings.motivation.beTheBest', type: 'motivation' },
      { key: 'greetings.motivation.successAwaits', type: 'motivation' },
      { key: 'greetings.motivation.youAreMagic', type: 'motivation' },
      { key: 'greetings.motivation.limitless', type: 'motivation' },
      { key: 'greetings.motivation.bornToSucceed', type: 'motivation' },
      { key: 'greetings.motivation.unstoppableForce', type: 'motivation' },
      { key: 'greetings.motivation.believeInMagic', type: 'motivation' },
      { key: 'greetings.motivation.skyIsTheLimit', type: 'motivation' },
      { key: 'greetings.motivation.makeItHappen', type: 'motivation' },
      { key: 'greetings.motivation.yourTimeIsNow', type: 'motivation' },
      { key: 'greetings.motivation.stayHungry', type: 'motivation' },
      { key: 'greetings.motivation.writeYourStory', type: 'motivation' },
      { key: 'greetings.motivation.embraceTheJourney', type: 'motivation' },
      { key: 'greetings.motivation.ownYourDay', type: 'motivation' },
      { key: 'greetings.motivation.beyondLimits', type: 'motivation' },
      { key: 'greetings.motivation.fearless', type: 'motivation' },
      { key: 'greetings.motivation.destinyAwaits', type: 'motivation' },
      { key: 'greetings.motivation.riseAbove', type: 'motivation' },
      { key: 'greetings.motivation.extraordinaryYou', type: 'motivation' },
      { key: 'greetings.motivation.winnerMindset', type: 'motivation' },
      { key: 'greetings.motivation.unstoppableSpirit', type: 'motivation' },
      { key: 'greetings.motivation.powerWithin', type: 'motivation' },
      { key: 'greetings.motivation.champInMaking', type: 'motivation' },
      { key: 'greetings.motivation.starQuality', type: 'motivation' },
      { key: 'greetings.motivation.goGetIt', type: 'motivation' },
      { key: 'greetings.motivation.amazingThingsAhead', type: 'motivation' },
      { key: 'greetings.motivation.believeAndAchieve', type: 'motivation' },
      { key: 'greetings.motivation.youMatter', type: 'motivation' },
      { key: 'greetings.motivation.keepPushing', type: 'motivation' },
      { key: 'greetings.motivation.greatnessInYou', type: 'motivation' },
      { key: 'greetings.motivation.shineOn', type: 'motivation' },
      { key: 'greetings.motivation.todayIsYours', type: 'motivation' },
      { key: 'greetings.motivation.makeWaves', type: 'motivation' },
      { key: 'greetings.motivation.inspireOthers', type: 'motivation' },
      { key: 'greetings.motivation.beTheChange', type: 'motivation' },
      { key: 'greetings.motivation.conquorTheWorld', type: 'motivation' },
      { key: 'greetings.motivation.youRock', type: 'motivation' },
      { key: 'greetings.motivation.legendInMaking', type: 'motivation' },
    );

    // Welcome greetings
    greetings.push(
      { key: 'greetings.welcome.welcomeBack', type: 'welcome' },
      { key: 'greetings.welcome.gladYoureHere', type: 'welcome' },
      { key: 'greetings.welcome.niceToSeeYou', type: 'welcome' },
      { key: 'greetings.welcome.heyThere', type: 'welcome' },
      { key: 'greetings.welcome.greatToHaveYou', type: 'welcome' },
      { key: 'greetings.welcome.missedYou', type: 'welcome' },
      { key: 'greetings.welcome.helloAgain', type: 'welcome' },
      { key: 'greetings.welcome.welcomeHome', type: 'welcome' },
      { key: 'greetings.welcome.backInAction', type: 'welcome' },
      { key: 'greetings.welcome.goodToSeeYou', type: 'welcome' },
      { key: 'greetings.welcome.heyChampion', type: 'welcome' },
      { key: 'greetings.welcome.welcomeAboard', type: 'welcome' },
      { key: 'greetings.welcome.helloBeautiful', type: 'welcome' },
      { key: 'greetings.welcome.youreBack', type: 'welcome' },
      { key: 'greetings.welcome.heySuperstar', type: 'welcome' },
      { key: 'greetings.welcome.lookWhoIsHere', type: 'welcome' },
      { key: 'greetings.welcome.alwaysWelcome', type: 'welcome' },
      { key: 'greetings.welcome.helloFriend', type: 'welcome' },
      { key: 'greetings.welcome.gladToSeeYou', type: 'welcome' },
      { key: 'greetings.welcome.welcomeChamp', type: 'welcome' },
    );

    // Study greetings
    greetings.push(
      { key: 'greetings.study.readyToLearn', type: 'study' },
      { key: 'greetings.study.knowledgeAwaits', type: 'study' },
      { key: 'greetings.study.letsStudy', type: 'study' },
      { key: 'greetings.study.brainTime', type: 'study' },
      { key: 'greetings.study.learnSomethingNew', type: 'study' },
      { key: 'greetings.study.curiousMind', type: 'study' },
      { key: 'greetings.study.studyMode', type: 'study' },
      { key: 'greetings.study.feedYourMind', type: 'study' },
      { key: 'greetings.study.growWiser', type: 'study' },
      { key: 'greetings.study.learnAndGrow', type: 'study' },
      { key: 'greetings.study.mindExpansion', type: 'study' },
      { key: 'greetings.study.academicExcellence', type: 'study' },
      { key: 'greetings.study.smarterToday', type: 'study' },
      { key: 'greetings.study.bookwormMode', type: 'study' },
      { key: 'greetings.study.knowledgeIsPower', type: 'study' },
      { key: 'greetings.study.scholarMindset', type: 'study' },
      { key: 'greetings.study.questForKnowledge', type: 'study' },
      { key: 'greetings.study.learningJourney', type: 'study' },
      { key: 'greetings.study.brainGains', type: 'study' },
      { key: 'greetings.study.wisdomSeeker', type: 'study' },
      { key: 'greetings.study.educationRocks', type: 'study' },
      { key: 'greetings.study.intelligenceLoading', type: 'study' },
      { key: 'greetings.study.studyHard', type: 'study' },
      { key: 'greetings.study.masterInMaking', type: 'study' },
    );

    // Fun greetings (always included)
    greetings.push(
      { key: 'greetings.fun.letsMakeHistory', type: 'motivation' },
      { key: 'greetings.fun.epicDay', type: 'motivation' },
      { key: 'greetings.fun.awesomeness', type: 'motivation' },
      { key: 'greetings.fun.superhero', type: 'motivation' },
      { key: 'greetings.fun.readyToRock', type: 'motivation' },
      { key: 'greetings.fun.bringItOn', type: 'motivation' },
      { key: 'greetings.fun.adventureAwaits', type: 'motivation' },
      { key: 'greetings.fun.gameOn', type: 'motivation' },
      { key: 'greetings.fun.levelUp', type: 'motivation' },
      { key: 'greetings.fun.bossMode', type: 'motivation' },
      { key: 'greetings.fun.nailedIt', type: 'motivation' },
      { key: 'greetings.fun.slayTheDay', type: 'motivation' },
      { key: 'greetings.fun.missionPossible', type: 'motivation' },
      { key: 'greetings.fun.highFive', type: 'welcome' },
      { key: 'greetings.fun.fistBump', type: 'welcome' },
    );

    // Get last used greeting index
    let lastIndex = -1;
    try {
      const stored = await safeStorage.getItem(LAST_GREETING_KEY);
      const storedDate = await safeStorage.getItem(LAST_GREETING_DATE_KEY);
      const today = new Date().toDateString();
      
      if (stored !== null && storedDate === today) {
        lastIndex = parseInt(stored, 10);
      }
    } catch {
      // Ignore storage errors
    }

    // Pick a random greeting different from last one
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * greetings.length);
    } while (newIndex === lastIndex && greetings.length > 1);

    // Save new index
    try {
      await safeStorage.setItem(LAST_GREETING_KEY, newIndex.toString());
      await safeStorage.setItem(LAST_GREETING_DATE_KEY, new Date().toDateString());
    } catch {
      // Ignore storage errors
    }

    const selectedGreeting = greetings[newIndex];
    let greetingText = t(selectedGreeting.key);
    
    // Replace {name} placeholder if present
    if (firstName && greetingText.includes('{name}')) {
      greetingText = greetingText.replace('{name}', firstName);
    } else if (firstName && Math.random() > 0.5) {
      // Sometimes add name at the end
      greetingText = `${greetingText}, ${firstName}!`;
    }

    return {
      text: greetingText,
      icon: getGreetingIcon(period, selectedGreeting.type),
    };
  }, [t, user?.name, getTimeContext, getGreetingIcon]);

  // Initialize greeting on mount
  useEffect(() => {
    const initGreeting = async () => {
      const newGreeting = await getRandomGreeting();
      setGreeting(newGreeting);
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
    };

    initGreeting();
  }, []);

  // Shimmer animation loop
  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [shimmerAnim]);

  // Subtle pulse animation for icon
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Gradient colors based on time and theme
  const getGradientColors = () => {
    const { period } = getTimeContext();
    
    if (isDarkMode) {
      const darkGradients = {
        morning: ['#1a365d', '#2c5282', '#2b6cb0'],
        afternoon: ['#2d3748', '#4a5568', '#553c9a'],
        evening: ['#322659', '#44337a', '#6b46c1'],
        night: ['#1a202c', '#2d3748', '#4a5568'],
      };
      return darkGradients[period];
    }
    
    const lightGradients = {
      morning: ['#ffecd2', '#fcb69f', '#ff9a9e'],
      afternoon: ['#a8edea', '#fed6e3', '#d299c2'],
      evening: ['#e0c3fc', '#8ec5fc', '#a8c0ff'],
      night: ['#667eea', '#764ba2', '#6b8dd6'],
    };
    return lightGradients[period];
  };

  // Shimmer overlay translate
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-wp(100), wp(100)],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.4)',
              },
            ]}
          >
            <Ionicons
              name={greeting.icon}
              size={moderateScale(20)}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </Animated.View>
          
          <Text
            style={[
              styles.greetingText,
              {
                color: isDarkMode ? '#fff' : '#333',
              },
            ]}
            numberOfLines={1}
          >
            {greeting.text}
          </Text>
        </View>

        {/* Decorative elements */}
        <View style={[styles.decorCircle, styles.circle1, { opacity: isDarkMode ? 0.1 : 0.2 }]} />
        <View style={[styles.decorCircle, styles.circle2, { opacity: isDarkMode ? 0.08 : 0.15 }]} />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: wp(4),
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientContainer: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: wp(50),
  },
  shimmerGradient: {
    flex: 1,
    width: wp(50),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  greetingText: {
    flex: 1,
    fontSize: normalize(14),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  circle1: {
    width: moderateScale(60),
    height: moderateScale(60),
    top: -moderateScale(20),
    right: moderateScale(20),
  },
  circle2: {
    width: moderateScale(40),
    height: moderateScale(40),
    bottom: -moderateScale(15),
    right: moderateScale(80),
  },
});

export default GreetingBanner;
