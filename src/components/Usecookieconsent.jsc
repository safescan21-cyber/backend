import { useState, useEffect, useCallback } from 'react';

const COOKIE_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';

const defaultPrefs = {
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

export function useCookieConsent() {
  const [consent, setConsent] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COOKIE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Re-show banner if consent version changed
        if (parsed.version !== CONSENT_VERSION) {
          setShowBanner(true);
        } else {
          setConsent(parsed);
        }
      } else {
        setShowBanner(true);
      }
    } catch {
      setShowBanner(true);
    }
    setIsLoaded(true);
  }, []);

  const saveConsent = useCallback((prefs) => {
    const data = {
      ...defaultPrefs,
      ...prefs,
      essential: true, // always true
      version: CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify(data));
    } catch {
      // storage might be unavailable
    }
    setConsent(data);
    setShowBanner(false);
    setShowModal(false);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  }, [saveConsent]);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(COOKIE_KEY);
    setConsent(null);
    setShowBanner(true);
    setShowModal(false);
  }, []);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return {
    consent,
    showBanner,
    showModal,
    isLoaded,
    acceptAll,
    rejectAll,
    saveConsent,
    resetConsent,
    openModal,
    closeModal,
  };
}