import { useState, useEffect } from 'react'
import { Book, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { api, type BookRequest } from '../../services/api'
import { toast } from 'react-toastify'

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<BookRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchRequests = async () => {
        setIsLoading(true)
        try {
            const res = await api.getMyRequests()
            if (res.success) {
                setRequests(res.data)
            }
        } catch (err: any) {
            toast.error(err.message || "So'rovlarni yuklashda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Kutilmoqda', color: '#f59e0b', icon: <Clock size={16} /> }
            case 'processing': return { label: 'Jarayonda', color: '#3b82f6', icon: <AlertCircle size={16} /> }
            case 'ready': return { label: 'Tayyor', color: '#10b981', icon: <CheckCircle size={16} /> }
            case 'rejected': return { label: 'Rad etildi', color: '#ef4444', icon: <XCircle size={16} /> }
            default: return { label: status, color: '#6b7280', icon: <Clock size={16} /> }
        }
    }

    const getTypeLabel = (type: string) => {
        return type === 'physical' ? 'Asl nusxa' : 'Elektron variant'
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
                    Mening so'rovlarim
                </h1>
                <p style={{ opacity: 0.7, margin: 0, fontSize: '0.95rem' }}>
                    Kutubxonaga yuborgan kitob so'rovlaringiz tarixi va holati
                </p>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div className="library-page__spinner"></div>
                </div>
            ) : requests.length === 0 ? (
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 40,
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.5)'
                }}>
                    Hozircha hech qanday so'rov yubormagansiz.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {requests.map(req => {
                        const sInfo = getStatusInfo(req.status)
                        return (
                            <div key={req.id} style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12,
                                padding: 20,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Book size={24} color="#a1a1aa" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff' }}>{req.book_title}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: 4 }}>
                                                Turi: <span style={{ fontWeight: 500, color: '#e4e4e7' }}>{getTypeLabel(req.request_type)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            borderRadius: 20,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            background: `${sInfo.color}15`,
                                            color: sInfo.color,
                                            border: `1px solid ${sInfo.color}40`
                                        }}>
                                            {sInfo.icon}
                                            {sInfo.label}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: 8 }}>
                                            {formatDate(req.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {req.employee_comment && (
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '12px 16px',
                                        borderRadius: 8,
                                        borderLeft: `4px solid ${sInfo.color}`,
                                        fontSize: '0.9rem',
                                        color: '#e4e4e7',
                                        lineHeight: 1.5
                                    }}>
                                        <strong style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: 4 }}>Kutubxonachi javobi:</strong>
                                        {req.employee_comment}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
