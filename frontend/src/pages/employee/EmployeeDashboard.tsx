import { BookCopy, Library, ClipboardList, UserCheck, TrendingUp, Clock } from 'lucide-react'

export default function EmployeeDashboard() {
    const stats = [
        { label: 'Bugun berilgan', value: '23', icon: <BookCopy size={22} />, color: 'var(--stat-blue)' },
        { label: 'Qaytarilgan', value: '15', icon: <ClipboardList size={22} />, color: 'var(--stat-green)' },
        { label: "Kutilayotgan so'rovlar", value: '8', icon: <Clock size={22} />, color: 'var(--stat-orange)' },
        { label: "Bugungi o'quvchilar", value: '42', icon: <UserCheck size={22} />, color: 'var(--stat-purple)' },
    ]

    const pendingReturns = [
        { student: 'Aliyev Sherzod', book: 'Oliy matematika', dueDate: '2026-02-18', status: 'normal' },
        { student: 'Yusupova Madina', book: 'Dasturlash asoslari', dueDate: '2026-02-15', status: 'overdue' },
        { student: 'Qodirov Anvar', book: 'Fizika', dueDate: '2026-02-20', status: 'normal' },
        { student: 'Juraeva Sevara', book: 'Ingliz tili grammatikasi', dueDate: '2026-02-14', status: 'overdue' },
        { student: 'Mirzaev Oybek', book: 'Algoritm va ma\'lumotlar tuzilmasi', dueDate: '2026-02-22', status: 'normal' },
    ]

    const popularBooks = [
        { title: 'Oliy matematika', author: 'Piskunov N.S.', count: 45 },
        { title: 'Dasturlash asoslari', author: 'Kernigan B.', count: 38 },
        { title: 'Fizika', author: 'Savyolov I.V.', count: 32 },
        { title: 'Ingliz tili', author: 'Murphy R.', count: 28 },
    ]

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Xodim paneli</h1>
                <p className="page-subtitle">Bugungi ish holati</p>
            </div>

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

            <div className="dashboard-grid-2">
                {/* Pending returns */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            <ClipboardList size={18} />
                            Qaytarish kutilayotganlar
                        </h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Talaba</th>
                                    <th>Kitob</th>
                                    <th>Muddat</th>
                                    <th>Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingReturns.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.student}</td>
                                        <td>{item.book}</td>
                                        <td>{item.dueDate}</td>
                                        <td>
                                            <span className={`badge badge--${item.status === 'overdue' ? 'danger' : 'success'}`}>
                                                {item.status === 'overdue' ? "Muddati o'tgan" : 'Normal'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Popular books */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            <TrendingUp size={18} />
                            Mashhur kitoblar
                        </h2>
                    </div>
                    <div className="popular-list">
                        {popularBooks.map((book, i) => (
                            <div key={i} className="popular-item">
                                <div className="popular-rank">{i + 1}</div>
                                <div className="popular-info">
                                    <strong>{book.title}</strong>
                                    <span>{book.author}</span>
                                </div>
                                <div className="popular-count">
                                    <Library size={14} />
                                    <span>{book.count} marta</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
