import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = 16;
const CARD_SPACING = 12;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (width - SCREEN_PADDING * 2 - CARD_SPACING) / CARDS_PER_ROW;

// Header animation constants
const HEADER_MAX_HEIGHT = 120;
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Mock data for testing
const CATEGORIES = [
  { id: 'all', name: 'All', count: 24 },
  { id: 'digital', name: 'Digital Displays', count: 12 },
  { id: 'led', name: 'LED Screens', count: 8 },
  { id: 'interactive', name: 'Interactive', count: 4 },
];

const SCREENS_DATA = [
  {
    id: 's1',
    title: 'Times Square LED Wall',
    location: 'New York, NY',
    type: 'LED Billboard',
    price: '$450/day',
    rating: 4.9,
    reviews: 127,
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400&auto=format&fit=crop',
    featured: true,
  },
  {
    id: 's2',
    title: 'Mall Digital Display',
    location: 'Los Angeles, CA',
    type: 'Digital Screen',
    price: '$120/day',
    rating: 4.7,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=400&auto=format&fit=crop',
    featured: false,
  },
  {
    id: 's3',
    title: 'Coffee Shop Display',
    location: 'Seattle, WA',
    type: 'Small Screen',
    price: '$45/day',
    rating: 4.5,
    reviews: 34,
    image: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=400&auto=format&fit=crop',
    featured: false,
  },
  {
    id: 's4',
    title: 'Bus Stop Interactive',
    location: 'Chicago, IL',
    type: 'Interactive Screen',
    price: '$85/day',
    rating: 4.6,
    reviews: 67,
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=400&auto=format&fit=crop',
    featured: true,
  },
  {
    id: 's5',
    title: 'Airport Terminal Screen',
    location: 'Miami, FL',
    type: 'Digital Display',
    price: '$200/day',
    rating: 4.8,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?q=80&w=400&auto=format&fit=crop',
    featured: false,
  },
  {
    id: 's6',
    title: 'Gym Wall Display',
    location: 'Austin, TX',
    type: 'LED Screen',
    price: '$75/day',
    rating: 4.4,
    reviews: 43,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=400&auto=format&fit=crop',
    featured: false,
  },
];

const home = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

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

  const filteredScreens = SCREENS_DATA.filter(screen => {
    const matchesSearch = screen.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         screen.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'digital' && screen.type.includes('Digital')) ||
                           (selectedCategory === 'led' && screen.type.includes('LED')) ||
                           (selectedCategory === 'interactive' && screen.type.includes('Interactive'));
    return matchesSearch && matchesCategory;
  });

  const renderScreenCard = ({ item, index }) => (
    <TouchableOpacity 
      style={[
        styles.screenCard,
        { marginLeft: index % CARDS_PER_ROW === 0 ? 0 : CARD_SPACING }
      ]}
    >
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.muted} />
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
        <Text style={styles.cardType}>{item.type}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.reviewCount}>({item.reviews})</Text>
          </View>
          <Text style={styles.priceText}>{item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
                  {item.count}
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

        {/* Screens Grid */}
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
        />
      </View>
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
  screenCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: CARD_SPACING,
    overflow: 'hidden',
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

export default home;