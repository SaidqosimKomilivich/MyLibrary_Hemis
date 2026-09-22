import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DatePickerPreset {
    label: string;
    daysFromToday: number;
}

interface DatePickerProps {
    value: Date | string | null;
    onChange: (date: Date | null) => void;
    minDate?: Date | string | null;
    placeholder?: string;
    label?: string;
    className?: string;
    presets?: DatePickerPreset[];
}

export const MONTHS_UZ = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

export const DAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

/**
 * Xavfsiz sana o'girish (mahalliy vaqt bo'yicha UTC siljishsiz)
 */
export function parseDateSafe(val: Date | string | null | undefined): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;
        // YYYY-MM-DD
        const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10) - 1;
            const d = parseInt(isoMatch[3], 10);
            const date = new Date(y, m, d);
            return isNaN(date.getTime()) ? null : date;
        }
        // DD.MM.YYYY or DD/MM/YYYY
        const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
        if (dmyMatch) {
            const d = parseInt(dmyMatch[1], 10);
            const m = parseInt(dmyMatch[2], 10) - 1;
            const y = parseInt(dmyMatch[3], 10);
            const date = new Date(y, m, d);
            return isNaN(date.getTime()) ? null : date;
        }
        const parsed = new Date(val);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

export function DatePicker({
    value,
    onChange,
    minDate,
    placeholder = 'Sanani tanlang...',
    label,
    className = '',
    presets
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedDate = parseDateSafe(value);

    // Reset view date when opening
    useEffect(() => {
        if (isOpen && selectedDate && !isNaN(selectedDate.getTime())) {
            setViewDate(new Date(selectedDate));
        } else if (isOpen) {
            setViewDate(new Date());
        }
    }, [isOpen]);

    const updateDropdownPosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 420; // Estimated height of the calendar dropdown
        const shouldOpenUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
        
        if (shouldOpenUp) {
            setDropdownStyle({
                position: 'fixed',
                left: rect.left,
                bottom: (window.innerHeight - rect.top) + 8,
                minWidth: '320px',
                zIndex: 99999,
                transformOrigin: 'bottom',
            });
        } else {
            setDropdownStyle({
                position: 'fixed',
                left: rect.left,
                top: rect.bottom + 8,
                minWidth: '320px',
                zIndex: 99999,
                transformOrigin: 'top',
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('[data-datepicker-dropdown]')
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleScrollResize = () => updateDropdownPosition();
        window.addEventListener('scroll', handleScrollResize, true);
        window.addEventListener('resize', handleScrollResize);
        return () => {
            window.removeEventListener('scroll', handleScrollResize, true);
            window.removeEventListener('resize', handleScrollResize);
        };
    }, [isOpen]);

    const handleOpen = () => {
        updateDropdownPosition();
        setIsOpen(!isOpen);
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        
        if (minDate) {
            const min = parseDateSafe(minDate);
            if (min) {
                min.setHours(0, 0, 0, 0);
                if (newDate < min) return;
            }
        }

        onChange(newDate);
        setIsOpen(false);
    };

    const handlePresetSelect = (days: number) => {
        const target = new Date();
        target.setDate(target.getDate() + days);
        target.setHours(0, 0, 0, 0);
        setViewDate(new Date(target));
        onChange(target);
        setIsOpen(false);
    };

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    const changeYear = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear() + offset, viewDate.getMonth(), 1));
    };

    // Calendar logic
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Adjust to Monday start: (day + 6) % 7
    const startingDay = (firstDayOfMonth + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const calendarCells = [];
    // Prev month days
    for (let i = startingDay - 1; i >= 0; i--) {
        calendarCells.push({ day: daysInPrevMonth - i, current: false });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarCells.push({ day: i, current: true });
    }
    // Next month days
    const remaining = 42 - calendarCells.length;
    for (let i = 1; i <= remaining; i++) {
        calendarCells.push({ day: i, current: false });
    }

    /**
     * O'zbekcha aniq sana ko'rinishi (masalan: 2026-yil 7-oktabr)
     * Bu format brauzer avto-tarjimasi (Google Translate) tomonidan
     * kun va oylar almashib ketishi (MM/DD/YYYY) xatosini butunlay yo'qotadi.
     */
    const formatDateDisplay = (date: Date | null) => {
        if (!date || isNaN(date.getTime())) return '';
        const day = date.getDate();
        const monthName = MONTHS_UZ[date.getMonth()]?.toLowerCase() || '';
        const y = date.getFullYear();
        return `${y}-yil ${day}-${monthName}`;
    };

    return (
        <div className={`relative ${className} notranslate`} translate="no" ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                className={`w-full flex items-center gap-3 bg-surface border border-border py-2.5 px-4 rounded-xl text-text transition-all hover:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 ${isOpen ? 'border-primary ring-4 ring-primary/10' : ''}`}
            >
                <CalendarIcon size={18} className={isOpen ? 'text-primary' : 'text-text-muted'} />
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    {label && <span className="text-text-muted text-sm whitespace-nowrap">{label}:</span>}
                    <span
                        translate="no"
                        className={`notranslate text-[0.95rem] ${!selectedDate ? 'text-text-muted' : 'text-text font-medium'}`}
                    >
                        {selectedDate ? formatDateDisplay(selectedDate) : placeholder}
                    </span>
                </div>
                {selectedDate && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="hover:bg-surface-hover p-1 rounded-md transition-colors"
                        title="Tozalash"
                    >
                        <X size={14} className="text-text-muted hover:text-error" />
                    </div>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    data-datepicker-dropdown
                    translate="no"
                    style={dropdownStyle}
                    className="notranslate bg-surface border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-5 animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* Presets (agar berilgan bo'lsa) */}
                    {presets && presets.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-border flex-wrap">
                            <span className="text-[11px] font-semibold text-text-muted mr-1">Tezkor:</span>
                            {presets.map((p, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handlePresetSelect(p.daysFromToday)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all shadow-xs"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">{year}-YIL</span>
                            <span className="text-lg font-bold text-text">{MONTHS_UZ[month]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS_UZ.map(d => (
                            <div key={d} className="text-center text-[0.7rem] font-bold text-text-muted uppercase py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((cell, idx) => {
                            const dateObj = cell.current ? new Date(year, month, cell.day) : null;
                            
                            let isDisabled = !cell.current;
                            if (cell.current && minDate) {
                                const min = parseDateSafe(minDate);
                                if (min) {
                                    min.setHours(0, 0, 0, 0);
                                    if (dateObj && dateObj < min) {
                                        isDisabled = true;
                                    }
                                }
                            }

                            const today = new Date();
                            const isToday = cell.current &&
                                today.getDate() === cell.day &&
                                today.getMonth() === month &&
                                today.getFullYear() === year;

                            const isSelected = cell.current &&
                                selectedDate !== null &&
                                selectedDate.getDate() === cell.day &&
                                selectedDate.getMonth() === month &&
                                selectedDate.getFullYear() === year;

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handleDateSelect(cell.day)}
                                    className={`
                                        h-9 w-9 flex items-center justify-center rounded-xl text-[0.9rem] transition-all relative
                                        ${cell.current && !isDisabled ? 'hover:bg-primary/10 hover:text-primary cursor-pointer' : 'opacity-20 cursor-not-allowed'}
                                        ${isToday && !isSelected ? 'text-primary font-bold' : ''}
                                        ${isSelected ? 'bg-primary text-white font-bold shadow-lg shadow-primary/25' : (!cell.current || isDisabled) ? 'text-text-muted' : 'text-text'}
                                    `}
                                >
                                    {cell.day}
                                    {isToday && !isSelected && (
                                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer / Quick controls */}
                    <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => {
                                setViewDate(new Date());
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                        >
                            Bugungi sana
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => changeYear(-1)}
                                className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover"
                                title="O'tgan yil"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-medium text-text-muted">{year}-yil</span>
                            <button
                                type="button"
                                onClick={() => changeYear(1)}
                                className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover"
                                title="Kelgusi yil"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
