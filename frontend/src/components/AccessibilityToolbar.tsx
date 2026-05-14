import React, { useState } from 'react';
import { Eye, Type, Volume2, Settings, X, Info } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

const AccessibilityToolbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings, toggleHighContrast, toggleLargeText, toggleScreenReaderMode } = useAccessibility();

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
            {/* Skip link for screen readers */}
            <a href="#main-content" className="skip-link">
                Asosiy mazmunga o'tish
            </a>

            {/* Expansion Menu */}
            {isOpen && (
                <div className="bg-surface border border-border shadow-2xl rounded-2xl p-4 w-72 animate-card-enter flex flex-col gap-4 backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <h3 className="font-bold flex items-center gap-2">
                            <Settings size={18} className="text-primary" />
                            Qulayliklar (Accessibility)
                        </h3>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
                            aria-label="Yopish"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* High Contrast Toggle */}
                        <div className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-xl transition-colors cursor-pointer" onClick={toggleHighContrast}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${settings.highContrast ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}>
                                    <Eye size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Yuqori kontrast</p>
                                    <p className="text-[0.7rem] text-text-muted">Ko'rishni osonlashtiradi</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.highContrast ? 'bg-primary' : 'bg-border'}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.highContrast ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        {/* Large Text Toggle */}
                        <div className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-xl transition-colors cursor-pointer" onClick={toggleLargeText}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${settings.largeText ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}>
                                    <Type size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Katta matn</p>
                                    <p className="text-[0.7rem] text-text-muted">Matnni o'qish qulayroq</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.largeText ? 'bg-primary' : 'bg-border'}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.largeText ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        {/* Screen Reader Mode Toggle */}
                        <div className="flex items-center justify-between p-2 hover:bg-surface-hover rounded-xl transition-colors cursor-pointer" onClick={toggleScreenReaderMode}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${settings.screenReaderMode ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'}`}>
                                    <Volume2 size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Ovozli yordamchi</p>
                                    <p className="text-[0.7rem] text-text-muted">Elementlarni ovozli e'lon qiladi</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.screenReaderMode ? 'bg-primary' : 'bg-border'}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.screenReaderMode ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 p-3 bg-primary/5 rounded-xl border border-primary/10 flex gap-3">
                        <Info size={16} className="text-primary shrink-0 mt-0.5" />
                        <p className="text-[0.7rem] text-text-muted">
                            Bu sozlamalar ko'zi ojizlar va ko'rish qobiliyati pastlar uchun tizimdan foydalanishni osonlashtiradi.
                        </p>
                    </div>
                </div>
            )}

            {/* Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
                    aria-label="Qulayliklar sozlamalari"
                    title="Qulayliklar (Accessibility)"
                >
                    <Settings className="group-hover:rotate-90 transition-transform duration-500" size={28} />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                </button>
            )}
        </div>
    );
};

export default AccessibilityToolbar;
