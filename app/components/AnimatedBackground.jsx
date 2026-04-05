import React, { useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { useAppSettingsSafe } from '../context/AppSettingsContext';

const { width, height } = Dimensions.get('window');

const AnimatedBackground = ({ particleCount = 35 }) => {
  const context = useAppSettingsSafe();
  const isDarkMode = context?.isDarkMode || false;
  const reduceMotion = context?.reduceMotion || false;
  const motionProfile = context?.motionProfile;
  const compactMode = context?.compactMode;
  
  // Keep enough particles for the effect while reducing visual noise by ~30%
  const baseCount = compactMode ? 21 : 42;
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
      // Start them all cleanly above the screen so they fall down continuously in their native loops
      const startY = -60 - Math.random() * 100;
      return {
        translateX: new Animated.Value(startX),
        translateY: new Animated.Value(startY),
        opacity: new Animated.Value(Math.random() * 0.22 + 0.12),
        size: Math.random() * 3 + 2, 
      };
    })
  );

  useEffect(() => {
    let timeoutIds = [];

    const animations = particles.map((particle) => {
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

      const moveYAnimation = Animated.loop(
        Animated.timing(particle.translateY, {
          toValue: height + 100,
          duration: duration,
          useNativeDriver: true,
          easing: Easing.linear
        })
      );

      const opacityAnimation = reduceMotion
        ? null
        : Animated.loop(
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.16 + 0.3,
                duration: 3000 + Math.random() * 2000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.08 + 0.06,
                duration: 3000 + Math.random() * 2000,
                useNativeDriver: true,
              }),
            ])
          );

      // Random start delay so particles don't all drop at once on load
      const initialDelay = Math.random() * duration;
      
      const timeoutId = setTimeout(() => {
        moveAnimation.start();
        moveYAnimation.start();
        if (opacityAnimation) {
          opacityAnimation.start();
        }
      }, initialDelay);
      
      timeoutIds.push(timeoutId);

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
              opacity: reduceMotion ? 0.14 : particle.opacity,
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.5)',
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
    shadowOpacity: 0.45,
    shadowRadius: 3,
  },
});

export default AnimatedBackground;
