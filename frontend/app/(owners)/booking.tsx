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
import { BookingDoc, ScreenDoc, BookingId } from '../../shared/models/firestore';

interface BookingWithScreen {
  booking: BookingDoc;
  screen: ScreenDoc | null;
}

// Status configuration for owners (different perspective)
const OWNER_STATUS_CONFIG = {
  requested: {
    label: 'New Request',
    color: '#FF9800',
    icon: 'time-outline',
    description: 'Pending your approval',
    needsAction: true,
    canCancel: false,
  },
  accepted: {
    label: 'Accepted',
    color: '#4CAF50',
    icon: 'checkmark-circle-outline',
    description: 'Booking confirmed and paid',
    needsAction: false,
    canCancel: true,
  },
  live: {
    label: 'Live',
    color: '#2196F3',
    icon: 'play-circle-outline',
    description: 'Currently displaying',
    needsAction: false,
    canCancel: false,
  },
  completed: {
    label: 'Completed',
    color: '#4CAF50',
    icon: 'checkmark-circle',
    description: 'Campaign finished',
    needsAction: false,
    canCancel: false,
  },
  declined: {
    label: 'Declined',
    color: '#F44336',
    icon: 'close-circle-outline',
    description: 'Request declined',
    needsAction: false,
    canCancel: false,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#9E9E9E',
    icon: 'ban-outline',
    description: 'Booking was cancelled',
    needsAction: false,
    canCancel: false,
  },
  refunded: {
    label: 'Refunded',
    color: '#9E9E9E',
    icon: 'arrow-back-circle-outline',
    description: 'Payment refunded',
    needsAction: false,
    canCancel: false,
  },
};

const STATUS_FILTERS = [
  { id: 'all', name: 'All', count: 0 },
  { id: 'requested', name: 'Requests', count: 0 },
  { id: 'accepted', name: 'Accepted', count: 0 },
  { id: 'live', name: 'Live', count: 0 },
  { id: 'completed', name: 'Completed', count: 0 },
  { id: 'declined', name: 'Declined', count: 0 },
];

const { width } = Dimensions.get('window');

