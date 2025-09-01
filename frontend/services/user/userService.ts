import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../../FirebaseConfig';
import { 
  UserDoc, 
  UserId,
  UserType,
  buildNewUser,
  paths
} from '../../shared/models/firestore';

export interface UserService {
  getCurrentUser(): Promise<UserDoc | null>;
  getUserById(userId: UserId): Promise<UserDoc | null>;
  createUser(userData: Omit<UserDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserDoc>;
  updateUser(userId: UserId, updates: Partial<Omit<UserDoc, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
  deleteUser(userId: UserId): Promise<void>;
  subscribeToUser(userId: UserId, callback: (user: UserDoc | null) => void): Unsubscribe;
  subscribeToCurrentUser(callback: (user: UserDoc | null) => void): Unsubscribe | null;
  updateUserType(userId: UserId, userType: UserType): Promise<void>;
  verifyUser(userId: UserId, isVerified: boolean): Promise<void>;
  updateProfile(userId: UserId, displayName?: string, photoURL?: string): Promise<void>;
}

class UserServiceImpl implements UserService {
  /**
   * Get the currently authenticated user's data
   */
  async getCurrentUser(): Promise<UserDoc | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }
    
    return this.getUserById(currentUser.uid as UserId);
  }

  /**
   * Get a user by their ID
   */
  async getUserById(userId: UserId): Promise<UserDoc | null> {
    try {
      const userDocRef = doc(db, ...paths.user(userId));
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        return { id: userId, ...userSnap.data() } as UserDoc;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new user document
   */
  async createUser(userData: Omit<UserDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserDoc> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const userId = currentUser.uid as UserId;
      const newUserData = buildNewUser(userData);
      const userDocRef = doc(db, ...paths.user(userId));
      
      await setDoc(userDocRef, { id: userId, ...newUserData });
      
      // Fetch the created user data to return with proper timestamps
      const createdUser = await this.getUserById(userId);
      if (!createdUser) {
        throw new Error('Failed to retrieve created user data');
      }
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user data
   */
  async updateUser(
    userId: UserId, 
    updates: Partial<Omit<UserDoc, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const userDocRef = doc(db, ...paths.user(userId));
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(userDocRef, updateData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a user document
   */
  async deleteUser(userId: UserId): Promise<void> {
    try {
      const userDocRef = doc(db, ...paths.user(userId));
      await deleteDoc(userDocRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to real-time updates for a user
   */
  subscribeToUser(userId: UserId, callback: (user: UserDoc | null) => void): Unsubscribe {
    const userDocRef = doc(db, ...paths.user(userId));
    
    return onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          callback({ id: userId, ...doc.data() } as UserDoc);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error in user subscription:', error);
        callback(null);
      }
    );
  }

  /**
   * Subscribe to real-time updates for the current user
   */
  subscribeToCurrentUser(callback: (user: UserDoc | null) => void): Unsubscribe | null {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }
    
    return this.subscribeToUser(currentUser.uid as UserId, callback);
  }

  /**
   * Update user type (owner, creator, both)
   */
  async updateUserType(userId: UserId, userType: UserType): Promise<void> {
    await this.updateUser(userId, { userType });
  }

  /**
   * Update user verification status
   */
  async verifyUser(userId: UserId, isVerified: boolean): Promise<void> {
    await this.updateUser(userId, { isVerified });
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId: UserId, displayName?: string, photoURL?: string): Promise<void> {
    const updates: Partial<UserDoc> = {};
    
    if (displayName !== undefined) {
      updates.displayName = displayName;
    }
    
    if (photoURL !== undefined) {
      updates.photoURL = photoURL;
    }
    
    if (Object.keys(updates).length > 0) {
      await this.updateUser(userId, updates);
    }
  }
}

// Export singleton instance
export const userService: UserService = new UserServiceImpl();

// Export additional helper functions
export const UserHelpers = {
  /**
   * Check if user is an owner
   */
  isOwner(user: UserDoc): boolean {
    return user.userType === 'owner' || user.userType === 'both';
  },

  /**
   * Check if user is a creator
   */
  isCreator(user: UserDoc): boolean {
    return user.userType === 'creator' || user.userType === 'both';
  },

  /**
   * Check if user is verified
   */
  isVerified(user: UserDoc): boolean {
    return user.isVerified === true;
  },

  /**
   * Get user display name or fallback to email
   */
  getDisplayName(user: UserDoc): string {
    return user.displayName || user.email.split('@')[0] || 'User';
  },

  /**
   * Get user initials for avatar
   */
  getInitials(user: UserDoc): string {
    const name = this.getDisplayName(user);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  },
};

// Export types for convenience
export type { UserDoc, NewUserDoc, UserId, UserType } from '../../shared/models/firestore';