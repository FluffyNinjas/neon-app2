import { create } from 'zustand';
import { ScreenDoc, ScreenId, ContentId, IsoDate } from '../shared/models/firestore';

export interface BookingState {
  // Screen being booked
  screenId: ScreenId | null;
  screen: ScreenDoc | null;
  
  // Selected dates
  selectedDates: IsoDate[];
  
  // Content selection
  selectedContentId: ContentId | null;
  
  // Pricing
  totalAmount: number; // in cents
  
  // Special instructions
  specialInstructions: string;
  
  // Actions
  setScreen: (screenId: ScreenId, screen: ScreenDoc) => void;
  setSelectedDates: (dates: IsoDate[]) => void;
  addSelectedDate: (date: IsoDate) => void;
  removeSelectedDate: (date: IsoDate) => void;
  clearSelectedDates: () => void;
  setSelectedContent: (contentId: ContentId | null) => void;
  setSpecialInstructions: (instructions: string) => void;
  calculateTotal: () => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>()((set, get) => ({
  // Initial state
  screenId: null,
  screen: null,
  selectedDates: [],
  selectedContentId: null,
  totalAmount: 0,
  specialInstructions: '',

  // Actions
  setScreen: (screenId, screen) => {
    set({ screenId, screen });
    // Recalculate total when screen changes
    get().calculateTotal();
  },

  setSelectedDates: (dates) => {
    // Sort dates and ensure uniqueness
    const uniqueDates = Array.from(new Set(dates)).sort();
    set({ selectedDates: uniqueDates });
    // Recalculate total when dates change
    get().calculateTotal();
  },

  addSelectedDate: (date) => {
    const { selectedDates } = get();
    if (!selectedDates.includes(date)) {
      const newDates = [...selectedDates, date].sort();
      set({ selectedDates: newDates });
      get().calculateTotal();
    }
  },

  removeSelectedDate: (date) => {
    const { selectedDates } = get();
    const newDates = selectedDates.filter(d => d !== date);
    set({ selectedDates: newDates });
    get().calculateTotal();
  },

  clearSelectedDates: () => {
    set({ selectedDates: [] });
    get().calculateTotal();
  },

  setSelectedContent: (contentId) => {
    set({ selectedContentId: contentId });
  },

  setSpecialInstructions: (instructions) => {
    set({ specialInstructions: instructions });
  },

  calculateTotal: () => {
    const { screen, selectedDates } = get();
    if (screen && selectedDates.length > 0) {
      const totalAmount = screen.dayPrice * selectedDates.length;
      set({ totalAmount });
    } else {
      set({ totalAmount: 0 });
    }
  },

  clearBooking: () => {
    set({
      screenId: null,
      screen: null,
      selectedDates: [],
      selectedContentId: null,
      totalAmount: 0,
      specialInstructions: '',
    });
  },
}));