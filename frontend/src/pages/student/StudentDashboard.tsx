import { BookOpen, Clock, CheckCircle, Library, Star } from 'lucide-react'

export default function StudentDashboard() {
    const stats = [
        { label: "O'qiyotgan kitoblar", value: '3', icon: <BookOpen size={22} />, colorClass: 'bg-blue-500/15 text-blue-500' },
        { label: 'Kutilayotgan', value: '1', icon: <Clock size={22} />, colorClass: 'bg-orange-500/15 text-orange-500' },
        { label: "O'qib bo'lganlar", value: '12', icon: <CheckCircle size={22} />, colorClass: 'bg-emerald-500/15 text-emerald-500' },
        { label: 'Mavjud kitoblar', value: '5,210', icon: <Library size={22} />, colorClass: 'bg-purple-500/15 text-purple-500' },
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
        <div className="animate-page-enter">
            <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Talaba paneli</h1>
                <p className="text-[0.9rem] text-text-muted">Xush kelibsiz! Kitoblar va so'rovlaringiz</p>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-4 p-5 bg-surface border border-border rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${stat.colorClass}`}>
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
                            O'qiyotgan kitoblar
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

                {/* Recommended books */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-4 px-5 border-b border-border">
                        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                            <Star size={18} />
                            Tavsiya etilgan kitoblar
                        </h2>
                    </div>
                    <div className="py-2 px-0">
                        {recommendedBooks.map((book, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 py-3 px-5 transition-colors hover:bg-indigo-500/5">
                                <div className="flex-1 min-w-0">
                                    <strong className="block text-[0.85rem] font-semibold truncate">{book.title}</strong>
                                    <span className="text-[0.8rem] text-text-muted truncate">{book.author}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="flex items-center gap-1 font-semibold text-[0.85rem] text-yellow-400">
                                        <Star size={13} fill="currentColor" />
                                        {book.rating}
                                    </span>
                                    <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-semibold whitespace-nowrap ${book.available ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
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
