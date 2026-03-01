import { useState, useEffect } from 'react'
import { api, type BookRequest } from '../../services/api'
import { Search, Loader2, X, CheckCircle, XCircle, Clock, AlertCircle, BookOpen, Calendar, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { toast } from 'react-toastify'
import { createPortal } from 'react-dom'
import { CustomSelect } from '../../components/CustomSelect'

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
        } catch (err: any) {
            toast.error(err.message || "So'rovlarni yuklashda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [page, search, statusFilter])

    const handleActionClick = (req: BookRequest) => {
        setSelectedRequest(req)
        setUpdateStatus(req.status === 'pending' ? 'processing' : req.status)
        setUpdateComment(req.employee_comment || '')
        setModalOpen(true)
    }

    const handleUpdateSubmit = async () => {
        if (!selectedRequest) return
        setIsUpdating(true)
        try {
            await api.updateRequestStatus(selectedRequest.id, updateStatus, updateComment || null)
            toast.success("So'rov muvaffaqiyatli yangilandi!")
            setModalOpen(false)
            setSelectedRequest(null)
            fetchRequests()
        } catch (err: any) {
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
        <div className="p-8 md:p-10 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-surface/50 p-4 rounded-2xl border border-white/5 shadow-lg backdrop-blur-md">
                <div className="flex-1 relative">
                    <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Murojaat id orqali qidirish..."
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
                        return (
                            <div key={req.id} className="bg-surface border border-border rounded-3xl p-6 transition-all duration-300 relative flex flex-col shadow-lg hover:-translate-y-1 hover:border-blue-400/30 hover:shadow-blue-500/20 hover:shadow-2xl group">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-purple-500 flex shrink-0 items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/40">
                                            {getInitials(req.user_name)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="m-0 text-[1.1rem] text-text font-bold tracking-tight truncate" title={req.user_name}>{req.user_name}</h3>
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

                                <div className="bg-surface-hover/50 border border-border rounded-2xl p-5 mb-6 flex-1">
                                    <h4 className="text-[1.2rem] font-bold text-text m-0 mb-3 flex items-start gap-2.5 leading-snug">
                                        <BookOpen size={20} className="text-blue-400 shrink-0 mt-0.5" />
                                        {req.book_title}
                                    </h4>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${req.request_type === 'physical' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-pink-500/10 text-pink-400'}`}>
                                        {req.request_type === 'physical' ? '📚 Asl nusxa (Kitob)' : '💻 Elektron variant (PDF/Audio)'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-dashed border-border">
                                    <button className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white border-none py-3 px-6 rounded-xl font-semibold text-[0.95rem] cursor-pointer transition-all shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(59,130,246,0.6)]" onClick={() => handleActionClick(req)}>
                                        Amal bajarish
                                    </button>
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-9999 animate-in fade-in duration-200 p-4" onClick={() => !isUpdating && setModalOpen(false)}>
                    <div className="bg-surface border border-border rounded-3xl w-full max-w-[550px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-surface-hover/50 px-8 py-6 border-b border-border flex justify-between items-center">
                            <div>
                                <h2 className="m-0 mb-1 text-[1.4rem] text-text font-bold">So'rov tartibi</h2>
                                <p className="m-0 text-text-muted text-[0.9rem]">Foydalanuvchiga kerakli javobni taqdim eting</p>
                            </div>
                            <button onClick={() => !isUpdating && setModalOpen(false)} className="bg-white/10 border-none text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-white/20">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                        {getInitials(selectedRequest.user_name)}
                                    </div>
                                    <div>
                                        <div className="text-text font-semibold">{selectedRequest.user_name}</div>
                                        <div className="text-text-muted text-[0.85rem]">{formatDate(selectedRequest.created_at)}</div>
                                    </div>
                                </div>
                                <div className="text-text text-[0.95rem] leading-normal bg-surface-hover p-3 rounded-lg">
                                    <span className="text-blue-400 font-semibold">So'ralgan kitob:</span> {selectedRequest.book_title} <br />
                                    <span className="text-purple-400 font-semibold">So'rov turi:</span> {selectedRequest.request_type === 'physical' ? 'Asl nusxa' : 'Elektron variant'}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="flex items-center gap-2 mb-3 text-[0.95rem] text-slate-300 font-medium">
                                    <AlertCircle size={18} className="text-blue-400" />
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
                                    buttonClassName="w-full bg-surface-hover border border-border py-4 px-5 rounded-xl text-text text-[1.05rem] transition-all focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 mb-3 text-[0.95rem] text-text-muted font-medium">
                                    <MessageSquare size={18} className="text-purple-400" />
                                    Izoh qoldirish (Talaba buni ko'radi)
                                </label>
                                <textarea
                                    value={updateComment}
                                    onChange={(e) => setUpdateComment(e.target.value)}
                                    placeholder="Masalan: Kitobni kutubxonadan kelib olishingiz mumkin..."
                                    rows={4}
                                    className="w-full p-4 rounded-2xl bg-surface-hover border border-border text-text outline-none text-[0.95rem] resize-y font-inherit transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/15"
                                />
                            </div>
                        </div>

                        <div className="bg-surface-hover/50 px-8 py-5 border-t border-border flex justify-end gap-4">
                            <button
                                disabled={isUpdating}
                                className="px-6 py-3 rounded-xl bg-transparent border border-border text-text font-semibold cursor-pointer transition-all hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleUpdateSubmit}
                                disabled={isUpdating}
                                className="px-7 py-3 rounded-xl bg-linear-to-br from-blue-500 to-purple-500 border-none text-white font-semibold cursor-pointer flex items-center gap-2.5 shadow-[0_8px_16px_-4px_rgba(59,130,246,0.5)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
                            >
                                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
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
