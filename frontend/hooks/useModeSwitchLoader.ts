import { useState, useCallback } from 'react';

export type ModeSwitchConfig = {
  duration?: number;
  customAnimation?: 'fade' | 'slide' | 'scale' | 'spin';
  customColors?: {
    background?: string;
    overlay?: string;
    text?: string;
    accent?: string;
    icon?: string;
  };
  message?: string;
};

export const useModeSwitchLoader = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [fromMode, setFromMode] = useState<'user' | 'owner'>('user');
  const [toMode, setToMode] = useState<'user' | 'owner'>('owner');
  const [onCompleteCallback, setOnCompleteCallback] = useState<(() => void) | null>(null);

  const showLoader = useCallback((
    from: 'user' | 'owner',
    to: 'user' | 'owner',
    onComplete?: () => void
  ) => {
    setFromMode(from);
    setToMode(to);
    setOnCompleteCallback(() => onComplete || (() => {}));
    setIsVisible(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsVisible(false);
    if (onCompleteCallback) {
      onCompleteCallback();
      setOnCompleteCallback(null);
    }
  }, [onCompleteCallback]);

  return {
    isVisible,
    fromMode,
    toMode,
    showLoader,
    hideLoader,
    loaderProps: {
      visible: isVisible,
      fromMode,
      toMode,
      onComplete: hideLoader,
    },
  };
};