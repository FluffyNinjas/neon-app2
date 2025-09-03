import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/Colors';
import { useBookingStore } from '../../stores/bookingStore';
import { ContentService } from '../../services/contentService';
import { ContentDoc, ContentType } from '../../shared/models/firestore';

export default function BookingAdvertisement() {
  const router = useRouter();
  const [userContent, setUserContent] = useState<ContentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  
  const { screen, selectedDates, selectedContentId, setSelectedContent, clearBooking } = useBookingStore();
  
  const loadUserContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = filterType !== 'all' ? { type: filterType as ContentType } : undefined;
      const content = await ContentService.getCurrentUserContent(filters);
      setUserContent(content);
    } catch (err) {
      console.error('Error loading content:', err);
      setError('Failed to load your content');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadUserContent();
  }, [loadUserContent]);

  // If no screen data available, redirect to information page
  if (!screen) {
    router.replace('/booking-screen' as any);
    return null;
  }

  const handleSelectContent = (content: ContentDoc) => {
    setSelectedContent(content.id);
  };

  const handleUploadContent = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload content!'
        );
        return;
      }

      // Show options for image or video
      Alert.alert(
        'Select Content Type',
        'What type of content would you like to upload?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Image',
            onPress: () => pickMedia('image'),
          },
          {
            text: 'Video',
            onPress: () => pickMedia('video'),
          },
        ]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to access media library');
    }
  };

  const pickMedia = async (type: 'image' | 'video') => {
    try {
      setUploading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 9], // Standard screen aspect ratio
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadSelectedMedia(asset, type as ContentType);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to select media');
    } finally {
      setUploading(false);
    }
  };

  const uploadSelectedMedia = async (asset: ImagePicker.ImagePickerAsset, type: ContentType) => {
    try {
      // Generate a title based on timestamp
      const timestamp = new Date().toLocaleString();
      const title = `${type === 'image' ? 'Image' : 'Video'} - ${timestamp}`;

      // Upload to Firebase Storage with progress tracking
      const contentId = await ContentService.uploadContent(
        title, 
        type, 
        {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          fileName: asset.fileName as any
        },
        (progress) => {
          setUploadProgress(progress.progress);
        }
      );
      
      // Refresh the content list to include the new upload
      await loadUserContent();
      
      // Auto-select the newly uploaded content
      setSelectedContent(contentId);
      
      Alert.alert('Success', 'Content uploaded successfully to Firebase Storage!');
    } catch (error) {
      console.error('Error uploading content:', error);
      Alert.alert('Error', 'Failed to upload content. Please try again.');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    Alert.alert(
      'Delete Content',
      'Are you sure you want to delete this content? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingIds(prev => new Set([...prev, contentId]));
            try {
              await ContentService.deleteContent(contentId as any);
              // Refresh content list
              await loadUserContent();
              // Deselect if this was the selected content
              if (selectedContentId === contentId) {
                setSelectedContent(null);
              }
              Alert.alert('Success', 'Content deleted successfully!');
            } catch (error) {
              console.error('Error deleting content:', error);
              Alert.alert('Error', 'Failed to delete content. Please try again.');
            } finally {
              setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(contentId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!selectedContentId) {
      Alert.alert('Select Content', 'Please select or upload content for your advertisement');
      return;
    }
    router.push('/booking-screen/confirmation');
  };

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
            // Navigate back to the home screen
            router.replace('/(users)/home');
          },
        },
      ],
      { cancelable: false }
    );
  };

  const renderContentItem = ({ item }: { item: ContentDoc }) => {
    const isSelected = selectedContentId === item.id;
    
    return (
      <TouchableOpacity 
        style={[styles.contentCard, isSelected && styles.contentCardSelected]}
        onPress={() => handleSelectContent(item)}
      >
        <Image 
          source={{ uri: item.fileUrl }} 
          style={styles.contentImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Failed to load image:', item.fileUrl, error);
          }}
        />
        
        <View style={styles.contentOverlay}>
          {/* Delete button - top left with better visibility */}
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteContent(item.id)}
            disabled={deletingIds.has(item.id)}
          >
            {deletingIds.has(item.id) ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Ionicons name="trash" size={16} color="#FF4444" />
            )}
          </TouchableOpacity>
          
          {/* Selected indicator - top right */}
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.accent} />
            </View>
          )}
          
          {/* Content info - bottom */}
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.contentMeta}>
              <View style={styles.contentTypeTag}>
                <Ionicons 
                  name={item.type === 'image' ? 'image' : 'videocam'} 
                  size={12} 
                  color={COLORS.background} 
                />
                <Text style={styles.contentTypeText}>{item.type}</Text>
              </View>
              {item.dimensions && (
                <Text style={styles.contentDimensions}>
                  {item.dimensions.width}×{item.dimensions.height}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Advertisement</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading your content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Advertisement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.title}>Choose Your Advertisement</Text>
          <Text style={styles.subtitle}>Screen: {screen.title}</Text>
          <Text style={styles.subtitle}>Selected dates: {selectedDates.length}</Text>
          <Text style={styles.subtitle}>Total: ${((screen.dayPrice * selectedDates.length) / 100).toFixed(0)}</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
            {['all', 'image', 'video'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterTab,
                  filterType === type && styles.filterTabActive
                ]}
                onPress={() => setFilterType(type as ContentType | 'all')}
              >
                <Text style={[
                  styles.filterTabText,
                  filterType === type && styles.filterTabTextActive
                ]}>
                  {type === 'all' ? 'All' : type === 'image' ? 'Images' : 'Videos'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Upload New Content Button */}
        <TouchableOpacity 
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUploadContent}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              {uploadProgress > 0 && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                </View>
              )}
            </View>
          ) : (
            <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
          )}
          <Text style={styles.uploadButtonText}>
            {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload New Content'}
          </Text>
        </TouchableOpacity>

        {/* Content Grid */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadUserContent}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : userContent.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Content Found</Text>
            <Text style={styles.emptySubtitle}>
              Upload your first advertisement content to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={userContent}
            renderItem={renderContentItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.contentRow}
            style={styles.contentGrid}
            scrollEnabled={false}
          />
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !selectedContentId && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedContentId}
        >
          <Text style={[
            styles.continueText,
            !selectedContentId && styles.continueTextDisabled
          ]}>
            Continue to Confirmation
          </Text>
          <Ionicons 
            name="arrow-forward" 
            size={20} 
            color={!selectedContentId ? COLORS.muted : COLORS.background} 
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
  
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.muted,
  },
  
  // Summary section
  summarySection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 8,
  },
  
  // Filter section
  filterSection: {
    marginBottom: 20,
  },
  filterTabs: {
    maxHeight: 50,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    marginRight: 12,
  },
  filterTabActive: {
    backgroundColor: COLORS.accent,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTabTextActive: {
    color: COLORS.background,
  },
  
  // Upload button
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    marginBottom: 20,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  progressContainer: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  
  // Content grid
  contentGrid: {
    marginBottom: 20,
  },
  contentRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  contentCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  contentCardSelected: {
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  contentImage: {
    width: '100%',
    height: '100%',
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 12,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  contentInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
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
    fontSize: 10,
    color: COLORS.background,
    opacity: 0.8,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Error state
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  
  bottomSpacing: {
    height: 100,
  },
  
  // Bottom container
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
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.surface,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
  continueTextDisabled: {
    color: COLORS.muted,
  },
});