// NEON Firestore Models (TypeScript)
// ------------------------------------------------------------
// Stack: Expo (React Native) + Firebase Firestore + Stripe
// Messaging is intentionally omitted from the domain.
// This file defines:
// - Brand ID helpers
// - Enums
// - Core document interfaces (users, screens, bookings, content, reviews, likes, analytics)
// - Runtime-safe creation types (with FieldValue for server timestamps)
// - Firestore path helpers
// - Firestore converters (withConverter)
// - Minimal validation helpers

import { Timestamp,
        FieldValue,
        DocumentData,
        FirestoreDataConverter
 } from '@google-cloud/firestore';

  
  // ------------------------------------------------------------
  // Branded IDs & Common Types
  // ------------------------------------------------------------
  
  type Brand<K, T> = K & { readonly __brand: T };
  export type UserId = Brand<string, 'UserId'>;
  export type ScreenId = Brand<string, 'ScreenId'>;
  export type BookingId = Brand<string, 'BookingId'>;
  export type ContentId = Brand<string, 'ContentId'>;
  export type ReviewId = Brand<string, 'ReviewId'>;
  
  export type Currency = 'usd'; // extend later if you support more
  
  export type LatLng = {
    lat: number; // WGS84
    lng: number;
  };
  
  // Firestore timestamp fields: when creating client-side, use FieldValue.serverTimestamp()
  export type CreatedUpdated = {
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
  
  export type CreatableTimestamps = {
    createdAt: FieldValue; // serverTimestamp()
    updatedAt: FieldValue; // serverTimestamp()
  };
  
  // ------------------------------------------------------------
  // Enums
  // ------------------------------------------------------------
  
  export type UserType = 'owner' | 'creator' | 'both';
  export type BookingStatus =
    | 'requested'
    | 'accepted'
    | 'live'
    | 'completed'
    | 'declined'
    | 'cancelled'
    | 'refunded';
  
  export type ContentType = 'image' | 'video';
  
  // ------------------------------------------------------------
  // users/{userId}
  // ------------------------------------------------------------
  
  export interface UserDoc extends CreatedUpdated {
    id: UserId; // virtual: document id
    email: string;
    displayName?: string;
    photoURL?: string;
    userType: UserType;
    stripeAccountId?: string; // Stripe Connect account
    isVerified?: boolean; // platform-level verification
  }
  
  export type NewUserDoc = Omit<UserDoc, 'id' | keyof CreatedUpdated> & CreatableTimestamps;
  
  // ------------------------------------------------------------
  // screens/{screenId}
  // ------------------------------------------------------------
  
  // Availability types (weekly schedule)
  export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  export type TimeHHMM = string; // 'HH:mm' 24h format
  export interface TimeRange { start: TimeHHMM; end: TimeHHMM; } // start < end
  export type DailyAvailability = TimeRange[]; // non-overlapping, sorted
  export interface WeeklyAvailability {
    timezone: string; // IANA, e.g., 'America/New_York'
    mon: DailyAvailability;
    tue: DailyAvailability;
    wed: DailyAvailability;
    thu: DailyAvailability;
    fri: DailyAvailability;
    sat: DailyAvailability;
    sun: DailyAvailability;
  }
  
  export interface ScreenDoc extends CreatedUpdated {
    id: ScreenId; // virtual: doc id
    ownerId: UserId;
    title: string;
    description?: string;
    screenType: string;
    screenResolution?: string,
    screenSize: string,
    address: string;
    coordinates: LatLng;
    photos: string[]; // Storage URLs
    dayPrice: number; // cents
    isActive: boolean;
    ratingAvg?: number; // 0..5
    ratingCount?: number;
    zipCode: string;
    state: string;
    city: string;
    // NEW: weekly time availability per weekday
    availability: WeeklyAvailability; // required for screens
    featured: false;
  }
  
  export type NewScreenDoc = Omit<ScreenDoc, 'id' | keyof CreatedUpdated> & CreatableTimestamps;
  
  // ------------------------------------------------------------
  // content/{contentId}
  // ------------------------------------------------------------
  
  export interface ContentDoc extends CreatedUpdated {
    id: ContentId; // virtual
    renterId: UserId;
    title: string;
    type: ContentType;
    fileUrl: string; // Storage URL
    durationSec?: number; // optional for images
    dimensions?: { width: number; height: number };
    fileSize?: number; // bytes
    tags?: string[];
  }
  
  export type NewContentDoc = Omit<ContentDoc, 'id' | keyof CreatedUpdated> & CreatableTimestamps;
  
  // ------------------------------------------------------------
  // bookings/{bookingId}
  // ------------------------------------------------------------
  
  // Booking dates are ISO YYYY-MM-DD strings (local to the screen location/timezone policy)
  export type IsoDate = string; // e.g., '2025-09-01'
  
  export interface BookingDoc extends CreatedUpdated {
    id: BookingId; // virtual
    screenId: ScreenId;
    ownerId: UserId; // denormalized from screen
    renterId: UserId;
    status: BookingStatus;
    dates: IsoDate[]; // one or more calendar days
    amountTotal: number; // cents
    currency: Currency;
    // Payments
    paymentIntentId?: string; // Stripe PaymentIntent on accept
    transferId?: string; // Stripe Transfer on completion
    refundId?: string; // if refunded
    // Presentation helpers (optional)
    contentId?: ContentId; // creative to run
    specialInstructions?: string; // one-off text instead of messaging
  }
  
  export type NewBookingDoc = Omit<BookingDoc, 'id' | keyof CreatedUpdated> & CreatableTimestamps;
  
  // ------------------------------------------------------------
  // reviews/{reviewId}
  // ------------------------------------------------------------
  
  export interface ReviewDoc extends CreatedUpdated {
    id: ReviewId; // virtual
    screenId: ScreenId;
    renterId: UserId;
    rating: number; // 1..5
    comment?: string;
  }
  
  export type NewReviewDoc = Omit<ReviewDoc, 'id' | keyof CreatedUpdated> & CreatableTimestamps;
  
  // ------------------------------------------------------------
  // likes/{userId}/screens/{screenId}
  // ------------------------------------------------------------
  
  export interface LikeDoc extends CreatedUpdated {
    id: ScreenId; // same as screen id, lives under likes/{userId}/screens/{screenId}
    userId: UserId; // parent id duplicated for convenience
    screenId: ScreenId;
  }
  
  export type NewLikeDoc = Omit<LikeDoc, 'id' | keyof CreatedUpdated> & CreatableTimestamps;
  
  // ------------------------------------------------------------
  // analytics_daily/{docId}
  // ------------------------------------------------------------
  
  export interface AnalyticsDailyDoc extends CreatedUpdated {
    id: string;
    ownerId: UserId;
    date: IsoDate; // YYYY-MM-DD
    grossCents: number;
    feesCents: number;
    netCents: number; // transfer amount
    bookingsCount: number;
  }
  
  export type NewAnalyticsDailyDoc = Omit<AnalyticsDailyDoc, 'id' | keyof CreatedUpdated> & CreatableTimestamps;
  
  // ------------------------------------------------------------
  // Path Helpers (keep routes consistent in one place)
  // ------------------------------------------------------------
  
  export const paths = {
    user: (uid: UserId) => ['users', uid] as const,
    screen: (sid: ScreenId) => ['screens', sid] as const,
    content: (cid: ContentId) => ['content', cid] as const,
    booking: (bid: BookingId) => ['bookings', bid] as const,
    review: (rid: ReviewId) => ['reviews', rid] as const,
    likesCol: (uid: UserId) => ['likes', uid, 'screens'] as const,
    like: (uid: UserId, sid: ScreenId) => ['likes', uid, 'screens', sid] as const,
    analyticsDaily: (id: string) => ['analytics_daily', id] as const,
  };
  
  // ------------------------------------------------------------
  // Converters: strip virtual id<>document, guard timestamps
  // ------------------------------------------------------------
  
  function withId<T extends { id: string }>(id: string, data: Omit<T, 'id'>): T {
    return { id: id as T['id'], ...(data as any) };
  }
  
  function requireTimestamps(data: any) {
    if (!data.createdAt || !data.updatedAt) {
      throw new Error('Missing createdAt/updatedAt');
    }
    return data;
  }
  
  // Generic builder
  function makeConverter<T extends { id: string }>(
    toFirestore: (model: Omit<T, 'id'>) => DocumentData,
    fromFirestore: (data: DocumentData) => Omit<T, 'id'>,
  ): FirestoreDataConverter<T> {
    return {
      toFirestore(model: T): DocumentData {
        const { id, ...rest } = model;
        return toFirestore(rest as Omit<T, 'id'>);
      },
      fromFirestore(snapshot): T {
        const data = fromFirestore(requireTimestamps(snapshot.data()));
        return withId<T>(snapshot.id, data as Omit<T, 'id'>);
      },
    };
  }
  
  // users
  export const userConverter = makeConverter<UserDoc>(
    (m) => m,
    (d) => d as Omit<UserDoc, 'id'>,
  );
  
  // screens
  export const screenConverter = makeConverter<ScreenDoc>(
    (m) => m,
    (d) => d as Omit<ScreenDoc, 'id'>,
  );
  
  // content
  export const contentConverter = makeConverter<ContentDoc>(
    (m) => m,
    (d) => d as Omit<ContentDoc, 'id'>,
  );
  
  // bookings
  export const bookingConverter = makeConverter<BookingDoc>(
    (m) => m,
    (d) => d as Omit<BookingDoc, 'id'>,
  );
  
  // reviews
  export const reviewConverter = makeConverter<ReviewDoc>(
    (m) => m,
    (d) => d as Omit<ReviewDoc, 'id'>,
  );
  
  // likes
  export const likeConverter = makeConverter<LikeDoc>(
    (m) => m,
    (d) => d as Omit<LikeDoc, 'id'>,
  );
  
  // analytics_daily
  export const analyticsDailyConverter = makeConverter<AnalyticsDailyDoc>(
    (m) => m,
    (d) => d as Omit<AnalyticsDailyDoc, 'id'>,
  );
  
  // ------------------------------------------------------------
  // Minimal Builders (strongly-typed creators for new docs)
  // ------------------------------------------------------------
  
  export function buildNewUser(input: Omit<UserDoc, 'id' | keyof CreatedUpdated>): NewUserDoc {
    return {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  
  export function buildNewScreen(input: Omit<ScreenDoc, 'id' | keyof CreatedUpdated>): NewScreenDoc {
    return {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  
  export function buildNewContent(input: Omit<ContentDoc, 'id' | keyof CreatedUpdated>): NewContentDoc {
    return {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  
  export function buildNewBooking(input: Omit<BookingDoc, 'id' | keyof CreatedUpdated>): NewBookingDoc {
    return {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  
  export function buildNewReview(input: Omit<ReviewDoc, 'id' | keyof CreatedUpdated>): NewReviewDoc {
    return {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  
  export function buildNewLike(input: Omit<LikeDoc, 'id' | keyof CreatedUpdated>): NewLikeDoc {
    return {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  
  export function buildNewAnalyticsDaily(input: Omit<AnalyticsDailyDoc, 'id' | keyof CreatedUpdated>): NewAnalyticsDailyDoc {
    return {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  
  // ------------------------------------------------------------
  // Validation helpers (lightweight)
  // ------------------------------------------------------------
  
  export function isIsoDate(s: string): boolean {
    // Accepts YYYY-MM-DD only
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
  }
  
  export function normalizeDates(dates: string[]): IsoDate[] {
    return Array.from(new Set(dates.map((d) => d.trim()))).sort();
  }
  
  export function ensureValidBooking(input: Partial<BookingDoc>): asserts input is BookingDoc {
    if (!input.dates || input.dates.length === 0) throw new Error('Booking must include at least one date');
    if (!input.dates.every(isIsoDate)) throw new Error('All booking dates must be ISO YYYY-MM-DD');
    if (input.amountTotal! <= 0) throw new Error('amountTotal must be > 0');
  }
  
  // ------------------------------------------------------------
  // Suggested Firestore Indexes (add via Firebase console when prompted)
  // ------------------------------------------------------------
  // bookings: [screenId ASC, status ASC, createdAt DESC]
  // bookings: [ownerId ASC, status ASC, createdAt DESC]
  // bookings: [renterId ASC, createdAt DESC]
  // screens:  [isActive ASC, dayPrice ASC]
  // screens:  [isActive ASC, ratingAvg DESC]
  // reviews:  [screenId ASC, createdAt DESC]
  
  // ------------------------------------------------------------
  // Usage Example (client)
  // ------------------------------------------------------------
  // import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
  // const ref = doc(db, ...paths.screen(screenId)).withConverter(screenConverter);
  // await setDoc(ref, { ...screen, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  