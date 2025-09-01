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

const suggestedPrices = [
  { label: 'Budget', price: '25' },
  { label: 'Standard', price: '50' },
  { label: 'Premium', price: '100' },
  { label: 'Luxury', price: '200' },
];

export default function Step4Pricing() {
  const { dailyPrice, setDailyPrice, isStepComplete } = useScreenCreationStore();

  const handleNext = () => {
    if (isStepComplete(4)) {
      router.push('/book-screen/step-5');
    }
  };

  const handlePriceSelect = (price: string) => {
    setDailyPrice(price);
  };

  const calculateEstimates = (price: string) => {
    const daily = parseFloat(price) || 0;
    const weekly = daily * 7;
    const monthly = daily * 30;
    return { daily, weekly, monthly };
  };

  const estimates = calculateEstimates(dailyPrice);

  return (
    <StepLayout
      currentStep={4}
      totalSteps={7}
      title="Set your daily price"
      onNext={handleNext}
      nextButtonDisabled={!isStepComplete(4)}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <Text style={styles.subtitle}>
          How much do you want to charge per day for your screen?
        </Text>

        {/* Price Input */}
        <View style={styles.priceInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="0"
            placeholderTextColor={COLORS.muted}
            value={dailyPrice}
            onChangeText={setDailyPrice}
            keyboardType="numeric"
            maxLength={6}
          />
          <Text style={styles.perDay}>/day</Text>
        </View>

        {/* Suggested Prices */}
        <View style={styles.suggestedSection}>
          <Text style={styles.sectionTitle}>Suggested Pricing</Text>
          <View style={styles.suggestedGrid}>
            {suggestedPrices.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestedOption,
                  dailyPrice === item.price && styles.suggestedOptionSelected,
                ]}
                onPress={() => handlePriceSelect(item.price)}
              >
                <Text
                  style={[
                    styles.suggestedLabel,
                    dailyPrice === item.price && styles.suggestedLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.suggestedPrice,
                    dailyPrice === item.price && styles.suggestedPriceSelected,
                  ]}
                >
                  ${item.price}/day
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Earnings Estimate */}
        {dailyPrice && !isNaN(Number(dailyPrice)) && (
          <View style={styles.estimatesSection}>
            <Text style={styles.sectionTitle}>Earnings Estimate</Text>
            <View style={styles.estimatesContainer}>
              <View style={styles.estimateRow}>
                <View style={styles.estimateItem}>
                  <Text style={styles.estimatePeriod}>Daily</Text>
                  <Text style={styles.estimateAmount}>${estimates.daily.toFixed(2)}</Text>
                </View>
                <View style={styles.estimateItem}>
                  <Text style={styles.estimatePeriod}>Weekly</Text>
                  <Text style={styles.estimateAmount}>${estimates.weekly.toFixed(2)}</Text>
                </View>
                <View style={styles.estimateItem}>
                  <Text style={styles.estimatePeriod}>Monthly</Text>
                  <Text style={styles.estimateAmount}>${estimates.monthly.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Pricing Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Pricing Tips</Text>
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              Consider your screen's location, size, and visibility when setting your price
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="trending-up-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              You can adjust your price anytime after listing your screen
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="people-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              Competitive pricing helps attract more bookings
            </Text>
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
    marginBottom: 32,
    lineHeight: 24,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingVertical: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 8,
  },
  priceInput: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    minWidth: 120,
  },
  perDay: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.muted,
    marginLeft: 8,
  },
  suggestedSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  suggestedOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  suggestedOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.accent,
  },
  suggestedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  suggestedLabelSelected: {
    color: COLORS.text,
  },
  suggestedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  suggestedPriceSelected: {
    color: COLORS.accent,
  },
  estimatesSection: {
    marginBottom: 32,
  },
  estimatesContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  estimateItem: {
    alignItems: 'center',
  },
  estimatePeriod: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    marginBottom: 4,
  },
  estimateAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  tipsSection: {
    marginBottom: 24,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});