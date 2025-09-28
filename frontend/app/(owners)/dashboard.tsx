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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { COLORS } from '../../constants/Colors';
import { functions, auth, db } from '../../FirebaseConfig';

const { width } = Dimensions.get('window');

interface Screen {
  id: string;
  title: string;
  isActive: boolean;
  dayPrice: number;
  ratingAvg?: number;
  ratingCount?: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface DashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalScreens: number;
  activeScreens: number;
  totalBookings: number;
  pendingBookings: number;
  avgRating: number;
  conversionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'booking' | 'payment' | 'review' | 'screen';
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
}

interface PerformanceMetrics {
  viewsThisMonth: number;
  bookingRate: number;
  avgBookingValue: number;
  topPerformingScreen: string;
}

const OwnerDashboard = () => {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalScreens: 0,
    activeScreens: 0,
    totalBookings: 0,
    pendingBookings: 0,
    avgRating: 0,
    conversionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    viewsThisMonth: 0,
    bookingRate: 0,
    avgBookingValue: 0,
    topPerformingScreen: '',
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load user's screens
      const screensQuery = query(
        collection(db, 'screens'),
        where('ownerId', '==', user.uid)
      );

      onSnapshot(screensQuery, (snapshot) => {
        const screenData: Screen[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          screenData.push({
            id: doc.id,
            title: data.title,
            isActive: data.isActive,
            dayPrice: data.dayPrice,
            ratingAvg: data.ratingAvg,
            ratingCount: data.ratingCount,
          });
        });
        setScreens(screenData);
        calculateStats(screenData);
      });

      // Generate mock recent activity data
      generateMockActivityData();
      
      // Generate mock revenue data
      generateMockRevenueData();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (screenData: Screen[]) => {
    const totalScreens = screenData.length;
    const activeScreens = screenData.filter(s => s.isActive).length;
    const totalRatings = screenData.reduce((sum, s) => sum + (s.ratingCount || 0), 0);
    const weightedRatingSum = screenData.reduce((sum, s) => 
      sum + ((s.ratingAvg || 0) * (s.ratingCount || 0)), 0
    );
    const avgRating = totalRatings > 0 ? weightedRatingSum / totalRatings : 0;
    
    // Mock calculations for demo - in real app, these would come from bookings/analytics
    const mockTotalRevenue = screenData.length * 1250; // $12.50 per screen average
    const mockMonthlyRevenue = screenData.length * 385; // $3.85 per screen this month
    
    setStats({
      totalRevenue: mockTotalRevenue,
      monthlyRevenue: mockMonthlyRevenue,
      totalScreens,
      activeScreens,
      totalBookings: screenData.length * 15, // Mock: 15 bookings per screen
      pendingBookings: Math.floor(screenData.length * 0.8), // Mock: 0.8 pending per screen
      avgRating,
      conversionRate: 0.12, // Mock: 12% conversion rate
    });

    setPerformanceMetrics({
      viewsThisMonth: screenData.length * 245,
      bookingRate: 0.08,
      avgBookingValue: 89.50,
      topPerformingScreen: screenData.length > 0 ? screenData[0].title : 'None',
    });
  };

  const generateMockActivityData = () => {
    const activities: RecentActivity[] = [
      {
        id: '1',
        type: 'booking',
        title: 'New Booking Request',
        description: 'Downtown Billboard - 3 days',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        amount: 150,
      },
      {
        id: '2',
        type: 'payment',
        title: 'Payment Received',
        description: 'Mall Screen #2',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        amount: 225,
      },
      {
        id: '3',
        type: 'review',
        title: 'New 5-star Review',
        description: 'Great location and visibility!',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: '4',
        type: 'screen',
        title: 'Screen Activated',
        description: 'Times Square LED Display',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];
    setRecentActivity(activities);
  };

  const generateMockRevenueData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 500) + 200 + (index * 50),
    }));
    setRevenueData(data);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking': return 'calendar';
      case 'payment': return 'card';
      case 'review': return 'star';
      case 'screen': return 'tv';
      default: return 'notifications';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'booking': return '#2196F3';
      case 'payment': return '#4CAF50';
      case 'review': return '#FFB800';
      case 'screen': return '#9C27B0';
      default: return COLORS.muted;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
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
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.headerTitle}>Dashboard Overview</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/profile-screens/payout-settings')}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Revenue Cards */}
        <View style={styles.revenueSection}>
          <View style={styles.primaryRevenueCard}>
            <View style={styles.revenueHeader}>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.revenueAmount}>${(stats.totalRevenue / 100).toFixed(2)}</Text>
            <Text style={styles.revenueChange}>+18.5% from last month</Text>
          </View>
          
          <View style={styles.secondaryRevenueCard}>
            <Text style={styles.secondaryRevenueLabel}>This Month</Text>
            <Text style={styles.secondaryRevenueAmount}>${(stats.monthlyRevenue / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/profile-screens/screen-management')}
          >
            <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="tv" size={20} color="#2196F3" />
            </View>
            <Text style={styles.statNumber}>{stats.totalScreens}</Text>
            <Text style={styles.statLabel}>Total Screens</Text>
            <Text style={styles.statSubLabel}>{stats.activeScreens} active</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
              <Ionicons name="calendar" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.statNumber}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
            <Text style={styles.statSubLabel}>{stats.pendingBookings} pending</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="star" size={20} color="#FFB800" />
            </View>
            <Text style={styles.statNumber}>{stats.avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
            <Text style={styles.statSubLabel}>Excellent!</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="trending-up" size={20} color="#9C27B0" />
            </View>
            <Text style={styles.statNumber}>{(stats.conversionRate * 100).toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Conversion</Text>
            <Text style={styles.statSubLabel}>View to book</Text>
          </TouchableOpacity>
        </View>

        {/* Performance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="analytics" size={24} color={COLORS.accent} />
              <Text style={styles.insightTitle}>This Month's Performance</Text>
            </View>
            <View style={styles.insightMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{performanceMetrics.viewsThisMonth.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Profile Views</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{(performanceMetrics.bookingRate * 100).toFixed(1)}%</Text>
                <Text style={styles.metricLabel}>Booking Rate</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>${performanceMetrics.avgBookingValue}</Text>
                <Text style={styles.metricLabel}>Avg Booking</Text>
              </View>
            </View>
            <View style={styles.topPerformer}>
              <Text style={styles.topPerformerLabel}>Top Performer:</Text>
              <Text style={styles.topPerformerValue}>{performanceMetrics.topPerformingScreen}</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.activityList}>
            {recentActivity.map((activity) => (
              <TouchableOpacity key={activity.id} style={styles.activityItem}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: getActivityColor(activity.type) + '20' }
                ]}>
                  <Ionicons 
                    name={getActivityIcon(activity.type)} 
                    size={16} 
                    color={getActivityColor(activity.type)} 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                </View>
                {activity.amount && (
                  <Text style={styles.activityAmount}>+${activity.amount}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => router.push('/add-screen')}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.accent} />
              <Text style={styles.quickActionText}>Add Screen</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => router.push('/profile-screens/screen-management')}
            >
              <Ionicons name="settings" size={24} color={COLORS.accent} />
              <Text style={styles.quickActionText}>Manage Screens</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => router.push('/profile-screens/booking-history')}
            >
              <Ionicons name="list" size={24} color={COLORS.accent} />
              <Text style={styles.quickActionText}>View Bookings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => router.push('/profile-screens/payout-settings')}
            >
              <Ionicons name="card" size={24} color={COLORS.accent} />
              <Text style={styles.quickActionText}>Payouts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default OwnerDashboard;

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
    borderBottomColor: COLORS.primary + '20',
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingsButton: {
    padding: 8,
  },
  
  // Revenue Section
  revenueSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  primaryRevenueCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 20,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 14,
    color: COLORS.background + 'CC',
    fontWeight: '500',
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.background,
    marginBottom: 4,
  },
  revenueChange: {
    fontSize: 14,
    color: COLORS.background + 'CC',
  },
  secondaryRevenueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryRevenueLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  secondaryRevenueAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    width: (width - 52) / 2, // Account for padding and gap
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  
  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  
  // Insights
  insightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  insightMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  topPerformer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary + '20',
    gap: 8,
  },
  topPerformerLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },
  topPerformerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Activity
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  
  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 52) / 2,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottomSpacing: {
    height: 24,
  },
});