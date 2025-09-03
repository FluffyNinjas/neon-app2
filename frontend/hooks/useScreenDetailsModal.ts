import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScreenDoc, ScreenId } from '../shared/models/firestore';
import { wishlistService } from '../services/wishlistService';

export const useScreenDetailsModal = (favoriteScreens?: Set<string>) => {
  const router = useRouter();
  const [selectedScreen, setSelectedScreen] = useState<ScreenDoc | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = (screen: ScreenDoc) => {
    setSelectedScreen(screen);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedScreen(null);
  };

  const handleBookNow = (screen: ScreenDoc) => {
    setModalVisible(false);
    router.replace({
      pathname: '/booking-screen' as any,
      params: {
        screenId: screen.id,
        screenTitle: screen.title,
      }
    });
  };

  const handleToggleFavorite = async (screen: ScreenDoc) => {
    try {
      const isInWishlist = favoriteScreens?.has(screen.id) || false;
      
      if (isInWishlist) {
        await wishlistService.removeFromWishlist(screen.id as ScreenId);
      } else {
        await wishlistService.addToWishlist(screen.id as ScreenId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const isFavorite = selectedScreen ? favoriteScreens?.has(selectedScreen.id) || false : false;

  return {
    selectedScreen,
    modalVisible,
    openModal,
    closeModal,
    handleBookNow,
    handleToggleFavorite,
    isFavorite,
  };
};