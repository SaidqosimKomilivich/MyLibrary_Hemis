import { useState, useEffect } from 'react'
import { api, type BookRequest } from '../../services/api'
import { Search, Loader2, X, CheckCircle, XCircle, Clock, AlertCircle, AlertTriangle, BookOpen, Calendar, ChevronLeft, ChevronRight, MessageSquare, Layers, MapPin, ShieldCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import { createPortal } from 'react-dom'
import { CustomSelect } from '../../components/CustomSelect'
import { highlightText } from '../../utils/highlightText'

const getShelfDisplay = (shelf?: string | null): string | null => {
    if (!shelf) return null
    const trimmed = shelf.trim()
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'null') return null
    return trimmed
}

export default function EmployeeRequestsPage() {
    const [requests, setRequests] = useState<BookRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Modal state
    const [selectedRequest, setSelectedRequest] = useState<BookRequest | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [updateStatus, setUpdateStatus] = useState('processing')
    const [updateComment, setUpdateComment] = useState('')

    const fetchRequests = async () => {
        setIsLoading(true)
        try {
            const res = await api.getAllRequests({ page, per_page: 12, search, status: statusFilter })
            if (res.success) {
                setRequests(res.data)
                setTotalPages(res.pagination.total_pages)
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "So'rovlarni yuklashda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search, statusFilter])

    // Modal ochiq bo'lganda orqa fon sahifasi skrolini bloklash va Escape bilan yopish
    useEffect(() => {
        if (modalOpen) {
            const originalOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && !isUpdating) {
                    setModalOpen(false)
                }
            }
            window.addEventListener('keydown', handleKeyDown)
            return () => {
                document.body.style.overflow = originalOverflow
                window.removeEventListener('keydown', handleKeyDown)
            }
        }
    }, [modalOpen, isUpdating])

    const handleActionClick = (req: BookRequest) => {
        if (req.status !== 'pending' || req.employee_name) return
        setSelectedRequest(req)
        setUpdateStatus('processing')
        setUpdateComment(req.employee_comment || '')
        setModalOpen(true)
    }

    const handleUpdateSubmit = async () => {
        if (!selectedRequest) return
        setIsUpdating(true)
        try {
            await api.updateRequestStatus(selectedRequest.id, updateStatus, updateComment || null)
            toast.success("So'rov muvaffaqiyatli yangilandi!")
            window.dispatchEvent(new Event('requestStatusUpdated'))
            setModalOpen(false)
            setSelectedRequest(null)
            fetchRequests()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Xatolik yuz berdi")
        } finally {
            setIsUpdating(false)
        }
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', icon: <Clock size={16} /> }
            case 'processing': return { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', icon: <AlertCircle size={16} /> }
            case 'ready': return { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', icon: <CheckCircle size={16} /> }
            case 'rejected': return { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', icon: <XCircle size={16} /> }
            default: return { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)', icon: <Clock size={16} /> }
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Kutilmoqda'
            case 'processing': return 'Jarayonda'
            case 'ready': return 'Tayyor'
            case 'rejected': return 'Rad etilgan'
            default: return status
        }
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const year = d.getFullYear()
        const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        return `${day}.${month}.${year} ${time}`
    }

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase()
    }

    return (
        <div className="p-8 md:p-10 max-w-400 mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-surface/50 p-4 rounded-2xl border border-white/5 shadow-lg backdrop-blur-md">
                <div className="flex-1 relative">
                    <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Kitob nomi, muallif yoki kitobxon ismi bo'yicha qidirish..."
                        className="w-full bg-surface-hover border border-border py-4 pr-5 pl-12 rounded-xl text-text text-[1.05rem] transition-all focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
                    />
                </div>
                <CustomSelect
                    value={statusFilter}
                    onChange={(val) => { setStatusFilter(val); setPage(1); }}
                    options={[
                        { value: 'all', label: 'Barcha holatlar' },
                        { value: 'pending', label: 'Kutilmoqda' },
                        { value: 'processing', label: 'Jarayonda' },
                        { value: 'ready', label: 'Tayyor (Tasdiqlangan)' },
                        { value: 'rejected', label: 'Rad etilgan' }
                    ]}
                    buttonClassName="w-full md:w-auto bg-surface-hover border border-border py-4 px-5 rounded-xl text-text text-[1.05rem] transition-all focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15 shrink-0"
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-24">
                    <Loader2 size={48} className="text-blue-400 opacity-80 animate-spin" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-24 text-text-muted bg-surface/50 rounded-3xl border border-dashed border-border">
                    <BookOpen size={64} className="opacity-20 mx-auto mb-5 text-current" />
                    <h2 className="text-text m-0 mb-2">Hech narsa topilmadi</h2>
                    <p className="m-0">So'rovlar ro'yxati bo'sh yoki qidiruvga mos natija yo'q.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {requests.map((req) => {
                        const style = getStatusStyle(req.status);
                        const isAnswered = req.status !== 'pending' || Boolean(req.employee_name);
                        return (
                            <div key={req.id} className="bg-surface border border-border rounded-3xl p-6 transition-all duration-300 relative flex flex-col shadow-lg hover:-translate-y-1 hover:border-blue-400/30 hover:shadow-blue-500/20 hover:shadow-2xl group">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-purple-500 flex shrink-0 items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/40">
                                            {getInitials(req.user_name)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="m-0 text-[1.1rem] text-text font-bold tracking-tight truncate" title={req.user_name}>{highlightText(req.user_name, search)}</h3>
                                            <p className="m-0 mt-1 text-[0.85rem] text-text-muted flex items-center gap-1.5"><Calendar size={14} /> {formatDate(req.created_at)}</p>
                                        </div>
                                    </div>

                                    <div className="shrink-0 mt-1">
                                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide border bg-opacity-10" style={{ backgroundColor: style.bg, color: style.color, borderColor: `${style.color}30` }}>
                                            {style.icon}
                                            {getStatusLabel(req.status)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-surface-hover/50 border border-border rounded-2xl p-5 mb-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-[1.2rem] font-bold text-text m-0 mb-1.5 flex items-start gap-2.5 leading-snug">
                                            <BookOpen size={20} className="text-blue-400 shrink-0 mt-0.5" />
                                            {highlightText(req.book_title, search)}
                                        </h4>
                                        {req.book_author && (
                                            <p className="m-0 mb-3 text-[0.88rem] text-text-muted pl-7">
                                                {highlightText(req.book_author, search)}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${req.request_type === 'physical' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                                {req.request_type === 'physical' ? '📚 Asl nusxa' : '💻 Elektron variant'}
                                            </span>
                                            {(() => {
                                                const shelf = getShelfDisplay(req.shelf_location)
                                                if (shelf) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted bg-surface border border-border">
                                                            <MapPin size={13} className="text-amber-400" />
                                                            Javon: {shelf}
                                                        </span>
                                                    )
                                                }
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted/60 bg-surface/40 border border-border/40 italic">
                                                        <MapPin size={13} className="opacity-40" />
                                                        Javon: Belgilanmagan
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                    </div>

                                    {/* Fonddagi nusxalar soni indikatori */}
                                    <div className="pt-3 border-t border-border/60">
                                        {(req.available_quantity ?? 0) <= 0 ? (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold">
                                                <AlertTriangle size={15} className="shrink-0 text-red-400" />
                                                <span>Kutubxona fondida yo'q (0 ta mavjud)</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                                                    <span>Fondda mavjud: {req.available_quantity} ta</span>
                                                </div>
                                                {req.total_quantity !== undefined && req.total_quantity !== null && (
                                                    <span className="text-emerald-400/80 text-[0.75rem] font-normal">
                                                        (jami: {req.total_quantity} ta)
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Javob bergan kutubxona xodimi */}
                                    {req.employee_name && (
                                        <div className="mt-2.5 pt-2 border-t border-dashed border-border/60 flex items-center justify-between text-xs text-text-muted">
                                            <span className="flex items-center gap-1.5 text-blue-400 font-medium truncate" title={req.employee_name}>
                                                <ShieldCheck size={14} className="shrink-0 text-blue-400" />
                                                Xodim: {req.employee_name}
                                            </span>
                                            <span className="text-[0.75rem] text-text-muted/70 shrink-0">
                                                {formatDate(req.updated_at)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Javob izohi (agar mavjud bo'lsa) */}
                                    {req.employee_comment && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-border/50 text-xs text-text-muted">
                                            <span className="font-medium text-text/80 flex items-center gap-1 mb-1">
                                                <MessageSquare size={13} className="text-purple-400 shrink-0" /> Javob izohi:
                                            </span>
                                            <p className="m-0 italic line-clamp-2 text-text/80 pl-4">{req.employee_comment}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-dashed border-border">
                                    {isAnswered ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full flex items-center justify-center gap-2 bg-surface-hover/80 text-text-muted border border-border/80 py-3 px-6 rounded-xl font-semibold text-[0.95rem] cursor-not-allowed opacity-75 shadow-none select-none"
                                            title="Ushbu so'rovga allaqachon javob berilgan"
                                        >
                                            <CheckCircle size={17} className={req.status === 'rejected' ? 'text-red-400' : 'text-emerald-400'} />
                                            Javob berilgan
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white border-none py-3 px-6 rounded-xl font-semibold text-[0.95rem] cursor-pointer transition-all shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(59,130,246,0.6)]"
                                            onClick={() => handleActionClick(req)}
                                        >
                                            Javob berish
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-6 mt-12">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-2 bg-surface-hover border border-border px-5 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-text hover:bg-surface disabled:hover:bg-surface-hover"
                    >
                        <ChevronLeft size={18} /> Oldingi
                    </button>
                    <span className="text-[1.1rem] font-semibold text-text">
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white hover:bg-white/10 disabled:hover:bg-white/5"
                    >
                        Keyingi <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Action Modal */}
            {modalOpen && selectedRequest && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-9999 animate-in fade-in duration-200 p-3 sm:p-4 overflow-y-auto" onClick={() => !isUpdating && setModalOpen(false)}>
                    <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl w-full max-w-130.5 max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden relative my-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-surface-hover/50 px-6 py-4.5 border-b border-border flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="m-0 mb-1 text-[1.25rem] text-text font-bold">So'rov tartibi</h2>
                                <p className="m-0 text-text-muted text-[0.82rem]">Foydalanuvchiga kerakli javobni taqdim eting</p>
                            </div>
                            <button onClick={() => !isUpdating && setModalOpen(false)} className="bg-white/10 border-none text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-white/20">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain custom-scrollbar space-y-5">
                            <div className="bg-surface-hover border border-border rounded-2xl p-4 space-y-3.5">
                                {/* Foydalanuvchi qismi */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md shadow-blue-500/30">
                                        {getInitials(selectedRequest.user_name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-text font-semibold text-[0.98rem] truncate">{selectedRequest.user_name}</div>
                                        <div className="text-text-muted text-[0.8rem] flex items-center gap-1 mt-0.5">
                                            <Calendar size={13} /> {formatDate(selectedRequest.created_at)}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.75rem] font-semibold ${selectedRequest.request_type === 'physical' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                            {selectedRequest.request_type === 'physical' ? '📚 Asl nusxa' : '💻 Elektron'}
                                        </span>
                                    </div>
                                </div>

                                {/* Agar oldinroq xodim javob bergan bo'lsa */}
                                {selectedRequest.employee_name && (
                                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck size={15} className="text-blue-400 shrink-0" />
                                            <span className="text-text-muted">
                                                Javob bergan: <strong className="text-blue-300 font-semibold">{selectedRequest.employee_name}</strong>
                                            </span>
                                        </div>
                                        <span className="text-text-muted/70 text-[0.75rem]">
                                            {formatDate(selectedRequest.updated_at)}
                                        </span>
                                    </div>
                                )}

                                {/* So'ralgan kitob kartasi */}
                                <div className="p-3.5 rounded-xl bg-surface border border-border/80">
                                    <div className="flex items-start gap-3">
                                        {selectedRequest.cover_image_url ? (
                                            <img
                                                src={selectedRequest.cover_image_url}
                                                alt={selectedRequest.book_title}
                                                className="w-11 h-15 object-cover rounded-lg border border-border shadow-sm shrink-0"
                                            />
                                        ) : (
                                            <div className="w-11 h-15 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                                <BookOpen size={22} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[0.7rem] font-bold text-blue-400 uppercase tracking-wider">So'ralgan kitob</span>
                                            <h3 className="text-text font-bold text-[1.02rem] m-0 mt-0.5 leading-snug">
                                                {selectedRequest.book_title}
                                            </h3>
                                            {selectedRequest.book_author && (
                                                <p className="text-text-muted text-[0.82rem] m-0 mt-0.5">
                                                    Muallif: <span className="text-text font-medium">{selectedRequest.book_author}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* KUTUBXONA FONDI MA'LUMOTLARI (FOND CHEGARASI VA MAVJUDLIGI) */}
                                    <div className="mt-3.5 pt-3 border-t border-border/60">
                                        {(selectedRequest.available_quantity ?? 0) <= 0 ? (
                                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200">
                                                <div className="flex items-center gap-2 font-bold text-red-400 text-[0.92rem]">
                                                    <AlertTriangle size={18} className="shrink-0 text-red-400" />
                                                    <span>Kutubxona fondida bu kitob yo'q! (0 ta qolgan)</span>
                                                </div>
                                                <p className="m-0 mt-1 text-[0.8rem] text-red-200/90 leading-relaxed">
                                                    Kitobning fonddagi mavjud nusxalari soni <strong>0 ga teng</strong>. 
                                                    {selectedRequest.total_quantity && selectedRequest.total_quantity > 0 
                                                        ? ` Jami fondda ${selectedRequest.total_quantity} ta nusxa mavjud, ammo barchasi boshqa kitobxonlarga berilgan.` 
                                                        : ' Kutubxona fondida ushbu kitobdan nusxa mavjud emas.'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUpdateStatus('rejected')
                                                        setUpdateComment("Hurmatli kitobxon, afsuski, so'ralgan kitob ayni vaqtda kutubxona fondida mavjud emas (0 ta qolgan). Yangi nusxalar kelganda yana so'rov yuborishingiz mumkin.")
                                                    }}
                                                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/40 cursor-pointer transition-colors"
                                                >
                                                    <XCircle size={14} />
                                                    "Rad etish" holatini tanlash va izoh to'ldirish
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-[0.92rem]">
                                                        <CheckCircle size={18} className="shrink-0 text-emerald-400" />
                                                        <span>Kutubxona fondida bor: {selectedRequest.available_quantity} ta mavjud</span>
                                                    </div>
                                                    {selectedRequest.total_quantity !== undefined && selectedRequest.total_quantity !== null && (
                                                        <span className="text-[0.72rem] bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full text-emerald-300 font-semibold flex items-center gap-1">
                                                            <Layers size={12} /> Jami: {selectedRequest.total_quantity} ta
                                                        </span>
                                                    )}
                                                </div>
                                                {(() => {
                                                    const shelf = getShelfDisplay(selectedRequest.shelf_location)
                                                    if (shelf) {
                                                        return (
                                                            <p className="m-0 mt-1.5 text-[0.8rem] text-emerald-200/90 flex items-center gap-1.5">
                                                                <MapPin size={14} className="text-amber-400 shrink-0" />
                                                                <span>Kutubxona javoni:</span>
                                                                <strong className="text-white bg-black/20 px-1.5 py-0.5 rounded border border-white/10">{shelf}</strong>
                                                            </p>
                                                        )
                                                    }
                                                    return (
                                                        <p className="m-0 mt-1.5 text-[0.78rem] text-emerald-200/70 flex items-center gap-1.5">
                                                            <MapPin size={14} className="text-amber-400/50 shrink-0" />
                                                            <span>Kutubxona javoni:</span>
                                                            <span className="text-emerald-300/80 italic bg-black/15 px-1.5 py-0.5 rounded border border-white/5">Bazada belgilanmagan</span>
                                                        </p>
                                                    )
                                                })()}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const shelf = getShelfDisplay(selectedRequest.shelf_location)
                                                        setUpdateStatus('ready')
                                                        setUpdateComment(`Hurmatli kitobxon, kitobingiz tayyorlandi. Kutubxonadan kelib olishingiz mumkin.${shelf ? ` (Javon: ${shelf})` : ''}`)
                                                    }}
                                                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 cursor-pointer transition-colors"
                                                >
                                                    <CheckCircle size={14} />
                                                    "Tayyor" holatini tanlash va izoh to'ldirish
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 mb-2 text-[0.88rem] text-slate-300 font-medium">
                                    <AlertCircle size={16} className="text-blue-400" />
                                    Joriy holatni yangilang
                                </label>
                                <CustomSelect
                                    value={updateStatus}
                                    onChange={(val) => setUpdateStatus(val)}
                                    options={[
                                        { value: 'pending', label: 'Kutilmoqda (Yangi)' },
                                        { value: 'processing', label: 'Jarayonda (Qidirilmoqda/Ko\'rilmoqda)' },
                                        { value: 'ready', label: 'Tasdiqlash & Tayyor' },
                                        { value: 'rejected', label: 'Rad etish' }
                                    ]}
                                    buttonClassName="w-full bg-surface-hover border border-border py-3 px-4 rounded-xl text-text text-[0.95rem] transition-all focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
                                />
                                {updateStatus === 'ready' && (selectedRequest.available_quantity ?? 0) <= 0 && (
                                    <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                                        <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                                        <span>Diqqat: Ushbu kitob fondda 0 ta (mavjud emas). Tasdiqlashdan avval mavjudligini qayta tekshiring!</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="flex items-center gap-2 text-[0.88rem] text-slate-200 font-medium">
                                        <MessageSquare size={16} className="text-purple-400" />
                                        <span>Kutubxonachi javob izohi</span>
                                        <span className="text-xs text-text-muted font-normal">(ixtiyoriy)</span>
                                    </label>
                                    {updateComment && (
                                        <button
                                            type="button"
                                            onClick={() => setUpdateComment('')}
                                            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                                            title="Izohni tozalash"
                                        >
                                            <X size={13} /> Tozalash
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={updateComment}
                                    onChange={(e) => setUpdateComment(e.target.value)}
                                    placeholder="Foydalanuvchiga yuboriladigan javob yoki tushuntirishni bu yerga erkin yozing (masalan: kitob ertaga keladi, boshqa bo'limdan olishingiz mumkin, 3-qavatdagi zaldan oling va h.k.)..."
                                    rows={3}
                                    className="w-full p-3.5 rounded-xl bg-surface-hover border border-border text-text outline-none text-[0.9rem] resize-y font-inherit transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
                                />

                                {/* Tezkor yordamchi iboralar (ixtiyoriy) */}
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[0.75rem] text-text-muted mr-1">Tezkor shablon:</span>
                                    <button
                                        type="button"
                                        onClick={() => setUpdateComment(prev => prev ? `${prev} Kitob tayyorlandi, kutubxonadan kelib olishingiz mumkin.` : 'Kitob tayyorlandi, kutubxonadan kelib olishingiz mumkin.')}
                                        className="px-2 py-1 rounded-lg bg-surface border border-border hover:border-blue-400/40 hover:text-text text-text-muted text-xs cursor-pointer transition-colors"
                                    >
                                        + "Kelib olishingiz mumkin"
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUpdateComment(prev => prev ? `${prev} Barcha nusxalar hozirda boshqa kitobxonlarda, navbatga qo'yildi.` : 'Barcha nusxalar hozirda boshqa kitobxonlarda, navbatga qo\'yildi.')}
                                        className="px-2 py-1 rounded-lg bg-surface border border-border hover:border-blue-400/40 hover:text-text text-text-muted text-xs cursor-pointer transition-colors"
                                    >
                                        + "Barcha nusxalar band"
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUpdateComment(prev => prev ? `${prev} Afsuski, kitob ayni vaqtda fondda mavjud emas.` : 'Afsuski, ushbu kitob ayni vaqtda fondda mavjud emas.')}
                                        className="px-2 py-1 rounded-lg bg-surface border border-border hover:border-blue-400/40 hover:text-text text-text-muted text-xs cursor-pointer transition-colors"
                                    >
                                        + "Fondda mavjud emas"
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-hover/50 px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => !isUpdating && setModalOpen(false)}
                                disabled={isUpdating}
                                className="px-5 py-2.5 rounded-xl bg-transparent border border-border text-text text-[0.9rem] font-semibold cursor-pointer transition-all hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleUpdateSubmit}
                                disabled={isUpdating}
                                className="px-6 py-2.5 rounded-xl bg-linear-to-br from-blue-500 to-purple-500 border-none text-white text-[0.9rem] font-semibold cursor-pointer flex items-center gap-2 shadow-[0_8px_16px_-4px_rgba(59,130,246,0.5)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
                            >
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {isUpdating ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
