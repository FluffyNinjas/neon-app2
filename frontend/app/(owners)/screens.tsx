import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { ScreenService } from '../../services/screenService';
import { OwnerScreenCard } from '../../components/OwnerScreenCard';
import { ScreenDoc, ScreenId } from '../../shared/models/firestore';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = 16;
const CARD_SPACING = 12;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (width - SCREEN_PADDING * 2 - CARD_SPACING) / CARDS_PER_ROW;

const Screens = () => {
  const [screens, setScreens] = useState<ScreenDoc[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<ScreenDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Load owner's screens on component mount
  useEffect(() => {
    loadOwnerScreens();
  }, []);

  const loadOwnerScreens = async () => {
    try {
      setError(null);
      const ownerScreens = await ScreenService.getOwnerScreens();
      setScreens(ownerScreens);
    } catch (err) {
      console.error('Error loading owner screens:', err);
      setError('Failed to load your screens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOwnerScreens();
    setRefreshing(false);
  };

  const applyFilters = useCallback(() => {
    let filtered = [...screens];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(screen => 
        screen.title.toLowerCase().includes(query) ||
        screen.address.toLowerCase().includes(query) ||
        screen.city.toLowerCase().includes(query) ||
        screen.state.toLowerCase().includes(query) ||
        screen.screenType.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(screen => screen.isActive);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(screen => !screen.isActive);
    }

    setFilteredScreens(filtered);
  }, [screens, searchQuery, filterStatus]);

  // Filter screens when search query or filter status changes
  useEffect(() => {
    applyFilters();
  }, [screens, searchQuery, filterStatus, applyFilters]);

  const handleCreateScreen = () => {
    router.push('/add-screen/' as any);
  };

  const handleScreenPress = (screen: ScreenDoc) => {
    // TODO: Navigate to screen details
    console.log('Owner screen pressed:', screen.title);
  };

 // const handleEditScreen = (screen: ScreenDoc) => {
    // TODO: Navigate to edit screen
   // Alert.alert('Edit Screen', `Editing "${screen.title}" - Coming soon!`);
//  };

  const handleDeleteScreen = async (screen: ScreenDoc) => {
    try {
      await ScreenService.deleteScreen(screen.id as ScreenId);
      
      // Update local state
      setScreens(prev => prev.filter(s => s.id !== screen.id));
      
      Alert.alert('Success', `"${screen.title}" has been deleted successfully.`);
    } catch (error) {
      console.error('Error deleting screen:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete screen');
    }
  };

  const handleToggleStatus = async (screen: ScreenDoc) => {
    try {
      const newStatus = await ScreenService.toggleScreenStatus(screen.id as ScreenId);
      
      // Update local state
      setScreens(prev => 
        prev.map(s => 
          s.id === screen.id ? { ...s, isActive: newStatus } : s
        )
      );
      
      const statusText = newStatus ? 'activated' : 'deactivated';
      Alert.alert('Success', `"${screen.title}" has been ${statusText}.`);
    } catch (error) {
      console.error('Error toggling screen status:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update screen status');
    }
  };

  const renderScreenCard = ({ item, index }: { item: ScreenDoc; index: number }) => (
    <OwnerScreenCard
      screen={item}
      onPress={handleScreenPress}
      //onEdit={handleEditScreen}
      onDelete={handleDeleteScreen}
      onToggleStatus={handleToggleStatus}
      cardWidth={CARD_WIDTH}
      marginLeft={index % CARDS_PER_ROW === 0 ? 0 : CARD_SPACING}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>My Screens</Text>
      <Text style={styles.subtitle}>
        {screens.length === 0 
          ? 'No screens yet' 
          : `${screens.length} screen${screens.length !== 1 ? 's' : ''} • ${screens.filter(s => s.isActive).length} active`
        }
      </Text>

      {/* Search Bar */}
      {screens.length > 0 && (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color={COLORS.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search screens..."
                placeholderTextColor={COLORS.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={COLORS.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
                All ({screens.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'active' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('active')}
            >
              <Text style={[styles.filterText, filterStatus === 'active' && styles.filterTextActive]}>
                Active ({screens.filter(s => s.isActive).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'inactive' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('inactive')}
            >
              <Text style={[styles.filterText, filterStatus === 'inactive' && styles.filterTextActive]}>
                Inactive ({screens.filter(s => !s.isActive).length})
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="tv-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>No screens yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first screen to start earning money from your advertising space
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateScreen}>
        <Ionicons name="add" size={20} color={COLORS.background} />
        <Text style={styles.createButtonText}>Create Your First Screen</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoResultsState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={48} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>No screens found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search or filter criteria
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadOwnerScreens}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading your screens...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderErrorState()}
        {/* Floating Action Button */}
        <TouchableOpacity 
          style={styles.floatingButton} 
          onPress={handleCreateScreen}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={COLORS.background} />
          <Text style={styles.floatingButtonText}>Create Screen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {screens.length === 0 ? (
        renderEmptyState()
      ) : filteredScreens.length === 0 && (searchQuery || filterStatus !== 'all') ? (
        <>
          {renderHeader()}
          {renderNoResultsState()}
        </>
      ) : (
        <FlatList
          data={filteredScreens}
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

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={handleCreateScreen}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={COLORS.background} />
        <Text style={styles.floatingButtonText}>Create Screen</Text>
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
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
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: COLORS.accent,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTextActive: {
    color: COLORS.background,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 8,
  },
  floatingButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default Screens;