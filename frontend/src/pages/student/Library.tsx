import { useState, useEffect } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { api, type Book } from '../../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import BookCard from '../../components/BookCard'
import BookModal from '../../components/BookModal'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'

export default function Library() {
    const { role } = useAuth()
    const canManageBooks = role === 'admin' || role === 'employee'

    const [books, setBooks] = useState<Book[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
    const [editingBook, setEditingBook] = useState<Book | null>(null)

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deletingBook, setDeletingBook] = useState<Book | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // PDF viewer state
    const [pdfBook, setPdfBook] = useState<Book | null>(null)

    // Audio player state
    const [audioBook, setAudioBook] = useState<Book | null>(null)

    const fetchBooks = async () => {
        setIsLoading(true)
        try {
            const res = await api.getBooks({ page, search })
            setBooks(res.data)
            setTotalPages(res.pagination.total_pages)
        } catch {
            toast.error("Kitoblarni yuklashda xatolik")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchBooks()
    }, [page, search])

    // Admin actions
    const handleAdd = () => {
        setModalMode('add')
        setEditingBook(null)
        setModalOpen(true)
    }

    const handleEdit = (book: Book) => {
        setModalMode('edit')
        setEditingBook(book)
        setModalOpen(true)
    }

    const handleDeleteClick = (bookId: string) => {
        const book = books.find(b => b.id === bookId)
        if (book) {
            setDeletingBook(book)
            setDeleteModalOpen(true)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deletingBook) return
        setIsDeleting(true)
        try {
            await api.deleteBook(deletingBook.id)
            toast.success("Kitob o'chirildi")
            setDeleteModalOpen(false)
            setDeletingBook(null)
            fetchBooks()
        } catch {
            toast.error("O'chirishda xatolik")
        } finally {
            setIsDeleting(false)
        }
    }

    // PDF viewer
    const handleViewPdf = (book: Book) => {
        setPdfBook(book)
    }

    // Audio player
    const handleListenAudio = (book: Book) => {
        setAudioBook(book)
    }

    // O'qiyotganlar ro'yxatiga qo'shish
    const handleAddReading = async (book: Book) => {
        try {
            await api.startReading(book.id)
            toast.success(`"${book.title}" o'qiyotganlar ro'yxatiga qo'shildi`)
        } catch (err: any) {
            toast.error(err.message || "Ro'yxatga qo'shishda xatolik")
        }
    }

    return (
        <div className="library-page">
            {/* Header */}
            <div className="library-page__header">
                <div>
                    <h1 className="library-page__title">
                        {canManageBooks ? 'Kitoblar boshqaruvi' : 'Kutubxona'}
                    </h1>
                    <p className="library-page__subtitle">
                        {canManageBooks ? "Kitoblarni qo'shish, tahrirlash va o'chirish" : 'Barcha mavjud kitoblar katalogi'}
                    </p>
                </div>
                {canManageBooks && (
                    <button className="library-page__add-btn" onClick={handleAdd}>
                        <Plus size={20} />
                        <span>Yangi kitob</span>
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="library-page__search">
                <div className="library-page__search-wrapper">
                    <Search size={20} className="library-page__search-icon" />
                    <input
                        type="text"
                        placeholder="Kitob yoki muallifni qidirish..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="library-page__search-input"
                    />
                </div>
            </div>

            {/* Book Grid */}
            {isLoading ? (
                <div className="library-page__loading">
                    <div className="library-page__spinner"></div>
                </div>
            ) : books.length === 0 ? (
                <div className="library-page__empty">
                    Kitoblar topilmadi
                </div>
            ) : (
                <div className="library-page__grid">
                    {books.map((book) => (
                        <BookCard
                            key={book.id}
                            book={book}
                            role={role}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onViewPdf={handleViewPdf}
                            onListenAudio={handleListenAudio}
                            onAddReading={!canManageBooks ? handleAddReading : undefined}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="library-page__pagination">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="library-page__page-btn"
                    >
                        Oldingi
                    </button>
                    <span className="library-page__page-info">
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="library-page__page-btn"
                    >
                        Keyingi
                    </button>
                </div>
            )}

            {/* Add/Edit Modal */}
            <BookModal
                isOpen={modalOpen}
                mode={modalMode}
                book={editingBook}
                onClose={() => setModalOpen(false)}
                onSuccess={fetchBooks}
            />

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
                title="Kitobni o'chirish"
                message={`"${deletingBook?.title}" kitobini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
                onConfirm={handleDeleteConfirm}
                onCancel={() => { setDeleteModalOpen(false); setDeletingBook(null) }}
                isLoading={isDeleting}
            />
        </div>
    )
}
