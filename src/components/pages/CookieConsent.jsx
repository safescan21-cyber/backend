import React, { useState, useEffect } from 'react';
import { Cookie, X, Settings, Check } from 'lucide-react';

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0'; // bump this if your cookie policy changes — forces re-consent

const defaultPreferences = {
  necessary: true,   // always on, can't be disabled
  analytics: false,
  marketing: false,
  functional: false,
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        setVisible(true);
        return;
      }
      const parsed = JSON.parse(stored);
      // Re-prompt if the policy version changed since they last consented
      if (parsed.version !== CONSENT_VERSION) {
        setVisible(true);
      }
    } catch (err) {
      // Corrupted/unreadable value — treat as no consent given
      setVisible(true);
    }
  }, []);

  const saveConsent = (prefs) => {
    const record = {
      version: CONSENT_VERSION,
      preferences: prefs,
      consentedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    setVisible(false);

    // 🔌 Hook point: fire your analytics/marketing scripts here based on
    // what was actually accepted, e.g.:
    // if (prefs.analytics) loadGoogleAnalytics();
    // if (prefs.marketing) loadMetaPixel();
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: prefs }));
  };

  const handleAcceptAll = () => {
    const allAccepted = { necessary: true, analytics: true, marketing: true, functional: true };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const handleRejectNonEssential = () => {
    setPreferences(defaultPreferences);
    saveConsent(defaultPreferences);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return; // can't toggle required cookies
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Cookie className="w-5 h-5 text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base mb-1.5">We use cookies</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                We use necessary cookies to make our site work. With your consent, we'd also
                like to use analytics and functional cookies to improve your experience. You
                can change your preferences anytime.{' '}
                <a href="/privacy-policy" className="text-blue-400 hover:text-blue-300 underline">
                  Learn more
                </a>
              </p>

              {showDetails && (
                <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
                  <PreferenceRow
                    label="Necessary"
                    description="Required for the site to function (login, cart, security). Always active."
                    checked={true}
                    disabled={true}
                    onToggle={() => {}}
                  />
                  <PreferenceRow
                    label="Functional"
                    description="Remembers preferences like saved addresses and display settings."
                    checked={preferences.functional}
                    onToggle={() => togglePreference('functional')}
                  />
                  <PreferenceRow
                    label="Analytics"
                    description="Helps us understand how visitors use the site so we can improve it."
                    checked={preferences.analytics}
                    onToggle={() => togglePreference('analytics')}
                  />
                  <PreferenceRow
                    label="Marketing"
                    description="Used to show relevant ads and measure campaign performance."
                    checked={preferences.marketing}
                    onToggle={() => togglePreference('marketing')}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-end">
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors order-3 sm:order-1"
            >
              <Settings className="w-4 h-4" />
              {showDetails ? 'Hide options' : 'Manage preferences'}
            </button>

            <button
              onClick={handleRejectNonEssential}
              className="px-4 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors order-2"
            >
              Reject non-essential
            </button>

            {showDetails ? (
              <button
                onClick={handleSavePreferences}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors order-1 sm:order-3"
              >
                <Check className="w-4 h-4" />
                Save preferences
              </button>
            ) : (
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors order-1 sm:order-3"
              >
                Accept all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PreferenceRow = ({ label, description, checked, disabled, onToggle }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={`flex-shrink-0 relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export default CookieConsent;