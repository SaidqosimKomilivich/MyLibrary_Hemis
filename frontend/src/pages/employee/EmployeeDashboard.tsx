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
        <div className="animate-page-enter">
            <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Xodim paneli</h1>
                <p className="text-[0.9rem] text-text-muted">Bugungi ish holati</p>
            </div>

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

            <div className="grid grid-cols-[1fr_1fr] gap-5 max-lg:grid-cols-1">
                {/* Pending returns */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <ClipboardList size={18} />
                            Qaytarish kutilayotganlar
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Talaba</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Kitob</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Muddat</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-slate-900/40">Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingReturns.map((item, i) => (
                                    <tr key={i} className="transition-colors hover:bg-indigo-500/5 border-t border-border">
                                        <td className="py-3 px-4 text-[0.875rem]">{item.student}</td>
                                        <td className="py-3 px-4 text-[0.875rem]">{item.book}</td>
                                        <td className="py-3 px-4 text-[0.875rem]">{item.dueDate}</td>
                                        <td className="py-3 px-4 text-[0.875rem]">
                                            <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-semibold whitespace-nowrap ${item.status === 'overdue' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
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
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <TrendingUp size={18} />
                            Mashhur kitoblar
                        </h2>
                    </div>
                    <div className="py-2">
                        {popularBooks.map((book, i) => (
                            <div key={i} className="flex items-center gap-3.5 py-3 px-5 transition-colors hover:bg-indigo-500/5">
                                <div className="w-7 text-center font-bold text-[0.9rem] text-text-muted">{i + 1}</div>
                                <div className="flex-1">
                                    <strong className="block text-[0.85rem] font-semibold">{book.title}</strong>
                                    <span className="text-[0.8rem] text-text-muted">{book.author}</span>
                                </div>
                                <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-slate-900/50 border border-border text-[0.75rem] text-text-muted">
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
