import { create } from 'zustand';

export interface ScreenImage {
  id: string;
  uri: string;
  order: number;
}

export interface AvailabilityDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isAvailable: boolean;
  startTime: string; // '09:00'
  endTime: string; // '18:00'
}

export interface ScreenCreationState {
  // Step 1: Screen Type
  screenType: string;
  
  // Step 2: Location
  location: {
    address: string;
    latitude?: number;
    longitude?: number;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Step 3: Details
  details: {
    title: string;
    description: string;
    screenSize: string;
    resolution: string;
  };
  
  // Step 4: Pricing
  dailyPrice: string;
  
  // Step 5: Images
  images: ScreenImage[];
  
  // Step 6: Availability
  availability: AvailabilityDay[];
  
  // Actions
  setScreenType: (type: string) => void;
  setLocation: (location: Partial<ScreenCreationState['location']>) => void;
  setDetails: (details: Partial<ScreenCreationState['details']>) => void;
  setDailyPrice: (price: string) => void;
  setImages: (images: ScreenImage[]) => void;
  addImage: (image: ScreenImage) => void;
  removeImage: (imageId: string) => void;
  reorderImages: (images: ScreenImage[]) => void;
  setAvailability: (availability: AvailabilityDay[]) => void;
  updateDayAvailability: (day: string, availability: Partial<AvailabilityDay>) => void;
  resetStore: () => void;
  
  // Step validation
  isStepComplete: (step: number) => boolean;
}

const initialAvailability: AvailabilityDay[] = [
  { day: 'monday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
  { day: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
  { day: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
  { day: 'thursday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
  { day: 'friday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
  { day: 'saturday', isAvailable: false, startTime: '09:00', endTime: '18:00' },
  { day: 'sunday', isAvailable: false, startTime: '09:00', endTime: '18:00' },
];

const initialState = {
  screenType: '',
  location: {
    address: '',
    city: '',
    state: '',
    zipCode: '',
  },
  details: {
    title: '',
    description: '',
    screenSize: '',
    resolution: '',
  },
  dailyPrice: '',
  images: [],
  availability: initialAvailability,
};

export const useScreenCreationStore = create<ScreenCreationState>((set, get) => ({
  ...initialState,
  
  setScreenType: (type) => set({ screenType: type }),
  
  setLocation: (location) => 
    set((state) => ({ 
      location: { ...state.location, ...location } 
    })),
  
  setDetails: (details) =>
    set((state) => ({
      details: { ...state.details, ...details }
    })),
  
  setDailyPrice: (price) => set({ dailyPrice: price }),
  
  setImages: (images) => set({ images }),
  
  addImage: (image) =>
    set((state) => ({
      images: [...state.images, image]
    })),
  
  removeImage: (imageId) =>
    set((state) => ({
      images: state.images.filter(img => img.id !== imageId)
    })),
  
  reorderImages: (images) => set({ images }),
  
  setAvailability: (availability) => set({ availability }),
  
  updateDayAvailability: (day, availability) =>
    set((state) => ({
      availability: state.availability.map(dayAvail =>
        dayAvail.day === day
          ? { ...dayAvail, ...availability }
          : dayAvail
      )
    })),
  
  resetStore: () => set({ ...initialState, availability: initialAvailability }),
  
  isStepComplete: (step) => {
    const state = get();
    switch (step) {
      case 1: // Screen Type
        return state.screenType.length > 0;
      case 2: // Location
        return state.location.address.length > 0 && 
               state.location.city.length > 0 && 
               state.location.state.length > 0;
      case 3: // Details
        return state.details.title.length > 0 && 
               state.details.description.length > 0 && 
               state.details.screenSize.length > 0 && 
               state.details.resolution.length > 0;
      case 4: // Price
        return state.dailyPrice.length > 0 && !isNaN(Number(state.dailyPrice));
      case 5: // Images
        return state.images.length > 0;
      case 6: // Availability
        return state.availability.some(day => day.isAvailable);
      default:
        return false;
    }
  },
}));