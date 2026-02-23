import { useState, useEffect } from 'react'
import { api, type BookRequest } from '../../services/api'
import { Search, Loader2, X, CheckCircle, XCircle, Clock, AlertCircle, BookOpen, Calendar, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { toast } from 'react-toastify'
import { createPortal } from 'react-dom'

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
        return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    }

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase()
    }

    return (
        <div className="req-page">
            <style>{`
                .req-page {
                    padding: 32px 40px;
                    max-width: 1600px;
                    margin: 0 auto;
                    font-family: 'Inter', system-ui, sans-serif;
                    min-height: 100vh;
                }
                .req-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
                    padding: 32px 40px;
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 40px -20px rgba(0,0,0,0.3);
                }
                .req-header::after {
                    content: '';
                    position: absolute;
                    top: -50%; left: -50%;
                    width: 200%; height: 200%;
                    background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 50%);
                    pointer-events: none;
                }
                .req-header h1 {
                    font-size: 2.2rem;
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    background: linear-gradient(to right, #60a5fa, #c084fc, #f472b6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -0.5px;
                }
                .req-header p {
                    color: #9ca3af;
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 500;
                }
                .req-search-bar {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 32px;
                    background: rgba(31, 41, 55, 0.5);
                    padding: 16px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.2);
                    backdrop-filter: blur(12px);
                }
                .req-search-wrapper {
                    flex: 1;
                    position: relative;
                }
                .req-search-icon {
                    position: absolute;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                }
                .req-input, .req-select {
                    width: 100%;
                    background: rgba(17, 24, 39, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 16px 20px 16px 52px;
                    border-radius: 14px;
                    color: #f3f4f6;
                    font-size: 1.05rem;
                    transition: all 0.3s ease;
                }
                .req-select {
                    padding-left: 20px;
                    min-width: 250px;
                    flex-shrink: 0;
                    width: auto;
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1rem center;
                    background-size: 1.2em;
                }
                .req-input:focus, .req-select:focus {
                    outline: none;
                    border-color: #60a5fa;
                    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.15);
                    background: rgba(17, 24, 39, 0.8);
                }
                .req-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                    gap: 24px;
                }
                .req-card {
                    background: linear-gradient(145deg, rgba(31, 41, 55, 0.6), rgba(17, 24, 39, 0.6));
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 24px;
                    padding: 24px;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px -15px rgba(0,0,0,0.5);
                }
                .req-card:hover {
                    transform: translateY(-6px) scale(1.01);
                    border-color: rgba(96, 165, 250, 0.3);
                    box-shadow: 0 20px 40px -15px rgba(59, 130, 246, 0.2);
                }
                .req-card::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; height: 100%;
                    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
                    pointer-events: none;
                    border-radius: 24px;
                }
                .req-user {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .req-avatar {
                    width: 48px; height: 48px;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: #fff;
                    font-size: 1.2rem;
                    box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.4);
                }
                .req-user-info h3 { margin: 0; font-size: 1.1rem; color: #f9fafb; font-weight: 700; letter-spacing: -0.3px; }
                .req-user-info p { margin: 4px 0 0 0; font-size: 0.85rem; color: #9ca3af; display: flex; align-items: center; gap: 6px; }
                
                .req-status-pill {
                    position: absolute;
                    top: 24px; right: 24px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }
                .req-book {
                    background: rgba(0, 0, 0, 0.25);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                    flex: 1;
                    border: 1px solid rgba(255,255,255,0.03);
                }
                .req-book-title {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #fff;
                    margin: 0 0 12px 0;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    line-height: 1.4;
                }
                .req-type-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 10px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .type-physical { background: rgba(52, 211, 153, 0.1); color: #34d399; }
                .type-electronic { background: rgba(244, 114, 182, 0.1); color: #f472b6; }
                
                .req-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 16px;
                    border-top: 1px dashed rgba(255,255,255,0.1);
                }
                .req-action-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 8px 20px -6px rgba(59, 130, 246, 0.5);
                    width: 100%;
                    justify-content: center;
                }
                .req-action-btn:hover {
                    background: #2563eb;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px -8px rgba(59, 130, 246, 0.6);
                }
                
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.3s ease;
                }
                .modal-content {
                    background: linear-gradient(165deg, #1f2937, #111827);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 28px;
                    width: 100%;
                    max-width: 550px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05) inset;
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                    position: relative;
                }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin-icon { animation: spin 1s linear infinite; }
            `}</style>

            {/* <div className="req-header">
                <div>
                    <h1>So'rovlar markazi</h1>
                    <p>Foydalanuvchilarning kitob talablarini aqlli boshqarish</p>
                </div>
                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <ShieldCheck size={28} color="#a78bfa" />
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>Admin Panel</div>
                        <div style={{ color: '#fff', fontWeight: 700 }}>So'rovlar modduli</div>
                    </div>
                </div>
            </div> */}

            <div className="req-search-bar">
                <div className="req-search-wrapper">
                    <Search size={22} className="req-search-icon" />
                    <input
                        type="text"
                        placeholder="Foydalanuvchi ismi yoki kitob qidirish..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="req-input"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="req-select"
                >
                    <option value="all">Barcha holatlar</option>
                    <option value="pending">Kutilmoqda</option>
                    <option value="processing">Jarayonda</option>
                    <option value="ready">Tayyor (Tasdiqlangan)</option>
                    <option value="rejected">Rad etilgan</option>
                </select>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                    <Loader2 size={48} color="#60a5fa" className="spin-icon" style={{ opacity: 0.8 }} />
                </div>
            ) : requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af', background: 'rgba(31,41,55,0.3)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <BookOpen size={64} style={{ opacity: 0.2, margin: '0 auto 20px' }} />
                    <h2 style={{ color: '#f3f4f6', margin: '0 0 8px' }}>Hech narsa topilmadi</h2>
                    <p style={{ margin: 0 }}>So'rovlar ro'yxati bo'sh yoki qidiruvga mos natija yo'q.</p>
                </div>
            ) : (
                <div className="req-grid">
                    {requests.map((req) => {
                        const style = getStatusStyle(req.status);
                        return (
                            <div key={req.id} className="req-card">
                                <div className="req-status-pill" style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}30` }}>
                                    {style.icon}
                                    {getStatusLabel(req.status)}
                                </div>

                                <div className="req-user">
                                    <div className="req-avatar">
                                        {getInitials(req.user_name)}
                                    </div>
                                    <div className="req-user-info">
                                        <h3>{req.user_name}</h3>
                                        <p><Calendar size={14} /> {formatDate(req.created_at)}</p>
                                    </div>
                                </div>

                                <div className="req-book">
                                    <h4 className="req-book-title">
                                        <BookOpen size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                                        {req.book_title}
                                    </h4>
                                    <span className={`req-type-badge ${req.request_type === 'physical' ? 'type-physical' : 'type-electronic'}`}>
                                        {req.request_type === 'physical' ? '📚 Asl nusxa (Kitob)' : '💻 Elektron variant (PDF/Audio)'}
                                    </span>
                                </div>

                                <div className="req-footer">
                                    <button className="req-action-btn" onClick={() => handleActionClick(req)}>
                                        Amal bajarish
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 48 }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? '#6b7280' : '#fff', padding: '12px 20px', borderRadius: 12, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <ChevronLeft size={18} /> Oldingi
                    </button>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f3f4f6' }}>
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? '#6b7280' : '#fff', padding: '12px 20px', borderRadius: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        Keyingi <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Action Modal */}
            {modalOpen && selectedRequest && createPortal(
                <div className="modal-overlay" onClick={() => !isUpdating && setModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', color: '#fff', fontWeight: 700 }}>So'rov tartibi</h2>
                                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>Foydalanuvchiga kerakli javobni taqdim eting</p>
                            </div>
                            <button onClick={() => !isUpdating && setModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '32px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                        {getInitials(selectedRequest.user_name)}
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 600 }}>{selectedRequest.user_name}</div>
                                        <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{formatDate(selectedRequest.created_at)}</div>
                                    </div>
                                </div>
                                <div style={{ color: '#e5e7eb', fontSize: '0.95rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>So'ralgan kitob:</span> {selectedRequest.book_title} <br />
                                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>So'rov turi:</span> {selectedRequest.request_type === 'physical' ? 'Asl nusxa' : 'Elektron variant'}
                                </div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.95rem', color: '#d1d5db', fontWeight: 500 }}>
                                    <AlertCircle size={18} color="#60a5fa" />
                                    Joriy holatni yangilang
                                </label>
                                <select
                                    value={updateStatus}
                                    onChange={(e) => setUpdateStatus(e.target.value)}
                                    className="req-select"
                                    style={{ background: 'rgba(0,0,0,0.3)' }}
                                >
                                    <option value="pending">Kutilmoqda (Yangi)</option>
                                    <option value="processing">Jarayonda (Qidirilmoqda/Ko'rilmoqda)</option>
                                    <option value="ready">Tasdiqlash & Tayyor</option>
                                    <option value="rejected">Rad etish</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.95rem', color: '#d1d5db', fontWeight: 500 }}>
                                    <MessageSquare size={18} color="#a78bfa" />
                                    Izoh qoldirish (Talaba buni ko'radi)
                                </label>
                                <textarea
                                    value={updateComment}
                                    onChange={(e) => setUpdateComment(e.target.value)}
                                    placeholder="Masalan: Kitobni kutubxonadan kelib olishingiz mumkin..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        borderRadius: 16,
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                            <button
                                onClick={() => setModalOpen(false)}
                                disabled={isUpdating}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: 12,
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleUpdateSubmit}
                                disabled={isUpdating}
                                style={{
                                    padding: '12px 28px',
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.5)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                {isUpdating ? <Loader2 size={18} className="spin-icon" /> : <CheckCircle size={18} />}
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
