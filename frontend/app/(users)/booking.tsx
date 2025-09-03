import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { BookingService } from '../../services/bookingService';
import { ScreenService } from '../../services/screenService';
import { ContentService } from '../../services/contentService';
import { BookingDoc, ScreenDoc, BookingStatus } from '../../shared/models/firestore';

interface BookingWithScreen {
  booking: BookingDoc;
  screen: ScreenDoc | null;
}

// Status configuration for progress tracking
const STATUS_CONFIG = {
  requested: {
    label: 'Requested',
    color: '#FF9800',
    icon: 'time-outline',
    description: 'Waiting for owner approval',
    step: 1,
    total: 4,
    canCancel: true,
  },
  accepted: {
    label: 'Accepted',
    color: '#4CAF50',
    icon: 'checkmark-circle-outline',
    description: 'Booking confirmed, payment processed',
    step: 2,
    total: 4,
    canCancel: true,
  },
  live: {
    label: 'Live',
    color: '#2196F3',
    icon: 'play-circle-outline',
    description: 'Your advertisement is currently showing',
    step: 3,
    total: 4,
    canCancel: false,
  },
  completed: {
    label: 'Completed',
    color: '#4CAF50',
    icon: 'checkmark-circle',
    description: 'Advertisement campaign finished',
    step: 4,
    total: 4,
    canCancel: false,
  },
  declined: {
    label: 'Declined',
    color: '#F44336',
    icon: 'close-circle-outline',
    description: 'Owner declined your request',
    step: 0,
    total: 4,
    canCancel: false,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#9E9E9E',
    icon: 'ban-outline',
    description: 'Booking was cancelled',
    step: 0,
    total: 4,
    canCancel: false,
  },
  refunded: {
    label: 'Refunded',
    color: '#9E9E9E',
    icon: 'arrow-back-circle-outline',
    description: 'Payment has been refunded',
    step: 0,
    total: 4,
    canCancel: false,
  },
};

const STATUS_FILTERS = [
  { id: 'all', name: 'All', count: 0 },
  { id: 'requested', name: 'Requested', count: 0 },
  { id: 'accepted', name: 'Accepted', count: 0 },
  { id: 'live', name: 'Live', count: 0 },
  { id: 'completed', name: 'Completed', count: 0 },
  { id: 'cancelled', name: 'Cancelled', count: 0 },
];

const { width } = Dimensions.get('window');

