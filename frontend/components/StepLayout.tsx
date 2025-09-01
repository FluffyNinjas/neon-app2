import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Alert, Animated, Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../constants/Colors';
import { useScreenCreationStore } from '../stores/useScreenCreationStore';
import { useProgressStore } from '../stores/useProgressStore';

export default function StepLayout({
  currentStep,
  totalSteps,
  title,
  children,
  onNext,
  nextButtonDisabled = false,
  nextButtonText = 'Next',
}) {
  const resetCreation = useScreenCreationStore((s) => s.resetStore);
  const { lastRatio, setLastRatio, reset: resetProgress } = useProgressStore();

  const handleClose = () => {
    Alert.alert(
      'Exit Screen Creation',
      'Are you sure you want to exit? All progress will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            resetCreation();
            resetProgress();                 // <-- clear persisted progress
            router.replace('/(owners)/screens');
          },
        },
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  // --- Animated progress (pixel width) with persisted start ---
  const [trackW, setTrackW] = useState(0);
  const progressPx = useRef(new Animated.Value(0)).current;

  const ratio = Math.max(0, Math.min(1, currentStep / totalSteps));

  // Initialize from persisted ratio once we know the width
  const onTrackLayout = (e: any) => {
    const w = e.nativeEvent.layout.width;
    setTrackW(w);
    // Set without animation so we don't "grow from zero" on every mount
    progressPx.setValue(lastRatio * w);
  };

  // Animate to the current step ratio
  useEffect(() => {
    if (!trackW) return;
    Animated.timing(progressPx, {
      toValue: ratio * trackW,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width anim
    }).start(() => {
      // persist the latest ratio so the next screen starts from here
      setLastRatio(ratio);
    });
  }, [ratio, trackW]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.stepInfo}>
          <Text style={styles.stepText}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground} onLayout={onTrackLayout}>
          <Animated.View style={[styles.progressBar, { width: progressPx }]} />
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, nextButtonDisabled && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={nextButtonDisabled}
        >
          <Text
            style={[styles.nextButtonText, nextButtonDisabled && styles.nextButtonTextDisabled]}
          >
            {nextButtonText}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={nextButtonDisabled ? COLORS.muted : COLORS.background}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  closeButton: {
    padding: 8,
  },
  stepInfo: {
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.surface,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  nextButtonTextDisabled: {
    color: COLORS.muted,
  },
});
