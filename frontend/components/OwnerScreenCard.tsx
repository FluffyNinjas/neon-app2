import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { ScreenDoc } from '../shared/models/firestore';
import { ScreenService } from '../services/screenService';
import { EditScreenModal } from './EditScreenModal';

interface OwnerScreenCardProps {
  screen: ScreenDoc;
  onPress?: (screen: ScreenDoc) => void;
  onEdit?: (screen: ScreenDoc) => void;
  onDelete?: (screen: ScreenDoc) => void;
  onToggleStatus?: (screen: ScreenDoc) => void;
  cardWidth?: number;
  marginLeft?: number;
}

export const OwnerScreenCard: React.FC<OwnerScreenCardProps> = ({
  screen,
  onPress,
  onEdit,
  onDelete,
  onToggleStatus,
  cardWidth,
  marginLeft = 0,
}) => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(screen);
  const handlePress = () => {
    onPress?.(screen);
  };

  const handleEdit = () => {
    setIsEditModalVisible(true);
  };

  const handleEditSave = (updatedScreen: ScreenDoc) => {
    setCurrentScreen(updatedScreen);
    onEdit?.(updatedScreen);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Screen',
      `Are you sure you want to delete "${screen.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(screen),
        },
      ]
    );
  };

  const handleToggleStatus = () => {
    const newStatus = !screen.isActive;
    const statusText = newStatus ? 'activate' : 'deactivate';
    
    Alert.alert(
      `${newStatus ? 'Activate' : 'Deactivate'} Screen`,
      `Are you sure you want to ${statusText} "${screen.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: newStatus ? 'Activate' : 'Deactivate',
          onPress: () => onToggleStatus?.(screen),
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[
        styles.screenCard,
        cardWidth ? { width: cardWidth } : undefined,
        { marginLeft }
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.cardImageContainer}>
        <Image 
          source={{ uri: ScreenService.getScreenImage(screen) }} 
          style={styles.cardImage}
          resizeMode="cover"
        />
        
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: ScreenService.getScreenStatusColor(currentScreen) }
        ]}>
          <Text style={styles.statusText}>
            {ScreenService.formatScreenStatus(currentScreen)}
          </Text>
        </View>

        {/* Featured Badge */}
        {currentScreen.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleToggleStatus}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons 
              name={currentScreen.isActive ? "pause" : "play"} 
              size={16} 
              color={COLORS.background} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons 
              name="create-outline" 
              size={16} 
              color={COLORS.background} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons 
              name="trash-outline" 
              size={16} 
              color={COLORS.background} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {currentScreen.title}
        </Text>
        <View style={styles.cardLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.muted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {ScreenService.formatLocation(currentScreen)}
          </Text>
        </View>
        <Text style={styles.cardType}>{currentScreen.screenType}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={styles.ratingText}>
              {currentScreen.ratingAvg ? currentScreen.ratingAvg.toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.reviewCount}>
              ({currentScreen.ratingCount || 0})
            </Text>
          </View>
          <Text style={styles.priceText}>
            {ScreenService.formatPrice(currentScreen.dayPrice)}
          </Text>
        </View>
      </View>
      
      <EditScreenModal
        visible={isEditModalVisible}
        screen={currentScreen}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleEditSave}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  screenCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 60,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
  },
  actionButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
  },
  cardType: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewCount: {
    fontSize: 10,
    color: COLORS.muted,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
});