import { useState, useEffect, useMemo } from 'react'
import { api, type Rental } from '../../services/api'
import { Search, Loader2, BookOpen, Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'

type FilterType = 'all' | 'returned' | 'active' | 'due_soon' | 'overdue'

export default function EmployeeRentalsPage() {
    const [rentals, setRentals] = useState<Rental[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<FilterType>('all')

    const fetchRentals = async () => {
        setIsLoading(true)
        try {
            const res = await api.getRentals() // barchasini olamiz
            if (res.success) {
                setRentals(res.data)
            }
        } catch (err: any) {
            toast.error(err.message || "Ijaralarni yuklashda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRentals()
    }, [])

    const isDueSoon = (dueDateStr: string): boolean => {
        const due = new Date(dueDateStr)
        due.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const diffTime = due.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return diffDays >= 0 && diffDays <= 3
    }

    // Front-end filtering since backend filter only supports basic states 
    // and we need "due_soon" logic logic here.
    const filteredRentals = useMemo(() => {
        return rentals.filter(r => {
            // Search logic
            const matchSearch =
                (r.book_title?.toLowerCase().includes(search.toLowerCase())) ||
                (r.user_full_name?.toLowerCase().includes(search.toLowerCase()))

            if (!matchSearch) return false;

            // Filter logic
            if (filter === 'all') return true;
            if (filter === 'returned') return r.status === 'returned';
            if (filter === 'overdue') return r.status === 'overdue';
            if (filter === 'active') return r.status === 'active';
            if (filter === 'due_soon') return r.status === 'active' && isDueSoon(r.due_date);

            return true;
        })
    }, [rentals, search, filter])

    const getStatusStyle = (rental: Rental) => {
        if (rental.status === 'returned') {
            return { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', icon: <CheckCircle size={16} />, label: 'Topshirgan' }
        }
        if (rental.status === 'overdue') {
            return { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', icon: <XCircle size={16} />, label: "Muddati o'tgan" }
        }
        if (rental.status === 'lost') {
            return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <AlertTriangle size={16} />, label: "Yo'qotilgan" }
        }

        // Active handling (check if due soon)
        if (isDueSoon(rental.due_date)) {
            return { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', icon: <Clock size={16} />, label: "Muddati kelgan" }
        }

        return { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', icon: <BookOpen size={16} />, label: "Topshirmagan (Ijarada)" }
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const getInitials = (name?: string) => {
        if (!name) return '?'
        return name.substring(0, 2).toUpperCase()
    }

    return (
        <div className="p-8 md:p-10 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex gap-3 mb-6 overflow-x-auto pb-3">
                <button className={`px-6 py-3 rounded-xl border font-semibold text-[0.95rem] whitespace-nowrap transition-all ${filter === 'all' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-white/5 text-text-muted hover:bg-slate-700/80 hover:text-slate-200'}`} onClick={() => setFilter('all')}>
                    Barcha ijara qilinganlar
                </button>
                <button className={`px-6 py-3 rounded-xl border font-semibold text-[0.95rem] whitespace-nowrap transition-all ${filter === 'active' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-white/5 text-text-muted hover:bg-slate-700/80 hover:text-slate-200'}`} onClick={() => setFilter('active')}>
                    Topshirmagan (Ijarada)
                </button>
                <button className={`px-6 py-3 rounded-xl border font-semibold text-[0.95rem] whitespace-nowrap transition-all ${filter === 'due_soon' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-white/5 text-text-muted hover:bg-slate-700/80 hover:text-slate-200'}`} onClick={() => setFilter('due_soon')}>
                    Muddati kelgan (Qaytarish vaqti)
                </button>
                <button className={`px-6 py-3 rounded-xl border font-semibold text-[0.95rem] whitespace-nowrap transition-all ${filter === 'overdue' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-white/5 text-text-muted hover:bg-slate-700/80 hover:text-slate-200'}`} onClick={() => setFilter('overdue')}>
                    Muddati o'tgan
                </button>
                <button className={`px-6 py-3 rounded-xl border font-semibold text-[0.95rem] whitespace-nowrap transition-all ${filter === 'returned' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-white/5 text-text-muted hover:bg-slate-700/80 hover:text-slate-200'}`} onClick={() => setFilter('returned')}>
                    Topshirgan (Arxiv)
                </button>
            </div>

            <div className="relative mb-8 max-w-[600px]">
                <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    placeholder="Talaba ismi yoki kitob qidirish..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 py-[18px] pr-5 pl-14 rounded-2xl text-slate-100 text-[1.05rem] transition-all focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/15 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] backdrop-blur-md"
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-24">
                    <Loader2 size={48} className="text-emerald-400 opacity-80 animate-spin" />
                </div>
            ) : filteredRentals.length === 0 ? (
                <div className="text-center py-24 text-text-muted bg-slate-800/30 rounded-3xl border border-dashed border-white/10">
                    <BookOpen size={64} className="opacity-20 mx-auto mb-5 text-current" />
                    <h2 className="text-slate-100 m-0 mb-2">Ma'lumot topilmadi</h2>
                    <p className="m-0">Belgilangan holat yoki qidiruv so'ziga mos ijaralar yo'q.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredRentals.map((r) => {
                        const style = getStatusStyle(r);
                        return (
                            <div key={r.id} className="bg-linear-to-br from-slate-800/60 to-slate-900/60 border border-white/5 rounded-3xl p-6 transition-all duration-300 relative flex flex-col shadow-lg overflow-hidden hover:-translate-y-1.5 hover:border-emerald-400/30 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]">
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: style.color }}></div>

                                <div className="flex items-center gap-4 mb-6 mt-2">
                                    <div className="w-[52px] h-[52px] rounded-2xl bg-linear-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-[1.2rem]">
                                        {getInitials(r.user_full_name || '')}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="m-0 text-[1.2rem] text-slate-50 font-bold tracking-tight flex items-center gap-2">
                                            {r.user_full_name}
                                            <span className="text-[0.75rem] font-normal text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                                                {r.role === 'student' ? 'Talaba' : r.role === 'employee' ? 'Xodim' : r.role === 'teacher' ? 'O\'qituvchi' : r.role}
                                            </span>
                                        </h3>
                                        <p className="m-0 mt-1.5 text-[0.9rem] text-text-muted font-mono">Ijara raqami: #{r.id.split('-')[0]}</p>
                                    </div>
                                </div>

                                <div className="bg-black/25 border border-white/5 rounded-2xl p-5 mb-6 flex-1">
                                    <h4 className="text-[1.15rem] font-bold text-white m-0 mb-2 leading-snug">{r.book_title}</h4>
                                    <p className="text-[0.9rem] text-text-muted m-0">{r.book_author}</p>
                                </div>

                                <div className="flex gap-3 mb-6">
                                    <div className="flex-1 bg-white/5 border border-white/5 p-3 rounded-xl">
                                        <div className="text-[0.8rem] text-slate-500 uppercase tracking-wide font-semibold mb-1">Berilgan sana</div>
                                        <div className="text-[0.95rem] text-slate-200 font-medium flex items-center gap-1.5"><Calendar size={14} className="text-text-muted" /> {formatDate(r.loan_date)}</div>
                                    </div>
                                    <div className={`flex-1 border p-3 rounded-xl ${isDueSoon(r.due_date) && r.status === 'active' ? 'bg-amber-500/5 border-amber-500/10' : r.status === 'overdue' ? 'bg-red-500/5 border-red-500/10' : 'bg-white/5 border-white/5'}`}>
                                        <div className={`text-[0.8rem] uppercase tracking-wide font-semibold mb-1 ${r.status === 'overdue' ? 'text-red-400' : 'text-slate-500'}`}>Qaytarish muddati</div>
                                        <div className={`text-[0.95rem] font-medium flex items-center gap-1.5 ${r.status === 'overdue' ? 'text-red-300' : 'text-slate-200'}`}><Clock size={14} className={r.status === 'overdue' ? 'text-red-400' : 'text-text-muted'} /> {formatDate(r.due_date)}</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.9rem] font-semibold tracking-wide border" style={{ background: style.bg, color: style.color, borderColor: `${style.color}30` }}>
                                        {style.icon} {style.label}
                                    </div>

                                    {r.return_date && r.status === 'returned' && (
                                        <div className="text-[0.85rem] text-text-muted flex items-center gap-1.5">
                                            <CheckCircle size={14} className="text-emerald-400" />
                                            Qaytardi: {formatDate(r.return_date)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
