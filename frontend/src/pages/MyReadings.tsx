import { useState, useEffect } from 'react'
import { BookOpen, BookMarked, X } from 'lucide-react'
import { api, type Reading, type Book } from '../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import BookCard from '../components/BookCard'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

/** Reading ma'lumotlaridan BookCard uchun Book obyektini yaratish */
function readingToBook(reading: Reading): Book {
    return {
        id: reading.book_id,
        title: reading.book_title || "Noma'lum kitob",
        author: reading.book_author || "Muallif noma'lum",
        cover_image_url: reading.book_cover,
        category: reading.book_category,
        page_count: reading.book_page_count,
        format: reading.book_format,
        digital_file_url: reading.book_digital_file_url,
    }
}

export default function MyReadings() {
    const { role } = useAuth()
    const [readings, setReadings] = useState<Reading[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // PDF viewer state
    const [pdfBook, setPdfBook] = useState<Book | null>(null)

    // Audio player state
    const [audioBook, setAudioBook] = useState<Book | null>(null)

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deletingReading, setDeletingReading] = useState<Reading | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchReadings = async () => {
        setIsLoading(true)
        try {
            const res = await api.getMyReadings()
            setReadings(res.data)
        } catch {
            toast.error("O'qiyotgan kitoblarni yuklashda xatolik")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchReadings()
    }, [])

    // PDF viewer
    const handleViewPdf = (book: Book) => {
        setPdfBook(book)
    }

    // Audio player
    const handleListenAudio = (book: Book) => {
        setAudioBook(book)
    }

    // O'chirish
    const handleDeleteClick = (bookId: string) => {
        const reading = readings.find(r => r.book_id === bookId)
        if (reading) {
            setDeletingReading(reading)
            setDeleteModalOpen(true)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deletingReading) return
        setIsDeleting(true)
        try {
            await api.removeReading(deletingReading.id)
            toast.success("Kitob ro'yxatdan olib tashlandi")
            setReadings(prev => prev.filter(r => r.id !== deletingReading.id))
            setDeleteModalOpen(false)
            setDeletingReading(null)
        } catch {
            toast.error("O'chirishda xatolik")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="library-page">
            {/* Header */}
            <div className="library-page__header">
                <div>
                    <h1 className="library-page__title">
                        <BookMarked size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        O'qiyotgan kitoblar
                    </h1>
                    <p className="library-page__subtitle">
                        Siz hozirda o'qiyotgan kitoblar ro'yxati
                    </p>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="library-page__loading">
                    <div className="library-page__spinner"></div>
                </div>
            ) : readings.length === 0 ? (
                <div className="library-page__empty">
                    <BookOpen size={64} strokeWidth={1} />
                    <h3 style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Hali kitob qo'shilmagan</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Kutubxonadan kitob tanlang va "+" tugmasini bosing</p>
                </div>
            ) : (
                <div className="library-page__grid">
                    {readings.map((reading) => {
                        const book = readingToBook(reading)
                        return (
                            <BookCard
                                key={reading.id}
                                book={book}
                                role={role}
                                onRemoveReading={(b) => handleDeleteClick(b.id)}
                                onViewPdf={handleViewPdf}
                                onListenAudio={handleListenAudio}
                            />
                        )
                    })}
                </div>
            )}

            {/* PDF Viewer Modal */}
            {pdfBook && (
                <div className="pdf-viewer__backdrop" onClick={() => setPdfBook(null)}>
                    <div className="pdf-viewer" onClick={(e) => e.stopPropagation()}>
                        <div className="pdf-viewer__header">
                            <h3>{pdfBook.title}</h3>
                            <button onClick={() => setPdfBook(null)} className="pdf-viewer__close">
                                <X size={20} />
                            </button>
                        </div>
                        <iframe
                            src={pdfBook.digital_file_url || ''}
                            className="pdf-viewer__frame"
                            title={pdfBook.title}
                        />
                    </div>
                </div>
            )}

            {/* Audio Player Modal */}
            {audioBook && (
                <div className="audio-player__backdrop" onClick={() => setAudioBook(null)}>
                    <div className="audio-player" onClick={(e) => e.stopPropagation()}>
                        <div className="audio-player__header">
                            <div className="audio-player__info">
                                {audioBook.cover_image_url ? (
                                    <img src={audioBook.cover_image_url} alt={audioBook.title} className="audio-player__cover" />
                                ) : (
                                    <div className="audio-player__cover audio-player__cover--placeholder">🎧</div>
                                )}
                                <div>
                                    <h3>{audioBook.title}</h3>
                                    <p>{audioBook.author}</p>
                                </div>
                            </div>
                            <button onClick={() => setAudioBook(null)} className="audio-player__close">
                                <X size={20} />
                            </button>
                        </div>
                        <audio controls autoPlay src={audioBook.digital_file_url || ''} className="audio-player__audio">
                            Brauzeringiz audio elementini qo'llab-quvvatlamaydi.
                        </audio>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            <DeleteConfirmModal
                isOpen={deleteModalOpen}
                title="Kitobni ro'yxatdan olib tashlash"
                message={`"${deletingReading?.book_title || ''}" kitobini o'qiyotganlar ro'yxatidan olib tashlamoqchimisiz?`}
                onConfirm={handleDeleteConfirm}
                onCancel={() => { setDeleteModalOpen(false); setDeletingReading(null) }}
                isLoading={isDeleting}
            />
        </div>
    )
}
