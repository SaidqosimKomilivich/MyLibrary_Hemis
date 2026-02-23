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
        <div className="animate-page-enter">
            <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">O'qituvchi paneli</h1>
                <p className="text-[0.9rem] text-text-muted">Kitoblar va so'rovlar holati</p>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-4 p-5 bg-surface border border-border rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
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

            <div className="grid grid-cols-[1fr_1fr] gap-5 max-lg:grid-cols-1">
                {/* My books */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <BookOpen size={18} />
                            Olgan kitoblarim
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Kitob</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Muallif</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Muddat</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myBooks.map((book, i) => (
                                    <tr key={i} className="transition-colors hover:bg-indigo-500/5 border-t border-border">
                                        <td className="py-3 px-4 text-[0.875rem]">{book.title}</td>
                                        <td className="py-3 px-4 text-[0.875rem]">{book.author}</td>
                                        <td className="py-3 px-4 text-[0.875rem]">{book.dueDate}</td>
                                        <td className="py-3 px-4 text-[0.875rem]">
                                            <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-semibold whitespace-nowrap ${book.status === 'due-soon' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-emerald-500/15 text-emerald-400'}`}>
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
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <Clock size={18} />
                            Kutilayotgan so'rovlar
                        </h2>
                    </div>
                    <div className="py-2">
                        {pendingRequests.map((req, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 py-3 px-5 transition-colors hover:bg-indigo-500/5">
                                <div className="flex-1 min-w-0">
                                    <strong className="block text-[0.85rem] font-semibold truncate">{req.title}</strong>
                                    <span className="block text-[0.8rem] text-text-muted mt-0.5">Yuborilgan: {req.date}</span>
                                </div>
                                <span className="inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-semibold whitespace-nowrap bg-yellow-500/15 text-yellow-500">
                                    {req.status}
                                </span>
                            </div>
                        ))}
                        {pendingRequests.length === 0 && (
                            <p className="py-8 text-center text-[0.9rem] text-text-muted m-0">Kutilayotgan so'rovlar yo'q</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
