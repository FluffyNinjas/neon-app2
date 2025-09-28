import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { COLORS } from '../../constants/Colors';
import { auth, db, functions } from '../../FirebaseConfig';

interface Booking {
  id: string;
  screenId: string;
  screenTitle: string;
  screenAddress: string;
  ownerId: string;
  ownerName: string;
  dates: string[];
  amountTotal: number;
  status: 'requested' | 'accepted' | 'live' | 'completed' | 'declined' | 'cancelled';
  paymentStatus?: string;
  paymentIntentId?: string;
  createdAt: any;
  specialInstructions?: string;
  contentTitle?: string;
}

export default function BookingHistoryScreen() {
  const [user] = useAuthState(auth);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  const cancelBooking = httpsCallable(functions, 'cancelBooking');

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = () => {
    if (!user) return;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingData: Booking[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        bookingData.push({
          id: doc.id,
          screenId: data.screenId,
          screenTitle: data.screenTitle || 'Unknown Screen',
          screenAddress: data.screenAddress || 'Address not available',
          ownerId: data.ownerId,
          ownerName: data.ownerName || 'Unknown Owner',
          dates: data.dates || [],
          amountTotal: data.amountTotal || 0,
          status: data.status,
          paymentStatus: data.paymentStatus,
          paymentIntentId: data.paymentIntentId,
          createdAt: data.createdAt,
          specialInstructions: data.specialInstructions,
          contentTitle: data.contentTitle,
        });
      });

      setBookings(bookingData);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = async (bookingId: string, bookingStatus: string) => {
    if (bookingStatus === 'live' || bookingStatus === 'completed') {
      Alert.alert('Cannot Cancel', 'This booking cannot be cancelled as it is already live or completed.');
      return;
    }

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? You will receive a full refund.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking({ bookingId, reason: 'Cancelled by user' });
              Alert.alert('Success', 'Booking cancelled successfully. You will receive a refund.');
            } catch (error: any) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', error.message || 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = (dates: string[]) => {
    if (dates.length === 0) return 'No dates';
    if (dates.length === 1) return formatDate(dates[0]);
    
    const sortedDates = [...dates].sort();
    return `${formatDate(sortedDates[0])} - ${formatDate(sortedDates[sortedDates.length - 1])}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return '#FF9800';
      case 'accepted':
        return '#4CAF50';
      case 'live':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'declined':
      case 'cancelled':
        return '#F44336';
      default:
        return COLORS.muted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'live':
        return 'Live';
      case 'completed':
        return 'Completed';
      case 'declined':
        return 'Declined';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getFilteredBookings = () => {
    switch (filter) {
      case 'active':
        return bookings.filter(b => ['requested', 'accepted', 'live'].includes(b.status));
      case 'completed':
        return bookings.filter(b => b.status === 'completed');
      case 'cancelled':
        return bookings.filter(b => ['declined', 'cancelled'].includes(b.status));
      default:
        return bookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading booking history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Booking History</Text>
          <Text style={styles.headerSubtitle}>{bookings.length} total bookings</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All', count: bookings.length },
              { key: 'active', label: 'Active', count: bookings.filter(b => ['requested', 'accepted', 'live'].includes(b.status)).length },
              { key: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length },
              { key: 'cancelled', label: 'Cancelled', count: bookings.filter(b => ['declined', 'cancelled'].includes(b.status)).length },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  filter === tab.key && styles.filterTabActive
                ]}
                onPress={() => setFilter(tab.key as any)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === tab.key && styles.filterTabTextActive
                  ]}
                >
                  {tab.label}
                </Text>
                <Text
                  style={[
                    styles.filterTabCount,
                    filter === tab.key && styles.filterTabCountActive
                  ]}
                >
                  {tab.count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Booking List */}
        <View style={styles.content}>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.muted} />
              <Text style={styles.emptyStateText}>
                {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {filter === 'all' 
                  ? 'Your bookings will appear here when you make your first reservation'
                  : `You don't have any ${filter} bookings at the moment`
                }
              </Text>
            </View>
          ) : (
            filteredBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                {/* Header */}
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingTitle}>{booking.screenTitle}</Text>
                    <Text style={styles.bookingLocation}>{booking.screenAddress}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
                    <Text style={styles.detailText}>{formatDateRange(booking.dates)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={16} color={COLORS.muted} />
                    <Text style={styles.detailText}>${(booking.amountTotal / 100).toFixed(0)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={16} color={COLORS.muted} />
                    <Text style={styles.detailText}>Owner: {booking.ownerName}</Text>
                  </View>
                  {booking.paymentStatus && (
                    <View style={styles.detailRow}>
                      <Ionicons name="card-outline" size={16} color={COLORS.muted} />
                      <Text style={styles.detailText}>Payment: {booking.paymentStatus}</Text>
                    </View>
                  )}
                </View>

                {/* Content */}
                {booking.contentTitle && (
                  <View style={styles.contentInfo}>
                    <Text style={styles.contentLabel}>Advertisement:</Text>
                    <Text style={styles.contentText}>{booking.contentTitle}</Text>
                  </View>
                )}

                {/* Special Instructions */}
                {booking.specialInstructions && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsLabel}>Instructions:</Text>
                    <Text style={styles.instructionsText}>{booking.specialInstructions}</Text>
                  </View>
                )}

                {/* Actions */}
                {booking.status === 'requested' && (
                  <View style={styles.bookingActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelBooking(booking.id, booking.status)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {booking.status === 'accepted' && (
                  <View style={styles.bookingActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelBooking(booking.id, booking.status)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Booking Date */}
                <View style={styles.bookingFooter}>
                  <Text style={styles.bookingDate}>
                    Booked {booking.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.muted,
  },
  
  // Header
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
    fontSize: 14,
    color: COLORS.muted,
  },
  
  // Filter Tabs
  filterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  filterTabCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  filterTabCountActive: {
    color: COLORS.background,
    backgroundColor: COLORS.background + '30',
  },
  
  // Content
  content: {
    padding: 20,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Booking Cards
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  bookingLocation: {
    fontSize: 14,
    color: COLORS.muted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.text,
  },
  contentInfo: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 2,
  },
  contentText: {
    fontSize: 14,
    color: COLORS.text,
  },
  instructionsContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 18,
  },
  bookingActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  bookingFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  bookingDate: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
});