import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface ModeSwitchLoaderProps {
  visible: boolean;
  fromMode: 'user' | 'owner';
  toMode: 'user' | 'owner';
  message?: string;
  onComplete?: () => void;
  duration?: number;
  customColors?: {
    background?: string;
    overlay?: string;
    text?: string;
    accent?: string;
    icon?: string;
  };
  customAnimation?: 'fade' | 'slide' | 'scale' | 'spin';
}

const ModeSwitchLoader: React.FC<ModeSwitchLoaderProps> = ({
  visible,
  fromMode,
  toMode,
  message,
  onComplete,
  duration = 2500,
  customColors = {},
  customAnimation = 'fade',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    background: customColors.background || COLORS.background,
    overlay: customColors.overlay || 'rgba(0, 0, 0, 0.8)',
    text: customColors.text || COLORS.text,
    accent: customColors.accent || COLORS.accent,
    icon: customColors.icon || COLORS.accent,
  };

  const getModeConfig = (mode: 'user' | 'owner') => {
    if (mode === 'owner') {
      return {
        icon: 'business-outline' as const,
        label: 'Owner Mode',
        subtitle: 'Managing your screens',
        color: '#FF6B35',
      };
    } else {
      return {
        icon: 'person-outline' as const,
        label: 'Creator Mode', 
        subtitle: 'Booking advertisements',
        color: '#4ECDC4',
      };
    }
  };

  const fromConfig = getModeConfig(fromMode);
  const toConfig = getModeConfig(toMode);

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      rotateAnim.setValue(0);
      progressAnim.setValue(0);

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: false,
        }),
      ]).start();

      // Auto complete after duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, fadeAnim, scaleAnim, rotateAnim, progressAnim, onComplete]);

  const getAnimationStyle = () => {
    const spin = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    switch (customAnimation) {
      case 'scale':
        return {
          transform: [{ scale: scaleAnim }],
        };
      case 'spin':
        return {
          transform: [{ rotate: spin }],
        };
      case 'slide':
        return {
          transform: [
            { 
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }
          ],
        };
      default: // fade
        return {};
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.overlay, 
            { backgroundColor: colors.overlay },
            { opacity: fadeAnim }
          ]}
        >
          <Animated.View 
            style={[
              styles.content,
              { backgroundColor: colors.background },
              getAnimationStyle()
            ]}
          >
            {/* Mode Transition Icons */}
            <View style={styles.iconContainer}>
              <View style={[styles.modeIcon, { backgroundColor: fromConfig.color + '20' }]}>
                <Ionicons 
                  name={fromConfig.icon} 
                  size={32} 
                  color={fromConfig.color} 
                />
              </View>
              
              <View style={styles.arrowContainer}>
                <Animated.View
                  style={{
                    transform: [{
                      translateX: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 20],
                      })
                    }]
                  }}
                >
                  <Ionicons name="arrow-forward" size={24} color={colors.accent} />
                </Animated.View>
              </View>
              
              <View style={[styles.modeIcon, { backgroundColor: toConfig.color + '20' }]}>
                <Ionicons 
                  name={toConfig.icon} 
                  size={32} 
                  color={toConfig.color} 
                />
              </View>
            </View>

            {/* Loading Text */}
            <Text style={[styles.title, { color: colors.text }]}>
              Switching Mode
            </Text>
            
            <Text style={[styles.fromToText, { color: colors.text }]}>
              {fromConfig.label} → {toConfig.label}
            </Text>

            <Text style={[styles.subtitle, { color: colors.text + '80' }]}>
              {message || toConfig.subtitle}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.accent + '20' }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.accent },
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      })
                    }
                  ]}
                />
              </View>
            </View>

            {/* Loading Dots */}
            <View style={styles.dotsContainer}>
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: colors.accent },
                    {
                      opacity: progressAnim.interpolate({
                        inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                        outputRange: index === 0 ? [0.3, 1, 0.3, 1, 0.3, 1] :
                                   index === 1 ? [0.3, 0.3, 1, 0.3, 1, 0.3] :
                                                [1, 0.3, 0.3, 1, 0.3, 0.3],
                      }),
                      transform: [{
                        scale: progressAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.2, 1],
                        })
                      }]
                    }
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    width: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  fromToText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default ModeSwitchLoader;