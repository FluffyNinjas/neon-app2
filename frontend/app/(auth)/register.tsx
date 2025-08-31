import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../FirebaseConfig';
import { router } from 'expo-router';
import { 
  buildNewUser, 
  userConverter, 
  paths,
  type UserType 
} from '../../shared/models/firestore';
import { COLORS } from '../../constants/Colors';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userType, setUserType] = useState<UserType>('creator');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, {
        displayName: displayName.trim(),
      });

      // Create Firestore user document using shared model
      const newUserData = buildNewUser({
        email: email.trim(),
        displayName: displayName.trim(),
        userType,
        isVerified: false,
      });

      const userDocRef = doc(db, ...paths.user(user.uid as any)).withConverter(userConverter);
      await setDoc(userDocRef, { id: user.uid as any, ...newUserData });

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Join NEON</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Display Name *"
              placeholderTextColor={COLORS.muted}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
            />

            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.muted}
              placeholder="Email *"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password *"
              placeholderTextColor={COLORS.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              placeholderTextColor={COLORS.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
            />

            <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeLabel}>I want to:</Text>
              
              <TouchableOpacity 
                style={[
                  styles.userTypeOption,
                  userType === 'creator' && styles.userTypeOptionSelected
                ]}
                onPress={() => setUserType('creator')}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    userType === 'creator' && styles.radioSelected
                  ]} />
                </View>
                <View style={styles.userTypeText}>
                  <Text style={styles.userTypeTitle}>Rent screens</Text>
                  <Text style={styles.userTypeDescription}>Display my content on screens</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.userTypeOption,
                  userType === 'owner' && styles.userTypeOptionSelected
                ]}
                onPress={() => setUserType('owner')}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    userType === 'owner' && styles.radioSelected
                  ]} />
                </View>
                <View style={styles.userTypeText}>
                  <Text style={styles.userTypeTitle}>List my screens</Text>
                  <Text style={styles.userTypeDescription}>Rent out my advertising screens</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.userTypeOption,
                  userType === 'both' && styles.userTypeOptionSelected
                ]}
                onPress={() => setUserType('both')}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    userType === 'both' && styles.radioSelected
                  ]} />
                </View>
                <View style={styles.userTypeText}>
                  <Text style={styles.userTypeTitle}>Both</Text>
                  <Text style={styles.userTypeDescription}>List screens and rent them</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: COLORS.muted,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: COLORS.text,
  },
  userTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  userTypeOptionSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.primary,
  },
  radioContainer: {
    marginRight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  radioSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  userTypeText: {
    flex: 1,
  },
  userTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.text,
  },
  userTypeDescription: {
    fontSize: 14,
    color: COLORS.muted,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: COLORS.muted,
  },
  linkText: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
});