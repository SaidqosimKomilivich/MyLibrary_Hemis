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

    // Request modal state
    const [requestModalOpen, setRequestModalOpen] = useState(false)
    const [requestBook, setRequestBook] = useState<Book | null>(null)
    const [requestType, setRequestType] = useState('physical')
    const [isRequesting, setIsRequesting] = useState(false)

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

    // Kitob so'rash
    const handleRequestSubmit = async () => {
        if (!requestBook) return
        setIsRequesting(true)
        try {
            await api.createBookRequest(requestBook.id, requestType)
            toast.success("So'rov muvaffaqiyatli yuborildi. Holatini 'Mening so'rovlarim' bo'limida kuzatishingiz mumkin.")
            setRequestModalOpen(false)
            setRequestBook(null)
        } catch (err: any) {
            toast.error(err.message || "So'rov yuborishda xatolik")
        } finally {
            setIsRequesting(false)
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
                            onRequestBook={!canManageBooks ? (book) => { setRequestBook(book); setRequestModalOpen(true) } : undefined}
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

            {/* Request Book Modal */}
            {requestModalOpen && requestBook && (
                <div className="pdf-viewer__backdrop" onClick={() => !isRequesting && setRequestModalOpen(false)}>
                    <div className="pdf-viewer" style={{ width: '100%', maxWidth: 450, minHeight: 'auto', padding: 24, borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
                        <div className="pdf-viewer__header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Kitob so'rash</h3>
                            <button onClick={() => !isRequesting && setRequestModalOpen(false)} className="pdf-viewer__close">
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>{requestBook.title}</div>
                            <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>{requestBook.author}</div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', opacity: 0.8 }}>Qanday shaklda kerak?</label>
                            <select
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 8,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {requestBook.available_quantity === 0 && <option value="physical">Asl nusxa (kutish)</option>}
                                <option value="electronic">Elektron variant (PDF/Audio)</option>
                                {requestBook.available_quantity !== 0 && <option value="physical">Asl nusxa (kutish)</option>}
                            </select>
                            <p style={{ marginTop: 10, fontSize: '0.8rem', opacity: 0.6, lineHeight: 1.4 }}>
                                {requestType === 'physical'
                                    ? "Asl nusxani so'rashda, kitob kutubxonaga qaytganida yoki tayyor bo'lganida sizga xabar beramiz."
                                    : "Agar kitobning elektron varianti bazamizda mavjud bo'lmasa, mutaxassis uni topib berishi mumkin."}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setRequestModalOpen(false)}
                                disabled={isRequesting}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: 8,
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    cursor: isRequesting ? 'not-allowed' : 'pointer',
                                    opacity: isRequesting ? 0.5 : 1
                                }}
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleRequestSubmit}
                                disabled={isRequesting}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: 8,
                                    background: 'var(--primary, #3b82f6)',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: isRequesting ? 'not-allowed' : 'pointer',
                                    opacity: isRequesting ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                {isRequesting ? 'Yuborilmoqda...' : "So'rov yuborish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
