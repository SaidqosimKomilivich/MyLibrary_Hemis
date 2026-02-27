import { useState, useEffect } from 'react'
import { Users, BookOpen, UserCog, BarChart3, TrendingUp, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react'
import { api } from '../../services/api'
import type { AdminDashboardResponse } from '../../services/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { toast } from 'react-toastify'

// Oylar nomi o'zbek tilida
const MONTH_NAMES = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

export default function AdminDashboard() {
    const [data, setData] = useState<AdminDashboardResponse['data'] | null>(null)
    const [loading, setLoading] = useState(true)

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

    useEffect(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1
        fetchDashboard(year, month)
    }, [currentDate])

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
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="font-medium text-[0.95rem] min-w-[120px] text-center">
                        {displayMonthYear}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
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
                                <div className="h-7 w-12 bg-slate-800 animate-pulse rounded mb-1"></div>
                            ) : (
                                <span className="text-[1.5rem] font-bold tracking-[-0.02em]">{stat.value}</span>
                            )}
                            <span className="text-[0.8rem] text-text-muted mt-0.5">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-[2fr_1fr] gap-5 max-lg:grid-cols-1">

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
                                <div key={i} className="flex items-center gap-3 py-3 px-5 transition-colors hover:bg-slate-800/50">
                                    <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-primary-light flex items-center justify-center font-bold text-[0.8rem] shrink-0 border border-indigo-500/20">
                                        {item.user.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <strong className="block text-[0.85rem] font-semibold truncate" title={item.user}>{item.user}</strong>
                                        <span className="text-[0.8rem] text-text-muted truncate block" title={item.action}>{item.action}</span>
                                    </div>
                                    <span className="text-[0.75rem] font-medium px-3 py-1 bg-slate-800/80 rounded-full text-slate-300 whitespace-nowrap border border-slate-700/80 shadow-sm">{item.time}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-text-muted text-[0.85rem]">Ushbu oy uchun faoliyat qayd etilmagan.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
