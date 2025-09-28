import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { COLORS } from '../../constants/Colors';
import { auth, db } from '../../FirebaseConfig';

interface PrivacySettings {
  showEmail: boolean;
  showPhone: boolean;
  allowMarketing: boolean;
  allowAnalytics: boolean;
  twoFactorEnabled: boolean;
}

export default function SecurityPrivacyScreen() {
  const [user] = useAuthState(auth);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    showEmail: false,
    showPhone: false,
    allowMarketing: true,
    allowAnalytics: true,
    twoFactorEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPrivacySettings();
    }
  }, [user]);

  const loadPrivacySettings = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPrivacySettings({
          showEmail: data.privacySettings?.showEmail || false,
          showPhone: data.privacySettings?.showPhone || false,
          allowMarketing: data.privacySettings?.allowMarketing || true,
          allowAnalytics: data.privacySettings?.allowAnalytics || true,
          twoFactorEnabled: data.privacySettings?.twoFactorEnabled || false,
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (setting: keyof PrivacySettings, value: boolean) => {
    if (!user) return;

    const newSettings = { ...privacySettings, [setting]: value };
    setPrivacySettings(newSettings);

    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', user.uid), {
        'privacySettings': newSettings,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      Alert.alert('Error', 'Failed to update privacy settings');
      setPrivacySettings(privacySettings); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) {
      Alert.alert('Error', 'Unable to change password');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      
      Alert.alert('Success', 'Password updated successfully');
      setChangePasswordModalVisible(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Please contact support to delete your account. We need to ensure all active bookings are handled properly.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading security settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Security & Privacy</Text>
          <Text style={styles.headerSubtitle}>Manage your account security and privacy preferences</Text>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setChangePasswordModalVisible(true)}
          >
            <View style={styles.settingContent}>
              <Ionicons name="key-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingDescription}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                <Text style={styles.settingDescription}>Add an extra layer of security</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.twoFactorEnabled}
              onValueChange={(value) => handleSettingChange('twoFactorEnabled', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={privacySettings.twoFactorEnabled ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Show Email in Profile</Text>
                <Text style={styles.settingDescription}>Allow others to see your email address</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.showEmail}
              onValueChange={(value) => handleSettingChange('showEmail', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={privacySettings.showEmail ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="call-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Show Phone in Profile</Text>
                <Text style={styles.settingDescription}>Allow others to see your phone number</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.showPhone}
              onValueChange={(value) => handleSettingChange('showPhone', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={privacySettings.showPhone ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>
        </View>

        {/* Data & Analytics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Analytics</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="analytics-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Analytics & Performance</Text>
                <Text style={styles.settingDescription}>Help us improve the app</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.allowAnalytics}
              onValueChange={(value) => handleSettingChange('allowAnalytics', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={privacySettings.allowAnalytics ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Ionicons name="megaphone-outline" size={20} color={COLORS.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Marketing Communications</Text>
                <Text style={styles.settingDescription}>Receive updates and promotional content</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.allowMarketing}
              onValueChange={(value) => handleSettingChange('allowMarketing', value)}
              trackColor={{ false: COLORS.muted + '40', true: COLORS.accent + '40' }}
              thumbColor={privacySettings.allowMarketing ? COLORS.accent : COLORS.muted}
              disabled={saving}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
            <View style={styles.settingContent}>
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: '#FF4444' }]}>Delete Account</Text>
                <Text style={styles.settingDescription}>Permanently delete your account and data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* Change Password Modal */}
        {changePasswordModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Change Password</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Current Password"
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData({...passwordData, currentPassword: text})}
                secureTextEntry
                placeholderTextColor={COLORS.muted}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="New Password"
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData({...passwordData, newPassword: text})}
                secureTextEntry
                placeholderTextColor={COLORS.muted}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Confirm New Password"
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData({...passwordData, confirmPassword: text})}
                secureTextEntry
                placeholderTextColor={COLORS.muted}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setChangePasswordModalVisible(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalSaveButton, passwordLoading && styles.modalButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator color={COLORS.background} size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Change Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    marginTop: 8,
  },
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
  dangerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFEBEB',
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
  
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.muted,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.muted,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  bottomSpacing: {
    height: 24,
  },
});