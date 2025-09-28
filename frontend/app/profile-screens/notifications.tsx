import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { COLORS } from '../../constants/Colors';
import { auth, db } from '../../FirebaseConfig';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  marketingUpdates: boolean;
  screenUpdates: boolean;
  systemUpdates: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'system' | 'marketing';
  read: boolean;
  createdAt: Date;
}

export default function NotificationsScreen() {
  const [user] = useAuthState(auth);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    bookingUpdates: true,
    paymentUpdates: true,
    marketingUpdates: false,
    screenUpdates: true,
    systemUpdates: true,
  });
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificationSettings();
      loadRecentNotifications();
    }
  }, [user]);

  const loadNotificationSettings = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.notificationSettings) {
          setSettings(data.notificationSettings);
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentNotifications = () => {
    if (!user) return;

    const notificationsQuery = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          title: data.title,
          message: data.message,
          type: data.type,
          read: data.read || false,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setRecentNotifications(notifications);
    });

    return unsubscribe;
  };

  const handleSettingChange = async (setting: keyof NotificationSettings, value: boolean) => {
    if (!user) return;

    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);

    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', user.uid), {
        notificationSettings: newSettings,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      setSettings(settings); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
        read: true,
        readAt: new Date(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'This feature will be available in a future update.');
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return 'calendar-outline';
      case 'payment':
        return 'card-outline';
      case 'system':
        return 'settings-outline';
      case 'marketing':
        return 'megaphone-outline';
      default:
        return 'notifications-outline';
    }
  };

  const formatNotificationTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Manage your notification preferences</Text>
        </View>

        {/* Recent Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            <TouchableOpacity onPress={clearAllNotifications}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          {recentNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={48} color={COLORS.muted} />
              <Text style={styles.emptyStateText}>No notifications yet</Text>
              <Text style={styles.emptyStateSubtext}>You'll see important updates here</Text>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {recentNotifications.slice(0, 5).map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadNotification,
                  ]}
                  onPress={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <View style={styles.notificationIcon}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type)} 
                      size={20} 
                      color={COLORS.accent} 
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>
                      {formatNotificationTime(notification.createdAt)}
                    </Text>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notification Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Methods</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="phone-portrait-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive notifications on your device</Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={(value) => handleSettingChange('pushEnabled', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.pushEnabled ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Email Notifications</Text>
                <Text style={styles.settingDescription}>Receive updates via email</Text>
              </View>
            </View>
            <Switch
              value={settings.emailEnabled}
              onValueChange={(value) => handleSettingChange('emailEnabled', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.emailEnabled ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>Receive updates via text message</Text>
              </View>
            </View>
            <Switch
              value={settings.smsEnabled}
              onValueChange={(value) => handleSettingChange('smsEnabled', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.smsEnabled ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>
        </View>

        {/* Notification Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Categories</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Booking Updates</Text>
                <Text style={styles.settingDescription}>New bookings, confirmations, and changes</Text>
              </View>
            </View>
            <Switch
              value={settings.bookingUpdates}
              onValueChange={(value) => handleSettingChange('bookingUpdates', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.bookingUpdates ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="card-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Payment Updates</Text>
                <Text style={styles.settingDescription}>Payment confirmations and payouts</Text>
              </View>
            </View>
            <Switch
              value={settings.paymentUpdates}
              onValueChange={(value) => handleSettingChange('paymentUpdates', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.paymentUpdates ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="tv-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Screen Updates</Text>
                <Text style={styles.settingDescription}>Updates about your screens</Text>
              </View>
            </View>
            <Switch
              value={settings.screenUpdates}
              onValueChange={(value) => handleSettingChange('screenUpdates', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.screenUpdates ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="settings-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>System Updates</Text>
                <Text style={styles.settingDescription}>App updates and maintenance notices</Text>
              </View>
            </View>
            <Switch
              value={settings.systemUpdates}
              onValueChange={(value) => handleSettingChange('systemUpdates', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.systemUpdates ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="megaphone-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Marketing Updates</Text>
                <Text style={styles.settingDescription}>Promotional content and feature announcements</Text>
              </View>
            </View>
            <Switch
              value={settings.marketingUpdates}
              onValueChange={(value) => handleSettingChange('marketingUpdates', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={settings.marketingUpdates ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>
        </View>

        <View style={styles.bottomSpacing} />
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  
  // Notifications List
  notificationsList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: COLORS.accent + '08',
    borderWidth: 1,
    borderColor: COLORS.accent + '20',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  
  // Settings
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.muted,
  },
  bottomSpacing: {
    height: 24,
  },
});