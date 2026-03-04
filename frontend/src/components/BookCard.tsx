import { useState } from 'react'
import { BookOpen, Edit, Trash2, FileText, Headphones, Eye, MapPin, PlusCircle, MinusCircle, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import type { Book } from '../services/api'

interface BookCardProps {
    book: Book
    role: string | null
    onEdit?: (book: Book) => void
    onDelete?: (id: string) => void
    onToggleActive?: (book: Book) => void
    onViewPdf?: (book: Book) => void
    onListenAudio?: (book: Book) => void
    onAddReading?: (book: Book) => void
    onRemoveReading?: (book: Book) => void
    onRequestBook?: (book: Book) => void
}

export default function BookCard({ book, role, onEdit, onDelete, onToggleActive, onViewPdf, onListenAudio, onAddReading, onRemoveReading, onRequestBook }: BookCardProps) {
    const [showOverlay, setShowOverlay] = useState(false)
    const canManageBooks = role === 'admin' || role === 'staff'
    // Fayl mavjud bo'lsa, format='pdf'/'audio'/'elektron'/'ikkalasi' dan qat'i nazar ko'rsat
    const hasDigitalFile = !!book.digital_file_url
    const isAudioFormat = book.format?.toLowerCase() === 'audio'
    const hasPdf = hasDigitalFile && !isAudioFormat  // audio bo'lmasa → PDF/Elektron
    const hasAudio = hasDigitalFile && isAudioFormat

    return (
        <div className="group relative bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)] hover:border-white/10 flex flex-col h-full">
            {/* Cover Image */}
            <div
                className="relative w-full pt-[135%] bg-surface-hover overflow-hidden cursor-pointer focus:outline-none"
                tabIndex={0}
                onClick={() => setShowOverlay(!showOverlay)}
                onMouseLeave={() => setShowOverlay(false)}
            >
                {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-focus:scale-110" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted/40 font-medium transition-transform duration-500 group-hover:scale-110 group-focus:scale-110">
                        <BookOpen size={48} />
                        <span>Rasm yo'q</span>
                    </div>
                )}

                {/* Format badge */}
                {hasPdf && (
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-bold tracking-wider uppercase text-white shadow-md bg-linear-to-r from-rose-500 to-rose-600 backdrop-blur-md">
                        <FileText size={14} /> PDF
                    </span>
                )}
                {hasAudio && (
                    <span className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-bold tracking-wider uppercase text-white shadow-md bg-linear-to-r from-violet-500 to-violet-600 backdrop-blur-md">
                        <Headphones size={14} /> Audio
                    </span>
                )}
                {/* Category and Language badges stacked at bottom left */}
                <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 z-20 max-w-[calc(100%-3rem)] pointer-events-none">
                    <span className="px-2.5 py-1.5 rounded-lg text-[0.7rem] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] bg-black/60 backdrop-blur-md border border-white/20 truncate max-w-full">
                        {book.category || 'Kategoriyasiz'}
                    </span>
                    {book.language && (
                        <span className="px-2.5 py-1.5 rounded-lg text-[0.65rem] font-bold tracking-wider uppercase text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] bg-black/60 backdrop-blur-md border border-white/20 truncate max-w-full">
                            {book.language}
                        </span>
                    )}
                </div>

                {/* Add to reading button — faqat fayli bor kitoblar uchun */}
                {onAddReading && hasDigitalFile && (
                    <button
                        className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center border-none cursor-pointer shadow-lg transition-transform duration-200 hover:scale-110 hover:bg-emerald-400 focus:scale-110 focus:bg-emerald-400 z-20"
                        onClick={(e) => { e.stopPropagation(); onAddReading(book) }}
                        title="O'qiyotganlar ro'yxatiga qo'shish"
                    >
                        <PlusCircle size={22} />
                    </button>
                )}

                {/* Remove from reading button */}
                {onRemoveReading && (
                    <button
                        className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center border-none cursor-pointer shadow-lg transition-transform duration-200 hover:scale-110 hover:bg-rose-400 focus:scale-110 focus:bg-rose-400 z-20"
                        onClick={(e) => { e.stopPropagation(); onRemoveReading(book) }}
                        title="Ro'yxatdan olib tashlash"
                    >
                        <MinusCircle size={22} />
                    </button>
                )}

                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 backdrop-blur-[2px] z-10 ${showOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {hasPdf && (
                        <button className="flex items-center gap-2 py-2.5 px-5 rounded-full border-none font-semibold text-[0.9rem] cursor-pointer transition-all hover:scale-105 focus:scale-105 shadow-lg bg-white text-rose-600 outline-none" onClick={(e) => { e.stopPropagation(); onViewPdf?.(book); }}>
                            <Eye size={18} /> Ko'rish
                        </button>
                    )}
                    {hasAudio && (
                        <button className="flex items-center gap-2 py-2.5 px-5 rounded-full border-none font-semibold text-[0.9rem] cursor-pointer transition-all hover:scale-105 focus:scale-105 shadow-lg bg-white text-violet-600 outline-none" onClick={(e) => { e.stopPropagation(); onListenAudio?.(book); }}>
                            <Headphones size={18} /> Tinglash
                        </button>
                    )}
                    {!hasPdf && !hasAudio && (
                        <span className="text-white font-medium tracking-wide">Batafsil</span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="m-0 mb-1 text-[1.1rem] font-bold text-text line-clamp-2 leading-[1.3] group-hover:text-primary transition-colors" title={book.title}>{book.title}</h3>
                <p className="m-0 mb-3 text-[0.9rem] text-text-muted/80 font-medium truncate">{book.author}</p>

                {canManageBooks && (
                    <div className="flex items-center justify-end mt-auto pt-4 border-t border-border">
                        <span className={`text-[0.75rem] font-bold shrink-0 ${(book.available_quantity || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(book.available_quantity || 0) > 0 ? `${book.available_quantity} ta` : 'Yo\'q'}
                        </span>
                    </div>
                )}

                {book.shelf_location && (
                    <div className="flex items-center gap-1.5 mt-3 text-[0.8rem] text-text-muted bg-black/20 p-2 rounded-lg border border-white/5">
                        <MapPin size={14} className="text-primary/70 shrink-0" />
                        <span className="truncate">{book.shelf_location}</span>
                    </div>
                )}

                {/* Request Button for non-admins — faqat fayl yo'q kitoblar uchun */}
                {!canManageBooks && onRequestBook && !hasDigitalFile && (
                    <div className="mt-3 flex gap-2">
                        <button
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-none font-medium text-[0.85rem] cursor-pointer transition-all bg-primary/20 text-primary hover:bg-primary hover:text-white"
                            onClick={() => onRequestBook(book)}
                            title="Kitob so'rash"
                        >
                            So'rov yuborish
                        </button>
                    </div>
                )}

                {/* Admin actions */}
                {canManageBooks && (
                    <div className="mt-3 flex flex-col gap-2">
                        {/* Toggle active button — full width */}
                        <button
                            onClick={() => onToggleActive?.(book)}
                            className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border font-medium text-[0.85rem] cursor-pointer transition-all ${book.is_active
                                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                                }`}
                            title={book.is_active ? 'Nofaollashtirish' : 'Faollashtirish'}
                        >
                            {book.is_active
                                ? <><ToggleRight size={16} /> Nofaollashtirish</>
                                : <><ToggleLeft size={16} /> Faollashtirish</>
                            }
                        </button>
                        {/* Edit + Delete */}
                        <div className="flex gap-2">
                            <button
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border border-dashed font-medium text-[0.85rem] cursor-pointer transition-all bg-transparent text-text-muted hover:bg-primary/20 hover:text-primary hover:border-primary/30 hover:border-solid"
                                onClick={() => onEdit?.(book)}
                                title="Tahrirlash"
                            >
                                <Edit size={15} /> Tahrirlash
                            </button>
                            <button
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border border-dashed font-medium text-[0.85rem] cursor-pointer transition-all bg-transparent text-text-muted hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-400/30 hover:border-solid"
                                onClick={() => onDelete?.(book.id)}
                                title="O'chirish"
                            >
                                <Trash2 size={15} /> O'chirish
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Inactive overlay badge (admin ko'rishi uchun) */}
            {canManageBooks && !book.is_active && (
                <div className="absolute top-2 right-2 z-20">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-500/90 text-white shadow">
                        <Clock size={10} /> Nofaol
                    </span>
                </div>
            )}
        </div>
    )
}
