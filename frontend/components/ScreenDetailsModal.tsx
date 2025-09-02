import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { ScreenDoc } from '../shared/models/firestore';
import { ScreenService } from '../services/screenService';
import { userService } from '../services/userService';

const { width, height } = Dimensions.get('window');

interface ScreenDetailsModalProps {
  visible: boolean;
  screen: ScreenDoc | null;
  onClose: () => void;
  onBookNow?: (screen: ScreenDoc) => void;
  onToggleFavorite?: (screen: ScreenDoc) => void;
  isFavorite?: boolean;
}

export const ScreenDetailsModal: React.FC<ScreenDetailsModalProps> = ({
  visible,
  screen,
  onClose,
  onBookNow,
  onToggleFavorite,
  isFavorite = false,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Reset full screen state when modal closes or screen changes
  useEffect(() => {
    if (!visible) {
      setFullScreenVisible(false);
      setCurrentImageIndex(0);
    }
  }, [visible]);

  // Reset state when screen changes
  useEffect(() => {
    setFullScreenVisible(false);
    setCurrentImageIndex(0);
    setOwnerInfo(null);
  }, [screen?.id]);

  const loadOwnerInfo = useCallback(async () => {
    try {
      if (screen?.ownerId) {
        const owner = await userService.getUserById(screen.ownerId);
        setOwnerInfo(owner);
      }
    } catch (error) {
      console.error('Error loading owner info:', error);
    }
  }, [screen?.ownerId]);

  // Load owner information when screen changes
  useEffect(() => {
    if (screen?.ownerId) {
      loadOwnerInfo();
    }
  }, [screen?.ownerId, loadOwnerInfo]);

  if (!screen) return null;

  const images = screen.photos && screen.photos.length > 0 
    ? screen.photos 
    : [ScreenService.getScreenImage(screen)];

  const handleBookNow = () => {
    onBookNow?.(screen);
  };

  const handleToggleFavorite = () => {
    onToggleFavorite?.(screen);
  };

  const handleImagePress = (index: number) => {
    console.log('handleImagePress called with index:', index);
    setCurrentImageIndex(index);
    setFullScreenVisible(true);
    console.log('Full screen modal should be visible now');
  };

  const handleCloseFullScreen = () => {
    console.log('Closing full screen modal');
    setFullScreenVisible(false);
  };

  const handleCloseModal = () => {
    console.log('Closing main modal');
    setFullScreenVisible(false);
    setCurrentImageIndex(0);
    onClose();
  };

  const handleOwnerPress = () => {
    console.log('Owner section pressed, owner ID:', screen?.ownerId);
    // TODO: Implement owner details card/modal
  };

  const onImageScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setCurrentImageIndex(roundIndex);
  };

  const formatTimeToAmPm = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatAvailability = (availability: any) => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return days.map((day, index) => {
      const dayAvailability = availability[day];
      const hasSlots = dayAvailability && dayAvailability.length > 0;
      
      return (
        <View key={day} style={[styles.availabilityDayCard, !hasSlots && styles.unavailableDayCard]}>
          <View style={styles.dayHeader}>
            <View style={[styles.dayIndicator, hasSlots && styles.dayIndicatorActive]}>
              <Text style={[styles.dayAbbrev, hasSlots && styles.dayAbbrevActive]}>
                {dayNames[index]}
              </Text>
            </View>
            <Text style={[styles.fullDayName, !hasSlots && styles.unavailableText]}>
              {fullDayNames[index]}
            </Text>
          </View>
          
          {hasSlots ? (
            <View style={styles.timeSlotsContainer}>
              {dayAvailability.map((timeSlot: any, slotIndex: number) => (
                <View key={slotIndex} style={styles.timeSlotChip}>
                  <Ionicons name="time-outline" size={14} color={COLORS.accent} />
                  <Text style={styles.timeSlotText}>
                    {formatTimeToAmPm(timeSlot.start)} - {formatTimeToAmPm(timeSlot.end)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.unavailableContainer}>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.muted} />
              <Text style={styles.unavailableLabel}>Unavailable</Text>
            </View>
          )}
        </View>
      );
    });
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity 
      style={styles.imageSlide}
      onPress={() => {
        console.log('Image pressed:', index);
        handleImagePress(index);
      }}
      activeOpacity={0.9}
      delayPressIn={0}
      delayPressOut={0}
    >
      <Image
        source={{ uri: item }}
        style={styles.slideImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  // Show full-screen modal OR main modal, not both at once
  if (fullScreenVisible && visible && screen) {
    return (
      <Modal
        visible={true}
        animationType="fade"
        onRequestClose={handleCloseFullScreen}
        statusBarTranslucent
        presentationStyle="fullScreen"
        transparent={false}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.fullScreenClose}
            onPress={handleCloseFullScreen}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          
          <FlatList
            data={images}
            renderItem={({ item }) => (
              <View style={styles.fullScreenImageContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              </View>
            )}
            keyExtractor={(item, index) => `fullscreen-${index}-${item}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentImageIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
          />

          {/* Full Screen Pagination */}
          {images.length > 1 && (
            <View style={styles.fullScreenPagination}>
              <Text style={styles.fullScreenPaginationText}>
                {currentImageIndex + 1} of {images.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCloseModal}
    >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Image Gallery with Floating Buttons */}
            <View style={styles.imageContainer} pointerEvents="box-none">
              <FlatList
                ref={flatListRef}
                data={images}
                renderItem={renderImageItem}
                keyExtractor={(item, index) => `${index}-${item}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false, listener: onImageScroll }
                )}
                scrollEventThrottle={16}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                pointerEvents="auto"
              />
              
              {/* Floating Close Button */}
              <TouchableOpacity style={styles.floatingCloseButton} onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Floating Favorite Button */}
              <TouchableOpacity style={styles.floatingFavoriteButton} onPress={handleToggleFavorite}>
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isFavorite ? "#FF6B6B" : "#FFFFFF"} 
                />
              </TouchableOpacity>
              
              {/* Image Pagination */}
              {images.length > 1 && (
                <View style={styles.paginationContainer}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        currentImageIndex === index && styles.paginationDotActive
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Badges */}
              <View style={styles.badgeContainer}>
                {screen.featured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredText}>Featured</Text>
                  </View>
                )}
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {screen.isActive ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.screenTitle}>{screen.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color={COLORS.accent} />
              <Text style={styles.locationText}>{screen.address}</Text>
            </View>
            <Text style={styles.cityState}>{ScreenService.formatLocation(screen)}</Text>
          </View>

          {/* Rating and Price */}
          <View style={styles.ratingPriceSection}>
            <View style={styles.ratingContainer}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.ratingText}>
                  {screen.ratingAvg ? screen.ratingAvg.toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.reviewCount}>
                  ({screen.ratingCount || 0} reviews)
                </Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>{ScreenService.formatPrice(screen.dayPrice)}</Text>
            </View>
          </View>

          {/* Screen Owner */}
          {ownerInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Screen Owner</Text>
              <TouchableOpacity 
                style={styles.ownerContainer}
                onPress={handleOwnerPress}
                activeOpacity={0.7}
              >
                <View style={styles.ownerAvatar}>
                  {ownerInfo.photoURL ? (
                    <Image source={{ uri: ownerInfo.photoURL }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {ownerInfo.displayName ? ownerInfo.displayName.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>
                    {ownerInfo.displayName || 'Screen Owner'}
                  </Text>
                  <View style={styles.ownerDetails}>
                    <Ionicons name="business-outline" size={14} color={COLORS.muted} />
                    <Text style={styles.ownerType}>
                      {ownerInfo.userType === 'both' ? 'Owner & Creator' : 
                       ownerInfo.userType === 'owner' ? 'Screen Owner' : 'Creator'}
                    </Text>
                    {ownerInfo.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Screen Specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specContainer}>
              <View style={styles.specCard}>
                <View style={styles.specIconContainer}>
                  <Ionicons name="tv-outline" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.specLabel}>Screen Type</Text>
                <Text style={styles.specValue}>{screen.screenType}</Text>
              </View>
              
              {screen.screenSize && (
                <View style={styles.specCard}>
                  <View style={styles.specIconContainer}>
                    <Ionicons name="resize-outline" size={24} color={COLORS.accent} />
                  </View>
                  <Text style={styles.specLabel}>Size</Text>
                  <Text style={styles.specValue}>{screen.screenSize}</Text>
                </View>
              )}
              
              {screen.screenResolution && (
                <View style={styles.specCard}>
                  <View style={styles.specIconContainer}>
                    <Ionicons name="diamond-outline" size={24} color={COLORS.accent} />
                  </View>
                  <Text style={styles.specLabel}>Resolution</Text>
                  <Text style={styles.specValue}>{screen.screenResolution}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {screen.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{screen.description}</Text>
            </View>
          )}

          {/* Location Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationDetails}>
              <View style={styles.locationItem}>
                <Ionicons name="location" size={16} color={COLORS.accent} />
                <Text style={styles.locationDetailText}>{screen.address}</Text>
              </View>
              <View style={styles.locationItem}>
                <Ionicons name="business" size={16} color={COLORS.accent} />
                <Text style={styles.locationDetailText}>{screen.city}, {screen.state}</Text>
              </View>
              <View style={styles.locationItem}>
                <Ionicons name="mail" size={16} color={COLORS.accent} />
                <Text style={styles.locationDetailText}>{screen.zipCode}</Text>
              </View>
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <Text style={styles.timezoneText}>Timezone: {screen.availability.timezone}</Text>
            <View style={styles.availabilityContainer}>
              {formatAvailability(screen.availability)}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Fixed Bottom Button */}
        {screen.isActive && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
              <Text style={styles.bookButtonText}>Book Now</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>

   
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  closeButton: {
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
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 20,
  },
  
  // Image Gallery Styles
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 380,
  },
  imageSlide: {
    width: width,
    height: 380,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 20,
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background,
  },
  statusBadge: {
    backgroundColor: 'rgba(199, 198, 198, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.background,
  },

  // Content Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 6,
    flex: 1,
  },
  cityState: {
    fontSize: 14,
    color: COLORS.muted,
    marginLeft: 24,
  },
  ratingPriceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  ratingContainer: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.muted,
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.accent,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  // Owner Section Styles
  ownerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    width: 50,
    height: 50,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.background,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  ownerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerType: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F0F9F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },

  // Improved Specifications Styles
  specContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
    maxWidth: '48%',
  },
  specIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  specValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Other Sections
  description: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  locationDetails: {
    gap: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDetailText: {
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  timezoneText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 12,
  },
  availabilityContainer: {
    gap: 12,
  },
  availabilityDayCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unavailableDayCard: {
    borderLeftColor: COLORS.muted,
    opacity: 0.6,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  dayIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.muted,
  },
  dayIndicatorActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  dayAbbrev: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  dayAbbrevActive: {
    color: COLORS.background,
  },
  fullDayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  unavailableText: {
    color: COLORS.muted,
  },
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  timeSlotText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unavailableLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
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
    paddingHorizontal: 10,
    marginBottom:20,
    //paddingBottom:20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
    borderRadius:16,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },

  // Floating Button Styles
  floatingCloseButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingFavoriteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Full Screen Modal Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height,
  },
  fullScreenPagination: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fullScreenPaginationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});