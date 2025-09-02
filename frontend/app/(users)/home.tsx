import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { ScreenService } from '../../services/screenService';
import { wishlistService } from '../../services/wishlistService';
import { ScreenCard } from '../../components/ScreenCard';
import { ScreenDetailsModal } from '../../components/ScreenDetailsModal';
import { ScreenDoc, ScreenId } from '../../shared/models/firestore';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = 16;
const CARD_SPACING = 12;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (width - SCREEN_PADDING * 2 - CARD_SPACING) / CARDS_PER_ROW;

// Header animation constants
const HEADER_MAX_HEIGHT = 120;
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'digital', name: 'Digital Displays' },
  { id: 'led', name: 'LED Screens' },
  { id: 'interactive', name: 'Interactive' },
];

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [screens, setScreens] = useState<ScreenDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteScreens, setFavoriteScreens] = useState<Set<string>>(new Set());
  const [selectedScreen, setSelectedScreen] = useState<ScreenDoc | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // Fetch screens and wishlist on component mount
  useEffect(() => {
    loadScreens();
    loadWishlistStatus();
  }, []);

  const loadScreens = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedScreens = await ScreenService.getAllScreens();
      setScreens(fetchedScreens);
    } catch (err) {
      console.error('Error loading screens:', err);
      setError('Failed to load screens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadWishlistStatus = async () => {
    try {
      const wishlistScreens = await wishlistService.getUserWishlist();
      const wishlistIds = new Set(wishlistScreens.map(screen => screen.id));
      setFavoriteScreens(wishlistIds);
    } catch (error) {
      console.error('Error loading wishlist status:', error);
      // Don't show error to user for wishlist - it's not critical
    }
  };

  const handleScreenPress = (screen: ScreenDoc) => {
    setSelectedScreen(screen);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedScreen(null);
  };

  const handleBookNow = (screen: ScreenDoc) => {
    // TODO: Navigate to booking flow
    console.log('Booking screen:', screen.title);
    setModalVisible(false);
  };

  const handleFavoritePress = async (screen: ScreenDoc) => {
    try {
      // Optimistically update the UI
      const newFavorites = new Set(favoriteScreens);
      const wasInWishlist = newFavorites.has(screen.id);
      
      if (wasInWishlist) {
        newFavorites.delete(screen.id);
      } else {
        newFavorites.add(screen.id);
      }
      setFavoriteScreens(newFavorites);

      // Update Firestore
      const isNowInWishlist = await wishlistService.toggleWishlist(screen.id as ScreenId);
      
      // Sync state with actual Firestore result in case of discrepancy
      const actualFavorites = new Set(favoriteScreens);
      if (isNowInWishlist) {
        actualFavorites.add(screen.id);
      } else {
        actualFavorites.delete(screen.id);
      }
      setFavoriteScreens(actualFavorites);
      
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      // Revert optimistic update on error
      loadWishlistStatus();
    }
  };

  // Header animation values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const filteredScreens = screens.filter(screen => {
    const matchesSearch = searchQuery.trim() === '' || 
      screen.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ScreenService.formatLocation(screen).toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.screenType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'digital' && screen.screenType.toLowerCase().includes('digital')) ||
      (selectedCategory === 'led' && screen.screenType.toLowerCase().includes('led')) ||
      (selectedCategory === 'interactive' && screen.screenType.toLowerCase().includes('interactive'));
    
    return matchesSearch && matchesCategory;
  });

  const renderScreenCard = ({ item, index }: { item: ScreenDoc; index: number }) => (
    <ScreenCard
      screen={item}
      onPress={handleScreenPress}
      onFavoritePress={handleFavoritePress}
      isFavorite={favoriteScreens.has(item.id)}
      cardWidth={CARD_WIDTH}
      marginLeft={index % CARDS_PER_ROW === 0 ? 0 : CARD_SPACING}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Collapsible Header */}
      <Animated.View style={[styles.header, { height: headerHeight, opacity: headerOpacity }]}>
        <View style={styles.headerTop}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.neonText}>NEON</Text>
        <Text style={styles.subtitle}>Find the perfect screen for your content</Text>
      </Animated.View>

      {/* Sticky Search and Categories Container */}
      <View style={styles.stickyContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search screens, locations..."
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === item.id && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === item.id && styles.categoryTextActive
                ]}>
                  {item.name}
                </Text>
                <Text style={[
                  styles.categoryCount,
                  selectedCategory === item.id && styles.categoryCountActive
                ]}>
                  {item.id === 'all' ? screens.length : 
                   item.id === 'digital' ? screens.filter(s => s.screenType.toLowerCase().includes('digital')).length :
                   item.id === 'led' ? screens.filter(s => s.screenType.toLowerCase().includes('led')).length :
                   item.id === 'interactive' ? screens.filter(s => s.screenType.toLowerCase().includes('interactive')).length : 0}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* Content with Scroll Detection */}
      <View style={styles.contentContainer}>
        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredScreens.length} screens available
          </Text>
          <TouchableOpacity style={styles.sortButton}>
            <Text style={styles.sortText}>Sort by</Text>
            <Ionicons name="chevron-down-outline" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading screens...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadScreens}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Screens Grid */}
        {!loading && !error && (
          <Animated.FlatList
            ref={flatListRef}
            data={filteredScreens}
            numColumns={CARDS_PER_ROW}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.screensContainer}
            keyExtractor={(item) => item.id}
            renderItem={renderScreenCard}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyText}>No screens found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Screen Details Modal */}
      <ScreenDetailsModal
        visible={modalVisible}
        screen={selectedScreen}
        onClose={handleCloseModal}
        onBookNow={handleBookNow}
        onToggleFavorite={handleFavoritePress}
        isFavorite={selectedScreen ? favoriteScreens.has(selectedScreen.id) : false}
      />
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
    paddingBottom: 15,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  stickyContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentContainer: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  notificationButton: {
    padding: 4,
  },
  neonText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 7,
    paddingBottom: 12,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    paddingBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: SCREEN_PADDING,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.accent,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 6,
  },
  categoryTextActive: {
    color: COLORS.background,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryCountActive: {
    color: COLORS.accent,
    backgroundColor: COLORS.background,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    marginTop:15,
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },
  screensContainer: {
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
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.muted,
  },
});

export default Home;