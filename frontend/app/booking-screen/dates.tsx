import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { ScreenService } from '../../services/screenService';
import { ScreenId, IsoDate, WeeklyAvailability, DailyAvailability } from '../../shared/models/firestore';
import { useBookingStore } from '../../stores/bookingStore';

interface CalendarDay {
  date: Date;
  isoDate: IsoDate;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isAvailable: boolean;
  isBooked: boolean;
  isSelected: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Map calendar day to screen availability day
const DAY_MAP: { [key: number]: Exclude<keyof WeeklyAvailability, 'timezone'> } = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
};

export default function BookingDates() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [existingBookings, setExistingBookings] = useState<Set<IsoDate>>(new Set());
  const [loading, setLoading] = useState(true);

  // Zustand store - screen data should already be loaded
  const {
    screen,
    screenId,
    selectedDates,
    addSelectedDate,
    removeSelectedDate,
    clearSelectedDates,
    clearBooking,
  } = useBookingStore();

  useEffect(() => {
    if (screen && screenId) {
      loadExistingBookings(screenId);
    } else {
      // If no screen data, redirect back to information page
      router.replace('/booking-screen' as any);
    }
  }, [screen, screenId]);


  const loadExistingBookings = async (screenId: ScreenId) => {
    try {
      setLoading(true);
      // TODO: Implement actual booking service call
      // For now, mock some existing bookings
      const mockBookings: Set<IsoDate> = new Set([
        '2025-01-10',
        '2025-01-15',
        '2025-01-25'
      ]);
      setExistingBookings(mockBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: IsoDate): string => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const generateCalendarDays = useMemo((): CalendarDay[] => {
    if (!screen) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks worth of days (42 days)
    for (let i = 0; i < 42; i++) {
      const isoDate = currentDate.toISOString().split('T')[0] as IsoDate;
      const dayOfWeek = currentDate.getDay();
      const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth();
      const isPast = currentDate < today;
      const isToday = currentDate.getTime() === today.getTime();
      
      // Check if day is available based on screen's weekly availability
      const availabilityKey = DAY_MAP[dayOfWeek];
      const dayAvailability: DailyAvailability = screen.availability[availabilityKey];
      const isAvailableBySchedule = dayAvailability && dayAvailability.length > 0;
      
      // Check if day is already booked
      const isBooked = existingBookings.has(isoDate);
      
      // Day is available if: not past, not today, available by schedule, not booked, and in current or future months
      const isAvailable = !isPast && !isToday && isAvailableBySchedule && !isBooked && isCurrentMonth;
      
      // Check if day is selected
      const isSelected = selectedDates.includes(isoDate);

      days.push({
        date: new Date(currentDate),
        isoDate,
        dayOfWeek,
        isCurrentMonth,
        isToday,
        isPast,
        isAvailable,
        isBooked,
        isSelected,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [currentMonth, screen, existingBookings, selectedDates]);

  const handleDatePress = (day: CalendarDay) => {
    if (!day.isAvailable) return;

    if (day.isSelected) {
      removeSelectedDate(day.isoDate);
    } else {
      addSelectedDate(day.isoDate);
    }
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const today = new Date();
    
    // Don't allow going to past months
    if (prevMonth.getMonth() >= today.getMonth() && prevMonth.getFullYear() >= today.getFullYear()) {
      setCurrentMonth(prevMonth);
    }
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
            router.replace('/(users)/home');
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleContinue = () => {
    if (selectedDates.length === 0) return;
    router.push('/booking-screen/advertisement');
  };

  const renderCalendarDay = ({ item }: { item: CalendarDay }) => {
    const getDateStyle = () => {
      const baseStyle: any[] = [styles.dayContainer];
      
      if (!item.isCurrentMonth) {
        baseStyle.push(styles.dayInactive);
      } else if (item.isPast || item.isToday) {
        baseStyle.push(styles.dayPast);
      } else if (item.isBooked) {
        baseStyle.push(styles.dayBooked);
      } else if (!item.isAvailable) {
        baseStyle.push(styles.dayUnavailable);
      } else if (item.isSelected) {
        baseStyle.push(styles.daySelected);
      } else {
        baseStyle.push(styles.dayAvailable);
      }
      
      return baseStyle;
    };

    const getTextStyle = () => {
      if (!item.isCurrentMonth) return styles.dayTextInactive;
      if (item.isPast || item.isToday) return styles.dayTextPast;
      if (item.isBooked) return styles.dayTextBooked;
      if (!item.isAvailable) return styles.dayTextUnavailable;
      if (item.isSelected) return styles.dayTextSelected;
      return styles.dayTextAvailable;
    };

    return (
      <TouchableOpacity
        style={getDateStyle()}
        onPress={() => handleDatePress(item)}
        disabled={!item.isAvailable}
        activeOpacity={0.7}
      >
        <Text style={getTextStyle()}>
          {item.date.getDate()}
        </Text>
        {item.isToday && <View style={styles.todayIndicator} />}
        {item.isBooked && <Ionicons name="close" size={8} color={COLORS.muted} style={styles.bookedIndicator} />}
      </TouchableOpacity>
    );
  };

  // If no screen data available, redirect to information page
  if (!screen || !screenId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading availability...</Text>
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
        <Text style={styles.headerTitle}>Select Dates</Text>
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearSelectedDates}
          disabled={selectedDates.length === 0}
        >
          <Text style={[styles.clearText, selectedDates.length === 0 && styles.clearTextDisabled]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Screen Info */}
        <View style={styles.screenInfo}>
          <Text style={styles.screenTitle}>{screen.title}</Text>
          <Text style={styles.screenPrice}>{ScreenService.formatPrice(screen.dayPrice)}</Text>
        </View>

        {/* Selected Dates Summary */}
        {selectedDates.length > 0 && (
          <View style={styles.selectedSummary}>
            <Text style={styles.selectedTitle}>
              Selected Dates ({selectedDates.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedDatesContainer}>
              {selectedDates.map((date) => (
                <View key={date} style={styles.selectedDateChip}>
                  <Text style={styles.selectedDateText}>{formatDate(date)}</Text>
                  <TouchableOpacity onPress={() => removeSelectedDate(date)}>
                    <Ionicons name="close" size={16} color={COLORS.background} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity style={styles.monthButton} onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity style={styles.monthButton} onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayHeader}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <FlatList
          data={generateCalendarDays}
          numColumns={7}
          scrollEnabled={false}
          keyExtractor={(item) => item.isoDate}
          renderItem={renderCalendarDay}
          contentContainerStyle={styles.calendarGrid}
        />

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayAvailable]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.daySelected]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayBooked]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayUnavailable]} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Continue Button */}
      {selectedDates.length > 0 && (
        <View style={styles.bottomContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total for {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''}</Text>
            <Text style={styles.totalAmount}>
              ${((screen.dayPrice * selectedDates.length) / 100).toFixed(0)}
            </Text>
          </View>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

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
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
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
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  clearTextDisabled: {
    color: COLORS.muted,
  },
  content: {
    flex: 1,
  },
  screenInfo: {
    padding: 20,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  screenPrice: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
  selectedSummary: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  selectedDatesContainer: {
    flexDirection: 'row',
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  calendarGrid: {
    paddingHorizontal: 20,
  },
  dayContainer: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayAvailable: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  daySelected: {
    backgroundColor: COLORS.accent,
  },
  dayBooked: {
    backgroundColor: COLORS.primary,
  },
  dayUnavailable: {
    backgroundColor: 'transparent',
  },
  dayPast: {
    backgroundColor: 'transparent',
  },
  dayInactive: {
    backgroundColor: 'transparent',
  },
  dayTextAvailable: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
  dayTextBooked: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.muted,
  },
  dayTextUnavailable: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.muted,
    opacity: 0.5,
  },
  dayTextPast: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.muted,
    opacity: 0.3,
  },
  dayTextInactive: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.muted,
    opacity: 0.2,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  bookedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  legend: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: COLORS.text,
  },
  bottomSpacing: {
    height: 120,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
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
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
});