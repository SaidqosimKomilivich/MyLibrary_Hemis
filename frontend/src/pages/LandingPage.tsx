import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Library, Search, ChevronRight, TrendingUp } from 'lucide-react'
import { api, type PublicDashboardResponse } from '../services/api'

export default function LandingPage() {
    const [stats, setStats] = useState<PublicDashboardResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.getPublicStats()
                if (res.success) {
                    setStats(res.data)
                }
            } catch (err) {
                console.error("Failed to fetch public stats")
            } finally {
                setIsLoading(false)
            }
        }
        fetchStats()
    }, [])

    return (
        <div className="min-h-screen bg-canvas text-text font-sans">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-500">
                        <Library size={24} />
                        <span className="text-xl font-bold tracking-tight text-text">Kutubxona</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* <Link
                            to="/login"
                            className="text-sm font-medium text-text-muted hover:text-text transition-colors"
                        >
                            Tizimga kirish
                        </Link> */}
                        <Link
                            to="/login"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Kirish
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-canvas to-indigo-500/5 -z-10" />
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border/50 text-sm font-medium mb-8 text-emerald-400 shadow-sm">
                        <span>🚀</span> Yangi raqamli kutubxona tizimi
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                        Bilimlar olamiga <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-400">xush kelibsiz</span>
                    </h1>

                    <p className="text-lg md:text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
                        Minglab kitoblar, raqamli resurslar va o'quv zallari endi bitta platformada.
                        O'zingizga kerakli kitobni qidiring, band qiling va o'qishni boshlang.
                    </p>

                    <div className="max-w-2xl mx-auto relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-muted group-focus-within:text-emerald-500 transition-colors">
                            <Search size={22} />
                        </div>
                        <input
                            type="text"
                            placeholder="Kitob nomi, muallif yoki ISBN bo'yicha qidiring..."
                            className="w-full bg-surface border-2 border-border/80 text-text rounded-full py-4 pl-14 pr-36 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-[1rem] placeholder:text-text-muted/50 shadow-sm"
                        />
                        <button className="absolute inset-y-2 right-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 font-medium transition-colors flex items-center gap-2 shadow-md">
                            Izlash
                        </button>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 border-y border-border/30 bg-surface/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface/50 border border-border/40 hover:border-emerald-500/30 transition-colors">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-4xl font-bold tracking-tight mb-1">
                                {isLoading ? <span className="animate-pulse bg-border h-10 w-24 block rounded" /> : stats?.total_books || 0}
                            </h3>
                            <p className="text-[0.85rem] font-medium text-text-muted uppercase tracking-wider">Jami kitoblar</p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface/50 border border-border/40 hover:border-indigo-500/30 transition-colors">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 mb-4">
                                <Users size={32} />
                            </div>
                            <h3 className="text-4xl font-bold tracking-tight mb-1">
                                {isLoading ? <span className="animate-pulse bg-border h-10 w-24 block rounded" /> : stats?.total_users || 0}
                            </h3>
                            <p className="text-[0.85rem] font-medium text-text-muted uppercase tracking-wider">Faol a'zolar</p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface/50 border border-border/40 hover:border-orange-500/30 transition-colors">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 text-orange-400 mb-4">
                                <TrendingUp size={32} />
                            </div>
                            <h3 className="text-4xl font-bold tracking-tight mb-1">
                                {isLoading ? <span className="animate-pulse bg-border h-10 w-24 block rounded" /> : stats?.total_rentals || 0}
                            </h3>
                            <p className="text-[0.85rem] font-medium text-text-muted uppercase tracking-wider">O'qilgan kitoblar</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Popular Books */}
            <section className="py-24 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-end justify-between mb-10">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Eng ko'p o'qilganlar</h2>
                            <p className="text-text-muted">Kutubxonamizning eng mashhur durdonalari bilan tanishing</p>
                        </div>
                        <Link to="/login" className="hidden md:flex items-center gap-1 text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                            Barchasini ko'rish <ChevronRight size={18} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {isLoading ? (
                            Array(4).fill(0).map((_, i) => (
                                <div key={i} className="bg-surface border border-border/50 rounded-2xl p-4 animate-pulse h-72" />
                            ))
                        ) : stats?.popular_books && stats.popular_books.length > 0 ? (
                            stats.popular_books.slice(0, 8).map((book, i) => (
                                <div key={i} className="group bg-surface border border-border/50 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer flex flex-col h-full">
                                    <div className="h-48 bg-slate-900/40 flex items-center justify-center border-b border-border/50 relative overflow-hidden">
                                        {book.cover_image ? (
                                            <img src={`http://localhost:8080${book.cover_image}`} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <BookOpen size={48} className="text-border group-hover:text-emerald-500/50 transition-colors duration-500" />
                                        )}
                                        <div className="absolute top-3 right-3 bg-surface/90 backdrop-blur text-[0.7rem] font-bold px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 text-text-muted shadow-sm">
                                            <TrendingUp size={12} className="text-emerald-500" /> {book.count} marta
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="font-bold text-[1.1rem] mb-1.5 line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">
                                            {book.title}
                                        </h3>
                                        <p className="text-[0.85rem] text-text-muted line-clamp-1 mt-auto">
                                            {book.author}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-16 text-center text-text-muted border-2 border-dashed border-border/50 rounded-2xl">
                                Hozircha mashhur kitoblar ro'yxati mavjud emas
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-emerald-500/5 border-t border-emerald-500/10 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold mb-4">Kitob o'qishni bugundan boshlang</h2>
                    <p className="text-text-muted mb-8 text-lg">Platformamizga a'zo bo'ling va minglab kitoblarga ega bo'ling.</p>
                    <Link to="/login" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        Hoziroq foydalanish
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-border/50 bg-surface/80 text-center text-sm text-text-muted">
                <p>© {new Date().getFullYear()} Tizim. Barcha huquqlar himoyalangan.</p>
            </footer>
        </div>
    )
}
