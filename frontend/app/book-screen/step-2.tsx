import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { useScreenCreationStore } from '../../stores/useScreenCreationStore';
import StepLayout from '../../components/StepLayout';

export default function Step2Location() {
  const { location, setLocation, isStepComplete } = useScreenCreationStore();

  const handleNext = () => {
    if (isStepComplete(2)) {
      router.push('/book-screen/step-3');
    }
  };

  const handleLocationChange = (field: string, value: string) => {
    setLocation({ [field]: value });
  };

  return (
    <StepLayout
      currentStep={2}
      totalSteps={7}
      title="Where is your screen located?"
      onNext={handleNext}
      nextButtonDisabled={!isStepComplete(2)}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <Text style={styles.subtitle}>
          Provide the address where your screen is installed
        </Text>

        <View style={styles.form}>
          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Street Address *
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                placeholderTextColor={COLORS.muted}
                value={location.address}
                onChangeText={(value) => handleLocationChange('address', value)}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* City and State */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                City *
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={20} color={COLORS.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="New York"
                  placeholderTextColor={COLORS.muted}
                  value={location.city}
                  onChangeText={(value) => handleLocationChange('city', value)}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>
                State *
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="flag-outline" size={20} color={COLORS.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="NY"
                  placeholderTextColor={COLORS.muted}
                  value={location.state}
                  onChangeText={(value) => handleLocationChange('state', value)}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          {/* Zip Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Zip Code
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder="10001"
                placeholderTextColor={COLORS.muted}
                value={location.zipCode}
                onChangeText={(value) => handleLocationChange('zipCode', value)}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.accent} />
          <Text style={styles.infoText}>
            This address will be shown to potential renters. Make sure it's accurate and specific.
          </Text>
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
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
    minHeight: 24,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});