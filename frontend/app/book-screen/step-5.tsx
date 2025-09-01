import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { useScreenCreationStore } from '../../stores/useScreenCreationStore';
import StepLayout from '../../components/StepLayout';
import * as ImagePicker from 'expo-image-picker';

export default function Step5Pictures() {
  const { images, addImage, removeImage, reorderImages, isStepComplete } = useScreenCreationStore();

  const handleNext = () => {
    if (isStepComplete(5)) {
      router.push('/book-screen/step-6');
    }
  };

  const ensureLibraryPermission = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (res.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access to pick images.');
      return false;
    }
    return true;
  };

  const ensureCameraPermission = async () => {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    if (res.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to take photos.');
      return false;
    }
    return true;
  };

  const handleAddImage = () => {
    Alert.alert('Add Photo', 'Choose photo source', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFromLibrary = async () => {
    if (!(await ensureLibraryPermission())) return;

    const remaining = Math.max(0, 10 - images.length);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,         // iOS 14+, Android 13+; falls back to single on older
      selectionLimit: remaining || 1,        // respect your 10 images limit
      quality: 0.85,                         // compress a bit
      exif: false,
    });

    if (result.canceled) return;

    // result.assets is an array (even in single-pick mode)
    const toAdd = result.assets.slice(0, remaining).map((asset, i) => ({
      id: `${Date.now()}-${i}`,
      uri: asset.uri,
      order: images.length + i,
    }));

    toAdd.forEach(addImage);
  };

  const pickFromCamera = async () => {
    if (!(await ensureCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      exif: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    addImage({
      id: `${Date.now()}`,
      uri: asset.uri,
      order: images.length,
    });
  };
  const handleRemoveImage = (imageId: string) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeImage(imageId)
        },
      ]
    );
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const reorderedImages = [...images];
    const [movedImage] = reorderedImages.splice(fromIndex, 1);
    reorderedImages.splice(toIndex, 0, movedImage);
    
    // Update order numbers
    const updatedImages = reorderedImages.map((img, index) => ({
      ...img,
      order: index,
    }));

    reorderImages(updatedImages);
  };

  const moveImageUp = (index: number) => {
    if (index > 0) {
      handleReorder(index, index - 1);
    }
  };

  const moveImageDown = (index: number) => {
    if (index < images.length - 1) {
      handleReorder(index, index + 1);
    }
  };

  return (
    <StepLayout
      currentStep={5}
      totalSteps={7}
      title="Add photos of your screen"
      onNext={handleNext}
      nextButtonDisabled={!isStepComplete(5)}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <Text style={styles.subtitle}>
          Upload high-quality photos to showcase your screen to potential renters
        </Text>

        {/* Photo Requirements */}
        <View style={styles.requirementsSection}>
          <Text style={styles.sectionTitle}>Photo Requirements</Text>
          <View style={styles.requirement}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accent} />
            <Text style={styles.requirementText}>At least 1 photo required</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accent} />
            <Text style={styles.requirementText}>High resolution (minimum 1080p)</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accent} />
            <Text style={styles.requirementText}>Show screen from multiple angles</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accent} />
            <Text style={styles.requirementText}>Include surrounding area context</Text>
          </View>
        </View>

        {/* Images Grid */}
        <View style={styles.imagesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Photos ({images.length}/10)
            </Text>
            {images.length > 1 && (
              <Text style={styles.reorderHint}>
                Use arrows to reorder
              </Text>
            )}
          </View>

          <View style={styles.imagesGrid}>
            {/* Add Photo Button */}
            {images.length < 10 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddImage}>
                <Ionicons name="camera-outline" size={32} color={COLORS.accent} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}

            {/* Image Items */}
            {images.map((image, index) => (
              <View key={image.id} style={styles.imageItem}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                
                {/* Primary Badge */}
                {index === 0 && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                  </View>
                )}

                {/* Image Controls */}
                <View style={styles.imageControls}>
                  {/* Reorder Controls */}
                  <View style={styles.reorderControls}>
                    <TouchableOpacity
                      style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                      onPress={() => moveImageUp(index)}
                      disabled={index === 0}
                    >
                      <Ionicons 
                        name="chevron-up" 
                        size={16} 
                        color={index === 0 ? COLORS.muted : COLORS.text} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reorderButton, index === images.length - 1 && styles.reorderButtonDisabled]}
                      onPress={() => moveImageDown(index)}
                      disabled={index === images.length - 1}
                    >
                      <Ionicons 
                        name="chevron-down" 
                        size={16} 
                        color={index === images.length - 1 ? COLORS.muted : COLORS.text} 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveImage(image.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ff99999" />
                  </TouchableOpacity>
                </View>

                {/* Order Number */}
                <View style={styles.orderNumber}>
                  <Text style={styles.orderNumberText}>{index + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Photo Tips</Text>
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              The first photo will be your primary image shown in listings
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="sunny-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              Take photos in good lighting conditions for best results
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="resize-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              Show the screen&apos;s size relative to surroundings
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
    marginBottom: 24,
    lineHeight: 24,
  },
  requirementsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  imagesSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reorderHint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  addPhotoButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 8,
  },
  imageItem: {
    width: '48%',
    aspectRatio: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
  },
  imageControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  reorderControls: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    flexDirection: 'column',
  },
  reorderButton: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  removeButton: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 20,
    height: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background,
  },
  tipsSection: {
    marginBottom: 24,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});