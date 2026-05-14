import React, { createContext, useContext, useEffect, useState } from 'react';

interface AccessibilitySettings {
    highContrast: boolean;
    largeText: boolean;
    screenReaderMode: boolean;
}

interface AccessibilityContextType {
    settings: AccessibilitySettings;
    toggleHighContrast: () => void;
    toggleLargeText: () => void;
    toggleScreenReaderMode: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(() => {
        const saved = localStorage.getItem('accessibility_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse accessibility settings", e);
            }
        }
        return {
            highContrast: false,
            largeText: false,
            screenReaderMode: false
        };
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        if (settings.highContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }

        if (settings.largeText) {
            root.classList.add('large-text');
        } else {
            root.classList.remove('large-text');
        }

        localStorage.setItem('accessibility_settings', JSON.stringify(settings));
    }, [settings]);

    const toggleHighContrast = () => {
        setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
    };

    const toggleLargeText = () => {
        setSettings(prev => ({ ...prev, largeText: !prev.largeText }));
    };

    const toggleScreenReaderMode = () => {
        setSettings(prev => ({ ...prev, screenReaderMode: !prev.screenReaderMode }));
    };

    return (
        <AccessibilityContext.Provider value={{ 
            settings, 
            toggleHighContrast, 
            toggleLargeText, 
            toggleScreenReaderMode 
        }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}
