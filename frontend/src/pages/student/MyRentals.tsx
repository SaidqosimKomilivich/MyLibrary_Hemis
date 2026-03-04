import { useState, useEffect } from 'react'
import { api, type Rental } from '../../services/api'
import { BookOpen, Clock, Calendar, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'

export default function MyRentals() {
    const [rentals, setRentals] = useState<Rental[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchRentals()
    }, [])

    const fetchRentals = async () => {
        try {
            const res = await api.getMyRentals()
            if (res.success) {
                setRentals(res.data)
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Ijaralarni yuklashda xatolik")
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        const d = new Date(dateStr)
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const year = d.getFullYear()
        return `${day}.${month}.${year}`
    }

    const calculateDaysLeft = (dueDateStr: string): number => {
        const due = new Date(dueDateStr)
        due.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const diffTime = due.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    return (
        <div className="animate-page-enter">
            <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Mening ijaralarim</h1>
                {/* <p className="text-[0.9rem] text-text-muted">Sizning barcha joriy va qaytarilgan ijaralaringiz ro'yxati</p> */}
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={40} className="text-emerald-500 animate-spin opacity-80" />
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    {rentals.length === 0 ? (
                        <div className="text-center py-10 bg-surface-hover/50 rounded-xl border border-dashed border-border">
                            <BookOpen size={40} className="mx-auto mb-3 opacity-20 text-current" />
                            <p className="text-text-muted">Hech qanday ijara tarixi topilmadi.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {rentals.map((r) => {
                                const daysLeft = calculateDaysLeft(r.due_date)
                                const isOverdue = r.status === 'overdue' || (r.status === 'active' && daysLeft < 0)
                                const isReturned = r.status === 'returned'
                                const isWarning = !isOverdue && !isReturned && daysLeft <= 3

                                // Card color theme based on status
                                const cardCls = isOverdue
                                    ? 'bg-red-500/5 border-red-500/25 shadow-[0_4px_24px_-8px_rgba(239,68,68,0.18)]'
                                    : isWarning
                                        ? 'bg-amber-500/5 border-amber-500/25 shadow-[0_4px_24px_-8px_rgba(245,158,11,0.15)]'
                                        : isReturned
                                            ? 'bg-emerald-500/5 border-emerald-500/20'
                                            : 'bg-surface-hover/50 border-border hover:border-blue-400/30'

                                // Accent left strip color
                                const accentCls = isOverdue
                                    ? 'bg-red-500'
                                    : isWarning
                                        ? 'bg-amber-400'
                                        : isReturned
                                            ? 'bg-emerald-500'
                                            : 'bg-primary'

                                return (
                                    <div key={r.id} className={`relative flex flex-col p-5 rounded-2xl border transition-all overflow-hidden ${cardCls}`}>
                                        {/* Left accent strip */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentCls}`} />

                                        <div className="flex-1 min-w-0 mb-4 pl-2">
                                            <div className="flex justify-between items-start gap-3 mb-2">
                                                <h3 className="text-[1.1rem] font-bold text-text leading-tight">{r.book_title}</h3>
                                                {isReturned ? (
                                                    <span title="Qaytarilgan"><CheckCircle size={20} className="text-emerald-500 shrink-0" /></span>
                                                ) : isOverdue ? (
                                                    <span title="Muddati o'tgan"><AlertTriangle size={20} className="text-red-500 shrink-0" /></span>
                                                ) : isWarning ? (
                                                    <span title="Muddati yaqinlashmoqda"><Clock size={20} className="text-amber-400 shrink-0" /></span>
                                                ) : (
                                                    <span title="Joriy ijara"><BookOpen size={20} className="text-blue-400 shrink-0" /></span>
                                                )}
                                            </div>
                                            <p className="text-[0.85rem] text-text-muted">{r.book_author}</p>
                                        </div>

                                        <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border/60 pl-2">
                                            <div className="flex justify-between items-center text-[0.85rem]">
                                                <span className="text-text-muted flex items-center gap-1.5"><Calendar size={14} /> Berildi:</span>
                                                <span className="font-medium text-text">{formatDate(r.loan_date)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[0.85rem]">
                                                <span className="text-text-muted flex items-center gap-1.5"><Clock size={14} /> Qaytarish:</span>
                                                <span className={`font-medium ${isOverdue ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-text'}`}>
                                                    {formatDate(r.due_date)}
                                                </span>
                                            </div>
                                            {isReturned && (
                                                <div className="flex justify-between items-center text-[0.85rem]">
                                                    <span className="text-text-muted flex items-center gap-1.5"><CheckCircle size={14} /> Qaytardi:</span>
                                                    <span className="font-medium text-emerald-400">{formatDate(r.return_date)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {!isReturned && (() => {
                                            if (isOverdue) return (
                                                <div className="mt-4 pt-3 border-t border-red-500/20 flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 rounded-xl">
                                                    <AlertTriangle size={15} className="text-red-400 shrink-0" />
                                                    <span className="text-[0.85rem] font-bold text-red-400">Muddati o'tgan — {Math.abs(daysLeft)} kun</span>
                                                </div>
                                            )
                                            if (isWarning) return (
                                                <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/10 rounded-xl">
                                                    <Clock size={15} className="text-amber-400 shrink-0" />
                                                    <span className="text-[0.85rem] font-bold text-amber-400">Qaytarishga {daysLeft} kun qoldi</span>
                                                </div>
                                            )
                                            return (
                                                <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500/10 rounded-xl">
                                                    <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                                                    <span className="text-[0.85rem] font-bold text-emerald-400">Qaytarishga {daysLeft} kun qoldi</span>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
