import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';
import { 
  bookingConverter, 
  UserId, 
  BookingId, 
  ScreenId, 
  ContentId,
  IsoDate,
  BookingStatus 
} from '../shared/models/firestore';

export interface CreateBookingRequest {
  screenId: ScreenId;
  ownerId: UserId;
  dates: IsoDate[];
  amountTotal: number;
  contentId?: ContentId;
  specialInstructions?: string;
}

export class BookingService {
  private static getBookingsCollection() {
    return collection(db, 'bookings').withConverter(bookingConverter);
  }

  // Create a new booking request
  static async createBooking(request: CreateBookingRequest): Promise<BookingId> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Build booking document, only including optional fields if they have values
      const bookingDoc: any = {
        screenId: request.screenId,
        ownerId: request.ownerId,
        renterId: user.uid as UserId,
        status: 'requested' as BookingStatus,
        dates: request.dates,
        amountTotal: request.amountTotal,
        currency: 'usd' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only add optional fields if they have values (Firestore doesn't accept undefined)
      if (request.contentId) {
        bookingDoc.contentId = request.contentId;
      }

      if (request.specialInstructions && request.specialInstructions.trim()) {
        bookingDoc.specialInstructions = request.specialInstructions.trim();
      }

      const docRef = await addDoc(this.getBookingsCollection(), bookingDoc);
      return docRef.id as BookingId;
    } catch (error) {
      console.error('Error creating booking:', error);
      console.error('Booking request data:', request);
      throw new Error('Failed to create booking');
    }
  }
}