interface BookingDetailsModalProps {
  visible: boolean;
  booking: BookingWithScreen | null;
  onClose: () => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  visible,
  booking,
  onClose,
}) => {
  const [contentUri, setContentUri] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const loadContent = useCallback(async () => {
    if (!booking?.booking.contentId || !booking.booking.renterId) return;
    
    try {
      setLoadingContent(true);
      console.log('Loading content for:', booking.booking.contentId, 'from user:', booking.booking.renterId);
      
      const userContent = await ContentService.getUserContent(booking.booking.renterId);
      console.log('User content:', userContent);
      
      const content = userContent.find(c => c.id === booking.booking.contentId);
      console.log('Found content:', content);
      
      if (content?.fileUrl) {
        setContentUri(content.fileUrl);
        console.log('Set content URI:', content.fileUrl);
      } else {
        console.log('No content found or no fileUrl');
        setContentUri(null);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setContentUri(null);
    } finally {
      setLoadingContent(false);
    }
  }, [booking?.booking.contentId, booking?.booking.renterId]);

  useEffect(() => {
    if (booking?.booking.contentId && visible) {
      loadContent();
    }
  }, [booking?.booking.contentId, visible, loadContent]);

  if (!booking) return null;

  const { booking: bookingData, screen } = booking;
  const statusConfig = STATUS_CONFIG[bookingData.status];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateRange = (dates: string[]) => {
    if (dates.length === 0) return 'No dates';
    if (dates.length === 1) return formatDate(dates[0]);
    
    const sortedDates = [...dates].sort();
    return `${formatDate(sortedDates[0])} - ${formatDate(sortedDates[sortedDates.length - 1])}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={modalStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        
        {/* Header */}
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Booking Details</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {/* Screen Information */}
          <View style={modalStyles.section}>
            <Text style={modalStyles.sectionTitle}>Screen Information</Text>
            <View style={modalStyles.screenInfo}>
              {screen?.photos[0] && (
                <Image 
                  source={{ uri: screen.photos[0] }} 
                  style={modalStyles.screenImage}
                  resizeMode="cover"
                />
              )}
              <View style={modalStyles.screenDetails}>
                <Text style={modalStyles.screenTitle}>
                  {screen?.title || 'Screen Not Found'}
                </Text>
                <View style={modalStyles.locationRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.muted} />
                  <Text style={modalStyles.screenLocation}>
                    {screen?.city}, {screen?.state}
                  </Text>
                </View>
                <Text style={modalStyles.screenType}>
                  {screen?.screenType}
                </Text>
              </View>
            </View>
          </View>

          {/* Booking Status */}
          <View style={modalStyles.section}>
            <Text style={modalStyles.sectionTitle}>Booking Status</Text>
            <View style={modalStyles.statusCard}>
              <View style={modalStyles.statusHeader}>
                <View style={modalStyles.statusIndicator}>
                  <Ionicons 
                    name={statusConfig.icon as any} 
                    size={24} 
                    color={statusConfig.color} 
                  />
                  <Text style={[modalStyles.statusLabel, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
                <Text style={modalStyles.bookingAmount}>
                  ${(bookingData.amountTotal / 100).toFixed(0)}
                </Text>
              </View>
              
              <Text style={modalStyles.statusDescription}>
                {statusConfig.description}
              </Text>
              
              {/* Progress Bar */}
              {statusConfig.step > 0 && (
                <View style={modalStyles.progressContainer}>
                  <View style={modalStyles.progressBar}>
                    <View style={[modalStyles.progressFill, { width: `${(statusConfig.step / statusConfig.total) * 100}%` }]} />
                  </View>
                  <Text style={modalStyles.progressText}>
                    Step {statusConfig.step} of {statusConfig.total}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Dates */}
          <View style={modalStyles.section}>
            <Text style={modalStyles.sectionTitle}>Campaign Dates</Text>
            <View style={modalStyles.datesCard}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
              <Text style={modalStyles.datesText}>
                {formatDateRange(bookingData.dates)}
              </Text>
            </View>
            <Text style={modalStyles.datesCount}>
              {bookingData.dates.length} day{bookingData.dates.length !== 1 ? 's' : ''} total
            </Text>
          </View>

          {/* Advertisement Content */}
          {bookingData.contentId && (
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Advertisement Content</Text>
              <View style={modalStyles.contentCard}>
                {loadingContent ? (
                  <View style={modalStyles.contentLoading}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={modalStyles.loadingText}>Loading content...</Text>
                  </View>
                ) : contentUri ? (
                  <Image 
                    source={{ uri: contentUri }} 
                    style={modalStyles.contentImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={modalStyles.contentError}>
                    <Ionicons name="image-outline" size={48} color={COLORS.muted} />
                    <Text style={modalStyles.errorText}>Content not available</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Special Instructions */}
          {bookingData.specialInstructions && (
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Special Instructions</Text>
              <Text style={modalStyles.instructionsText}>
                {bookingData.specialInstructions}
              </Text>
            </View>
          )}

          {/* Booking Details */}
          <View style={modalStyles.section}>
            <Text style={modalStyles.sectionTitle}>Booking Information</Text>
            <View style={modalStyles.detailsCard}>
              <View style={modalStyles.detailRow}>
                <Text style={modalStyles.detailLabel}>Booking ID</Text>
                <Text style={modalStyles.detailValue}>{bookingData.id}</Text>
              </View>
              <View style={modalStyles.detailRow}>
                <Text style={modalStyles.detailLabel}>Created</Text>
                <Text style={modalStyles.detailValue}>
                  {bookingData.createdAt ? new Date(bookingData.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={modalStyles.detailRow}>
                <Text style={modalStyles.detailLabel}>Currency</Text>
                <Text style={modalStyles.detailValue}>{bookingData.currency.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const Booking = () => {
  const [bookings, setBookings] = useState<BookingWithScreen[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithScreen[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithScreen | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const applyFilter = useCallback((filterId: string, bookingsList?: BookingWithScreen[]) => {
    const listToFilter = bookingsList || bookings;
    let filtered = listToFilter;
    
    if (filterId !== 'all') {
      filtered = listToFilter.filter(item => item.booking.status === filterId);
    }
    
    setFilteredBookings(filtered);
    setSelectedFilter(filterId);
  }, [bookings]);

  const loadBookings = useCallback(async () => {
    try {
      setError(null);
      const userBookings = await BookingService.getUserBookings();
      
      // Fetch screen data for each booking
      const bookingsWithScreens = await Promise.all(
        userBookings.map(async (booking) => {
          try {
            const screen = await ScreenService.getScreenById(booking.screenId);
            return { booking, screen };
          } catch (err) {
            console.warn(`Failed to load screen ${booking.screenId}:`, err);
            return { booking, screen: null };
          }
        })
      );
      
      setBookings(bookingsWithScreens);
      // Only apply 'all' filter on initial load or refresh, not when user has selected a filter
      if (selectedFilter === 'all' || loading || refreshing) {
        applyFilter('all', bookingsWithScreens);
      } else {
        // Reapply the current filter with new data
        applyFilter(selectedFilter, bookingsWithScreens);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyFilter, selectedFilter, loading, refreshing]);

  const getFilterCounts = (bookingsList: BookingWithScreen[]) => {
    const counts = STATUS_FILTERS.map(filter => {
      if (filter.id === 'all') {
        return { ...filter, count: bookingsList.length };
      }
      return {
        ...filter,
        count: bookingsList.filter(item => item.booking.status === filter.id).length
      };
    });
    return counts;
  };

  const handleBookingPress = (item: BookingWithScreen) => {
    setSelectedBooking(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBooking(null);
  };

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = (item: BookingWithScreen) => {
    const statusConfig = STATUS_CONFIG[item.booking.status];
    
    if (!statusConfig.canCancel) {
      Alert.alert('Cannot Cancel', `This booking cannot be cancelled as it is ${statusConfig.label.toLowerCase()}.`);
      return;
    }

    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel this booking? ${item.booking.status === 'accepted' ? 'You will receive a full refund.' : ''}`,
      [
        {
          text: 'Keep Booking',
          style: 'cancel',
        },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => performCancellation(item),
        },
      ]
    );
  };

  const performCancellation = async (item: BookingWithScreen) => {
    try {
      await BookingService.cancelBooking(item.booking.id);
      Alert.alert('Booking Cancelled', 'Your booking has been successfully cancelled.');
      // Refresh the list
      loadBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (dates: string[]) => {
    if (dates.length === 0) return 'No dates';
    if (dates.length === 1) return formatDate(dates[0]);
    
    const sortedDates = [...dates].sort();
    return `${formatDate(sortedDates[0])} - ${formatDate(sortedDates[sortedDates.length - 1])}`;
  };

  const renderProgressBar = (status: BookingStatus) => {
    const config = STATUS_CONFIG[status];
    const progress = config.step / config.total;
    
    if (config.step === 0) {
      return null; // No progress bar for cancelled/declined/refunded
    }

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {config.step} of {config.total}
        </Text>
      </View>
    );
  };

  const renderBookingItem = ({ item }: { item: BookingWithScreen }) => {
    const { booking, screen } = item;
    const statusConfig = STATUS_CONFIG[booking.status];

    return (
      <TouchableOpacity 
        style={styles.bookingCard}
        onPress={() => handleBookingPress(item)}
        activeOpacity={0.7}
      >
        {/* Screen Info */}
        <View style={styles.bookingHeader}>
          {screen?.photos[0] && (
            <Image 
              source={{ uri: screen.photos[0] }} 
              style={styles.screenImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.bookingInfo}>
            <Text style={styles.screenTitle}>
              {screen?.title || 'Screen Not Found'}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.muted} />
              <Text style={styles.screenLocation}>
                {screen?.city}, {screen?.state}
              </Text>
            </View>
            <Text style={styles.bookingDates}>
              {formatDateRange(booking.dates)}
            </Text>
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator}>
              <Ionicons 
                name={statusConfig.icon as any} 
                size={20} 
                color={statusConfig.color} 
              />
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={styles.bookingAmount}>
              ${(booking.amountTotal / 100).toFixed(0)}
            </Text>
          </View>
          
          <Text style={styles.statusDescription}>
            {statusConfig.description}
          </Text>
          
          {renderProgressBar(booking.status)}
        </View>

        {/* Action Button */}
        {statusConfig.canCancel && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => handleCancelBooking(item)}
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.muted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filters = getFilterCounts(bookings);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Status Filter Tabs */}
      {bookings.length > 0 && (
        <View style={styles.filtersContainer}>
          <FlatList
            data={filters}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedFilter === item.id && styles.filterButtonActive
                ]}
                onPress={() => applyFilter(item.id)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === item.id && styles.filterTextActive
                ]}>
                  {item.name}
                </Text>
                <Text style={[
                  styles.filterCount,
                  selectedFilter === item.id && styles.filterCountActive
                ]}>
                  {item.count}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      
      {bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No Bookings Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start booking screens to advertise your content!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.booking.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        visible={modalVisible}
        booking={selectedBooking}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 16,
  },
  filtersContainer: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 16,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: COLORS.accent,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 6,
  },
  filterTextActive: {
    color: COLORS.background,
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  filterCountActive: {
    color: COLORS.accent,
    backgroundColor: COLORS.background,
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  screenImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  screenLocation: {
    fontSize: 14,
    color: COLORS.muted,
  },
  bookingDates: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  statusSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  bookingAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  statusDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 12,
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 12,
  },
  cancelButtonText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  screenInfo: {
    flexDirection: 'row',
  },
  screenImage: {
    width: 100,
    height: 75,
    borderRadius: 8,
    marginRight: 16,
  },
  screenDetails: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  screenLocation: {
    fontSize: 14,
    color: COLORS.muted,
  },
  screenType: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  bookingAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  statusDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
  },
  datesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  datesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  datesCount: {
    fontSize: 14,
    color: COLORS.muted,
  },
  contentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  contentLoading: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  contentImage: {
    width: width - 80,
    height: 200,
    borderRadius: 8,
  },
  contentError: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  instructionsText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
});

export default Booking;