// constants/screenTypes.ts or config/screenTypes.ts

export interface ScreenType {
    id: string;
    title: string;
    description: string;
    icon: string;
  }
  
  export const screenTypes: ScreenType[] = [
    {
      id: 'digital-billboard',
      title: 'Digital Billboard',
      description: 'Large outdoor digital displays',
      icon: 'library-outline',
    },
    {
      id: 'led-screen',
      title: 'LED Screen',
      description: 'High brightness LED displays',
      icon: 'bulb-outline',
    },
    {
      id: 'lcd-display',
      title: 'LCD Display',
      description: 'Indoor LCD monitors and screens',
      icon: 'desktop-outline',
    },
    {
      id: 'interactive-kiosk',
      title: 'Interactive Kiosk',
      description: 'Touch-enabled interactive displays',
      icon: 'finger-print-outline',
    },
    {
      id: 'projection-screen',
      title: 'Projection Screen',
      description: 'Projector-based displays',
      icon: 'videocam-outline',
    },
    {
      id: 'transit-display',
      title: 'Transit Display',
      description: 'Screens in buses, trains, stations',
      icon: 'train-outline',
    },
    {
      id: 'retail-display',
      title: 'Retail Display',
      description: 'In-store and window displays',
      icon: 'storefront-outline',
    },
    {
      id: 'other',
      title: 'Other',
      description: 'Custom or unique screen types',
      icon: 'ellipsis-horizontal-outline',
    },
  ];
  
  // Optional: Helper functions
  export const getScreenTypeById = (id: string): ScreenType | undefined => {
    return screenTypes.find(type => type.id === id);
  };
  
  export const getScreenTypeTitles = (): string[] => {
    return screenTypes.map(type => type.title);
  };
  
  export const getScreenTypeIds = (): string[] => {
    return screenTypes.map(type => type.id);
  };