import { Users, BookOpen, UserCog, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react'

export default function AdminDashboard() {
    const stats = [
        { label: 'Jami foydalanuvchilar', value: '1,245', icon: <Users size={22} />, color: 'var(--stat-blue)' },
        { label: 'Jami kitoblar', value: '8,432', icon: <BookOpen size={22} />, color: 'var(--stat-green)' },
        { label: 'Faol xodimlar', value: '18', icon: <UserCog size={22} />, color: 'var(--stat-purple)' },
        { label: "Bugungi so'rovlar", value: '34', icon: <BarChart3 size={22} />, color: 'var(--stat-orange)' },
    ]

    const recentActivities = [
        { user: 'Azimov Jasur', action: '"Matematika asoslari" kitobini oldi', time: '5 daqiqa oldin' },
        { user: 'Karimova Nilufar', action: '"Fizika" kitobini qaytardi', time: '12 daqiqa oldin' },
        { user: 'Toshmatov Sardor', action: "Yangi foydalanuvchi ro'yxatdan o'tdi", time: '30 daqiqa oldin' },
        { user: 'Rahimova Dilfuza', action: '"Ingliz tili" kitobiga so\'rov berdi', time: '1 soat oldin' },
        { user: 'Xolmatov Bekzod', action: '"Kimyo" kitobini oldi', time: '2 soat oldin' },
    ]

    return (
        <div className="animate-page-enter">
            <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Boshqaruv paneli</h1>
                <p className="text-[0.9rem] text-text-muted">Tizim umumiy ko'rinishi</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-4 p-5 bg-surface border border-border rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[1.5rem] font-bold tracking-[-0.02em]">{stat.value}</span>
                            <span className="text-[0.8rem] text-text-muted mt-0.5">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-[1fr_1fr] gap-5 max-lg:grid-cols-1">
                {/* Recent activity */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <TrendingUp size={18} />
                            Oxirgi faoliyatlar
                        </h2>
                    </div>
                    <div className="py-2">
                        {recentActivities.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 py-3 px-5 transition-colors hover:bg-indigo-500/5">
                                <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-primary-light flex items-center justify-center font-bold text-[0.8rem] shrink-0">{item.user.charAt(0)}</div>
                                <div className="flex-1 min-w-0">
                                    <strong className="block text-[0.85rem] font-semibold">{item.user}</strong>
                                    <span className="text-[0.8rem] text-text-muted">{item.action}</span>
                                </div>
                                <span className="text-[0.75rem] text-text-muted whitespace-nowrap">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alerts */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <AlertTriangle size={18} />
                            Ogohlantirishlar
                        </h2>
                    </div>
                    <div className="flex flex-col gap-3 py-3 px-5">
                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-border">
                            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                            <div>
                                <strong className="block text-[0.85rem] font-semibold mb-0.5">12 ta kitob muddati o'tgan</strong>
                                <p className="text-[0.8rem] text-text-muted">Qaytarilmagan kitoblar ro'yxatini tekshiring</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-border">
                            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
                            <div>
                                <strong className="block text-[0.85rem] font-semibold mb-0.5">5 ta yangi so'rov</strong>
                                <p className="text-[0.8rem] text-text-muted">Kutilayotgan kitob so'rovlari bor</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-border">
                            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                            <div>
                                <strong className="block text-[0.85rem] font-semibold mb-0.5">Tizim yangilandi</strong>
                                <p className="text-[0.8rem] text-text-muted">Barcha modullar muvaffaqiyatli yangilandi</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
