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
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const year = d.getFullYear()
        const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        return `${day}.${month}.${year} ${time}`
    }

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-[1.8rem] font-bold text-white m-0 mb-2">
                    Mening so'rovlarim
                </h1>
                <p className="m-0 text-[0.95rem] opacity-70">
                    Kutubxonaga yuborgan kitob so'rovlaringiz tarixi va holati
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-10">
                    <div className="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-10 text-center text-white/50">
                    Hozircha hech qanday so'rov yubormagansiz.
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {requests.map(req => {
                        const sInfo = getStatusInfo(req.status)
                        return (
                            <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
                                <div className="flex justify-between items-start flex-wrap gap-3">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                                            <Book size={24} className="text-zinc-400" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-[1.1rem] text-white">{req.book_title}</div>
                                            <div className="text-[0.85rem] text-zinc-400 mt-1">
                                                Turi: <span className="font-medium text-zinc-200">{getTypeLabel(req.request_type)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.85rem] font-medium"
                                            style={{
                                                background: `${sInfo.color}15`,
                                                color: sInfo.color,
                                                border: `1px solid ${sInfo.color}40`
                                            }}
                                        >
                                            {sInfo.icon}
                                            {sInfo.label}
                                        </div>
                                        <div className="text-[0.8rem] text-zinc-500 mt-2">
                                            {formatDate(req.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {req.employee_comment && (
                                    <div
                                        className="bg-black/20 py-3 px-4 rounded-lg text-[0.9rem] text-zinc-200 leading-relaxed"
                                        style={{ borderLeft: `4px solid ${sInfo.color}` }}
                                    >
                                        <strong className="block text-[0.8rem] text-zinc-400 mb-1">Kutubxonachi javobi:</strong>
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
