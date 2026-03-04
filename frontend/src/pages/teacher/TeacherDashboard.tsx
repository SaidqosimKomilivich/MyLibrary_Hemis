import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, type MyDashboardResponse, type Rental, type Book } from '../../services/api'
import { BookOpen, Clock, CheckCircle, Library, Star, AlertTriangle, Loader2, Calendar, ArrowRight } from 'lucide-react'
import { toast } from 'react-toastify'

export default function TeacherDashboard() {
    const [dashboardData, setDashboardData] = useState<MyDashboardResponse['data'] | null>(null)
    const [myRentals, setMyRentals] = useState<Rental[]>([])
    const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([])
    const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchDashboardAndRentals()
    }, [])

    const fetchDashboardAndRentals = async () => {
        try {
            const [dashRes, rentalsRes, booksRes, submissionsRes] = await Promise.all([
                api.getMyDashboard(),
                api.getMyRentals(),
                api.getBooks({ limit: 5 }),
                api.getMySubmissions()
            ])
            if (dashRes.success) setDashboardData(dashRes.data)
            if (rentalsRes.success) {
                // Show active and overdue rentals
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setMyRentals(rentalsRes.data.filter((r: any) => r.status === 'active' || r.status === 'overdue'))
            }
            if (booksRes.success) {
                setRecommendedBooks(booksRes.data.slice(0, 5))
            }
            if (submissionsRes.success) {
                // Submitted books waiting for admin approval (is_active !== true)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pendingSubs = submissionsRes.data.filter((b: any) => !b.is_active)
                setPendingSubmissionsCount(pendingSubs.length)
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Ma'lumotlarni yuklashda xatolik")
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        const d = new Date(dateStr)
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const year = d.getFullYear()
        return `${day}.${month}.${year}`
    }

    const calculateDaysLeft = (dueDateStr: string): number => {
        if (!dueDateStr) return 0
        const due = new Date(dueDateStr)
        due.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const diffTime = due.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const totalPending = dashboardData ? dashboardData.pending_requests + pendingSubmissionsCount : 0

    const stats = dashboardData ? [
        { label: "O'qiyotgan kitoblarim", value: dashboardData.active_rentals.toString(), icon: <BookOpen size={22} />, colorClass: 'bg-blue-500/15 text-blue-500' },
        { label: 'Muddatidan o\'tganlar', value: dashboardData.overdue_rentals > 0 ? dashboardData.overdue_rentals.toString() : '0 - Qarzingiz yo\'q', icon: dashboardData.overdue_rentals > 0 ? <AlertTriangle size={22} /> : <CheckCircle size={22} />, colorClass: dashboardData.overdue_rentals > 0 ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500' },
        { label: "Jami o'qilgan kitoblar", value: dashboardData.total_read.toString(), icon: <Library size={22} />, colorClass: 'bg-emerald-500/15 text-emerald-500' },
        { label: "Kutilayotgan so'rovlar", value: totalPending.toString(), icon: <Clock size={22} />, colorClass: 'bg-amber-500/15 text-amber-500' },
    ] : []

    return (
        <div className="animate-page-enter">
            {/* <div className="mb-7">
                <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">O'qituvchi paneli</h1>
                <p className="text-[0.9rem] text-text-muted">Kitoblar va so'rovlar holati</p>
            </div> */}

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={40} className="text-emerald-500 animate-spin opacity-80" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 mb-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="flex items-center gap-4 p-5 bg-surface border border-border rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${stat.colorClass}`}>
                                    {stat.icon}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-[1.5rem] font-bold tracking-[-0.02em] ${stat.label === 'Muddatidan o\'tganlar' && dashboardData?.overdue_rentals === 0 ? 'text-[1.1rem] text-emerald-500' : ''}`}>
                                        {stat.value}
                                    </span>
                                    <span className="text-[0.8rem] text-text-muted mt-0.5">{stat.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-[1fr_350px] gap-5 max-xl:grid-cols-1">
                        <div className="flex flex-col gap-5">
                            {/* My books (Active Rentals) */}
                            <div className="bg-surface border border-border rounded-xl overflow-hidden p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="flex items-center gap-2 text-[1.1rem] font-bold text-text">
                                        <BookOpen size={20} className="text-blue-400" />
                                        Hozirgi ijaralarim
                                    </h2>
                                </div>

                                {myRentals.length === 0 ? (
                                    <div className="text-center py-10 bg-surface-hover/50 rounded-xl border border-dashed border-border">
                                        <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                                        <p className="text-text-muted">Ayni paytda qo'lingizda kitob yo'q. Kutubxonadan kitob oling!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {myRentals.slice(0, 2).map((r) => {
                                            const daysLeft = calculateDaysLeft(r.due_date)
                                            const isOverdue = r.status === 'overdue' || daysLeft < 0

                                            return (
                                                <div key={r.id} className={`flex max-md:flex-col gap-4 p-5 rounded-2xl border transition-all ${isOverdue ? 'bg-red-500/5 border-red-500/20 shadow-[0_4px_20px_-10px_rgba(239,68,68,0.1)]' : 'bg-surface-hover border-border hover:border-blue-500/30'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-[1.1rem] font-bold text-text mb-1 truncate">{r.book_title}</h3>
                                                        <p className="text-[0.85rem] text-text-muted mb-4 truncate">{r.book_author}</p>

                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[0.7rem] uppercase tracking-wider text-text-muted font-semibold mb-0.5">Berilgan sana</span>
                                                                <span className="text-[0.85rem] font-medium flex items-center gap-1.5"><Calendar size={12} className="opacity-50" /> {formatDate(r.loan_date)}</span>
                                                            </div>
                                                            <div className="w-px h-8 bg-border hidden sm:block"></div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-[0.7rem] uppercase tracking-wider font-semibold mb-0.5 ${isOverdue ? 'text-red-400' : 'text-text-muted'}`}>Qaytarish muddati</span>
                                                                <span className={`text-[0.85rem] font-medium flex items-center gap-1.5 ${isOverdue ? 'text-red-400' : ''}`}><Clock size={12} className="opacity-50" /> {formatDate(r.due_date)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 flex items-center justify-center min-w-[140px]">
                                                        {isOverdue ? (
                                                            <div className="flex flex-col items-center justify-center w-full bg-red-500/10 border border-red-500/20 rounded-xl py-3 px-4">
                                                                <AlertTriangle size={20} className="text-red-400 mb-1" />
                                                                <span className="text-[0.85rem] font-bold text-red-400 text-center">Muddati o'tgan<br />{Math.abs(daysLeft)} kun</span>
                                                            </div>
                                                        ) : (
                                                            <div className={`flex flex-col items-center justify-center w-full border rounded-xl py-3 px-4 ${daysLeft <= 2 ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                                                <Clock size={20} className="mb-1" />
                                                                <span className="text-[0.85rem] font-bold text-center">Qaytarishga<br />{daysLeft} kun qoldi</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {myRentals.length > 2 && (
                                            <div className="mt-2 flex justify-end">
                                                <Link to="/teacher/rentals" className="inline-flex items-center gap-2 text-[0.85rem] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                                                    Batafsil ko'rish
                                                    <ArrowRight size={16} />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Personal Timeline Log */}
                            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                                <h2 className="flex items-center gap-2 text-[1.1rem] font-bold mb-6 text-text">
                                    <Clock size={20} className="text-emerald-400" />
                                    Mening oxirgi harakatlarim
                                </h2>

                                <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-border">
                                    {dashboardData?.recent_activities?.length === 0 ? (
                                        <p className="text-[0.9rem] text-text-muted">Harakatlar tarixi bo'sh.</p>
                                    ) : dashboardData?.recent_activities.map((act, i) => (
                                        <div key={act.id + i} className="relative">
                                            <div className="absolute -left-[30px] top-1 w-[12px] h-[12px] rounded-full bg-surface border-2 border-emerald-400 ring-4 ring-canvas"></div>
                                            <div className="flex flex-col">
                                                <p className="text-[0.95rem] text-text m-0 leading-snug">{act.action}</p>
                                                <span className="text-[0.75rem] text-text-muted font-mono mt-1">{act.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recommend Side Panel */}
                        <div className="flex flex-col gap-5">
                            {/* Submit Book CTA
                            <div className="bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                                    <Upload size={24} className="text-indigo-400" />
                                </div>
                                <h3 className="text-[1.1rem] font-bold text-slate-100 mb-2">Yangi kitob taqdim etish</h3>
                                <p className="text-[0.85rem] text-indigo-200/70 mb-5">Kutubxona bazasiga o'z hissangizni qo'shing. PDF, EPUB yoki Audio formatdagi resurslarni yuklang.</p>
                                <Link to="/teacher/submit-book" className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[0.9rem] font-semibold transition-colors">
                                    Kitob yuklash
                                </Link>
                            </div> */}

                            {/* Recommended books */}
                            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex-1">
                                <h2 className="flex items-center gap-2 text-[1.1rem] font-bold mb-5 text-text">
                                    <Star size={20} className="text-yellow-400" />
                                    Yangi kelgan kitoblar
                                </h2>
                                <div className="flex flex-col gap-3">
                                    {recommendedBooks.length === 0 ? (
                                        <p className="text-[0.9rem] text-text-muted">Hozircha kitoblar yo'q</p>
                                    ) : recommendedBooks.map((book) => (
                                        <div key={book.id} className="flex gap-3 py-3 px-4 rounded-xl transition-colors hover:bg-surface-hover border border-transparent hover:border-border group cursor-pointer">
                                            <div className="w-[45px] h-[65px] shrink-0 bg-surface-hover rounded flex items-center justify-center overflow-hidden border border-border group-hover:border-border transition-colors">
                                                {book.cover_image ? (
                                                    <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <BookOpen size={20} className="text-text-muted" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <strong className="block text-[0.9rem] font-bold text-text truncate group-hover:text-emerald-400 transition-colors">{book.title}</strong>
                                                <span className="text-[0.8rem] text-text-muted truncate mb-1">{book.author}</span>
                                                <div className="flex items-center gap-2 mt-auto">
                                                    <span className={`inline-flex items-center py-0.5 px-2 rounded-md text-[0.65rem] font-bold uppercase tracking-wider ${book.available_copies > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {book.available_copies > 0 ? 'Mavjud' : 'Band'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
