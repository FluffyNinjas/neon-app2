import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { useBookingStore } from '../../stores/bookingStore';

export default function BookingConfirmation() {
  const router = useRouter();
  
  const { screen, selectedDates, totalAmount, clearBooking } = useBookingStore();
  
  // If no screen data available, redirect to information page
  if (!screen) {
    router.replace('/booking-screen');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmation</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Booking Confirmation</Text>
        <Text style={styles.subtitle}>Screen: {screen.title}</Text>
        <Text style={styles.subtitle}>Selected dates: {selectedDates.length}</Text>
        <Text style={styles.subtitle}>Total: ${(totalAmount / 100).toFixed(0)}</Text>
        <Text style={styles.placeholder}>Payment and confirmation coming soon...</Text>
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 16,
    color: COLORS.secondary,
    fontStyle: 'italic',
  },
});