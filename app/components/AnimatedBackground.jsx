import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useAppSettingsSafe } from '../context/AppSettingsContext';

const { width, height } = Dimensions.get('window');

const AnimatedBackground = ({ particleCount = 35 }) => {
  const context = useAppSettingsSafe();
  const isDarkMode = context?.isDarkMode || false;
  const reduceMotion = context?.reduceMotion || false;
  const motionProfile = context?.motionProfile;
  const compactMode = context?.compactMode;
  
  // Use more dots: ~60 for normal, ~30 for compact
  const baseCount = compactMode ? 30 : 60;
  // Override incoming particleCount if it's too small for the snow effect
  const finalCount = particleCount < baseCount ? baseCount : particleCount;
  
  const effectiveParticleCount = reduceMotion
    ? Math.max(8, Math.round(finalCount * 0.35))
    : finalCount;
    
  // Use useState hook initialized once to completely avoid re-creating particles on re-renders 
  // which might be triggering resets when navigation causes AppSettings context to momentarily update.
  const [particles] = React.useState(() =>
    Array.from({ length: effectiveParticleCount }, () => {
      const startX = Math.random() * width;
      // Spread them across the entire height initially so they don't all start at the top
      const startY = Math.random() * (height + 200) - 100;
      return {
        translateX: new Animated.Value(startX),
        translateY: new Animated.Value(startY),
        opacity: new Animated.Value(Math.random() * 0.4 + 0.2),
        // Add random size variation for snow
        size: Math.random() * 3 + 2, 
      };
    })
  );

  useEffect(() => {
    let timeoutIds = [];

    const animations = particles.map((particle, index) => {
      // Much slower, consistent snow fall (e.g., 20s to 45s to cross screen vertically)
      const duration = reduceMotion
        ? 35000 + Math.random() * 15000
        : 20000 + Math.random() * 25000;
        
      const currentStartX = particle.translateX._value;
      // Drift sideways slightly like snow
      const horizontalTravel = (Math.random() > 0.5 ? 1 : -1) * (width * 0.15 + Math.random() * width * 0.2);
      const endX = currentStartX + horizontalTravel;
      
      const moveAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(particle.translateX, {
            toValue: endX,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: currentStartX,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      // Determine where this specific particle is starting right now
      const startY = particle.translateY._value;
      // The distance it needs to travel to reach the bottom
      const distanceToBottom = (height + 100) - startY;
      const totalDistance = height + 160;
      // Calculate how long it should take to just reach the bottom from its current random start position
      const initialDuration = (distanceToBottom / totalDistance) * duration;

      const moveYAnimation = Animated.sequence([
        // First, animate from current random position to bottom
        Animated.timing(particle.translateY, {
          toValue: height + 100,
          duration: initialDuration,
          useNativeDriver: true,
        }),
        // Then loop from top to bottom continuously
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.translateY, {
              toValue: -60,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateY, {
              toValue: height + 100,
              duration: duration,
              useNativeDriver: true,
            }),
          ])
        )
      ]);

      const opacityAnimation = reduceMotion
        ? null
        : Animated.loop(
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.3 + 0.5,
                duration: 3000 + Math.random() * 2000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.2 + 0.1,
                duration: 3000 + Math.random() * 2000,
                useNativeDriver: true,
              }),
            ])
          );

      // Start immediately because they are already distributed across the screen
      moveAnimation.start();
      moveYAnimation.start();
      if (opacityAnimation) {
        opacityAnimation.start();
      }

      return { moveAnimation, moveYAnimation, opacityAnimation };
    });

    return () => {
      timeoutIds.forEach(clearTimeout);
      animations.forEach(({ moveAnimation, moveYAnimation, opacityAnimation }) => {
        moveAnimation.stop();
        moveYAnimation.stop();
        if (opacityAnimation) {
          opacityAnimation.stop();
        }
      });
    };
  }, [motionProfile?.targetFps, particles, reduceMotion]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              transform: [
                { translateX: particle.translateX },
                { translateY: particle.translateY },
              ],
              opacity: reduceMotion ? 0.2 : particle.opacity,
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.8)',
              shadowColor: isDarkMode ? '#fff' : '#ffffff',
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
});

export default AnimatedBackground;
