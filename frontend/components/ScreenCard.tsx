import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { ScreenDoc } from '../shared/models/firestore';
import { ScreenService } from '../services/screenService';

interface ScreenCardProps {
  screen: ScreenDoc;
  onPress?: (screen: ScreenDoc) => void;
  onFavoritePress?: (screen: ScreenDoc) => void;
  isFavorite?: boolean;
  cardWidth?: number;
  marginLeft?: number;
}

export const ScreenCard: React.FC<ScreenCardProps> = ({
  screen,
  onPress,
  onFavoritePress,
  isFavorite = false,
  cardWidth,
  marginLeft = 0,
}) => {
  const handlePress = () => {
    onPress?.(screen);
  };

  const handleFavoritePress = () => {
    onFavoritePress?.(screen);
  };

  return (
    <TouchableOpacity 
      style={[
        styles.screenCard,
        cardWidth && { width: cardWidth },
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
        {screen.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={18} 
            color={isFavorite ? "#FF6B6B" : COLORS.text} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {screen.title}
        </Text>
        <View style={styles.cardLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.muted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {ScreenService.formatLocation(screen)}
          </Text>
        </View>
        <Text style={styles.cardType}>{screen.screenType}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={styles.ratingText}>
              {screen.ratingAvg ? screen.ratingAvg.toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.reviewCount}>
              ({screen.ratingCount || 0})
            </Text>
          </View>
          <Text style={styles.priceText}>
            {ScreenService.formatPrice(screen.dayPrice)}
          </Text>
        </View>
      </View>
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
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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