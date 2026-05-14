import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { speak, stopSpeaking } from '../utils/speechSynthesis';

const ScreenReaderHover: React.FC = () => {
    const { settings } = useAccessibility();
    const lastReadRef = useRef<string | null>(null);

    useEffect(() => {
        if (!settings.screenReaderMode) {
            stopSpeaking();
            return;
        }

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // Extract text from the element or its ARIA label
            const textToRead = target.getAttribute('aria-label') || target.innerText || target.getAttribute('title');

            if (textToRead && textToRead.trim().length > 0 && textToRead !== lastReadRef.current) {
                // Don't read long blocks of text unless they are specifically targeted
                if (textToRead.length > 500) return;

                speak(textToRead.trim());
                lastReadRef.current = textToRead;
            }
        };

        const handleMouseLeave = () => {
            // Optional: stop speaking when moving away, but usually better to let it finish short sentences
            // stopSpeaking();
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [settings.screenReaderMode]);

    return null; // This component doesn't render anything
};

export default ScreenReaderHover;
