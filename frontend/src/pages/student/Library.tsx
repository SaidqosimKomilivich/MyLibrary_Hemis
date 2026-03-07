import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Layers, CheckCircle, XCircle, AlertTriangle, BookOpen } from 'lucide-react'
import { api, type Book } from '../../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { useAudio } from '../../context/AudioContext'
import BookCard from '../../components/BookCard'
import BookModal from '../../components/BookModal'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'
import { CustomSelect } from '../../components/CustomSelect'
import PdfViewerModal from '../../components/PdfViewerModal'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Library() {
    const { role } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const canManageBooks = role === 'admin' || role === 'staff'

    // Book ID passed after login from PublicCatalog deep-link
    const autoOpenBookId: string | undefined = (location.state as { autoOpenBookId?: string } | null)?.autoOpenBookId
    const autoOpenHandledRef = useRef(false)

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

    // AudioContext (global player)
    const { openPlayer } = useAudio()

    // Bulk toggle state
    const [bulkModal, setBulkModal] = useState(false)
    const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | null>(null)
    const [isBulking, setIsBulking] = useState(false)

    // Per-book toggle state
    const [toggleBook, setToggleBook] = useState<Book | null>(null)
    const [isToggling, setIsToggling] = useState(false)

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search])

    // Auto-open kitobi agar login ga katalogdan o'tilgan bo'lsa
    useEffect(() => {
        if (!autoOpenBookId || autoOpenHandledRef.current) return
        autoOpenHandledRef.current = true

        const handleAutoOpen = async () => {
            try {
                // O'qilayotganlar ro'yxatiga qo'shish
                await api.startReading(autoOpenBookId)
            } catch {
                // Allaqachon ro'yxatda bo'lishi mumkin — davom etamiz
            }

            try {
                // Kitobni to'g'ridan-to'g'ri API dan olish (paginated listga bog'liq emas)
                const res = await api.getBookById(autoOpenBookId)
                if (res.success && res.data) {
                    setPdfBook(res.data)
                    toast.success(`"${res.data.title}" o'qilayotgan kitoblar ro'yxatiga qo'shildi!`, { autoClose: 4000 })
                }
            } catch {
                toast.error("Kitob yuklanmadi")
            }

            // Router state ni tozalaymiz — sahifa yangilanganda qayta ishga tushmaydi
            navigate(location.pathname, { replace: true, state: {} })
        }

        handleAutoOpen()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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

    // Audio player — AudioContext orqali global player ochiladi
    const handleListenAudio = (book: Book) => {
        openPlayer(book)
    }

    // Bulk toggle
    const handleBulkConfirm = async () => {
        if (!bulkAction) return
        setIsBulking(true)
        try {
            const res = await api.setAllBooksActive(bulkAction === 'activate')
            toast.success(`✅ ${res.message} (${res.affected} ta kitob)`)
            setBulkModal(false)
            setBulkAction(null)
            fetchBooks()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || 'Xatolik yuz berdi')
        } finally {
            setIsBulking(false)
        }
    }

    // Per-book toggle confirm
    const handleToggleConfirm = async () => {
        if (!toggleBook) return
        setIsToggling(true)
        try {
            await api.toggleBookActive(toggleBook.id)
            toast.success(
                toggleBook.is_active
                    ? `❌ "${toggleBook.title}" nofaollashtirildi`
                    : `✅ "${toggleBook.title}" faollashtirildi`
            )
            setToggleBook(null)
            fetchBooks()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Holatni o'zgartirib bo'lmadi")
        } finally {
            setIsToggling(false)
        }
    }

    // O'qiyotganlar ro'yxatiga qo'shish
    const handleAddReading = async (book: Book) => {
        try {
            await api.startReading(book.id)
            toast.success(`"${book.title}" o'qiyotganlar ro'yxatiga qo'shildi`)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
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
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
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
                        {canManageBooks ? 'Kitoblar' : 'Kutubxona'}
                    </h1>
                    <p className="text-[0.95rem] text-text-muted m-0">
                        {/* {canManageBooks ? "Kitoblarni qo'shish, tahrirlash va o'chirish" : 'Barcha mavjud kitoblar katalogi'} */}
                        {canManageBooks ? "Kitoblarni qo'shish, tahrirlash va o'chirish" : ''}
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
                            onToggleActive={canManageBooks ? (b) => setToggleBook(b) : undefined}
                            onViewPdf={handleViewPdf}
                            onListenAudio={handleListenAudio}
                            onAddReading={!canManageBooks ? handleAddReading : undefined}
                            onRequestBook={!canManageBooks ? (book) => { setRequestBook(book); setRequestModalOpen(true) } : undefined}
                            highlightQuery={search}
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
                <PdfViewerModal
                    title={pdfBook.title}
                    fileUrl={pdfBook.digital_file_url || ''}
                    onClose={() => setPdfBook(null)}
                />
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

            {/* Per-book toggle modal */}
            {toggleBook && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4" onClick={() => !isToggling && setToggleBook(null)}>
                    <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className={`flex items-center gap-3 p-5 rounded-t-2xl border-b ${toggleBook.is_active
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20'
                            }`}>
                            {toggleBook.is_active
                                ? <XCircle size={20} className="text-red-400 shrink-0" />
                                : <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                            }
                            <div>
                                <h3 className="font-bold text-text text-sm">
                                    {toggleBook.is_active ? 'Kitobni nofaollashtirish' : 'Kitobni faollashtirish'}
                                </h3>
                                <p className="text-xs text-text-muted mt-0.5 truncate max-w-[220px]">"{toggleBook.title}"</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-5 flex gap-3">
                            {toggleBook.cover_image_url ? (
                                <img src={toggleBook.cover_image_url} alt="" className="w-12 h-16 object-cover rounded-lg border border-border shrink-0" />
                            ) : (
                                <div className="w-12 h-16 bg-white/5 border border-border rounded-lg flex items-center justify-center shrink-0">
                                    <BookOpen size={16} className="text-text-muted" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="font-semibold text-sm text-text truncate">{toggleBook.title}</p>
                                <p className="text-xs text-text-muted">{toggleBook.author}</p>
                                <p className="text-xs text-text-muted mt-2">
                                    {toggleBook.is_active
                                        ? 'Kitob nofaollashtirilsa foydalanuvchilarga ko\'rinmaydi.'
                                        : 'Kitob faollashtirilsa barcha foydalanuvchilarga ko\'rinarli bo\'ladi.'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 justify-end p-5 border-t border-border">
                            <button
                                onClick={() => setToggleBook(null)}
                                disabled={isToggling}
                                className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-text-muted hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleToggleConfirm}
                                disabled={isToggling}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 ${toggleBook.is_active
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    }`}
                            >
                                {isToggling
                                    ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    : toggleBook.is_active
                                        ? <XCircle size={15} />
                                        : <CheckCircle size={15} />
                                }
                                {isToggling ? 'Bajarilmoqda...' : toggleBook.is_active ? 'Nofaollashtirish' : 'Faollashtirish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                Bulk Toggle Modal — Barcha kitoblarni boshqarish
            ═══════════════════════════════════════════════════════ */}
            {bulkModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4" onClick={() => !isBulking && setBulkModal(false)}>
                    <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h3 className="flex items-center gap-2 font-bold text-text text-lg">
                                <Layers size={20} className="text-primary-light" />
                                Barcha kitoblarni boshqarish
                            </h3>
                            {!isBulking && (
                                <button onClick={() => setBulkModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Harakat tanlash */}
                        {!bulkAction ? (
                            <div className="p-5 flex flex-col gap-4">
                                <p className="text-sm text-text-muted">
                                    Barcha kutubxona kitoblarini bir vaqtda faollashtirish yoki nofaollashtirish.
                                    Bu amal barcha sahifalardagi kitoblarga ta'sir qiladi.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setBulkAction('activate')}
                                        className="flex flex-col items-center gap-3 p-5 bg-emerald-500/10 border-2 border-emerald-500/30 hover:border-emerald-500 rounded-2xl text-emerald-400 transition-all hover:bg-emerald-500/20 group"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <CheckCircle size={28} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-sm">Barchasini faollashtirish</p>
                                            <p className="text-xs text-emerald-400/70 mt-0.5">Barcha kitoblar ko'rinadi</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setBulkAction('deactivate')}
                                        className="flex flex-col items-center gap-3 p-5 bg-red-500/10 border-2 border-red-500/30 hover:border-red-500 rounded-2xl text-red-400 transition-all hover:bg-red-500/20 group"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <XCircle size={28} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-sm">Barchasini nofaollashtirish</p>
                                            <p className="text-xs text-red-400/70 mt-0.5">Barcha kitoblar yashiriladi</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Tasdiqlash qadami */
                            <div className="p-5 flex flex-col gap-4">
                                <div className={`flex items-start gap-3 p-4 rounded-xl border ${bulkAction === 'activate'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                                    }`}>
                                    <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-sm">
                                            {bulkAction === 'activate'
                                                ? 'Barcha kitoblar faollashtiriladi'
                                                : 'Barcha kitoblar nofaollashtiriladi'
                                            }
                                        </p>
                                        <p className="text-xs opacity-80 mt-1">
                                            {bulkAction === 'activate'
                                                ? 'Bu amaldan so\'ng barcha kitoblar foydalanuvchilarga ko\'rinarli bo\'ladi.'
                                                : 'Bu amaldan so\'ng barcha kitoblar yashiriladi va foydalanuvchilarga ko\'rinmaydi.'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-text-muted text-center">Davom etishni tasdiqlaysizmi?</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between p-5 border-t border-border">
                            <button
                                onClick={() => bulkAction ? setBulkAction(null) : setBulkModal(false)}
                                disabled={isBulking}
                                className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-text-muted hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                {bulkAction ? '← Orqaga' : 'Bekor qilish'}
                            </button>
                            {bulkAction && (
                                <button
                                    onClick={handleBulkConfirm}
                                    disabled={isBulking}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50 ${bulkAction === 'activate'
                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                        : 'bg-red-500 hover:bg-red-600 text-white'
                                        }`}
                                >
                                    {isBulking ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    ) : bulkAction === 'activate' ? (
                                        <CheckCircle size={16} />
                                    ) : (
                                        <XCircle size={16} />
                                    )}
                                    {isBulking ? 'Bajarilmoqda...' : bulkAction === 'activate' ? 'Barchasini faollashtirish' : 'Barchasini nofaollashtirish'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Request Book Modal */}
            {requestModalOpen && requestBook && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => !isRequesting && setRequestModalOpen(false)}>
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
                            <CustomSelect
                                value={requestType}
                                onChange={(val) => setRequestType(val)}
                                options={[
                                    ...(requestBook.available_quantity === 0 ? [{ value: 'physical', label: 'Asl nusxa (kutish)' }] : []),
                                    { value: 'electronic', label: 'Elektron variant (PDF/Audio)' },
                                    ...(requestBook.available_quantity !== 0 ? [{ value: 'physical', label: 'Asl nusxa (kutish)' }] : [])
                                ]}
                                buttonClassName="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-[1rem] transition-colors focus:border-primary hover:bg-white/10"
                            />
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
