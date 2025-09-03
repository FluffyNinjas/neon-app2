import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { useBookingStore } from '../../stores/bookingStore';
import { ContentService } from '../../services/contentService';
import { BookingService } from '../../services/bookingService';
import { ContentDoc } from '../../shared/models/firestore';

export default function BookingConfirmation() {
  const router = useRouter();
  const [selectedContent, setSelectedContent] = useState<ContentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  
  const { 
    screen, 
    selectedDates, 
    totalAmount, 
    selectedContentId, 
    specialInstructions,
    clearBooking 
  } = useBookingStore();
  
  const loadSelectedContent = useCallback(async () => {
    if (!selectedContentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userContent = await ContentService.getCurrentUserContent();
      const content = userContent.find(c => c.id === selectedContentId);
      setSelectedContent(content || null);
    } catch (error) {
      console.error('Error loading selected content:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedContentId]);

  useEffect(() => {
    loadSelectedContent();
  }, [loadSelectedContent]);

  // If no screen data available, redirect to information page
  if (!screen) {
    router.replace('/booking-screen' as any);
    return null;
  }

  const handleExit = () => {
    Alert.alert(
      'Exit Booking',
      'Are you sure you want to exit? Your progress will not be saved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            clearBooking();
            router.replace('/(users)/home');
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleGoBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    // Add T00:00:00 to treat as local date and avoid timezone offset issues
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = () => {
    if (selectedDates.length === 0) return 'No dates selected';
    if (selectedDates.length === 1) return formatDate(selectedDates[0]);
    
    const sortedDates = [...selectedDates].sort();
    return `${formatDate(sortedDates[0])} - ${formatDate(sortedDates[sortedDates.length - 1])}`;
  };

  const handleConfirmBooking = async () => {
    if (!screen || selectedDates.length === 0) {
      Alert.alert('Error', 'Missing required booking information');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      'This will create a booking request. You will be charged once the owner accepts your request.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: () => processBooking(),
        },
      ]
    );
  };

  const processBooking = async () => {
    setBookingInProgress(true);
    try {
      await BookingService.createBooking({
        screenId: screen.id,
        ownerId: screen.ownerId,
        dates: selectedDates,
        amountTotal: totalAmount,
        contentId: selectedContentId || undefined,
        specialInstructions: specialInstructions || undefined,
      });

      Alert.alert(
        'Booking Request Sent!',
        'Your booking request has been submitted. You will receive a notification once the owner responds.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearBooking();
              router.replace('/(users)/home');
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      console.error('Error creating booking:', err);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Confirmation</Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Screen Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Details</Text>
          <View style={styles.screenCard}>
            {screen.photos.length > 0 && (
              <Image 
                source={{ uri: screen.photos[0] }} 
                style={styles.screenImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.screenInfo}>
              <Text style={styles.screenTitle}>{screen.title}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.muted} />
                <Text style={styles.screenLocation}>{screen.address}</Text>
              </View>
              <View style={styles.screenMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Type:</Text>
                  <Text style={styles.metaValue}>{screen.screenType}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Size:</Text>
                  <Text style={styles.metaValue}>{screen.screenSize}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dates</Text>
              <Text style={styles.detailValue}>{formatDateRange()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Daily Rate</Text>
              <Text style={styles.detailValue}>${(screen.dayPrice / 100).toFixed(0)}</Text>
            </View>
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>${(totalAmount / 100).toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Selected Content */}
        {selectedContentId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Advertisement Content</Text>
            <View style={styles.contentCard}>
              {loading ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator color={COLORS.accent} />
                  <Text style={styles.loadingText}>Loading content...</Text>
                </View>
              ) : selectedContent ? (
                <>
                  <Image 
                    source={{ uri: selectedContent.fileUrl }} 
                    style={styles.contentPreview}
                    resizeMode="cover"
                  />
                  <View style={styles.contentInfo}>
                    <Text style={styles.contentTitle}>{selectedContent.title}</Text>
                    <View style={styles.contentMeta}>
                      <View style={styles.contentTypeTag}>
                        <Ionicons 
                          name={selectedContent.type === 'image' ? 'image' : 'videocam'} 
                          size={12} 
                          color={COLORS.background} 
                        />
                        <Text style={styles.contentTypeText}>{selectedContent.type}</Text>
                      </View>
                      {selectedContent.dimensions && (
                        <Text style={styles.contentDimensions}>
                          {selectedContent.dimensions.width}×{selectedContent.dimensions.height}
                        </Text>
                      )}
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.noContentText}>Content not found</Text>
              )}
            </View>
          </View>
        )}

        {/* Special Instructions */}
        {specialInstructions && specialInstructions.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsText}>{specialInstructions}</Text>
            </View>
          </View>
        )}

        {/* Payment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Ionicons name="card-outline" size={20} color={COLORS.muted} />
              <Text style={styles.paymentText}>Payment will be processed via Stripe</Text>
            </View>
            <Text style={styles.paymentNote}>
              You will be charged ${(totalAmount / 100).toFixed(0)} once the screen owner accepts your booking request.
            </Text>
          </View>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancellation Policy</Text>
          <View style={styles.policyCard}>
            <View style={styles.policyRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.policyText}>Free cancellation anytime before your session goes live</Text>
            </View>
            <View style={styles.policyRow}>
              <Ionicons name="information-circle" size={20} color={COLORS.accent} />
              <Text style={styles.policyText}>Full refund if cancelled before session start</Text>
            </View>
            <View style={styles.policyRow}>
              <Ionicons name="time" size={20} color={COLORS.muted} />
              <Text style={styles.policyText}>Sessions typically go live at 12:00 AM on your selected dates</Text>
            </View>
            <Text style={styles.policyNote}>
              You can cancel your booking from your bookings page at any time before the session begins.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.confirmButton, bookingInProgress && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={bookingInProgress}
        >
          {bookingInProgress ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.confirmText}>Confirm Booking - ${(totalAmount / 100).toFixed(0)}</Text>
          )}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  
  // Sections
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  
  // Screen Card
  screenCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  screenImage: {
    width: '100%',
    height: 160,
  },
  screenInfo: {
    padding: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  screenLocation: {
    fontSize: 14,
    color: COLORS.muted,
    flex: 1,
  },
  screenMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Details Card
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.accent,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent,
  },
  
  // Content Card
  contentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadingContent: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  contentPreview: {
    width: '100%',
    height: 120,
  },
  contentInfo: {
    padding: 16,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  contentTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.background,
    textTransform: 'uppercase',
  },
  contentDimensions: {
    fontSize: 12,
    color: COLORS.muted,
  },
  noContentText: {
    padding: 32,
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.muted,
  },
  
  // Instructions Card
  instructionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  
  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentNote: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
  },
  
  // Policy Card
  policyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  policyText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18,
  },
  policyNote: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  
  bottomSpacing: {
    height: 100,
  },
  
  // Bottom Container
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
  confirmButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background,
  },
});