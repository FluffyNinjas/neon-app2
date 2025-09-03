import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/Colors';

export default function BookingInformation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { screenId, screenTitle } = params;

  const handleGetStarted = () => {
    router.push({
      pathname: '/booking-screen/dates',
      params: { screenId, screenTitle }
    });
  };

  const handleExit = () => {
    // Return to the previous screen (ScreenDetailsModal will be reopened by parent component)
    router.replace('/(users)/home');
  };

  const bookingSteps = [
    {
      icon: 'calendar-outline',
      title: 'Choose Your Dates',
      description: 'Select the dates when you want your advertisement to be displayed on this screen.',
      color: COLORS.accent,
    },
    {
      icon: 'image-outline',
      title: 'Select Advertisement',
      description: 'Upload or choose from your existing content to display during your booking period.',
      color: COLORS.secondary,
    },
    {
      icon: 'card-outline',
      title: 'Payment & Confirmation',
      description: 'Review your booking details and complete the secure payment process.',
      color: COLORS.primary,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Screen</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Screen Info */}
        <View style={styles.screenInfoSection}>
          <Text style={styles.screenTitle}>{screenTitle || 'Screen Booking'}</Text>
          <Text style={styles.subtitle}>Let&apos;s get your advertisement up and running!</Text>
        </View>

        {/* Process Overview */}
        <View style={styles.processSection}>
          <Text style={styles.sectionTitle}>Booking Process</Text>
          <Text style={styles.sectionSubtitle}>
            Follow these simple steps to book your screen advertising space
          </Text>

          {bookingSteps.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIconContainer, { backgroundColor: step.color }]}>
                  <Ionicons name={step.icon as any} size={24} color={COLORS.background} />
                </View>
                <View style={styles.stepInfo}>
                  <View style={styles.stepTitleRow}>
                    <Text style={styles.stepNumber}>Step {index + 1}</Text>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* What You'll Need */}
        <View style={styles.requirementsSection}>
          <Text style={styles.sectionTitle}>What You&apos;ll Need</Text>
          
          <View style={styles.requirementCard}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
            <Text style={styles.requirementText}>
              Your advertisement content (image or video)
            </Text>
          </View>
          
          <View style={styles.requirementCard}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
            <Text style={styles.requirementText}>
              Preferred dates for your campaign
            </Text>
          </View>
          
          <View style={styles.requirementCard}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
            <Text style={styles.requirementText}>
              Payment method for secure checkout
            </Text>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Important Notes</Text>
          
          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.noteText}>
              Your booking request will be reviewed by the screen owner before confirmation.
            </Text>
          </View>
          
          <View style={styles.noteCard}>
            <Ionicons name="time-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.noteText}>
              The booking process typically takes 2-3 minutes to complete.
            </Text>
          </View>
          
          <View style={styles.noteCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.noteText}>
              All payments are secure and processed through Stripe.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Get Started Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.getStartedText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  screenInfoSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
  },
  processSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 20,
  },
  stepCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  requirementsSection: {
    marginBottom: 32,
  },
  requirementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  notesSection: {
    marginBottom: 32,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
});