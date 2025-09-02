import { 
  doc, 
  collection, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';
import { 
  ScreenDoc,
  ScreenId,
  UserId,
  buildNewLike,
  paths,
  screenConverter
} from '../shared/models/firestore';

export interface WishlistService {
  addToWishlist(screenId: ScreenId): Promise<void>;
  removeFromWishlist(screenId: ScreenId): Promise<void>;
  getUserWishlist(): Promise<ScreenDoc[]>;
  isScreenInWishlist(screenId: ScreenId): Promise<boolean>;
  subscribeToWishlist(callback: (screens: ScreenDoc[]) => void): Unsubscribe | null;
  toggleWishlist(screenId: ScreenId): Promise<boolean>;
}

class WishlistServiceImpl implements WishlistService {
  
  private getCurrentUserId(): UserId {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to manage wishlist');
    }
    return currentUser.uid as UserId;
  }

  /**
   * Add a screen to the user's wishlist
   */
  async addToWishlist(screenId: ScreenId): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const likeDocRef = doc(db, ...paths.like(userId, screenId));
      
      const newLike = buildNewLike({
        userId,
        screenId,
      });

      await setDoc(likeDocRef, newLike);
      
      console.log(`Added screen ${screenId} to wishlist`);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw new Error(`Failed to add to wishlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a screen from the user's wishlist
   */
  async removeFromWishlist(screenId: ScreenId): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const likeDocRef = doc(db, ...paths.like(userId, screenId));
      
      await deleteDoc(likeDocRef);
      
      console.log(`Removed screen ${screenId} from wishlist`);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw new Error(`Failed to remove from wishlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all screens in the user's wishlist with full screen details
   */
  async getUserWishlist(): Promise<ScreenDoc[]> {
    try {
      const userId = this.getCurrentUserId();
      const likesCollectionRef = collection(db, ...paths.likesCol(userId));
      
      const likesSnapshot = await getDocs(likesCollectionRef);
      const likedScreenIds = likesSnapshot.docs.map(doc => doc.id as ScreenId);
      
      if (likedScreenIds.length === 0) {
        return [];
      }

      // Fetch full screen details for each liked screen
      const screensCollection = collection(db, 'screens').withConverter(screenConverter);
      const screens: ScreenDoc[] = [];
      
      for (const screenId of likedScreenIds) {
        const screenDocRef = doc(screensCollection, screenId);
        const screenDoc = await import('firebase/firestore').then(({ getDoc }) => getDoc(screenDocRef));
        
        if (screenDoc.exists() && screenDoc.data().isActive) {
          screens.push(screenDoc.data());
        }
      }
      
      // Sort by creation date (most recently liked first)
      return screens.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
      
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw new Error(`Failed to fetch wishlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a specific screen is in the user's wishlist
   */
  async isScreenInWishlist(screenId: ScreenId): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId();
      const likeDocRef = doc(db, ...paths.like(userId, screenId));
      
      const { getDoc } = await import('firebase/firestore');
      const likeDoc = await getDoc(likeDocRef);
      
      return likeDoc.exists();
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time wishlist updates
   */
  subscribeToWishlist(callback: (screens: ScreenDoc[]) => void): Unsubscribe | null {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const userId = currentUser.uid as UserId;
    const likesCollectionRef = collection(db, ...paths.likesCol(userId));
    
    return onSnapshot(
      likesCollectionRef,
      async (snapshot) => {
        try {
          const likedScreenIds = snapshot.docs.map(doc => doc.id as ScreenId);
          
          if (likedScreenIds.length === 0) {
            callback([]);
            return;
          }

          // Fetch full screen details for each liked screen
          const screensCollection = collection(db, 'screens').withConverter(screenConverter);
          const screens: ScreenDoc[] = [];
          
          for (const screenId of likedScreenIds) {
            const screenDocRef = doc(screensCollection, screenId);
            const { getDoc } = await import('firebase/firestore');
            const screenDoc = await getDoc(screenDocRef);
            
            if (screenDoc.exists() && screenDoc.data().isActive) {
              screens.push(screenDoc.data());
            }
          }
          
          // Sort by creation date (most recently liked first)
          const sortedScreens = screens.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
          callback(sortedScreens);
          
        } catch (error) {
          console.error('Error in wishlist subscription:', error);
          callback([]);
        }
      },
      (error) => {
        console.error('Error in wishlist subscription:', error);
        callback([]);
      }
    );
  }

  /**
   * Toggle a screen in/out of wishlist and return new state
   */
  async toggleWishlist(screenId: ScreenId): Promise<boolean> {
    try {
      const isCurrentlyInWishlist = await this.isScreenInWishlist(screenId);
      
      if (isCurrentlyInWishlist) {
        await this.removeFromWishlist(screenId);
        return false;
      } else {
        await this.addToWishlist(screenId);
        return true;
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      throw new Error(`Failed to toggle wishlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const wishlistService: WishlistService = new WishlistServiceImpl();

// Export helper functions
export const WishlistHelpers = {
  /**
   * Get wishlist count for display purposes
   */
  getWishlistCount(screens: ScreenDoc[]): number {
    return screens.length;
  },

  /**
   * Check if wishlist is empty
   */
  isWishlistEmpty(screens: ScreenDoc[]): boolean {
    return screens.length === 0;
  },

  /**
   * Get wishlist summary text
   */
  getWishlistSummary(screens: ScreenDoc[]): string {
    const count = screens.length;
    if (count === 0) return 'No saved screens';
    if (count === 1) return '1 saved screen';
    return `${count} saved screens`;
  },
};

// Export types for convenience
export type { ScreenDoc, ScreenId } from '../shared/models/firestore';