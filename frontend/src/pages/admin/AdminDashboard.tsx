import { useState, useEffect } from 'react'
import { Users, BookOpen, UserCog, BarChart3, TrendingUp, ChevronLeft, ChevronRight, RefreshCcw, AlertTriangle, Calendar, Clock, ArrowRight } from 'lucide-react'
import { api } from '../../services/api'
import type { AdminDashboardResponse, Rental } from '../../services/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

// Oylar nomi o'zbek tilida
const MONTH_NAMES = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

const isOverdue = (rental: Rental): boolean => {
    if (rental.status === 'overdue') return true
    if (rental.status !== 'active') return false
    if (!rental.due_date) return false
    const due = new Date(rental.due_date)
    if (isNaN(due.getTime())) return false
    due.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due.getTime() < today.getTime()
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
}

const getOverdueDays = (dueDateStr?: string): number => {
    if (!dueDateStr) return 0
    const due = new Date(dueDateStr)
    if (isNaN(due.getTime())) return 0
    due.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = today.getTime() - due.getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [data, setData] = useState<AdminDashboardResponse['data'] | null>(null)
    const [loading, setLoading] = useState(true)
    const [overdueRentals, setOverdueRentals] = useState<Rental[]>([])
    const [overdueLoading, setOverdueLoading] = useState(true)

    const [currentDate, setCurrentDate] = useState(new Date())

    const fetchDashboard = async (year: number, month: number) => {
        try {
            setLoading(true)
            const res = await api.getAdminDashboard(year, month)
            if (res.success) {
                setData(res.data)
            }
        } catch (error: any) {
            toast.error(error.message || 'Ma\'lumotlarni yuklashda xatolik')
        } finally {
            setLoading(false)
        }
    }

    const fetchOverdue = async () => {
        try {
            setOverdueLoading(true)
            const res = await api.getRentals()
            if (res.success) {
                const overdue = res.data.filter(r => isOverdue(r))
                // Sort by most overdue first
                overdue.sort((a, b) => getOverdueDays(b.due_date) - getOverdueDays(a.due_date))
                setOverdueRentals(overdue)
            }
        } catch (err: any) {
            toast.error(err.message || 'Muddati o\'tgan ijaralarni yuklashda xatolik')
        } finally {
            setOverdueLoading(false)
        }
    }

    useEffect(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1
        fetchDashboard(year, month)
    }, [currentDate])

    useEffect(() => {
        fetchOverdue()
    }, [])

    const handlePrevMonth = () => {
        const d = new Date(currentDate)
        d.setMonth(d.getMonth() - 1)
        setCurrentDate(d)
    }

    const handleNextMonth = () => {
        const d = new Date(currentDate)
        d.setMonth(d.getMonth() + 1)
        setCurrentDate(d)
    }

    const displayMonthYear = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`

    const stats = [
        { label: 'Jami foydalanuvchilar', value: data?.total_users ?? 0, icon: <Users size={22} />, color: 'var(--stat-blue)' },
        { label: 'Jami kitoblar', value: data?.total_books ?? 0, icon: <BookOpen size={22} />, color: 'var(--stat-green)' },
        { label: "Oy davomidagi ijaralar", value: data?.active_rentals ?? 0, icon: <UserCog size={22} />, color: 'var(--stat-purple)' },
        { label: "Qarzdorliklar (Oy bo'yicha)", value: data?.overdue_rentals ?? 0, icon: <BarChart3 size={22} />, color: 'var(--stat-orange)' },
    ]

    return (
        <div className="animate-page-enter">
            <div className="flex items-center justify-between mb-7">
                <div>
                    <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Boshqaruv paneli</h1>
                    <p className="text-[0.9rem] text-text-muted">Tizim umumiy ko'rinishi</p>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={handlePrevMonth}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="font-medium text-[0.95rem] min-w-[120px] text-center">
                        {displayMonthYear}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <div className="w-px h-5 bg-border mx-1"></div>
                    <button
                        onClick={() => {
                            const year = currentDate.getFullYear()
                            const month = currentDate.getMonth() + 1
                            fetchDashboard(year, month)
                        }}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/15 transition-colors ${loading ? 'animate-spin' : ''}`}
                        title="Yangilash"
                    >
                        <RefreshCcw size={16} />
                    </button>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-4 p-5 bg-surface border border-border rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="flex flex-col">
                            {loading ? (
                                <div className="h-7 w-12 bg-surface-hover animate-pulse rounded mb-1"></div>
                            ) : (
                                <span className="text-[1.5rem] font-bold tracking-[-0.02em]">{stat.value}</span>
                            )}
                            <span className="text-[0.8rem] text-text-muted mt-0.5">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-[2fr_1fr] gap-5 max-lg:grid-cols-1 mb-5">

                {/* Left side: Charts */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden p-5 flex flex-col min-h-[450px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <BarChart3 size={18} />
                            Oylik faoliyat ko'rsatkichlari (Ijara va Tashriflar)
                        </h2>
                    </div>
                    <div className="flex-1 w-full relative">
                        {loading && (
                            <div className="absolute inset-0 bg-surface/50 z-10 flex items-center justify-center backdrop-blur-sm">
                                <RefreshCcw size={24} className="animate-spin text-primary" />
                            </div>
                        )}
                        {data?.chart_data && data.chart_data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.chart_data}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorControls" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => val.split('-')[2]}
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        interval={0}
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                        formatter={(val, name) => [val, name === 'count' ? 'Ijaralar' : 'Tashriflar']}
                                        labelFormatter={(label) => `Sana: ${label}`}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        height={36}
                                        wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                                        formatter={(value: string) => value === 'count' ? 'Ijaralar' : 'Tashriflar'}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="controls_count"
                                        name="controls_count"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorControls)"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="count"
                                        stroke="#06b6d4"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorCount)"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                                {loading ? "Yuklanmoqda..." : "Ushbu oy uchun ma'lumot topilmadi"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent activity */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col max-h-[480px]">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <TrendingUp size={18} />
                            Kunlik faoliyatlar
                        </h2>
                    </div>
                    <div className="py-2 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center text-text-muted animate-pulse">Yuklanmoqda...</div>
                        ) : data?.recent_activities && data.recent_activities.length > 0 ? (
                            data.recent_activities.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 py-3 px-5 transition-colors hover:bg-surface-hover/50">
                                    <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-primary-light flex items-center justify-center font-bold text-[0.8rem] shrink-0 border border-indigo-500/20">
                                        {item.user.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <strong className="block text-[0.85rem] font-semibold truncate" title={item.user}>{item.user}</strong>
                                        <span className="text-[0.8rem] text-text-muted truncate block" title={item.action}>{item.action}</span>
                                    </div>
                                    <span className="text-[0.75rem] font-medium px-3 py-1 bg-surface-hover rounded-full text-text-muted whitespace-nowrap border border-border shadow-sm">{item.time}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-text-muted text-[0.85rem]">Ushbu oy uchun faoliyat qayd etilmagan.</div>
                        )}
                    </div>
                </div>

            </div>

            {/* Overdue Rentals Panel */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                    <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                        <AlertTriangle size={18} className="text-red-400" />
                        Muddati o'tgan kitoblar
                        {!overdueLoading && overdueRentals.length > 0 && (
                            <span className="bg-red-500/15 text-red-400 border border-red-500/25 text-[0.75rem] font-bold px-2 py-0.5 rounded-full">
                                {overdueRentals.length}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => navigate('/admin/rentals')}
                        className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-primary hover:text-primary-hover transition-colors"
                    >
                        Barchasini ko'rish <ArrowRight size={14} />
                    </button>
                </div>

                {/* Content */}
                {overdueLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCcw size={28} className="animate-spin text-red-400/60" />
                    </div>
                ) : overdueRentals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                            <BookOpen size={26} className="text-emerald-400" />
                        </div>
                        <p className="font-semibold text-text">Hammasi joyida!</p>
                        <p className="text-[0.85rem] mt-1">Muddati o'tgan ijaralar yo'q.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-surface-hover/50">
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Foydalanuvchi</th>
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Kitob</th>
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider hidden md:table-cell">Olingan sana</th>
                                    <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Qaytarish muddati</th>
                                    <th className="text-center p-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Kechikish</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {overdueRentals.map((r) => {
                                    const days = getOverdueDays(r.due_date)
                                    const urgency = days >= 14 ? 'high' : days >= 7 ? 'med' : 'low'
                                    return (
                                        <tr key={r.id} className="hover:bg-surface-hover/40 transition-colors">
                                            {/* User */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center font-bold text-red-400 text-[0.8rem] shrink-0">
                                                        {r.user_full_name?.substring(0, 2).toUpperCase() || '??'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-text text-[0.88rem] truncate">{r.user_full_name}</p>
                                                        <p className="text-[0.75rem] text-text-muted capitalize">
                                                            {r.role === 'student' ? 'Talaba' : r.role === 'teacher' ? "O'qituvchi" : r.role === 'staff' ? 'Xodim' : r.role}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Book */}
                                            <td className="p-4">
                                                <p className="font-semibold text-text text-[0.88rem] line-clamp-1 max-w-[220px]">{r.book_title}</p>
                                                <p className="text-[0.75rem] text-text-muted truncate max-w-[220px]">{r.book_author}</p>
                                            </td>
                                            {/* Loan date */}
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5 text-text-muted text-[0.85rem]">
                                                    <Calendar size={13} />
                                                    {formatDate(r.loan_date)}
                                                </div>
                                            </td>
                                            {/* Due date */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5 text-red-400 font-medium text-[0.85rem]">
                                                    <Clock size={13} />
                                                    {formatDate(r.due_date)}
                                                </div>
                                            </td>
                                            {/* Days overdue */}
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${urgency === 'high'
                                                        ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                                        : urgency === 'med'
                                                            ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                                                            : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                                    }`}>
                                                    <AlertTriangle size={11} />
                                                    {days} kun
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
