import { BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function TeacherDashboard() {
    const stats = [
        { label: "O'qiyotgan kitoblar", value: '7', icon: <BookOpen size={22} />, color: 'var(--stat-blue)' },
        { label: 'Kutilayotgan', value: '2', icon: <Clock size={22} />, color: 'var(--stat-orange)' },
        { label: 'Tasdiqlangan', value: '5', icon: <CheckCircle size={22} />, color: 'var(--stat-green)' },
        { label: "Muddati yaqin", value: '1', icon: <AlertCircle size={22} />, color: 'var(--stat-red)' },
    ]

    const myBooks = [
        { title: 'Pedagogika asoslari', author: 'Munavvarov A.Q.', takenDate: '2026-01-15', dueDate: '2026-02-28', status: 'active' },
        { title: 'Psixologiya', author: "Nishonova Z.T.", takenDate: '2026-01-20', dueDate: '2026-02-20', status: 'due-soon' },
        { title: "Ta'lim texnologiyalari", author: 'Yuldashev J.G.', takenDate: '2026-02-01', dueDate: '2026-03-01', status: 'active' },
        { title: 'Didaktika', author: 'Tolipov O.Q.', takenDate: '2026-02-05', dueDate: '2026-03-05', status: 'active' },
    ]

    const pendingRequests = [
        { title: "Oliy matematika metodikasi", status: "Kutilmoqda", date: '2026-02-14' },
        { title: "Informatika o'qitish metodikasi", status: "Ko'rib chiqilmoqda", date: '2026-02-15' },
    ]

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">O'qituvchi paneli</h1>
                <p className="page-subtitle">Kitoblar va so'rovlar holati</p>
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
                {/* My books */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            <BookOpen size={18} />
                            Olgan kitoblarim
                        </h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Kitob</th>
                                    <th>Muallif</th>
                                    <th>Muddat</th>
                                    <th>Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myBooks.map((book, i) => (
                                    <tr key={i}>
                                        <td>{book.title}</td>
                                        <td>{book.author}</td>
                                        <td>{book.dueDate}</td>
                                        <td>
                                            <span className={`badge badge--${book.status === 'due-soon' ? 'warning' : 'success'}`}>
                                                {book.status === 'due-soon' ? 'Muddati yaqin' : 'Faol'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending requests */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            <Clock size={18} />
                            Kutilayotgan so'rovlar
                        </h2>
                    </div>
                    <div className="requests-list">
                        {pendingRequests.map((req, i) => (
                            <div key={i} className="request-item">
                                <div className="request-info">
                                    <strong>{req.title}</strong>
                                    <span>Yuborilgan: {req.date}</span>
                                </div>
                                <span className="badge badge--warning">{req.status}</span>
                            </div>
                        ))}
                        {pendingRequests.length === 0 && (
                            <p className="empty-text">Kutilayotgan so'rovlar yo'q</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
