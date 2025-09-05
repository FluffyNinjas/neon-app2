import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { ScreenDoc } from '../shared/models/firestore';
import { ScreenService } from '../services/screenService';
import { screenTypes, getScreenTypeById } from '../constants/ScreenTypes';

interface EditScreenModalProps {
  visible: boolean;
  screen: ScreenDoc | null;
  onClose: () => void;
  onSave: (updatedScreen: ScreenDoc) => void;
}

export const EditScreenModal: React.FC<EditScreenModalProps> = ({
  visible,
  screen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<ScreenDoc>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showScreenTypeDropdown, setShowScreenTypeDropdown] = useState(false);

  useEffect(() => {
    if (screen) {
      setFormData({
        title: screen.title,
        description: screen.description || '',
        screenType: screen.screenType,
        screenResolution: screen.screenResolution || '',
        screenSize: screen.screenSize,
        address: screen.address,
        city: screen.city,
        state: screen.state,
        zipCode: screen.zipCode,
        dayPrice: screen.dayPrice,
        isActive: screen.isActive,
        featured: screen.featured,
      });
      setHasChanges(false);
      setErrors({});
    }
  }, [screen]);

  const updateField = (field: keyof ScreenDoc, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.screenType?.trim()) {
      newErrors.screenType = 'Screen type is required';
    }
    
    if (!formData.screenSize?.trim()) {
      newErrors.screenSize = 'Screen size is required';
    }
    
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state?.trim()) {
      newErrors.state = 'State is required';
    }
    
    // zipCode is optional, no validation needed
    
    if (typeof formData.dayPrice !== 'number' || formData.dayPrice <= 0) {
      newErrors.dayPrice = 'Price must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!screen || !validateForm()) return;

    setIsSaving(true);
    try {
      const updates = {
        title: formData.title!,
        description: formData.description,
        screenType: formData.screenType!,
        screenResolution: formData.screenResolution,
        screenSize: formData.screenSize!,
        address: formData.address!,
        city: formData.city!,
        state: formData.state!,
        zipCode: formData.zipCode!,
        dayPrice: formData.dayPrice!,
        isActive: formData.isActive!,
        featured: formData.featured!,
      };

      await ScreenService.updateScreen(screen.id, updates);
      
      // Create updated screen object for callback
      const updatedScreen: ScreenDoc = {
        ...screen,
        ...updates,
      };
      
      onSave(updatedScreen);
      Alert.alert('Success', 'Screen updated successfully!');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update screen. Please try again.'+error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: onClose 
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderInputField = (
    label: string,
    field: keyof ScreenDoc,
    placeholder?: string,
    multiline = false,
    keyboardType: 'default' | 'numeric' = 'default'
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          errors[field] && styles.inputError,
        ]}
        value={String(formData[field] || '')}
        onChangeText={(value) => {
          const processedValue = keyboardType === 'numeric' 
            ? (value === '' ? 0 : Number(value)) 
            : value;
          updateField(field, processedValue);
        }}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        placeholderTextColor={COLORS.muted}
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderScreenTypeDropdown = () => {
    const selectedType = getScreenTypeById(formData.screenType || '');
    
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Screen Type</Text>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            errors.screenType && styles.inputError,
          ]}
          onPress={() => setShowScreenTypeDropdown(true)}
        >
          <View style={styles.dropdownContent}>
            {selectedType ? (
              <>
                <Ionicons 
                  name={selectedType.icon as any} 
                  size={20} 
                  color={COLORS.accent} 
                  style={styles.dropdownIcon}
                />
                <View style={styles.dropdownTextContainer}>
                  <Text style={styles.dropdownTitle}>{selectedType.title}</Text>
                  <Text style={styles.dropdownDescription}>{selectedType.description}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.dropdownPlaceholder}>Select screen type</Text>
            )}
            <Ionicons 
              name="chevron-down" 
              size={20} 
              color={COLORS.muted} 
            />
          </View>
        </TouchableOpacity>
        {errors.screenType && (
          <Text style={styles.errorText}>{errors.screenType}</Text>
        )}
        
        {/* Screen Type Modal */}
        <Modal
          visible={showScreenTypeDropdown}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowScreenTypeDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownModalTitle}>Select Screen Type</Text>
              <TouchableOpacity 
                onPress={() => setShowScreenTypeDropdown(false)}
                style={styles.dropdownCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dropdownList}>
              {screenTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.dropdownOption,
                    formData.screenType === type.id && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    updateField('screenType', type.id);
                    setShowScreenTypeDropdown(false);
                  }}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={formData.screenType === type.id ? COLORS.accent : COLORS.text} 
                    style={styles.dropdownOptionIcon}
                  />
                  <View style={styles.dropdownOptionText}>
                    <Text style={[
                      styles.dropdownOptionTitle,
                      formData.screenType === type.id && styles.dropdownOptionTitleSelected
                    ]}>
                      {type.title}
                    </Text>
                    <Text style={styles.dropdownOptionDescription}>
                      {type.description}
                    </Text>
                  </View>
                  {formData.screenType === type.id && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color={COLORS.accent} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  };

  const renderSwitchField = (
    label: string,
    field: keyof ScreenDoc,
    description?: string
  ) => (
    <View style={styles.inputGroup}>
      <View style={styles.switchRow}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.inputLabel}>{label}</Text>
          {description && (
            <Text style={styles.switchDescription}>{description}</Text>
          )}
        </View>
        <Switch
          value={Boolean(formData[field])}
          onValueChange={(value) => updateField(field, value)}
          trackColor={{ false: COLORS.muted, true: COLORS.accent }}
          thumbColor={Boolean(formData[field]) ? COLORS.background : COLORS.surface}
        />
      </View>
    </View>
  );

  if (!screen) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleCancel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Edit Screen</Text>
          
          <TouchableOpacity 
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            style={[
              styles.saveButton,
              (!hasChanges || isSaving) && styles.saveButtonDisabled
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={[
                styles.saveButtonText,
                (!hasChanges || isSaving) && styles.saveButtonTextDisabled
              ]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            {renderInputField('Title', 'title', 'Enter screen title')}
            {renderInputField('Description', 'description', 'Enter description (optional)', true)}
            {renderScreenTypeDropdown()}
            {renderInputField('Screen Resolution', 'screenResolution', 'e.g., 1920x1080 (optional)')}
            {renderInputField('Screen Size', 'screenSize', 'e.g., 50", 6x4 feet')}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            {renderInputField('Address', 'address', 'Street address')}
            {renderInputField('City', 'city', 'City name')}
            {renderInputField('State', 'state', 'State or province')}
            {renderInputField('ZIP Code', 'zipCode', 'Postal code (optional)')}
          </View>

          {/* Pricing & Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & Status</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Daily Price</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.priceInput, errors.dayPrice && styles.inputError]}
                  value={formData.dayPrice ? (formData.dayPrice / 100).toString() : ''}
                  onChangeText={(value) => {
                    const numValue = value === '' ? 0 : Number(value) * 100;
                    updateField('dayPrice', numValue);
                  }}
                  placeholder="0"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
                <Text style={styles.priceUnit}>/day</Text>
              </View>
              {errors.dayPrice && (
                <Text style={styles.errorText}>{errors.dayPrice}</Text>
              )}
            </View>

            {renderSwitchField(
              'Active Status', 
              'isActive', 
              'Available for booking'
            )}
            
            {renderSwitchField(
              'Featured', 
              'featured', 
              'Highlight in featured listings'
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonTextDisabled: {
    color: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currencySymbol: {
    fontSize: 16,
    color: COLORS.text,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: 'transparent',
  },
  priceUnit: {
    fontSize: 14,
    color: COLORS.muted,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  dropdownButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownTextContainer: {
    flex: 1,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dropdownDescription: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: COLORS.muted,
    flex: 1,
  },
  dropdownModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dropdownCloseButton: {
    padding: 4,
  },
  dropdownList: {
    flex: 1,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  dropdownOptionSelected: {
    backgroundColor: `${COLORS.accent}10`,
  },
  dropdownOptionIcon: {
    marginRight: 16,
  },
  dropdownOptionText: {
    flex: 1,
  },
  dropdownOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  dropdownOptionTitleSelected: {
    color: COLORS.accent,
  },
  dropdownOptionDescription: {
    fontSize: 14,
    color: COLORS.muted,
  },
});