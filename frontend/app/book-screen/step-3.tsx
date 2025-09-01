import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { useScreenCreationStore } from '../../stores/useScreenCreationStore';
import StepLayout from '../../components/StepLayout';

const screenSizes = [
  '32"', '43"', '50"', '55"', '65"', '75"', '85"', '98"',
  'Small (< 40")', 'Medium (40"-60")', 'Large (60"-80")', 'Extra Large (> 80")',
  'Custom Size'
];

const resolutions = [
  '1920x1080 (Full HD)',
  '2560x1440 (2K)',
  '3840x2160 (4K)',
  '7680x4320 (8K)',
  'Custom Resolution'
];

export default function Step3Details() {
  const { details, setDetails, isStepComplete } = useScreenCreationStore();

  const handleNext = () => {
    if (isStepComplete(3)) {
      router.push('/book-screen/step-4');
    }
  };

  const handleDetailsChange = (field: string, value: string) => {
    setDetails({ [field]: value });
  };

  return (
    <StepLayout
      currentStep={3}
      totalSteps={7}
      title="Tell us about your screen"
      onNext={handleNext}
      nextButtonDisabled={!isStepComplete(3)}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <Text style={styles.subtitle}>
          Provide details that will help renters understand your screen
        </Text>

        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Screen Title *
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g., Times Square LED Wall"
                placeholderTextColor={COLORS.muted}
                value={details.title}
                onChangeText={(value) => handleDetailsChange('title', value)}
                maxLength={50}
              />
            </View>
            <Text style={styles.characterCount}>
              {details.title.length}/50
            </Text>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description *
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your screen's location, visibility, audience, and any special features..."
                placeholderTextColor={COLORS.muted}
                value={details.description}
                onChangeText={(value) => handleDetailsChange('description', value)}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.characterCount}>
              {details.description.length}/500
            </Text>
          </View>

          {/* Screen Size */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Screen Size *
            </Text>
            <View style={styles.quickOptions}>
              {screenSizes.map((size, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickOption,
                    details.screenSize === size && styles.quickOptionSelected,
                  ]}
                  onPress={() => handleDetailsChange('screenSize', size)}
                >
                  <Text
                    style={[
                      styles.quickOptionText,
                      details.screenSize === size && styles.quickOptionTextSelected,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Or enter custom size"
                placeholderTextColor={COLORS.muted}
                value={details.screenSize}
                onChangeText={(value) => handleDetailsChange('screenSize', value)}
              />
            </View>
          </View>

          {/* Resolution */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Resolution *
            </Text>
            <View style={styles.quickOptions}>
              {resolutions.map((resolution, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickOption,
                    details.resolution === resolution && styles.quickOptionSelected,
                  ]}
                  onPress={() => handleDetailsChange('resolution', resolution)}
                >
                  <Text
                    style={[
                      styles.quickOptionText,
                      details.resolution === resolution && styles.quickOptionTextSelected,
                    ]}
                  >
                    {resolution}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Or enter custom resolution"
                placeholderTextColor={COLORS.muted}
                value={details.resolution}
                onChangeText={(value) => handleDetailsChange('resolution', value)}
              />
            </View>
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
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    fontSize: 16,
    color: COLORS.text,
    minHeight: 24,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  quickOptionSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  quickOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  quickOptionTextSelected: {
    color: COLORS.background,
  },
});