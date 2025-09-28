import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/Colors';
import { auth, db } from '../../FirebaseConfig';

interface Screen {
  id: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  dayPrice: number;
  isActive: boolean;
  photos: string[];
  ratingAvg?: number;
  ratingCount?: number;
  createdAt: Date;
}

interface ScreenStats {
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  avgRating: number;
}

export default function ScreenManagementScreen() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ScreenStats>({
    totalBookings: 0,
    activeBookings: 0,
    totalRevenue: 0,
    avgRating: 0,
  });

  useEffect(() => {
    if (user) {
      const unsubscribe = loadUserScreens();
      return unsubscribe;
    }
  }, [user]);

  const loadUserScreens = () => {
    if (!user) return;

    const screensQuery = query(
      collection(db, 'screens'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(screensQuery, (snapshot) => {
      const screenData: Screen[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        screenData.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          address: data.address,
          city: data.city,
          state: data.state,
          dayPrice: data.dayPrice,
          isActive: data.isActive,
          photos: data.photos || [],
          ratingAvg: data.ratingAvg,
          ratingCount: data.ratingCount,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      
      setScreens(screenData);
      calculateStats(screenData);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  const calculateStats = (screenData: Screen[]) => {
    const totalScreens = screenData.length;
    const activeScreens = screenData.filter(s => s.isActive).length;
    const totalRatings = screenData.reduce((sum, s) => sum + (s.ratingCount || 0), 0);
    const weightedRatingSum = screenData.reduce((sum, s) => 
      sum + ((s.ratingAvg || 0) * (s.ratingCount || 0)), 0
    );
    const avgRating = totalRatings > 0 ? weightedRatingSum / totalRatings : 0;

    setStats({
      totalBookings: 0, // This would require querying bookings collection
      activeBookings: 0, // This would require querying active bookings
      totalRevenue: 0, // This would require calculating from completed bookings
      avgRating: avgRating,
    });
  };

  const toggleScreenStatus = async (screenId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'screens', screenId), {
        isActive: !currentStatus,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating screen status:', error);
      Alert.alert('Error', 'Failed to update screen status');
    }
  };

  const handleDeleteScreen = (screenId: string, title: string) => {
    Alert.alert(
      'Delete Screen',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'screens', screenId));
              Alert.alert('Success', 'Screen deleted successfully');
            } catch (error) {
              console.error('Error deleting screen:', error);
              Alert.alert('Error', 'Failed to delete screen');
            }
          },
        },
      ]
    );
  };

  const handleEditScreen = (screenId: string) => {
    router.push(`/add-screen?edit=${screenId}`);
  };

  const handleAddScreen = () => {
    router.push('/add-screen');
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener will handle updating the data
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Screen Management</Text>
            <Text style={styles.headerSubtitle}>
              {screens.length} screen{screens.length !== 1 ? 's' : ''} total
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddScreen}>
            <Ionicons name="add" size={24} color={COLORS.background} />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{screens.length}</Text>
            <Text style={styles.statLabel}>Total Screens</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{screens.filter(s => s.isActive).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        {/* Screens List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Screens</Text>
          
          {screens.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="tv-outline" size={64} color={COLORS.muted} />
              <Text style={styles.emptyStateTitle}>No Screens Yet</Text>
              <Text style={styles.emptyStateText}>
                Add your first screen to start earning from rentals
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddScreen}>
                <Text style={styles.primaryButtonText}>Add Your First Screen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.screensList}>
              {screens.map((screen) => (
                <View key={screen.id} style={styles.screenCard}>
                  {/* Screen Image */}
                  <View style={styles.screenImageContainer}>
                    {screen.photos.length > 0 ? (
                      <View style={styles.screenImage}>
                        <Ionicons name="image" size={24} color={COLORS.muted} />
                      </View>
                    ) : (
                      <View style={styles.screenImage}>
                        <Ionicons name="tv-outline" size={24} color={COLORS.muted} />
                      </View>
                    )}
                    <View style={[
                      styles.statusBadge,
                      screen.isActive ? styles.activeBadge : styles.inactiveBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        screen.isActive ? styles.activeText : styles.inactiveText
                      ]}>
                        {screen.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  {/* Screen Info */}
                  <View style={styles.screenInfo}>
                    <Text style={styles.screenTitle}>{screen.title}</Text>
                    <Text style={styles.screenAddress}>
                      {screen.city}, {screen.state}
                    </Text>
                    <View style={styles.screenMeta}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceText}>
                          ${(screen.dayPrice / 100).toFixed(0)}/day
                        </Text>
                      </View>
                      {screen.ratingAvg && (
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color="#FFB800" />
                          <Text style={styles.ratingText}>
                            {screen.ratingAvg.toFixed(1)} ({screen.ratingCount || 0})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.screenActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleScreenStatus(screen.id, screen.isActive)}
                    >
                      <Ionicons 
                        name={screen.isActive ? 'pause-circle-outline' : 'play-circle-outline'} 
                        size={20} 
                        color={screen.isActive ? '#FF9800' : '#4CAF50'} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditScreen(screen.id)}
                    >
                      <Ionicons name="pencil-outline" size={20} color={COLORS.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteScreen(screen.id, screen.title)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        {screens.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton} onPress={handleAddScreen}>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
                <Text style={styles.quickActionText}>Add New Screen</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => Alert.alert('Coming Soon', 'Bulk management features coming soon')}
              >
                <Ionicons name="settings-outline" size={24} color={COLORS.accent} />
                <Text style={styles.quickActionText}>Bulk Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.muted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  
  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  
  // Screens List
  screensList: {
    gap: 16,
  },
  screenCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  screenImageContainer: {
    position: 'relative',
  },
  screenImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
  },
  inactiveBadge: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeText: {
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#FFFFFF',
  },
  screenInfo: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  screenAddress: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
  },
  screenMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceContainer: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  screenActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  
  // Buttons
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 24,
  },
});