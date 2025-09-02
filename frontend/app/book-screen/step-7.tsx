import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, setDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { COLORS } from '../../constants/Colors';
import { useScreenCreationStore } from '../../stores/useScreenCreationStore';
import StepLayout from '../../components/StepLayout';
import { getScreenTypeById } from '../../constants/ScreenTypes';
import { db, auth, storage } from '../../FirebaseConfig';
import { 
  buildNewScreen, 
  screenConverter, 
  type WeeklyAvailability,
  type ScreenId,
  type UserId 
} from '../../shared/models/firestore';

const DAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

export default function Step7Confirmation() {
  const [user, loading] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    screenType, 
    location, 
    details, 
    dailyPrice, 
    images, 
    availability,
    resetStore 
  } = useScreenCreationStore();

  const handleEdit = (step: number) => {
    router.push(`/book-screen/step-${step}`);
  };

  // Convert store availability format to Firestore format
  const transformAvailabilityToFirestore = (): WeeklyAvailability => {
    const dayMapping = {
      monday: 'mon',
      tuesday: 'tue', 
      wednesday: 'wed',
      thursday: 'thu',
      friday: 'fri',
      saturday: 'sat',
      sunday: 'sun'
    } as const;

    const weeklyAvailability = {
      timezone: 'America/New_York', // Default timezone - could be made configurable
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: []
    } as WeeklyAvailability;

    availability.forEach(day => {
      if (day.isAvailable) {
        const firestoreDay = dayMapping[day.day];
        weeklyAvailability[firestoreDay] = [{
          start: day.startTime, // Already in HH:mm format
          end: day.endTime
        }];
      }
    });

    return weeklyAvailability;
  };

  // Upload images to Firebase Storage
  const uploadImages = async (screenId: string): Promise<string[]> => {
    const uploadPromises = images.map(async (image, index) => {
      try {
        // Convert URI to blob for upload
        const response = await fetch(image.uri);
        const blob = await response.blob();
        
        // Create storage reference with a structured path
        const fileName = `${Date.now()}_${index}.jpg`;
        const storageRef = ref(storage, `screens/${screenId}/images/${fileName}`);
        
        // Upload the blob
        await uploadBytes(storageRef, blob);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      } catch (error) {
        console.error(`Error uploading image ${index}:`, error);
        throw error;
      }
    });

    // Wait for all uploads to complete
    return Promise.all(uploadPromises);
  };

  const handleSubmit = () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a screen listing.');
      return;
    }

    Alert.alert(
      'Submit Screen Listing',
      'Are you sure you want to submit your screen for approval? You can edit it later from your dashboard.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            
            try {
              // Create a new screen document
              const screenRef = doc(collection(db, 'screens'));
              const screenId = screenRef.id as ScreenId;
              
              // Upload images to Firebase Storage first
              const uploadedImageUrls = await uploadImages(screenId);
              
              // Transform store data to Firestore format
              const screenData = buildNewScreen({
                ownerId: user.uid as UserId,
                title: details.title,
                description: details.description,
                screenType: screenType,
                screenSize: details.screenSize,
                screenResolution: details.resolution,
                address: location.address,
                zipCode: location.zipCode,
                city: location.city,
                state: location.state,
                coordinates: {
                  lat: location.latitude || 0, // Default to 0 if not set
                  lng: location.longitude || 0
                },
                photos: uploadedImageUrls, // Now using Firebase Storage URLs
                dayPrice: Math.round(parseFloat(dailyPrice) * 100), // Convert to cents
                isActive: true,
                availability: transformAvailabilityToFirestore(),
                featured: false
              });

              // Save to Firestore
              await setDoc(screenRef.withConverter(screenConverter), {
                id: screenId,
                ...screenData
              });

              Alert.alert(
                'Success!',
                'Your screen has been submitted for review. You\'ll receive a notification once it\'s approved.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      resetStore();
                      router.replace('/(owners)/screens');
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error creating screen:', error);
              
              let errorMessage = 'Failed to submit your screen listing. Please try again.';
              
              // Provide more specific error messages
              if (error instanceof Error) {
                if (error.message.includes('storage')) {
                  errorMessage = 'Failed to upload images. Please check your internet connection and try again.';
                } else if (error.message.includes('firestore') || error.message.includes('permission')) {
                  errorMessage = 'Failed to save screen data. Please try again.';
                }
              }
              
              Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hour] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${time.split(':')[1]} ${ampm}`;
  };

  const getScreenTypeLabel = (type: string) => {
    const screenTypeData = getScreenTypeById(type);
    return screenTypeData ? screenTypeData.title : type;
  };

  const availableDays = availability.filter(day => day.isAvailable);

  return (
    <StepLayout
      currentStep={7}
      totalSteps={7}
      title="Review your listing"
      onNext={handleSubmit}
      nextButtonText={isSubmitting ? "Submitting..." : "Submit Listing"}
      nextButtonDisabled={isSubmitting || loading}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <Text style={styles.subtitle}>
          Review all details before submitting your screen for approval
        </Text>

        {/* Screen Type */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Screen Type</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit(1)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionValue}>{getScreenTypeLabel(screenType)}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit(2)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionValue}>{location.address}</Text>
            <Text style={styles.sectionSubValue}>
              {location.city}, {location.state} {location.zipCode}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Screen Details</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit(3)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionValue}>{details.title}</Text>
            <Text style={styles.sectionSubValue}>{details.description}</Text>
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Size</Text>
                <Text style={styles.detailValue}>{details.screenSize}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Resolution</Text>
                <Text style={styles.detailValue}>{details.resolution}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit(4)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.priceValue}>${dailyPrice}/day</Text>
            <View style={styles.earningsEstimate}>
              <Text style={styles.earningsLabel}>Potential monthly earnings:</Text>
              <Text style={styles.earningsValue}>
                ${(parseFloat(dailyPrice) * 30).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos ({images.length})</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit(5)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosPreview}>
                {images.slice(0, 5).map((image, index) => (
                  <View key={image.id} style={styles.photoPreview}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    {index === 0 && (
                      <View style={styles.primaryPhotoBadge}>
                        <Text style={styles.primaryPhotoText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>
                ))}
                {images.length > 5 && (
                  <View style={styles.morePhotos}>
                    <Text style={styles.morePhotosText}>+{images.length - 5}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit(6)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.availabilityGrid}>
              {availableDays.map((day) => (
                <View key={day.day} style={styles.availabilityItem}>
                  <Text style={styles.availabilityDay}>
                    {DAYS.find(d => d.key === day.day)?.short}
                  </Text>
                  <Text style={styles.availabilityTime}>
                    {formatTime(day.startTime)} - {formatTime(day.endTime)}
                  </Text>
                </View>
              ))}
            </View>
            {availableDays.length === 0 && (
              <Text style={styles.noAvailability}>No availability set</Text>
            )}
          </View>
        </View>

        {/* Submission Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.accent} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What happens next?</Text>
              <Text style={styles.infoText}>
                • Your listing will be reviewed within 24-48 hours{'\n'}
                • We&apos;ll verify the information and photos{'\n'}
                • You&apos;ll receive a notification once approved{'\n'}
                • Your screen will then be visible to renters
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  sectionContent: {
    padding: 16,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubValue: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 24,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 8,
  },
  earningsEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earningsLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  photosPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  photoPreview: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  primaryPhotoBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryPhotoText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.background,
  },
  morePhotos: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  availabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilityItem: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  availabilityDay: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  availabilityTime: {
    fontSize: 10,
    color: COLORS.muted,
  },
  noAvailability: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  infoSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
});