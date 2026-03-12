import { useState, useEffect } from 'react'
import { BookCopy, Library, ClipboardList, UserCheck, TrendingUp, Clock, Loader2 } from 'lucide-react'
import { api, type EmployeeDashboardResponse } from '../../services/api'
import { getFileUrl } from '../../utils/fileUrl'
import { formatDate } from '../../utils/dateUtils'
import { toast } from 'react-toastify'

export default function EmployeeDashboard() {
    const [dashboardData, setDashboardData] = useState<EmployeeDashboardResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.getEmployeeDashboard()
                if (res.success) {
                    setDashboardData(res.data)
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            catch (err: any) {
                toast.error(err.message || "Ma'lumotlarni yuklashda xatolik yuz berdi")
            } finally {
                setIsLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    const stats = [
        { label: 'Bugun berilgan', value: dashboardData?.today_rented || 0, icon: <BookCopy size={22} />, color: 'var(--stat-blue)' },
        { label: 'Qaytarilgan', value: dashboardData?.today_returned || 0, icon: <ClipboardList size={22} />, color: 'var(--stat-green)' },
        { label: "Kutilayotgan so'rovlar", value: dashboardData?.pending_requests || 0, icon: <Clock size={22} />, color: 'var(--stat-orange)' },
        { label: "Bugungi o'quvchilar", value: dashboardData?.today_visitors || 0, icon: <UserCheck size={22} />, color: 'var(--stat-purple)' },
    ]

    if (isLoading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 size={48} className="text-emerald-400 opacity-80 animate-spin" />
            </div>
        )
    }

    return (
        <div className="animate-page-enter">
            {/* <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Xodim paneli</h1>
                <p className="text-[0.9rem] text-text-muted">Bugungi ish holati</p>
            </div> */}

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
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50">Talaba</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50">Kitob</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50">Muddat</th>
                                    <th className="py-2.5 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50">Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData?.pending_returns && dashboardData.pending_returns.length > 0 ? (
                                    dashboardData.pending_returns.map((item, i) => (
                                        <tr key={i} className="transition-colors hover:bg-surface-hover/50 border-t border-border">
                                            <td className="py-3 px-4 text-[0.875rem]">{item.student}</td>
                                            <td className="py-3 px-4 text-[0.875rem]">{item.book}</td>
                                            <td className="py-3 px-4 text-[0.875rem]">{formatDate(item.due_date)}</td>
                                            <td className="py-3 px-4 text-[0.875rem]">
                                                {(() => {
                                                    const [yyyy, mm, dd] = item.due_date.split('-');
                                                    const due = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                                    let colorClass = 'bg-emerald-500/15 text-emerald-400';
                                                    let text = 'Normal';

                                                    if (item.status === 'overdue' || diffDays <= 0) {
                                                        colorClass = 'bg-red-500/15 text-red-400';
                                                        text = "Muddati o'tgan";
                                                    } else if (diffDays <= 3) {
                                                        colorClass = 'bg-yellow-500/15 text-yellow-400';
                                                        text = 'Yaqinlashdi';
                                                    }

                                                    return (
                                                        <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-semibold whitespace-nowrap ${colorClass}`}>
                                                            {text}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-text-muted">
                                            Qaytarish kutilayotgan kitoblar yo'q
                                        </td>
                                    </tr>
                                )}
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
                        {dashboardData?.popular_books && dashboardData.popular_books.length > 0 ? (
                            dashboardData.popular_books.map((book, i) => (
                                <div key={i} className="flex items-center gap-3.5 py-3 px-5 transition-colors hover:bg-surface-hover/50">
                                    <div className="w-10 h-14 bg-surface rounded flex items-center justify-center overflow-hidden shrink-0 border border-border">
                                        {book.cover_image ? (
                                            <img src={getFileUrl(book.cover_image)} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full text-center font-bold text-[0.8rem] text-text-muted">{i + 1}</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <strong className="block text-[0.85rem] font-semibold truncate">{book.title}</strong>
                                        <span className="text-[0.8rem] text-text-muted truncate block">{book.author}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-surface-hover border border-border text-[0.75rem] text-text-muted">
                                        <Library size={14} />
                                        <span>{book.count} marta</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-6 text-center text-[0.9rem] text-text-muted">
                                Mashhur kitoblar ro'yxati hozircha bo'sh
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
