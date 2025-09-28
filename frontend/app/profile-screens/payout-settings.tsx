import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { COLORS } from '../../constants/Colors';
import { httpsCallable } from 'firebase/functions';
import { functions, auth, db } from '../../FirebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';

interface StripeAccountStatus {
  accountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: any;
}

export default function PayoutSettingsScreen() {
  const [user] = useAuthState(auth);
  const [stripeAccount, setStripeAccount] = useState<StripeAccountStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const createConnectAccount = httpsCallable(functions, 'createConnectAccount');
  const createAccountLink = httpsCallable(functions, 'createAccountLink');
  const getAccountStatus = httpsCallable(functions, 'getAccountStatus');

  useEffect(() => {
    if (user) {
      loadUserStripeInfo();
    } else {
      setIsLoading(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserStripeInfo = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.stripeAccountId) {
          // User has a Stripe account, fetch its status
          const result = await getAccountStatus({ accountId: userData.stripeAccountId });
          const data = result.data as any;
          
          setStripeAccount({
            accountId: data.accountId,
            chargesEnabled: data.chargesEnabled,
            payoutsEnabled: data.payoutsEnabled,
            detailsSubmitted: data.detailsSubmitted,
            requirements: data.requirements,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user Stripe info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to connect your Stripe account.');
      return;
    }

    console.log('Starting Stripe Connect flow for user:', user.email);
    setIsConnecting(true);

    try {
      // Create Stripe Connect account
      console.log('Calling createConnectAccount...');
      const accountResult = await createConnectAccount({
        email: user.email || '',
        country: 'US'
      });
      
      console.log('Account creation result:', accountResult);
      const accountData = accountResult.data as any;
      
      if (accountData.success && accountData.accountId) {
        console.log('Account created successfully:', accountData.accountId);
        
        // Create account link for onboarding
        console.log('Creating account link...');
        const linkResult = await createAccountLink({
          accountId: accountData.accountId,
          returnUrl: 'https://finalneon-30e6e.web.app/onboard/complete',
          refreshUrl: 'https://finalneon-30e6e.web.app/onboard/refresh'
        });
        
        console.log('Account link result:', linkResult);
        const linkData = linkResult.data as any;
        
        if (linkData.success && linkData.url) {
          console.log('Account link created, opening URL:', linkData.url);
          
          // Set account info before opening link
          setStripeAccount({
            accountId: accountData.accountId,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
          });
          
          // Open Stripe onboarding in browser
          const supported = await Linking.canOpenURL(linkData.url);
          if (supported) {
            await Linking.openURL(linkData.url);
            Alert.alert(
              'Stripe Onboarding',
              'Please complete the Stripe onboarding process in your browser, then return to the app and tap "Refresh" to update your account status.'
            );
          } else {
            Alert.alert('Error', 'Cannot open Stripe onboarding link');
          }
        } else {
          console.error('Failed to create account link:', linkData);
          Alert.alert('Error', 'Failed to create onboarding link');
        }
      } else {
        console.error('Failed to create account:', accountData);
        Alert.alert('Error', 'Failed to create Stripe account');
      }
    } catch (error: any) {
      console.error('Error connecting Stripe account:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      
      let errorMessage = 'Failed to connect Stripe account. Please try again.';
      
      if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Authentication error. Please log out and log back in.';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.';
      } else if (error.code === 'functions/internal') {
        errorMessage = 'Internal server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Connection Error', errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (user) {
      setIsLoading(true);
      await loadUserStripeInfo();
    }
  };

  const handleUpdateBankAccount = () => {
    Alert.alert('Bank Account', 'Bank account details are managed through your Stripe dashboard. Use the "Reconnect" button to access your account settings.');
  };

  const handleViewPayoutHistory = () => {
    Alert.alert('Payout History', 'Payout history will be available after you complete your first transaction.');
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
                <View style={[
                  styles.statusDot, 
                  stripeAccount?.detailsSubmitted ? styles.connectedDot : styles.disconnectedDot
                ]} />
                <Text style={styles.statusText}>
                  {isLoading 
                    ? 'Loading...' 
                    : stripeAccount?.detailsSubmitted 
                      ? 'Connected' 
                      : 'Not Connected'
                  }
                </Text>
              </View>
              {stripeAccount?.accountId && !stripeAccount.detailsSubmitted && (
                <Text style={styles.warningText}>
                  Account created but onboarding incomplete. Please complete setup.
                </Text>
              )}
              {stripeAccount?.detailsSubmitted && (
                <View style={styles.accountInfo}>
                  <Text style={styles.accountInfoText}>
                    ✓ Charges enabled: {stripeAccount.chargesEnabled ? 'Yes' : 'No'}
                  </Text>
                  <Text style={styles.accountInfoText}>
                    ✓ Payouts enabled: {stripeAccount.payoutsEnabled ? 'Yes' : 'No'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[
                  styles.primaryButton, 
                  (isConnecting || isLoading) && styles.disabledButton,
                  stripeAccount?.accountId && styles.buttonFlex
                ]} 
                onPress={handleConnectStripe}
                disabled={isConnecting || isLoading}
              >
                <Text style={styles.primaryButtonText}>
                  {isConnecting 
                    ? 'Connecting...' 
                    : stripeAccount?.accountId 
                      ? 'Reconnect' 
                      : 'Connect Stripe'
                  }
                </Text>
              </TouchableOpacity>
              {stripeAccount?.accountId && (
                <TouchableOpacity 
                  style={[
                    styles.secondaryButton,
                    styles.buttonFlex,
                    isLoading && styles.disabledButton
                  ]}
                  onPress={handleRefreshStatus}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
  connectedDot: {
    backgroundColor: '#4CAF50',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    fontStyle: 'italic',
  },
  accountInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 4,
  },
  accountInfoText: {
    fontSize: 12,
    color: '#2E7D32',
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonFlex: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.6,
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