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
        <div className="p-5 md:p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-[1.8rem] font-bold text-text mb-1 tracking-tight">
                        {canManageBooks ? 'Kitoblar boshqaruvi' : 'Kutubxona'}
                    </h1>
                    <p className="text-[0.95rem] text-text-muted m-0">
                        {canManageBooks ? "Kitoblarni qo'shish, tahrirlash va o'chirish" : 'Barcha mavjud kitoblar katalogi'}
                    </p>
                </div>
                {canManageBooks && (
                    <button
                        className="flex items-center justify-center gap-2 bg-primary text-white border-none py-2.5 px-5 rounded-xl font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:brightness-110 active:transform-none"
                        onClick={handleAdd}
                    >
                        <Plus size={20} />
                        <span>Yangi kitob</span>
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="mb-8">
                <div className="relative max-w-[500px]">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Kitob yoki muallifni qidirish..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full bg-surface border border-border text-text rounded-2xl py-3.5 pr-4 pl-12 text-[1rem] transition-all outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-text-muted/60"
                    />
                </div>
            </div>

            {/* Book Grid */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20 min-h-[300px]">
                    <div className="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : books.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-text-muted bg-surface/50 border border-dashed border-border rounded-2xl">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Search size={28} className="opacity-50" />
                    </div>
                    <p className="text-[1.1rem]">Kitoblar topilmadi</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
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
                <div className="flex justify-center items-center gap-4 mt-12 bg-surface py-3 px-5 rounded-2xl w-max mx-auto border border-border shadow-sm">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="py-1.5 px-4 rounded-lg bg-white/5 border-none text-text text-[0.9rem] font-medium cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Oldingi
                    </button>
                    <span className="text-[0.9rem] font-semibold text-text-muted bg-white/5 py-1 px-3 rounded-md">
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="py-1.5 px-4 rounded-lg bg-white/5 border-none text-text text-[0.9rem] font-medium cursor-pointer transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100 flex flex-col animate-in fade-in duration-200" onClick={() => setPdfBook(null)}>
                    <div className="w-full h-full bg-surface/95 flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                            <h3 className="m-0 text-[1.1rem] font-semibold text-text truncate pr-4">{pdfBook.title}</h3>
                            <button onClick={() => setPdfBook(null)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border-none text-text-muted cursor-pointer transition-colors hover:bg-white/10 hover:text-white shrink-0">
                                <X size={20} />
                            </button>
                        </div>
                        <iframe
                            src={pdfBook.digital_file_url || ''}
                            className="flex-1 w-full border-none bg-white"
                            title={pdfBook.title}
                        />
                    </div>
                </div>
            )}

            {/* Audio Player Modal */}
            {audioBook && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setAudioBook(null)}>
                    <div className="w-full max-w-md bg-surface rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start p-5 border-b border-white/10 bg-black/20">
                            <div className="flex items-center gap-4">
                                {audioBook.cover_image_url ? (
                                    <img src={audioBook.cover_image_url} alt={audioBook.title} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10 shadow-sm" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0 border border-white/10 shadow-sm">🎧</div>
                                )}
                                <div className="min-w-0 pr-4">
                                    <h3 className="m-0 text-[1.1rem] font-bold text-text mb-1 truncate">{audioBook.title}</h3>
                                    <p className="m-0 text-[0.85rem] text-text-muted truncate">{audioBook.author}</p>
                                </div>
                            </div>
                            <button onClick={() => setAudioBook(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border-none text-text-muted cursor-pointer transition-colors hover:bg-white/10 hover:text-white shrink-0">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 bg-black/10">
                            <audio controls autoPlay src={audioBook.digital_file_url || ''} className="w-full h-10 outline-none rounded-lg custom-audio">
                                Brauzeringiz audio elementini qo'llab-quvvatlamaydi.
                            </audio>
                        </div>
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => !isRequesting && setRequestModalOpen(false)}>
                    <div className="w-full max-w-[450px] bg-surface rounded-2xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-4 mb-5 border-b border-white/10">
                            <h3 className="m-0 text-[1.2rem] font-bold">Kitob so'rash</h3>
                            <button onClick={() => !isRequesting && setRequestModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border-none text-text-muted cursor-pointer transition-colors hover:bg-white/10 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-5">
                            <div className="font-semibold text-[1.1rem] mb-1">{requestBook.title}</div>
                            <div className="opacity-70 text-[0.9rem]">{requestBook.author}</div>
                        </div>

                        <div className="mb-6">
                            <label className="block mb-2 text-[0.9rem] opacity-80">Qanday shaklda kerak?</label>
                            <select
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-[1rem] cursor-pointer appearance-none focus:border-primary transition-colors hover:bg-white/10"
                            >
                                {requestBook.available_quantity === 0 && <option value="physical" className="bg-slate-800 text-white">Asl nusxa (kutish)</option>}
                                <option value="electronic" className="bg-slate-800 text-white">Elektron variant (PDF/Audio)</option>
                                {requestBook.available_quantity !== 0 && <option value="physical" className="bg-slate-800 text-white">Asl nusxa (kutish)</option>}
                            </select>
                            <p className="mt-2.5 text-[0.8rem] opacity-60 leading-relaxed">
                                {requestType === 'physical'
                                    ? "Asl nusxani so'rashda, kitob kutubxonaga qaytganida yoki tayyor bo'lganida sizga xabar beramiz."
                                    : "Agar kitobning elektron varianti bazamizda mavjud bo'lmasa, mutaxassis uni topib berishi mumkin."}
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setRequestModalOpen(false)}
                                disabled={isRequesting}
                                className="py-2.5 px-4 rounded-xl bg-transparent border border-white/10 text-white cursor-pointer transition-colors hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleRequestSubmit}
                                disabled={isRequesting}
                                className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-primary border-none text-white font-semibold cursor-pointer transition-colors hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-linear-to-br from-indigo-500 to-indigo-600"
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
