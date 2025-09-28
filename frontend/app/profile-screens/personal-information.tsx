import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLORS } from '../../constants/Colors';
import { auth, db } from '../../FirebaseConfig';

interface UserInfo {
  displayName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  userType: 'owner' | 'creator' | 'both';
}

export default function PersonalInformationScreen() {
  const [user] = useAuthState(auth);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    displayName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    userType: 'creator',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserInfo();
    }
  }, [user]);

  const loadUserInfo = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserInfo({
          displayName: data.displayName || user.displayName || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          company: data.company || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          userType: data.userType || 'creator',
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      Alert.alert('Error', 'Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: userInfo.displayName,
        phone: userInfo.phone,
        company: userInfo.company,
        address: userInfo.address,
        city: userInfo.city,
        state: userInfo.state,
        zipCode: userInfo.zipCode,
        updatedAt: new Date(),
      });

      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating user info:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    loadUserInfo(); // Reset to original values
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(!editing)}
          >
            <Ionicons 
              name={editing ? 'close' : 'pencil'} 
              size={20} 
              color={COLORS.accent} 
            />
          </TouchableOpacity>
        </View>

        {/* Profile Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userInfo.displayName.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
              </Text>
            </View>
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryName}>{userInfo.displayName || 'Not set'}</Text>
            <Text style={styles.summaryEmail}>{userInfo.email}</Text>
            <View style={styles.userTypeTag}>
              <Text style={styles.userTypeText}>
                {userInfo.userType === 'owner' ? 'Screen Owner' : 
                 userInfo.userType === 'creator' ? 'Content Creator' : 'Owner & Creator'}
              </Text>
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={userInfo.displayName}
              onChangeText={(text) => setUserInfo({...userInfo, displayName: text})}
              placeholder="Enter your full name"
              editable={editing}
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={userInfo.email}
              editable={false}
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.inputNote}>Email cannot be changed here</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={userInfo.phone}
              onChangeText={(text) => setUserInfo({...userInfo, phone: text})}
              placeholder="Enter your phone number"
              editable={editing}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company/Organization</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={userInfo.company}
              onChangeText={(text) => setUserInfo({...userInfo, company: text})}
              placeholder="Enter your company name (optional)"
              editable={editing}
              placeholderTextColor={COLORS.muted}
            />
          </View>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Street Address</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={userInfo.address}
              onChangeText={(text) => setUserInfo({...userInfo, address: text})}
              placeholder="Enter your street address"
              editable={editing}
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={userInfo.city}
                onChangeText={(text) => setUserInfo({...userInfo, city: text})}
                placeholder="City"
                editable={editing}
                placeholderTextColor={COLORS.muted}
              />
            </View>
            
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={userInfo.state}
                onChangeText={(text) => setUserInfo({...userInfo, state: text})}
                placeholder="State"
                editable={editing}
                placeholderTextColor={COLORS.muted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP Code</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={userInfo.zipCode}
              onChangeText={(text) => setUserInfo({...userInfo, zipCode: text})}
              placeholder="Enter ZIP code"
              editable={editing}
              keyboardType="numeric"
              placeholderTextColor={COLORS.muted}
            />
          </View>
        </View>

        {editing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  editButton: {
    padding: 8,
  },
  
  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.background,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  summaryEmail: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
  },
  userTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  
  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  
  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputDisabled: {
    backgroundColor: COLORS.primary + '10',
    color: COLORS.muted,
  },
  inputNote: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.muted,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.muted,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  bottomSpacing: {
    height: 24,
  },
});