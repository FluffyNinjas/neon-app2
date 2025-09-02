import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { wishlistService, WishlistHelpers } from '../../services/wishlistService';
import { ScreenCard } from '../../components/ScreenCard';
import { ScreenDoc, ScreenId } from '../../shared/models/firestore';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = 16;
const CARD_SPACING = 12;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (width - SCREEN_PADDING * 2 - CARD_SPACING) / CARDS_PER_ROW;

const Wishlist = () => {
  const [wishlistScreens, setWishlistScreens] = useState<ScreenDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load wishlist on component mount
  useEffect(() => {
    loadWishlist();
    
    // Subscribe to real-time updates
    const unsubscribe = wishlistService.subscribeToWishlist((screens) => {
      setWishlistScreens(screens);
      setLoading(false);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const loadWishlist = async () => {
    try {
      setError(null);
      const screens = await wishlistService.getUserWishlist();
      setWishlistScreens(screens);
    } catch (err) {
      console.error('Error loading wishlist:', err);
      setError('Failed to load your wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWishlist();
    setRefreshing(false);
  };

  const handleScreenPress = (screen: ScreenDoc) => {
    // TODO: Navigate to screen details
    console.log('Wishlist screen pressed:', screen.title);
  };

  const handleRemoveFromWishlist = async (screen: ScreenDoc) => {
    try {
      // Optimistically remove from UI
      setWishlistScreens(prev => prev.filter(s => s.id !== screen.id));
      
      // Remove from Firestore
      await wishlistService.removeFromWishlist(screen.id as ScreenId);
      
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      // Revert optimistic update on error
      loadWishlist();
    }
  };

  const renderScreenCard = ({ item, index }: { item: ScreenDoc; index: number }) => (
    <ScreenCard
      screen={item}
      onPress={handleScreenPress}
      onFavoritePress={handleRemoveFromWishlist}
      isFavorite={true} // All screens in wishlist are favorites
      cardWidth={CARD_WIDTH}
      marginLeft={index % CARDS_PER_ROW === 0 ? 0 : CARD_SPACING}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>My Wishlist</Text>
      <Text style={styles.subtitle}>
        {WishlistHelpers.getWishlistSummary(wishlistScreens)}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
      <Text style={styles.emptySubtitle}>
        Browse screens and tap the heart icon to save them here
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => router.push('/(users)/home')}
      >
        <Text style={styles.browseButtonText}>Browse Screens</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadWishlist}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading your wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {WishlistHelpers.isWishlistEmpty(wishlistScreens) ? (
        <>
          {renderHeader()}
          {renderEmptyState()}
        </>
      ) : (
        <FlatList
          data={wishlistScreens}
          numColumns={CARDS_PER_ROW}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          keyExtractor={(item) => item.id}
          renderItem={renderScreenCard}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  contentContainer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: SCREEN_PADDING,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: SCREEN_PADDING,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  browseButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Wishlist;