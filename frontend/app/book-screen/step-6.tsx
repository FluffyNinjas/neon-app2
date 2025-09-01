import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { useScreenCreationStore, AvailabilityDay } from '../../stores/useScreenCreationStore';
import StepLayout from '../../components/StepLayout';

const DAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export default function Step6Availability() {
  const { availability, updateDayAvailability, isStepComplete } = useScreenCreationStore();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const handleNext = () => {
    if (isStepComplete(6)) {
      router.push('/book-screen/step-7');
    }
  };

  const toggleDayAvailability = (day: string, isAvailable: boolean) => {
    updateDayAvailability(day, { isAvailable });
  };

  const updateTime = (day: string, timeType: 'startTime' | 'endTime', time: string) => {
    updateDayAvailability(day, { [timeType]: time });
  };

  const getDayAvailability = (day: string): AvailabilityDay => {
    return availability.find(d => d.day === day) || {
      day: day as any,
      isAvailable: false,
      startTime: '09:00',
      endTime: '18:00',
    };
  };

  const setQuickSchedule = (schedule: 'business' | 'extended' | 'always') => {
    DAYS.forEach(({ key }) => {
      switch (schedule) {
        case 'business':
          updateDayAvailability(key, {
            isAvailable: !['saturday', 'sunday'].includes(key),
            startTime: '09:00',
            endTime: '17:00',
          });
          break;
        case 'extended':
          updateDayAvailability(key, {
            isAvailable: true,
            startTime: '08:00',
            endTime: '20:00',
          });
          break;
        case 'always':
          updateDayAvailability(key, {
            isAvailable: true,
            startTime: '00:00',
            endTime: '23:59',
          });
          break;
      }
    });
  };

  const formatTime = (time: string) => {
    const [hour] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${time.split(':')[1]} ${ampm}`;
  };

  return (
    <StepLayout
      currentStep={6}
      totalSteps={7}
      title="Set your screen availability"
      onNext={handleNext}
      nextButtonDisabled={!isStepComplete(6)}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <Text style={styles.subtitle}>
          Choose when your screen is available for booking
        </Text>

        {/* Quick Schedule Options */}
        <View style={styles.quickScheduleSection}>
          <Text style={styles.sectionTitle}>Quick Setup</Text>
          <View style={styles.quickScheduleButtons}>
            <TouchableOpacity
              style={styles.quickScheduleButton}
              onPress={() => setQuickSchedule('business')}
            >
              <Ionicons name="briefcase-outline" size={20} color={COLORS.accent} />
              <Text style={styles.quickScheduleButtonText}>Business Hours</Text>
              <Text style={styles.quickScheduleDescription}>Mon-Fri, 9AM-5PM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickScheduleButton}
              onPress={() => setQuickSchedule('extended')}
            >
              <Ionicons name="time-outline" size={20} color={COLORS.accent} />
              <Text style={styles.quickScheduleButtonText}>Extended Hours</Text>
              <Text style={styles.quickScheduleDescription}>Daily, 8AM-8PM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickScheduleButton}
              onPress={() => setQuickSchedule('always')}
            >
              <Ionicons name="infinite-outline" size={20} color={COLORS.accent} />
              <Text style={styles.quickScheduleButtonText}>24/7 Available</Text>
              <Text style={styles.quickScheduleDescription}>Always available</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Schedule */}
        <View style={styles.customScheduleSection}>
          <Text style={styles.sectionTitle}>Custom Schedule</Text>
          
          {DAYS.map(({ key, label, short }) => {
            const dayAvail = getDayAvailability(key);
            return (
              <View key={key} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayLabel}>{label}</Text>
                    <Text style={styles.dayShort}>{short}</Text>
                  </View>
                  
                  <Switch
                    value={dayAvail.isAvailable}
                    onValueChange={(value) => toggleDayAvailability(key, value)}
                    trackColor={{ false: COLORS.surface, true: COLORS.accent }}
                    thumbColor={dayAvail.isAvailable ? COLORS.background : COLORS.muted}
                  />
                </View>

                {dayAvail.isAvailable && (
                  <View style={styles.timeSelection}>
                    {/* Start Time */}
                    <View style={styles.timeGroup}>
                      <Text style={styles.timeLabel}>From</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.timeScroller}
                      >
                        {TIME_SLOTS.map((time) => (
                          <TouchableOpacity
                            key={`start-${time}`}
                            style={[
                              styles.timeSlot,
                              dayAvail.startTime === time && styles.timeSlotSelected,
                            ]}
                            onPress={() => updateTime(key, 'startTime', time)}
                          >
                            <Text
                              style={[
                                styles.timeSlotText,
                                dayAvail.startTime === time && styles.timeSlotTextSelected,
                              ]}
                            >
                              {formatTime(time)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* End Time */}
                    <View style={styles.timeGroup}>
                      <Text style={styles.timeLabel}>To</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.timeScroller}
                      >
                        {TIME_SLOTS.map((time) => (
                          <TouchableOpacity
                            key={`end-${time}`}
                            style={[
                              styles.timeSlot,
                              dayAvail.endTime === time && styles.timeSlotSelected,
                            ]}
                            onPress={() => updateTime(key, 'endTime', time)}
                          >
                            <Text
                              style={[
                                styles.timeSlotText,
                                dayAvail.endTime === time && styles.timeSlotTextSelected,
                              ]}
                            >
                              {formatTime(time)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Availability Summary</Text>
          <View style={styles.summary}>
            {availability.filter(day => day.isAvailable).map((day) => (
              <View key={day.day} style={styles.summaryItem}>
                <Text style={styles.summaryDay}>
                  {DAYS.find(d => d.key === day.day)?.short}
                </Text>
                <Text style={styles.summaryTime}>
                  {formatTime(day.startTime)} - {formatTime(day.endTime)}
                </Text>
              </View>
            ))}
            {availability.filter(day => day.isAvailable).length === 0 && (
              <Text style={styles.noAvailability}>
                No availability set. Please select at least one day.
              </Text>
            )}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Availability Tips</Text>
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              More availability means more booking opportunities
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              You can adjust availability anytime after listing
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="time-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              Consider peak hours for your location and audience
            </Text>
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
  quickScheduleSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  quickScheduleButtons: {
    gap: 12,
  },
  quickScheduleButton: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickScheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  quickScheduleDescription: {
    fontSize: 12,
    color: COLORS.muted,
  },
  customScheduleSection: {
    marginBottom: 32,
  },
  dayRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayShort: {
    fontSize: 12,
    color: COLORS.muted,
  },
  timeSelection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  timeGroup: {
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  timeScroller: {
    flexGrow: 0,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginRight: 8,
  },
  timeSlotSelected: {
    backgroundColor: COLORS.accent,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  timeSlotTextSelected: {
    color: COLORS.background,
  },
  summarySection: {
    marginBottom: 32,
  },
  summary: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryDay: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryTime: {
    fontSize: 10,
    color: COLORS.muted,
  },
  noAvailability: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    width: '100%',
  },
  tipsSection: {
    marginBottom: 24,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});