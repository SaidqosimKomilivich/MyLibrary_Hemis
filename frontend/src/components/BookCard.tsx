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
        <div className="book-card">
            {/* Cover Image */}
            <div className="book-card__cover">
                {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} />
                ) : (
                    <div className="book-card__cover-placeholder">
                        <BookOpen size={48} />
                        <span>Rasm yo'q</span>
                    </div>
                )}

                {/* Format badge */}
                {hasPdf && (
                    <span className="book-card__badge book-card__badge--pdf">
                        <FileText size={14} /> PDF
                    </span>
                )}
                {hasAudio && (
                    <span className="book-card__badge book-card__badge--audio">
                        <Headphones size={14} /> Audio
                    </span>
                )}

                {/* Add to reading button */}
                {onAddReading && (
                    <button
                        className="book-card__add-reading-btn"
                        onClick={(e) => { e.stopPropagation(); onAddReading(book) }}
                        title="O'qiyotganlar ro'yxatiga qo'shish"
                    >
                        <PlusCircle size={22} />
                    </button>
                )}

                {/* Remove from reading button */}
                {onRemoveReading && (
                    <button
                        className="book-card__add-reading-btn book-card__add-reading-btn--remove"
                        onClick={(e) => { e.stopPropagation(); onRemoveReading(book) }}
                        title="Ro'yxatdan olib tashlash"
                    >
                        <MinusCircle size={22} />
                    </button>
                )}

                {/* Hover overlay */}
                <div className="book-card__overlay">
                    {hasPdf && (
                        <button className="book-card__overlay-btn" onClick={() => onViewPdf?.(book)}>
                            <Eye size={18} /> Ko'rish
                        </button>
                    )}
                    {hasAudio && (
                        <button className="book-card__overlay-btn book-card__overlay-btn--audio" onClick={() => onListenAudio?.(book)}>
                            <Headphones size={18} /> Tinglash
                        </button>
                    )}
                    {!hasPdf && !hasAudio && (
                        <span className="book-card__overlay-text">Batafsil</span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="book-card__content">
                <h3 className="book-card__title" title={book.title}>{book.title}</h3>
                <p className="book-card__author">{book.author}</p>

                <div className="book-card__meta">
                    <span className="book-card__category">
                        {book.category || 'Kategoriyasiz'}
                    </span>
                    <span className={`book-card__stock ${(book.available_quantity || 0) > 0 ? 'book-card__stock--available' : 'book-card__stock--unavailable'}`}>
                        {(book.available_quantity || 0) > 0 ? `${book.available_quantity} ta mavjud` : 'Mavjud emas'}
                    </span>
                </div>

                {book.shelf_location && (
                    <div className="book-card__location">
                        <MapPin size={14} />
                        <span>{book.shelf_location}</span>
                    </div>
                )}

                {/* Request Button for non-admins */}
                {!canManageBooks && onRequestBook && (
                    <div className="book-card__actions" style={{ marginTop: 12 }}>
                        <button
                            className="book-card__action-btn"
                            style={{ width: '100%', justifyContent: 'center', background: 'var(--primary, #3b82f6)', color: 'white', padding: '8px', border: 'none', borderRadius: 6, fontWeight: 500 }}
                            onClick={() => onRequestBook(book)}
                            title="Kitob so'rash"
                        >
                            So'rov yuborish
                        </button>
                    </div>
                )}

                {/* Admin actions */}
                {canManageBooks && (
                    <div className="book-card__actions">
                        <button
                            className="book-card__action-btn book-card__action-btn--edit"
                            onClick={() => onEdit?.(book)}
                            title="Tahrirlash"
                        >
                            <Edit size={16} /> Tahrirlash
                        </button>
                        <button
                            className="book-card__action-btn book-card__action-btn--delete"
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
