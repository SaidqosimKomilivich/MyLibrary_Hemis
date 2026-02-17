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
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Boshqaruv paneli</h1>
                <p className="page-subtitle">Tizim umumiy ko'rinishi</p>
            </div>

            {/* Stats grid */}
            <div className="stats-grid">
                {stats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <div className="stat-icon" style={{ background: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="dashboard-grid-2">
                {/* Recent activity */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            <TrendingUp size={18} />
                            Oxirgi faoliyatlar
                        </h2>
                    </div>
                    <div className="activity-list">
                        {recentActivities.map((item, i) => (
                            <div key={i} className="activity-item">
                                <div className="activity-avatar">{item.user.charAt(0)}</div>
                                <div className="activity-info">
                                    <strong>{item.user}</strong>
                                    <span>{item.action}</span>
                                </div>
                                <span className="activity-time">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alerts */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            <AlertTriangle size={18} />
                            Ogohlantirishlar
                        </h2>
                    </div>
                    <div className="alerts-list">
                        <div className="alert-item alert-item--warning">
                            <span className="alert-dot" />
                            <div>
                                <strong>12 ta kitob muddati o'tgan</strong>
                                <p>Qaytarilmagan kitoblar ro'yxatini tekshiring</p>
                            </div>
                        </div>
                        <div className="alert-item alert-item--info">
                            <span className="alert-dot" />
                            <div>
                                <strong>5 ta yangi so'rov</strong>
                                <p>Kutilayotgan kitob so'rovlari bor</p>
                            </div>
                        </div>
                        <div className="alert-item alert-item--success">
                            <span className="alert-dot" />
                            <div>
                                <strong>Tizim yangilandi</strong>
                                <p>Barcha modullar muvaffaqiyatli yangilandi</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
