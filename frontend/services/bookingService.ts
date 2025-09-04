import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';
import { 
  BookingDoc,
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

  // Get existing bookings for a screen (accepted bookings only)
  static async getScreenBookings(screenId: ScreenId): Promise<IsoDate[]> {
    try {
      const bookingsQuery = query(
        this.getBookingsCollection(),
        where('screenId', '==', screenId),
        where('status', 'in', ['accepted', 'live', 'completed'])
      );

      const querySnapshot = await getDocs(bookingsQuery);
      const bookedDates: Set<IsoDate> = new Set();

      querySnapshot.docs.forEach(doc => {
        const booking = doc.data() as BookingDoc;
        // Add all dates from this booking to the set
        booking.dates.forEach(date => {
          bookedDates.add(date);
        });
      });

      return Array.from(bookedDates);
    } catch (error) {
      console.error('Error fetching screen bookings:', error);
      throw new Error('Failed to load existing bookings');
    }
  }

  // Get all bookings for the current user
  static async getUserBookings(): Promise<BookingDoc[]> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const bookingsQuery = query(
        this.getBookingsCollection(),
        where('renterId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(bookingsQuery);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw new Error('Failed to load your bookings');
    }
  }

  // Cancel a booking (only allowed for requested status)
  static async cancelBooking(bookingId: BookingId): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const bookingRef = doc(this.getBookingsCollection(), bookingId);
      await updateDoc(bookingRef, {
        status: 'cancelled' as BookingStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw new Error('Failed to cancel booking');
    }
  }

  // Get all bookings for screens owned by the current user
  static async getOwnerBookings(): Promise<BookingDoc[]> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const bookingsQuery = query(
        this.getBookingsCollection(),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(bookingsQuery);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error fetching owner bookings:', error);
      throw new Error('Failed to load bookings for your screens');
    }
  }

  // Accept a booking request with status validation
  static async acceptBooking(bookingId: BookingId): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const bookingRef = doc(this.getBookingsCollection(), bookingId);
      
      // First, get the current booking to check its status
      const bookingSnapshot = await getDoc(bookingRef);
      
      if (!bookingSnapshot.exists()) {
        throw new Error('Booking not found');
      }
      
      const currentBooking = bookingSnapshot.data();
      
      // Check if the booking was cancelled by the renter
      if (currentBooking.status === 'cancelled') {
        throw new Error('BOOKING_CANCELLED');
      }
      
      // Check if the booking is still in requested status
      if (currentBooking.status !== 'requested') {
        throw new Error(`Booking status is ${currentBooking.status}, cannot accept`);
      }
      
      // Check for date conflicts with other accepted bookings
      const existingBookedDates = await this.getScreenBookings(currentBooking.screenId);
      const requestedDates = new Set(currentBooking.dates);
      const conflictingDates = existingBookedDates.filter(date => requestedDates.has(date));
      
      if (conflictingDates.length > 0) {
        const conflictDatesStr = conflictingDates.map(date => {
          const dateObj = new Date(date + 'T00:00:00');
          return dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short', 
            day: 'numeric'
          });
        }).join(', ');
        
        throw new Error(`DATE_CONFLICT:${conflictDatesStr}`);
      }
      
      await updateDoc(bookingRef, {
        status: 'accepted' as BookingStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error accepting booking:', error);
      if (error.message === 'BOOKING_CANCELLED') {
        throw new Error('This booking has been cancelled by the customer');
      }
      if (error.message.startsWith('DATE_CONFLICT:')) {
        const conflictDates = error.message.split(':')[1];
        throw new Error(`Cannot accept this booking because the following dates are already reserved: ${conflictDates}`);
      }
      throw new Error('Failed to accept booking');
    }
  }

  // Decline a booking request
  static async declineBooking(bookingId: BookingId): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const bookingRef = doc(this.getBookingsCollection(), bookingId);
      await updateDoc(bookingRef, {
        status: 'declined' as BookingStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error declining booking:', error);
      throw new Error('Failed to decline booking');
    }
  }

  // Cancel a booking from owner's side (for accepted bookings)
  static async ownerCancelBooking(bookingId: BookingId): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const bookingRef = doc(this.getBookingsCollection(), bookingId);
      await updateDoc(bookingRef, {
        status: 'cancelled' as BookingStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw new Error('Failed to cancel booking');
    }
  }
}