interface BookingDetailsModalProps {
  visible: boolean;
  booking: BookingWithScreen | null;
  onClose: () => void;
  onAction: (action: 'accept' | 'decline' | 'cancel', bookingId: string) => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  visible,
  booking,
  onClose,
  onAction,
}) => {
  const [contentUri, setContentUri] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | 'cancel' | null>(null);

  const loadContent = useCallback(async () => {
    if (!booking?.booking.contentId || !booking.booking.renterId) return;
    
    try {
      setLoadingContent(true);
      console.log('Loading content for:', booking.booking.contentId, 'from user:', booking.booking.renterId);
      
      const userContent = await ContentService.getUserContent(booking.booking.renterId);
      const content = userContent.find(c => c.id === booking.booking.contentId);
      
      if (content?.fileUrl) {
        setContentUri(content.fileUrl);
      } else {
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
    } else {
      setContentUri(null);
    }
  }, [booking?.booking.contentId, visible, loadContent]);

  const handleAction = async (action: 'accept' | 'decline' | 'cancel') => {
    if (!booking) return;
    
    // For cancel action, don't set loading state yet as confirmation dialog will show first
    if (action === 'cancel') {
      try {
        await onAction(action, booking.booking.id);
        onClose();
      } catch (err) {
        // Error handling is done in the parent component
        console.error('Error handling booking action:', err);
      }
      return;
    }
    
    setActionLoading(action);
    try {
      await onAction(action, booking.booking.id);
      onClose();
    } finally {
      setActionLoading(null);
    }
  };

  if (!booking) return null;

  const { booking: bookingData, screen } = booking;
  const statusConfig = OWNER_STATUS_CONFIG[bookingData.status];

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

  const formatIndividualDates = (dates: string[]) => {
    if (dates.length === 0) return [];
    
    const sortedDates = [...dates].sort();
    return sortedDates.map(dateString => {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    });
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
          <Text style={modalStyles.title}>Booking Request</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {/* Screen Information */}
          <View style={modalStyles.section}>
            <Text style={modalStyles.sectionTitle}>Your Screen</Text>
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
            <Text style={modalStyles.sectionTitle}>Status</Text>
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
            </View>
          </View>

          {/* Campaign Dates */}
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
            
            {/* Individual Dates */}
            {bookingData.dates.length > 1 && (
              <View style={modalStyles.individualDatesContainer}>
                <Text style={modalStyles.individualDatesTitle}>All scheduled dates:</Text>
                <View style={modalStyles.individualDates}>
                  {formatIndividualDates(bookingData.dates).map((dateStr, index) => (
                    <View key={index} style={modalStyles.dateChip}>
                      <Text style={modalStyles.dateChipText}>{dateStr}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
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
                <Text style={modalStyles.detailLabel}>Requested</Text>
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

        {/* Action Buttons */}
        {(statusConfig.needsAction || statusConfig.canCancel) && (
          <View style={modalStyles.actionContainer}>
            {statusConfig.needsAction ? (
              <>
                <TouchableOpacity 
                  style={[modalStyles.actionButton, modalStyles.declineButton]}
                  onPress={() => handleAction('decline')}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'decline' ? (
                    <ActivityIndicator size="small" color="#C62828" />
                  ) : (
                    <>
                      <Ionicons name="close-outline" size={20} color="#C62828" />
                      <Text style={modalStyles.declineButtonText}>Decline</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[modalStyles.actionButton, modalStyles.acceptButton]}
                  onPress={() => handleAction('accept')}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'accept' ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={20} color={COLORS.background} />
                      <Text style={modalStyles.acceptButtonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : statusConfig.canCancel ? (
              <TouchableOpacity 
                style={[modalStyles.actionButton, modalStyles.cancelButton]}
                onPress={() => handleAction('cancel')}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'cancel' ? (
                  <ActivityIndicator size="small" color="#C62828" />
                ) : (
                  <>
                    <Ionicons name="ban-outline" size={20} color="#C62828" />
                    <Text style={modalStyles.cancelButtonText}>Cancel Booking</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const OwnerBookings = () => {
  const [bookings, setBookings] = useState<BookingWithScreen[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithScreen[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithScreen | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter bookings based on selected filter
  useEffect(() => {
    let filtered = bookings;
    
    if (selectedFilter !== 'all') {
      filtered = bookings.filter(item => item.booking.status === selectedFilter);
    }
    
    setFilteredBookings(filtered);
  }, [bookings, selectedFilter]);

  const loadBookings = useCallback(async () => {
    try {
      setError(null);
      const ownerBookings = await BookingService.getOwnerBookings();
      
      // Fetch screen data for each booking
      const bookingsWithScreens = await Promise.all(
        ownerBookings.map(async (booking) => {
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
    } catch (err) {
      console.error('Error loading owner bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const handleBookingAction = async (action: 'accept' | 'decline' | 'cancel', bookingId: string) => {
    // Show confirmation dialog for cancel action
    if (action === 'cancel') {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking? The customer will be notified and may receive a refund.',
        [
          {
            text: 'Keep Booking',
            style: 'cancel',
          },
          {
            text: 'Cancel Booking',
            style: 'destructive',
            onPress: () => performBookingAction(action, bookingId),
          },
        ]
      );
      return;
    }
    
    // For other actions, proceed directly
    performBookingAction(action, bookingId);
  };

  const performBookingAction = async (action: 'accept' | 'decline' | 'cancel', bookingId: string) => {
    try {
      if (action === 'accept') {
        await BookingService.acceptBooking(bookingId as BookingId);
        Alert.alert('Booking Accepted', 'The booking has been accepted and the customer will be notified.');
      } else if (action === 'decline') {
        await BookingService.declineBooking(bookingId as BookingId);
        Alert.alert('Booking Declined', 'The booking has been declined and the customer will be notified.');
      } else if (action === 'cancel') {
        await BookingService.ownerCancelBooking(bookingId as BookingId);
        Alert.alert('Booking Cancelled', 'The booking has been cancelled and the customer will be notified.');
      }
      
      // Refresh the list
      loadBookings();
    } catch (err) {
      console.error(`Error ${action}ing booking:`, err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Handle specific error for cancelled bookings
      if (errorMessage === 'This booking has been cancelled by the customer') {
        Alert.alert('Booking Already Cancelled', 'This booking has been cancelled by the customer. The list will be refreshed.');
        loadBookings();
      } else if (errorMessage.includes('Cannot accept this booking because the following dates are already reserved:')) {
        // Handle date conflict error
        Alert.alert(
          'Date Conflict', 
          `${errorMessage}\n\nThese dates may have been booked by another customer after this request was made. Please refresh the list to see the most current bookings.`,
          [
            {
              text: 'Refresh List',
              onPress: () => loadBookings(),
            }
          ]
        );
      } else {
        Alert.alert('Error', `Failed to ${action} booking. Please try again.`);
      }
      throw err; // Re-throw to handle loading state in modal
    }
  };

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
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

  const renderBookingItem = ({ item }: { item: BookingWithScreen }) => {
    const { booking, screen } = item;
    const statusConfig = OWNER_STATUS_CONFIG[booking.status];

    return (
      <TouchableOpacity 
        style={[
          styles.bookingCard,
          statusConfig.needsAction && styles.bookingCardActive
        ]}
        onPress={() => handleBookingPress(item)}
        activeOpacity={0.7}
      >
        {statusConfig.needsAction && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

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
        </View>

        {/* Quick Actions for Requests */}
        {statusConfig.needsAction && (
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickActionButton, styles.declineQuickButton]}
              onPress={() => handleBookingAction('decline', booking.id)}
            >
              <Ionicons name="close-outline" size={16} color="#C62828" />
              <Text style={styles.declineQuickButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionButton, styles.acceptQuickButton]}
              onPress={() => handleBookingAction('accept', booking.id)}
            >
              <Ionicons name="checkmark-outline" size={16} color={COLORS.background} />
              <Text style={styles.acceptQuickButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel Button for Accepted Bookings */}
        {statusConfig.canCancel && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => handleBookingAction('cancel', booking.id)}
          >
            <Ionicons name="ban-outline" size={16} color="#C62828" />
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
          <Text style={styles.loadingText}>Loading booking requests...</Text>
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
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Booking Requests</Text>
        <Text style={styles.headerSubtitle}>Manage requests for your screens</Text>
      </View>
      
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
                onPress={() => setSelectedFilter(item.id)}
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
          <Text style={styles.emptyTitle}>No Booking Requests</Text>
          <Text style={styles.emptySubtitle}>
            When users request to book your screens, they&apos;ll appear here.
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
        onAction={handleBookingAction}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.muted,
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
    position: 'relative',
  },
  bookingCardActive: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  newBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  declineQuickButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  acceptQuickButton: {
    backgroundColor: COLORS.accent,
  },
  declineQuickButtonText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptQuickButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelButtonText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
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
  individualDatesContainer: {
    marginTop: 16,
  },
  individualDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  individualDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateChip: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.background,
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
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  declineButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  acceptButton: {
    backgroundColor: COLORS.accent,
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  declineButtonText: {
    color: '#C62828',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#C62828',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OwnerBookings;