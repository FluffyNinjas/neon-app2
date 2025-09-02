import { collection, getDocs, query, where, orderBy, limit, doc, deleteDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';
import { ScreenDoc, screenConverter, UserId, ScreenId, paths} from '../shared/models/firestore';

export interface ScreenFilters {
  category?: string;
  searchQuery?: string;
  isActive?: boolean;
  limit?: number;
}

export class ScreenService {
  private static screenCollection = collection(db, 'screens').withConverter(screenConverter);

  static async getAllScreens(filters?: ScreenFilters): Promise<ScreenDoc[]> {
    try {
      let screenQuery = query(
        this.screenCollection,
        where('isActive', '==', filters?.isActive ?? true)
      );

      if (filters?.limit) {
        screenQuery = query(screenQuery, limit(filters.limit));
      }

      // Add ordering by creation date (newest first)
      screenQuery = query(screenQuery, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(screenQuery);
      let screens = querySnapshot.docs.map(doc => doc.data());

      // Apply client-side filters
      if (filters) {
        screens = this.applyClientFilters(screens, filters);
      }

      return screens;
    } catch (error) {
      console.error('Error fetching screens:', error);
      throw new Error('Failed to fetch screens');
    }
  }

  static async getFeaturedScreens(limit: number = 10): Promise<ScreenDoc[]> {
    try {
      const screenQuery = query(
        this.screenCollection,
        where('isActive', '==', true),
        where('featured', '==', true),
        orderBy('ratingAvg', 'desc'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(screenQuery);
      return querySnapshot.docs.map(doc => doc.data()).slice(0, limit);
    } catch (error) {
      console.error('Error fetching featured screens:', error);
      // Fallback: get top-rated screens if featured query fails
      return this.getTopRatedScreens(limit);
    }
  }

  static async getTopRatedScreens(limit: number = 10): Promise<ScreenDoc[]> {
    try {
      const screenQuery = query(
        this.screenCollection,
        where('isActive', '==', true),
        orderBy('ratingAvg', 'desc'),
        orderBy('ratingCount', 'desc'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(screenQuery);
      return querySnapshot.docs.map(doc => doc.data()).slice(0, limit);
    } catch (error) {
      console.error('Error fetching top-rated screens:', error);
      throw new Error('Failed to fetch top-rated screens');
    }
  }

  private static applyClientFilters(screens: ScreenDoc[], filters: ScreenFilters): ScreenDoc[] {
    let filteredScreens = [...screens];

    // Apply search filter
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = filters.searchQuery.toLowerCase().trim();
      filteredScreens = filteredScreens.filter(screen => 
        screen.title.toLowerCase().includes(searchTerm) ||
        screen.address.toLowerCase().includes(searchTerm) ||
        screen.city.toLowerCase().includes(searchTerm) ||
        screen.state.toLowerCase().includes(searchTerm) ||
        screen.screenType.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filteredScreens = filteredScreens.filter(screen => {
        const screenType = screen.screenType.toLowerCase();
        switch (filters.category?.toLowerCase()) {
          case 'digital':
            return screenType.includes('digital') || screenType.includes('display');
          case 'led':
            return screenType.includes('led');
          case 'interactive':
            return screenType.includes('interactive');
          default:
            return true;
        }
      });
    }

    return filteredScreens;
  }

  static formatPrice(priceInCents: number): string {
    return `$${(priceInCents / 100).toFixed(0)}/day`;
  }

  static formatLocation(screen: ScreenDoc): string {
    return `${screen.city}, ${screen.state}`;
  }

  static getScreenImage(screen: ScreenDoc): string {
    if (screen.photos && screen.photos.length > 0) {
      return screen.photos[0];
    }
    // Fallback placeholder image
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400&auto=format&fit=crop';
  }

  // Owner-specific methods
  static async getOwnerScreens(ownerId?: UserId): Promise<ScreenDoc[]> {
    try {
      // Use current user if no ownerId provided
      const currentUser = auth.currentUser;
      const targetOwnerId = ownerId || (currentUser?.uid as UserId);
      
      if (!targetOwnerId) {
        throw new Error('No authenticated user or owner ID provided');
      }

      const screenQuery = query(
        this.screenCollection,
        where('ownerId', '==', targetOwnerId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(screenQuery);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error fetching owner screens:', error);
      throw new Error('Failed to fetch your screens');
    }
  }

  static async getScreenById(screenId: ScreenId): Promise<ScreenDoc | null> {
    try {
      const screenDocRef = doc(this.screenCollection, screenId);
      const screenDoc = await getDoc(screenDocRef);
      
      if (screenDoc.exists()) {
        return screenDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching screen:', error);
      throw new Error('Failed to fetch screen details');
    }
  }

  static async updateScreen(screenId: ScreenId, updates: Partial<Omit<ScreenDoc, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const screenDocRef = doc(db, ...paths.screen(screenId));
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(screenDocRef, updateData);
    } catch (error) {
      console.error('Error updating screen:', error);
      throw new Error('Failed to update screen');
    }
  }

  static async deleteScreen(screenId: ScreenId): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to delete screens');
      }

      // First verify the screen belongs to the current user
      const screen = await this.getScreenById(screenId);
      if (!screen) {
        throw new Error('Screen not found');
      }

      if (screen.ownerId !== currentUser.uid) {
        throw new Error('You can only delete your own screens');
      }

      const screenDocRef = doc(db, ...paths.screen(screenId));
      await deleteDoc(screenDocRef);
    } catch (error) {
      console.error('Error deleting screen:', error);
      throw new Error(`Failed to delete screen: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async toggleScreenStatus(screenId: ScreenId): Promise<boolean> {
    try {
      const screen = await this.getScreenById(screenId);
      if (!screen) {
        throw new Error('Screen not found');
      }

      const newStatus = !screen.isActive;
      await this.updateScreen(screenId, { isActive: newStatus });
      
      return newStatus;
    } catch (error) {
      console.error('Error toggling screen status:', error);
      throw new Error('Failed to update screen status');
    }
  }

  static formatScreenStatus(screen: ScreenDoc): string {
    return screen.isActive ? 'Active' : 'Inactive';
  }

  static getScreenStatusColor(screen: ScreenDoc): string {
    return screen.isActive ? '#10B981' : '#6B7280';
  }
}