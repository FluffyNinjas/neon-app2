import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { useScreenCreationStore } from '../../stores/useScreenCreationStore';
import StepLayout from '../../components/StepLayout';

const screenTypes = [
  {
    id: 'digital-billboard',
    title: 'Digital Billboard',
    description: 'Large outdoor digital displays',
    icon: 'library-outline',
  },
  {
    id: 'led-screen',
    title: 'LED Screen',
    description: 'High brightness LED displays',
    icon: 'bulb-outline',
  },
  {
    id: 'lcd-display',
    title: 'LCD Display',
    description: 'Indoor LCD monitors and screens',
    icon: 'desktop-outline',
  },
  {
    id: 'interactive-kiosk',
    title: 'Interactive Kiosk',
    description: 'Touch-enabled interactive displays',
    icon: 'finger-print-outline',
  },
  {
    id: 'projection-screen',
    title: 'Projection Screen',
    description: 'Projector-based displays',
    icon: 'videocam-outline',
  },
  {
    id: 'transit-display',
    title: 'Transit Display',
    description: 'Screens in buses, trains, stations',
    icon: 'train-outline',
  },
  {
    id: 'retail-display',
    title: 'Retail Display',
    description: 'In-store and window displays',
    icon: 'storefront-outline',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Custom or unique screen types',
    icon: 'ellipsis-horizontal-outline',
  },
];

export default function Step1ScreenType() {
  const { screenType, setScreenType, isStepComplete } = useScreenCreationStore();

  const handleSelectType = (type: string) => {
    setScreenType(type);
  };

  const handleNext = () => {
    if (isStepComplete(1)) {
      router.push('/book-screen/step-2');
    }
  };

  return (
    <StepLayout
      currentStep={1}
      totalSteps={7}
      title="What type of screen do you have?"
      onNext={handleNext}
      nextButtonDisabled={!isStepComplete(1)}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <Text style={styles.subtitle}>
          Select the category that best describes your screen
        </Text>

        <View style={styles.optionsContainer}>
          {screenTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.option,
                screenType === type.id && styles.optionSelected,
              ]}
              onPress={() => handleSelectType(type.id)}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIcon}>
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={screenType === type.id ? COLORS.accent : COLORS.secondary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text
                    style={[
                      styles.optionTitle,
                      screenType === type.id && styles.optionTitleSelected,
                    ]}
                  >
                    {type.title}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      screenType === type.id && styles.optionDescriptionSelected,
                    ]}
                  >
                    {type.description}
                  </Text>
                </View>
                {screenType === type.id && (
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
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
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.accent,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  optionDescriptionSelected: {
    color: COLORS.secondary,
  },
  checkIcon: {
    marginLeft: 12,
  },
});