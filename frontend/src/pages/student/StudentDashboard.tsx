import { BookOpen, Clock, CheckCircle, Library, Star } from 'lucide-react'

export default function StudentDashboard() {
    const stats = [
        { label: "O'qiyotgan kitoblar", value: '3', icon: <BookOpen size={22} />, color: 'var(--stat-blue)' },
        { label: 'Kutilayotgan', value: '1', icon: <Clock size={22} />, color: 'var(--stat-orange)' },
        { label: "O'qib bo'lganlar", value: '12', icon: <CheckCircle size={22} />, color: 'var(--stat-green)' },
        { label: 'Mavjud kitoblar', value: '5,210', icon: <Library size={22} />, color: 'var(--stat-purple)' },
    ]

    const myBooks = [
        { title: 'Chiziqli algebra', author: "Qo'shjonov A.", takenDate: '2026-02-01', dueDate: '2026-02-28', status: 'active' },
        { title: 'C++ dasturlash', author: 'Stroustrup B.', takenDate: '2026-02-05', dueDate: '2026-03-05', status: 'active' },
        { title: "Ma'lumotlar bazasi", author: 'Date C.J.', takenDate: '2026-01-10', dueDate: '2026-02-17', status: 'due-soon' },
    ]

    const recommendedBooks = [
        { title: 'Algoritmlar', author: 'Kormen T.', rating: 4.8, available: true },
        { title: 'Kompyuter tarmoqlari', author: 'Tanenbaum A.', rating: 4.6, available: true },
        { title: "Operatsion tizimlar", author: 'Stallings W.', rating: 4.5, available: false },
        { title: "Sun'iy intellekt", author: 'Russell S.', rating: 4.9, available: true },
    ]

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Talaba paneli</h1>
                <p className="page-subtitle">Xush kelibsiz! Kitoblar va so'rovlaringiz</p>
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
                            O'qiyotgan kitoblar
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

                {/* Recommended books */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            <Star size={18} />
                            Tavsiya etilgan kitoblar
                        </h2>
                    </div>
                    <div className="recommended-list">
                        {recommendedBooks.map((book, i) => (
                            <div key={i} className="recommended-item">
                                <div className="recommended-info">
                                    <strong>{book.title}</strong>
                                    <span>{book.author}</span>
                                </div>
                                <div className="recommended-meta">
                                    <span className="recommended-rating">
                                        <Star size={13} fill="currentColor" />
                                        {book.rating}
                                    </span>
                                    <span className={`badge badge--${book.available ? 'success' : 'danger'}`}>
                                        {book.available ? 'Mavjud' : 'Band'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
