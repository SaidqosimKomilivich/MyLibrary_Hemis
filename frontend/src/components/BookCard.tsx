import { BookOpen, Edit, Trash2, FileText, Headphones, Eye, MapPin, PlusCircle, MinusCircle } from 'lucide-react'
import type { Book } from '../services/api'

interface BookCardProps {
    book: Book
    role: string | null
    onEdit?: (book: Book) => void
    onDelete?: (id: string) => void
    onViewPdf?: (book: Book) => void
    onListenAudio?: (book: Book) => void
    onAddReading?: (book: Book) => void
    onRemoveReading?: (book: Book) => void
    onRequestBook?: (book: Book) => void
}

export default function BookCard({ book, role, onEdit, onDelete, onViewPdf, onListenAudio, onAddReading, onRemoveReading, onRequestBook }: BookCardProps) {
    const canManageBooks = role === 'admin' || role === 'employee'
    const hasPdf = book.format === 'pdf' && book.digital_file_url
    const hasAudio = book.format === 'audio' && book.digital_file_url

    return (
        <div className="group relative bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)] hover:border-white/10 flex flex-col h-full">
            {/* Cover Image */}
            <div className="relative w-full pt-[135%] bg-slate-800/50 overflow-hidden">
                {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted/40 font-medium">
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

                {/* Add to reading button */}
                {onAddReading && (
                    <button
                        className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center border-none cursor-pointer shadow-lg transition-transform duration-200 hover:scale-110 hover:bg-emerald-400 z-10"
                        onClick={(e) => { e.stopPropagation(); onAddReading(book) }}
                        title="O'qiyotganlar ro'yxatiga qo'shish"
                    >
                        <PlusCircle size={22} />
                    </button>
                )}

                {/* Remove from reading button */}
                {onRemoveReading && (
                    <button
                        className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center border-none cursor-pointer shadow-lg transition-transform duration-200 hover:scale-110 hover:bg-rose-400 z-10"
                        onClick={(e) => { e.stopPropagation(); onRemoveReading(book) }}
                        title="Ro'yxatdan olib tashlash"
                    >
                        <MinusCircle size={22} />
                    </button>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 opacity-0 transition-opacity duration-300 backdrop-blur-[2px] z-10 group-hover:opacity-100">
                    {hasPdf && (
                        <button className="flex items-center gap-2 py-2.5 px-5 rounded-full border-none font-semibold text-[0.9rem] cursor-pointer transition-all hover:scale-105 shadow-lg bg-white text-rose-600" onClick={() => onViewPdf?.(book)}>
                            <Eye size={18} /> Ko'rish
                        </button>
                    )}
                    {hasAudio && (
                        <button className="flex items-center gap-2 py-2.5 px-5 rounded-full border-none font-semibold text-[0.9rem] cursor-pointer transition-all hover:scale-105 shadow-lg bg-white text-violet-600" onClick={() => onListenAudio?.(book)}>
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

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                    <span className="text-[0.75rem] px-2.5 py-1 rounded bg-white/5 text-text-muted font-medium truncate max-w-[50%]">
                        {book.category || 'Kategoriyasiz'}
                    </span>
                    <span className={`text-[0.75rem] font-bold ${(book.available_quantity || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(book.available_quantity || 0) > 0 ? `${book.available_quantity} ta mavjud` : 'Mavjud emas'}
                    </span>
                </div>

                {book.shelf_location && (
                    <div className="flex items-center gap-1.5 mt-3 text-[0.8rem] text-text-muted bg-black/20 p-2 rounded-lg border border-white/5">
                        <MapPin size={14} className="text-primary/70 shrink-0" />
                        <span className="truncate">{book.shelf_location}</span>
                    </div>
                )}

                {/* Request Button for non-admins */}
                {!canManageBooks && onRequestBook && (
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
                    <div className="mt-3 flex gap-2">
                        <button
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border border-dashed font-medium text-[0.85rem] cursor-pointer transition-all bg-transparent text-text-muted hover:bg-primary/20 hover:text-primary hover:border-primary/30 hover:border-solid"
                            onClick={() => onEdit?.(book)}
                            title="Tahrirlash"
                        >
                            <Edit size={16} /> Tahrirlash
                        </button>
                        <button
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border border-dashed font-medium text-[0.85rem] cursor-pointer transition-all bg-transparent text-text-muted hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-400/30 hover:border-solid"
                            onClick={() => onDelete?.(book.id)}
                            title="O'chirish"
                        >
                            <Trash2 size={16} /> O'chirish
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
