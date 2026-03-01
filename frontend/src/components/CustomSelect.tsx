import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    label: string | ReactNode;
    value: string;
    icon?: ReactNode;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
    disabled?: boolean;
    dropUp?: boolean;
}

export function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Tanlang...',
    className = '',
    buttonClassName = '',
    disabled = false,
    dropUp = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    // Calculate dropdown position based on button position
    const updateDropdownPosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownHeight = Math.min(options.length * 44 + 12, 252); // max-h-60

        if (dropUp) {
            setDropdownStyle({
                position: 'fixed',
                left: rect.left,
                bottom: window.innerHeight - rect.top + 6,
                minWidth: rect.width,
                zIndex: 99999,
            });
        } else {
            setDropdownStyle({
                position: 'fixed',
                left: rect.left,
                top: rect.bottom + 6,
                minWidth: rect.width,
                zIndex: 99999,
            });
        }
        void dropdownHeight;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('[data-custom-select-dropdown]')
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update position when scrolling/resizing
    useEffect(() => {
        if (!isOpen) return;
        const handleScrollResize = () => updateDropdownPosition();
        window.addEventListener('scroll', handleScrollResize, true);
        window.addEventListener('resize', handleScrollResize);
        return () => {
            window.removeEventListener('scroll', handleScrollResize, true);
            window.removeEventListener('resize', handleScrollResize);
        };
    }, [isOpen, dropUp]);

    const handleOpen = () => {
        updateDropdownPosition();
        setIsOpen(prev => !prev);
    };

    const defaultBtnClass = buttonClassName
        ? buttonClassName
        : 'w-full flex items-center justify-between text-left bg-surface-hover border border-border py-3 px-4 rounded-xl text-text transition-all focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15';
    const cleanBtnClass = defaultBtnClass.replace('appearance-none', '').replace(/bg-\[url\([^\]]+\)\](.*?)bg-no-repeat/g, '');

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={handleOpen}
                className={`flex items-center justify-between text-left w-full ${cleanBtnClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/20'}`}
                style={{ backgroundImage: 'none' }}
            >
                <div className="grid text-left truncate pr-2">
                    {/* Hidden sizer: forces width to match widest option */}
                    <div className="col-start-1 row-start-1 grid invisible pointer-events-none" aria-hidden="true">
                        {options.map((opt) => (
                            <div key={opt.value} className="col-start-1 row-start-1 flex items-center gap-2 whitespace-nowrap px-0.5">
                                {opt.icon}
                                <span>{opt.label}</span>
                            </div>
                        ))}
                        <div className="col-start-1 row-start-1 flex items-center gap-2 whitespace-nowrap px-0.5">
                            <span>{placeholder}</span>
                        </div>
                    </div>
                    {/* Visible selected value */}
                    <div className="col-start-1 row-start-1 flex items-center gap-2 truncate px-0.5">
                        {selectedOption?.icon}
                        <span className="truncate">{selectedOption ? selectedOption.label : <span className="text-text-muted">{placeholder}</span>}</span>
                    </div>
                </div>
                <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div
                    data-custom-select-dropdown
                    style={dropdownStyle}
                    className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150"
                >
                    <div className="max-h-60 overflow-y-auto custom-scrollbar py-1.5">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-[0.95rem] text-left transition-colors ${String(value) === String(option.value) ? 'bg-primary/20 text-primary font-medium' : 'text-text hover:bg-surface-hover hover:text-text'}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    {option.icon}
                                    <span className="truncate">{option.label}</span>
                                </span>
                                {String(value) === String(option.value) && <Check size={16} className="text-primary shrink-0 ml-3" />}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
