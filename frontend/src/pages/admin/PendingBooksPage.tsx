import { useState, useEffect } from 'react'
import { BookOpen, CheckCircle, XCircle, Clock, RefreshCw, Eye, MessageSquare, AlertTriangle, ExternalLink, Download } from 'lucide-react'
import { api, type Book } from '../../services/api'
import { toast } from 'react-toastify'
import PdfViewerModal from '../../components/PdfViewerModal'

type ActionType = 'approve' | 'reject' | 'deactivate'

interface ConfirmState {
    book: Book
    action: ActionType
    comment: string
}

export default function PendingBooksPage() {
    const [books, setBooks] = useState<Book[]>([])
    const [teacherBooks, setTeacherBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'pending' | 'teachers'>('pending')
    const [searchTerm, setSearchTerm] = useState('')
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [detailBook, setDetailBook] = useState<Book | null>(null)
    const [confirm, setConfirm] = useState<ConfirmState | null>(null)
    const [pdfBook, setPdfBook] = useState<Book | null>(null)

    const loadPending = async () => {
        try {
            const res = await api.getPendingBooks()
            setBooks(res.data || [])
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Kutilayotgan kitoblarni yuklab bo'lmadi")
        }
    }

    const loadTeacherBooks = async () => {
        try {
            const res = await api.getTeacherSubmissions()
            setTeacherBooks(res.data || [])
        } catch {
            // no-op, silent fail
        }
    }

    const refresh = () => {
        setLoading(true)
        Promise.all([loadPending(), loadTeacherBooks()]).finally(() => setLoading(false))
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { refresh() }, [])

    const openConfirm = (book: Book, action: ActionType) => {
        setDetailBook(null)
        setConfirm({ book, action, comment: '' })
    }

    const handleConfirm = async () => {
        if (!confirm) return
        setTogglingId(confirm.book.id)
        const { book, action, comment } = confirm
        setConfirm(null)
        try {
            const res = await api.toggleBookActive(book.id, comment.trim() ? comment.trim() : undefined)
            const updated = res.data
            if (action === 'approve') {
                toast.success(`✅ "${book.title}" tasdiqlandi!`)
            } else if (action === 'reject') {
                toast.error(`❌ "${book.title}" rad etildi!`)
            } else {
                toast.success(`"${book.title}" ${updated.is_active ? 'faollashtirildi' : 'nofaollashtirildi'}`)
            }
            if (comment.trim()) {
                toast.info(`📝 Izoh: ${comment.trim()}`, { autoClose: 6000 })
            }
            await Promise.all([loadPending(), loadTeacherBooks()])
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Amalni bajarib bo'lmadi")
        } finally {
            setTogglingId(null)
        }
    }

    const baseDisplayBooks = tab === 'pending' ? books : teacherBooks
    const displayBooks = baseDisplayBooks.filter(book =>
        (book.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (book.author?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (book.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    )

    const ACTION_CONFIG = {
        approve: {
            title: 'Kitobni tasdiqlash',
            desc: 'Bu kitob tasdiqlansa, barcha foydalanuvchilarga ko\'rinarli bo\'ladi.',
            confirmLabel: 'Tasdiqlash',
            icon: <CheckCircle size={20} className="text-emerald-400" />,
            headerColor: 'bg-emerald-500/10 border-emerald-500/20',
            btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white',
            commentPlaceholder: 'Masalan: Kitob tekshirildi, sifatli material...',
        },
        reject: {
            title: 'Kitobni rad etish',
            desc: 'Bu kitob rad etilsa nofaol holatda qoladi. O\'qituvchi qayta taqdim etishi mumkin.',
            confirmLabel: 'Rad etish',
            icon: <XCircle size={20} className="text-red-400" />,
            headerColor: 'bg-red-500/10 border-red-500/20',
            btnClass: 'bg-red-500 hover:bg-red-600 text-white',
            commentPlaceholder: 'Masalan: Kitob standartga mos emas, takrorlanadi...',
        },
        deactivate: {
            title: 'Kitobni nofaollashtirish',
            desc: 'Faol kitob nofaol holatga o\'tkaziladi va foydalanuvchilarga ko\'rinmaydi.',
            confirmLabel: 'Nofaollashtirish',
            icon: <AlertTriangle size={20} className="text-amber-400" />,
            headerColor: 'bg-amber-500/10 border-amber-500/20',
            btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
            commentPlaceholder: 'Nofaollashtirish sababini yozing...',
        },
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-text">
                        <Clock size={26} className="text-amber-400" />
                        Taqdim qilingan kitoblar
                    </h1>
                    <p className="text-sm text-text-muted mt-1.5">
                        O'qituvchilar taqdim etgan barcha kitoblari
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm text-text-muted hover:bg-white/5 transition-colors"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Yangilash
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                        <Clock size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-text">{books.length}</p>
                        <p className="text-xs text-text-muted">Kutilayotgan</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                        <BookOpen size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-text">{teacherBooks.length}</p>
                        <p className="text-xs text-text-muted">O'qituvchilardan</p>
                    </div>
                </div>
            </div>

            {/* Tabs and Filter */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex gap-1 p-1 bg-surface-hover rounded-xl w-fit border border-border flex-wrap">
                    <button
                        onClick={() => { setTab('pending'); setSearchTerm(''); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-text-muted hover:text-text'}`}
                    >
                        <Clock size={15} />
                        Tasdiq kutmoqda
                        {books.length > 0 && (
                            <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{books.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => { setTab('teachers'); setSearchTerm(''); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'teachers' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-text-muted hover:text-text'}`}
                    >
                        <BookOpen size={15} />
                        O'qituvchilardan
                        {teacherBooks.length > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{teacherBooks.length}</span>
                        )}
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Kitob yoki muallifni qidirish..."
                        className="w-full bg-surface-hover border border-border rounded-xl pl-4 pr-10 py-2.5 text-sm text-text outline-none focus:border-primary transition-colors placeholder:text-text-muted/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
                        <BookOpen size={16} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
                    </div>
                ) : displayBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-2">
                        <BookOpen size={32} className="opacity-30" />
                        <p className="text-sm">{tab === 'pending' ? "Tasdiq kutayotgan kitoblar yo'q" : tab === 'teachers' ? "O'qituvchilar yuklagan kitoblar yo'q" : "Faol kitoblar yo'q"}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-surface-hover/50">
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Kitob</th>
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Muallif</th>
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider hidden md:table-cell">Kategoriya</th>
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider hidden lg:table-cell">Nusxa</th>
                                    <th className="text-center p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Holat</th>
                                    <th className="text-center p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Amal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {displayBooks.map(book => (
                                    <tr key={book.id} className="hover:bg-surface-hover/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {book.cover_image_url ? (
                                                    <img src={book.cover_image_url} alt="" className="w-9 h-12 object-cover rounded-lg border border-border shrink-0" />
                                                ) : (
                                                    <div className="w-9 h-12 bg-surface-hover border border-border rounded-lg flex items-center justify-center shrink-0">
                                                        <BookOpen size={14} className="text-text-muted" />
                                                    </div>
                                                )}
                                                <span className="font-semibold text-text line-clamp-2 max-w-[200px]">{book.title}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-text-muted">{book.author}</td>
                                        <td className="p-4 text-text-muted hidden md:table-cell">{book.category || '—'}</td>
                                        <td className="p-4 text-text-muted hidden lg:table-cell">{book.total_quantity ?? 1}</td>
                                        <td className="p-4 text-center">
                                            {book.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                    <CheckCircle size={11} /> Faol
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                    <Clock size={11} /> Kutilmoqda
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* Ko'rish */}
                                                <button
                                                    onClick={() => setDetailBook(book)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors"
                                                    title="Ko'rish"
                                                >
                                                    <Eye size={15} />
                                                </button>

                                                {book.is_active ? (
                                                    /* Faol kitob → faqat nofaollashtirish */
                                                    <button
                                                        onClick={() => openConfirm(book, 'deactivate')}
                                                        disabled={togglingId === book.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-all disabled:opacity-50"
                                                    >
                                                        {togglingId === book.id
                                                            ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                                                            : <><XCircle size={13} /> Nofaol</>
                                                        }
                                                    </button>
                                                ) : (
                                                    /* Kutilayotgan kitob → Tasdiqlash + Rad etish */
                                                    <>
                                                        <button
                                                            onClick={() => openConfirm(book, 'approve')}
                                                            disabled={togglingId === book.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all disabled:opacity-50"
                                                        >
                                                            {togglingId === book.id
                                                                ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                                                                : <><CheckCircle size={13} /> Tasdiqlash</>
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => openConfirm(book, 'reject')}
                                                            disabled={togglingId === book.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-all disabled:opacity-50"
                                                        >
                                                            <><XCircle size={13} /> Rad etish</>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════
                Detail Modal — kitob ma'lumotlari
            ═══════════════════════════════════════════ */}
            {detailBook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetailBook(null)}>
                    <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h3 className="font-bold text-text flex items-center gap-2">
                                <BookOpen size={18} className="text-primary-light" /> Kitob ma'lumotlari
                            </h3>
                            <button onClick={() => setDetailBook(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors">✕</button>
                        </div>
                        <div className="p-5 flex gap-4">
                            {detailBook.cover_image_url ? (
                                <img src={detailBook.cover_image_url} alt="" className="w-24 h-32 object-cover rounded-xl border border-border shrink-0" />
                            ) : (
                                <div className="w-24 h-32 bg-surface-hover border border-border rounded-xl flex items-center justify-center shrink-0">
                                    <BookOpen size={24} className="text-text-muted" />
                                </div>
                            )}
                            <div className="flex flex-col gap-2 min-w-0">
                                <p className="font-bold text-text text-lg leading-tight">{detailBook.title}</p>
                                {detailBook.subtitle && <p className="text-sm text-text-muted italic">{detailBook.subtitle}</p>}
                                <p className="text-sm text-text-muted">{detailBook.author}</p>
                                {detailBook.category && <span className="text-xs bg-primary/15 text-primary-light px-2 py-0.5 rounded-full w-fit">{detailBook.category}</span>}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs text-text-muted">
                                    {detailBook.publisher && <p>Nashriyot: <span className="text-text">{detailBook.publisher}</span></p>}
                                    {detailBook.publication_date && <p>Yil: <span className="text-text">{detailBook.publication_date}</span></p>}
                                    {detailBook.language && <p>Til: <span className="text-text">{detailBook.language}</span></p>}
                                    {detailBook.page_count && <p>Sahifalar: <span className="text-text">{detailBook.page_count}</span></p>}
                                    <p>Nusxa: <span className="text-text">{detailBook.total_quantity ?? 1}</span></p>
                                    <p>Format: <span className="text-text">{detailBook.format || '—'}</span></p>
                                </div>
                                {detailBook.description && <p className="text-xs text-text-muted mt-1 line-clamp-4">{detailBook.description}</p>}
                            </div>
                        </div>

                        {/* Digital file */}
                        {detailBook.digital_file_url && (
                            <div className="px-5 pb-4 flex gap-2">
                                <button onClick={() => setPdfBook(detailBook)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/15 text-primary-light border border-primary/20 rounded-xl text-xs font-semibold hover:bg-primary/25 transition-colors cursor-pointer">
                                    <ExternalLink size={13} /> Faylni ochish
                                </button>
                                <a href={detailBook.digital_file_url} download
                                    className="flex items-center gap-2 px-4 py-2 bg-surface-hover text-text-muted border border-border rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors">
                                    <Download size={13} /> Yuklab olish
                                </a>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-between p-5 border-t border-border">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${detailBook.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                {detailBook.is_active ? <><CheckCircle size={12} /> Faol</> : <><Clock size={12} /> Kutilmoqda</>}
                            </span>
                            <div className="flex gap-2">
                                {detailBook.is_active ? (
                                    <button
                                        onClick={() => openConfirm(detailBook, 'deactivate')}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-all"
                                    >
                                        <XCircle size={15} /> Nofaollashtirish
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => openConfirm(detailBook, 'approve')}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                                        >
                                            <CheckCircle size={15} /> Tasdiqlash
                                        </button>
                                        <button
                                            onClick={() => openConfirm(detailBook, 'reject')}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-all"
                                        >
                                            <XCircle size={15} /> Rad etish
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════
                Confirmation Modal — izoh bilan tasdiqlash
            ═══════════════════════════════════════════ */}
            {confirm && (() => {
                const cfg = ACTION_CONFIG[confirm.action]
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setConfirm(null)}>
                        <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className={`flex items-center gap-3 p-5 rounded-t-2xl border-b ${cfg.headerColor}`}>
                                {cfg.icon}
                                <div>
                                    <h3 className="font-bold text-text">{cfg.title}</h3>
                                    <p className="text-xs text-text-muted mt-0.5">"{confirm.book.title}"</p>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-5 flex flex-col gap-4">
                                {/* Book preview mini */}
                                <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-xl border border-border">
                                    {confirm.book.cover_image_url ? (
                                        <img src={confirm.book.cover_image_url} alt="" className="w-10 h-14 object-cover rounded-lg border border-border shrink-0" />
                                    ) : (
                                        <div className="w-10 h-14 bg-surface-hover border border-border rounded-lg flex items-center justify-center shrink-0">
                                            <BookOpen size={14} className="text-text-muted" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-text truncate">{confirm.book.title}</p>
                                        <p className="text-xs text-text-muted truncate">{confirm.book.author}</p>
                                        {confirm.book.category && <span className="text-xs text-primary-light">{confirm.book.category}</span>}
                                    </div>
                                </div>

                                <p className="text-sm text-text-muted">{cfg.desc}</p>

                                {/* Izoh maydoni */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                        <MessageSquare size={13} />
                                        Izoh <span className="text-text-muted/60 normal-case font-normal">(ixtiyoriy)</span>
                                    </label>
                                    <textarea
                                        className="w-full bg-surface-hover border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-primary transition-colors resize-none placeholder:text-text-muted/50"
                                        rows={3}
                                        placeholder={cfg.commentPlaceholder}
                                        value={confirm.comment}
                                        onChange={e => setConfirm(prev => prev ? { ...prev, comment: e.target.value } : null)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
                                <button
                                    onClick={() => setConfirm(null)}
                                    className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${cfg.btnClass}`}
                                >
                                    {cfg.icon}
                                    {cfg.confirmLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* PDF Viewer Modal */}
            {pdfBook && (
                <PdfViewerModal
                    title={pdfBook.title}
                    fileUrl={pdfBook.digital_file_url || ''}
                    onClose={() => setPdfBook(null)}
                />
            )}
        </div>
    )
}
