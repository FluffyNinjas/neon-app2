import { collection, getDocs, query, where, orderBy, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../FirebaseConfig';
import { ContentDoc, contentConverter, UserId, ContentId, ContentType } from '../shared/models/firestore';

export interface ContentFilters {
  type?: ContentType;
  limit?: number;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export class ContentService {
  private static getContentCollection(userId: UserId) {
    return collection(db, 'users', userId, 'content').withConverter(contentConverter);
  }

  static async getUserContent(userId: UserId, filters?: ContentFilters): Promise<ContentDoc[]> {
    try {
      let contentQuery = query(
        this.getContentCollection(userId),
        orderBy('createdAt', 'desc')
      );

      if (filters?.type) {
        contentQuery = query(contentQuery, where('type', '==', filters.type));
      }

      const querySnapshot = await getDocs(contentQuery);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error fetching user content:', error);
      throw new Error('Failed to load content');
    }
  }

  static async getCurrentUserContent(filters?: ContentFilters): Promise<ContentDoc[]> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return this.getUserContent(user.uid as UserId, filters);
  }

  // Upload content to Firebase Storage and save metadata to Firestore
  static async uploadContent(
    title: string, 
    type: ContentType, 
    file: { uri: string; width?: number; height?: number; fileSize?: number; fileName?: string },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ContentId> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = type === 'image' ? 'jpg' : 'mp4';
      const fileName = file.fileName || `${type}_${timestamp}.${fileExtension}`;
      
      // Create storage reference in user-specific folder
      const storageRef = ref(storage, `content/${user.uid}/${fileName}`);
      
      // Convert URI to blob for upload
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Upload file to Firebase Storage
      const uploadTask = await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      // Save metadata to Firestore
      const contentDoc = {
        renterId: user.uid as UserId,
        title,
        type,
        fileUrl: downloadURL,
        storagePath: `content/${user.uid}/${fileName}`,
        dimensions: { width: file.width || 400, height: file.height || 300 },
        fileSize: file.fileSize || blob.size,
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(this.getContentCollection(user.uid as UserId), contentDoc as any);
      return docRef.id as ContentId;
    } catch (error) {
      console.error('Error uploading content:', error);
      throw new Error('Failed to upload content');
    }
  }

  // Delete content from both Firestore and Firebase Storage
  static async deleteContent(contentId: ContentId): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Get content document to find storage path
      const contentRef = doc(this.getContentCollection(user.uid as UserId), contentId);
      const contentDocSnap = await getDocs(query(this.getContentCollection(user.uid as UserId)));
      
      // Find the specific document
      const contentDoc = contentDocSnap.docs.find(doc => doc.id === contentId);
      
      if (contentDoc) {
        const content = contentDoc.data();
        
        // Delete from Firebase Storage if storagePath exists
        if (content.storagePath) {
          const storageRef = ref(storage, content.storagePath);
          try {
            await deleteObject(storageRef);
          } catch (storageError) {
            console.warn('Failed to delete from storage:', storageError);
            // Continue with Firestore deletion even if storage deletion fails
          }
        }
      }
      
      // Delete from Firestore
      await deleteDoc(contentRef);
    } catch (error) {
      console.error('Error deleting content:', error);
      throw new Error('Failed to delete content');
    }
  }
}