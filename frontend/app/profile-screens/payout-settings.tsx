import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS } from '../../constants/Colors';

export default function PayoutSettingsScreen() {
  const handleConnectStripe = () => {
    Alert.alert('Stripe Integration', 'Stripe account connection will be implemented here.');
  };

  const handleUpdateBankAccount = () => {
    Alert.alert('Bank Account', 'Bank account update will be implemented here.');
  };

  const handleViewPayoutHistory = () => {
    Alert.alert('Payout History', 'Payout history view will be implemented here.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Payout Settings</Text>
          <Text style={styles.subtitle}>Manage your payment and payout preferences</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stripe Account</Text>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Connect Stripe Account</Text>
              <Text style={styles.cardDescription}>
                Connect your Stripe account to receive payments from screen rentals
              </Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, styles.disconnectedDot]} />
                <Text style={styles.statusText}>Not Connected</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleConnectStripe}>
              <Text style={styles.primaryButtonText}>Connect Stripe</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Account</Text>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Bank Account Details</Text>
              <Text style={styles.cardDescription}>
                Your bank account information for receiving payouts
              </Text>
              <Text style={styles.placeholderText}>No bank account connected</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleUpdateBankAccount}>
              <Text style={styles.secondaryButtonText}>Add Bank Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Schedule</Text>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Automatic Payouts</Text>
              <Text style={styles.cardDescription}>
                Set when you want to receive your earnings
              </Text>
              <Text style={styles.placeholderText}>Weekly on Fridays (Default)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Overview</Text>
          <View style={styles.card}>
            <View style={styles.earningsContainer}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Available Balance</Text>
                <Text style={styles.earningsAmount}>$0.00</Text>
              </View>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Pending Payouts</Text>
                <Text style={styles.earningsAmount}>$0.00</Text>
              </View>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Total Earned</Text>
                <Text style={styles.earningsAmount}>$0.00</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleViewPayoutHistory}>
              <Text style={styles.secondaryButtonText}>View Payout History</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  disconnectedDot: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border || COLORS.muted,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  earningsContainer: {
    marginBottom: 16,
  },
  earningsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E5E5',
  },
  earningsLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});