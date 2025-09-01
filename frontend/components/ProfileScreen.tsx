import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../constants/Colors';
import { userService, UserHelpers, UserDoc } from '../services/user/useService';

interface ProfileScreenProps {
  userType: 'user' | 'owner';
}

export default function ProfileScreen({ userType: initialUserType }: ProfileScreenProps) {
  const [currentUserType, setCurrentUserType] = useState<'user' | 'owner'>(initialUserType);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isOwner = currentUserType === 'owner';

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = await userService.getCurrentUser();
        if (user) {
          setUserData(user);
          // Update current user type based on fetched data
          if (UserHelpers.isOwner(user) && !UserHelpers.isCreator(user)) {
            setCurrentUserType('owner');
          } else if (UserHelpers.isCreator(user) && !UserHelpers.isOwner(user)) {
            setCurrentUserType('user');
          } else if (user.userType === 'both') {
            // Keep the initial user type for 'both' users
            setCurrentUserType(initialUserType);
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [initialUserType]);

  // Subscribe to real-time user updates
  useEffect(() => {
    const unsubscribe = userService.subscribeToCurrentUser((user) => {
      if (user) {
        setUserData(user);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleModeSwitch = async () => {
    if (!userData) return;
    
    const newMode = isOwner ? 'user' : 'owner';
    const modeText = isOwner ? 'User Mode' : 'Owner Mode';
    
    Alert.alert(
      'Switch Mode',
      `Switch to ${modeText}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch',
          style: 'default',
          onPress: async () => {
            try {
              setCurrentUserType(newMode);
              // Update user type in database if user doesn't have 'both' capability
              if (userData.userType !== 'both') {
                const newUserType = newMode === 'owner' ? 'owner' : 'creator';
                await userService.updateUserType(userData.id, newUserType);
              }
              // Navigate to the appropriate tab layout
              if (newMode === 'owner') {
                router.replace('/(owners)/dashboard');
              } else {
                router.replace('/(users)/home');
              }
            } catch (error) {
              console.error('Error switching mode:', error);
              Alert.alert('Error', 'Failed to switch mode. Please try again.');
            }
          },
        },
      ]
    );
  };

  const profileSections = [
    {
      title: 'Account',
      items: [
        { label: 'Personal Information', icon: 'person-outline' as const },
        { label: 'Security & Privacy', icon: 'shield-outline' as const },
        { label: 'Notifications', icon: 'notifications-outline' as const },
      ],
    },
    {
      title: isOwner ? 'Business' : 'Activity',
      items: isOwner
        ? [
            { label: 'Screen Management', icon: 'tv-outline' as const },
            { label: 'Revenue Analytics', icon: 'analytics-outline' as const },
            { label: 'Payout Settings', icon: 'card-outline' as const },
          ]
        : [
            { label: 'Booking History', icon: 'time-outline' as const },
            { label: 'Saved Screens', icon: 'heart-outline' as const },
            { label: 'Payment Methods', icon: 'card-outline' as const },
          ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', icon: 'help-circle-outline' as const },
        { label: 'Contact Support', icon: 'mail-outline' as const },
        { label: 'Terms & Privacy', icon: 'document-text-outline' as const },
      ],
    },
  ];

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.muted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              // Re-trigger the useEffect
              userService.getCurrentUser()
                .then(setUserData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show profile if user data is available
  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={COLORS.muted} />
          <Text style={styles.errorText}>No user data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {userData.photoURL ? (
                <View>
                  {/* TODO: Add Image component for photoURL */}
                  <Ionicons name="person" size={40} color={COLORS.text} />
                </View>
              ) : (
                <Text style={styles.avatarText}>
                  {UserHelpers.getInitials(userData)}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.name}>
            {UserHelpers.getDisplayName(userData)}
          </Text>
          <Text style={styles.email}>{userData.email}</Text>
          <View style={styles.userTypeBadge}>
            <Text style={styles.userTypeText}>
              {isOwner ? 'Screen Owner' : 'Content Creator'}
              {userData.userType === 'both' && ' • Dual Mode'}
            </Text>
          </View>
          {UserHelpers.isVerified(userData) && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Profile Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity key={itemIndex} style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={22} color={COLORS.secondary} />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.text} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Action Button for Mode Switching */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleModeSwitch}>
        <Ionicons 
          name={isOwner ? "person-outline" : "business-outline"} 
          size={24} 
          color={COLORS.background} 
        />
      </TouchableOpacity>
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
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 12,
  },
  userTypeBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.muted,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 4,
  },
});