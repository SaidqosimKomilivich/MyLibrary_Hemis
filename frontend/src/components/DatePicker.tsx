import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
    value: Date | string | null;
    onChange: (date: Date | null) => void;
    minDate?: Date | string | null;
    placeholder?: string;
    label?: string;
    className?: string;
}

const MONTHS_UZ = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

const DAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export function DatePicker({
    value,
    onChange,
    minDate,
    placeholder = 'Sanani tanlang...',
    label,
    className = ''
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedDate = value ? new Date(value) : null;

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
        const dropdownHeight = 400; // Estimated height of the calendar dropdown
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
        const selected = new Date(year, month, day);
        
        if (minDate) {
            const min = new Date(minDate);
            min.setHours(0, 0, 0, 0);
            if (selected < min) return;
        }

        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onChange(newDate);
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

    const formatDateDisplay = (date: Date | null) => {
        if (!date || isNaN(date.getTime())) return '';
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                className={`w-full flex items-center gap-3 bg-surface border border-border py-2.5 px-4 rounded-xl text-text transition-all hover:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 ${isOpen ? 'border-primary ring-4 ring-primary/10' : ''}`}
            >
                <CalendarIcon size={18} className={isOpen ? 'text-primary' : 'text-text-muted'} />
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    {label && <span className="text-text-muted text-sm whitespace-nowrap">{label}:</span>}
                    <span className={`text-[0.95rem] ${!selectedDate ? 'text-text-muted' : 'text-text font-medium'}`}>
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
                    >
                        <X size={14} className="text-text-muted hover:text-error" />
                    </div>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    data-datepicker-dropdown
                    style={dropdownStyle}
                    className="bg-surface border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-5 animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">{year}</span>
                            <span className="text-lg font-bold text-text">{MONTHS_UZ[month]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => changeMonth(-1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
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
                                const min = new Date(minDate);
                                min.setHours(0, 0, 0, 0);
                                if (dateObj && dateObj < min) {
                                    isDisabled = true;
                                }
                            }

                            const isToday = cell.current &&
                                new Date().getDate() === cell.day &&
                                new Date().getMonth() === month &&
                                new Date().getFullYear() === year;

                            const isSelected = cell.current &&
                                selectedDate?.getDate() === cell.day &&
                                selectedDate?.getMonth() === month &&
                                selectedDate?.getFullYear() === year;

                            return (
                                <button
                                    key={idx}
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
                            onClick={() => {
                                setViewDate(new Date());
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                        >
                            Bugungi sana
                        </button>
                        <div className="flex items-center gap-2">
                             <button
                                onClick={() => changeYear(-1)}
                                className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover"
                                title="O'tgan yil"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-medium text-text-muted">{year}</span>
                            <button
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

