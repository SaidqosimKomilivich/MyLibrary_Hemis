import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Users, Search, ChevronRight, TrendingUp, Megaphone, Calendar, Info, ShieldCheck, Clock, HelpCircle, Phone, Mail, MapPin, ChevronDown } from 'lucide-react'
import { api, type PublicDashboardResponse, type News } from '../services/api'

export default function LandingPage() {
    const [stats, setStats] = useState<PublicDashboardResponse | null>(null)
    const [news, setNews] = useState<News[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
    const navigate = useNavigate()

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, newsRes] = await Promise.all([
                    api.getPublicStats(),
                    api.getPublicNewsList({ limit: 4 })
                ]);
                if (statsRes.success) {
                    setStats(statsRes.data)
                }
                if (newsRes.success) {
                    setNews(newsRes.data)
                }
            } catch {
                console.error("Failed to fetch public data")
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <div className="w-full">
            {/* Hero Section */}
            <section className="relative pt-20 pb-20 px-6 h-screen overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-canvas to-indigo-500/5 -z-10" />
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    {/* <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border/50 text-sm font-medium mb-8 text-emerald-400 shadow-sm stagger-fade-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        <span>🚀</span> Yangi raqamli kutubxona tizimi
                    </div> */}

                    <h1
                        className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] stagger-fade-up"
                        style={{ animationDelay: '0.25s' }}
                    >
                        Bilimlar olamiga <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-400">xush kelibsiz</span>
                    </h1>

                    <p
                        className="text-lg md:text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed stagger-fade-up pointer-events-auto"
                        style={{ animationDelay: '0.4s' }}
                    >
                        Minglab kitoblar, raqamli resurslar va o'quv zallari endi bitta platformada.
                        O'zingizga kerakli kitobni qidiring, band qiling va o'qishni boshlang.
                    </p>

                    <form
                        onSubmit={handleSearchSubmit}
                        className="max-w-2xl mx-auto relative group stagger-fade-up pointer-events-auto"
                        style={{ animationDelay: '0.55s' }}
                    >
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-muted group-focus-within:text-emerald-500 transition-colors">
                            <Search size={22} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Kitob nomi, muallif yoki ISBN bo'yicha qidiring..."
                            className="w-full bg-surface border-2 border-border/80 text-text rounded-full py-4 pl-14 pr-36 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-[1rem] placeholder:text-text-muted/50 shadow-sm"
                        />
                        <button type="submit" className="absolute inset-y-2 right-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 font-medium transition-colors flex items-center gap-2 shadow-md">
                            Izlash
                        </button>
                    </form>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 px-6 relative bg-surface/30 border-y border-border/30">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="stagger-fade-up" style={{ animationDelay: '0.2s' }}>
                                <h2 className="text-3xl font-bold tracking-tight mb-4 flex items-center gap-3">
                                    <Info className="text-emerald-500" size={32} />
                                    Biz haqimizda
                                </h2>
                                <p className="text-lg text-text-muted leading-relaxed">
                                    Bizning xalqaro darajadagi zamonaviy kutubxonamiz ilm-fan, ta'lim va madaniyat o'chog'idir. Bu yerda siz nodir qo'lyozmalardan tortib, eng so'nggi raqamli resurslargacha bo'lgan cheksiz bilimlar bazasiga ega bo'lasiz.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-canvas p-6 rounded-2xl border border-border/50 stagger-fade-up" style={{ animationDelay: '0.4s' }}>
                                    <ShieldCheck className="text-emerald-500 mb-4" size={28} />
                                    <h4 className="font-bold text-lg mb-2">Ishonchli Manbalar</h4>
                                    <p className="text-sm text-text-muted">Barcha adabiyotlar ekspertlar tomonidan tasdiqlangan va saralangan.</p>
                                </div>
                                <div className="bg-canvas p-6 rounded-2xl border border-border/50 stagger-fade-up" style={{ animationDelay: '0.6s' }}>
                                    <Clock className="text-indigo-400 mb-4" size={28} />
                                    <h4 className="font-bold text-lg mb-2">24/7 Raqamli Kirish</h4>
                                    <p className="text-sm text-text-muted">Istalgan vaqtda va istalgan joydan elektron tizim orqali ulanish imkoniyati.</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative stagger-fade-up" style={{ animationDelay: '0.8s' }}>
                            <div className="absolute inset-0 bg-linear-to-tr from-emerald-500/20 to-indigo-500/20 rounded-3xl transform rotate-3 scale-105 z-0 border border-border/50 backdrop-blur-3xl"></div>
                            <div className="relative z-10 bg-canvas border border-border/50 rounded-3xl p-8 shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
                                {/* Optional: A decorative image or abstract hero visual can go here */}
                                <div className="absolute inset-0 bg-linear-to-b from-transparent to-surface/80 pointer-events-none"></div>
                                <div className="book-wrap relative z-20 scale-90 md:scale-100 hover:scale-110 transition-transform duration-700 cursor-pointer">
                                    <div className="book-page-left"></div>
                                    <div className="book-page-right"></div>
                                    <div className="book-page"></div>
                                    <div className="book-page"></div>
                                    <div className="book-page"></div>
                                    <div className="book-page"></div>
                                    <div className="book-page"></div>
                                    <div className="book-page"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 border-b border-border/30 bg-surface/30">
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

            {/* Latest News */}
            <section id="news" className="py-16 px-6 relative bg-canvas">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-end justify-between mb-10">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                                <Megaphone className="text-blue-500" size={28} />
                                So'nggi yangiliklar
                            </h2>
                            <p className="text-text-muted">Kutubxonamizdagi eng muhim e'lon va voqealar</p>
                        </div>
                        <Link to="/news" className="hidden md:flex items-center gap-1 text-blue-500 hover:text-blue-400 font-medium transition-colors">
                            Barchasini ko'rish <ChevronRight size={18} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {isLoading ? (
                            Array(4).fill(0).map((_, i) => (
                                <div key={i} className="bg-surface border border-border/50 rounded-2xl p-4 animate-pulse h-64" />
                            ))
                        ) : news && news.length > 0 ? (
                            news.map((item, i) => (
                                <Link to={`/news/${item.slug}`} key={i} className="group bg-surface border border-border/50 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col h-full">
                                    {item.images && item.images.length > 0 ? (
                                        <div className="h-40 bg-surface/50 border-b border-border/50 overflow-hidden shrink-0">
                                            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    ) : (
                                        <div className="h-40 bg-surface/50 border-b border-border/50 flex flex-col justify-center items-center shrink-0">
                                            <Megaphone size={36} className="text-blue-500/50 mb-2 group-hover:scale-110 transition-transform duration-500" />
                                            <span className="text-blue-500/50 font-bold tracking-wider text-xs uppercase">{item.category || "E'lon"}</span>
                                        </div>
                                    )}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-3">
                                            {item.category && (
                                                <span className="bg-blue-500/10 text-blue-400 text-[0.65rem] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm">
                                                    {item.category}
                                                </span>
                                            )}
                                            <span className="text-text-muted flex items-center gap-1 text-[0.7rem] ml-auto font-medium">
                                                <Calendar size={12} />
                                                {new Date(item.published_at || item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-[1.05rem] mb-2 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        {item.summary && (
                                            <p className="text-[0.85rem] text-text-muted line-clamp-2 leading-relaxed mt-auto">
                                                {item.summary}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-text-muted border border-dashed border-border/50 rounded-2xl">
                                Hozircha yangiliklar yo'q
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Popular Books */}
            <section id="books" className="py-24 px-6 relative">
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
                                    <div className="h-48 bg-surface/50 flex items-center justify-center border-b border-border/50 relative overflow-hidden">
                                        {book.cover_image ? (
                                            <img src={`http://localhost:8080${book.cover_image}`} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <BookOpen size={48} className="text-text-muted/50 group-hover:text-emerald-500/50 transition-colors duration-500" />
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

            {/* Help / Support & FAQ */}
            <section id="help" className="py-24 px-6 relative bg-canvas border-t border-border/30">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4">
                            <HelpCircle size={32} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-4">Yordam va Qo'llab-quvvatlash</h2>
                        <p className="text-lg text-text-muted">Kutubxonamizdan foydalanish bo'yicha eng ko'p beriladigan savollar va bog'lanish usullari.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* FAQ Accordion */}
                        <div className="lg:col-span-7 space-y-4">
                            <h3 className="text-xl font-bold mb-6">Ko'p beriladigan savollar</h3>
                            {[
                                {
                                    q: "Tizimdan qanday ro'yxatdan o'tishim mumkin?",
                                    a: "Tizim ma'murlari (universitet yoxud muassasa xodimi) orqali yopiq tizimga a'zo bo'lasiz. Saytdagi 'Kirish' tugmasi orqali o'z login/parolingiz bilan kirishingiz mumkin."
                                },
                                {
                                    q: "Oflayn o'qish uchun qanday kitob band qilaman?",
                                    a: "Tizimga kirgach katalogdan kerakli kitobni tanlang va 'Band qilish' tugmasini bosing. Kutubxonachi so'rovingizni tasdiqlaganidan so'ng kutubxonaga kelib kitobni olib ketishingiz mumkin."
                                },
                                {
                                    q: "Kitobni qancha muddatga olsa bo'ladi?",
                                    a: "Standart ijaraga berish muddati tuzilmaga qarab 10 kundan 30 kungacha. Bu haqida aniq ma'lumot kitobni band qilayotganingizda profilingizda ko'rsatiladi."
                                },
                                {
                                    q: "Elektron PDF kitoblarni saqlab olishim mumkinmi?",
                                    a: "Mualliflik huquqini himoya qilish maqsadida, elektron resurslarni faqat tizim ichidagi maxsus o'qish oynasida (Read Mode) mutolaa qila olasiz. Ularni yuklash cheklangan ba'zi hollar bundan mustasno."
                                }
                            ].map((faq, i) => (
                                <div key={i} className="bg-surface border border-border/50 rounded-2xl overflow-hidden transition-all duration-300">
                                    <button
                                        onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                        className="w-full text-left px-6 py-5 font-bold flex items-center justify-between hover:bg-surface/80"
                                    >
                                        <span className="text-[1rem] leading-snug pr-4">{faq.q}</span>
                                        <ChevronDown size={20} className={`text-text-muted transition-transform duration-300 shrink-0 ${openFaqIndex === i ? 'rotate-180 text-emerald-500' : ''}`} />
                                    </button>
                                    <div
                                        className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === i ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
                                    >
                                        <p className="text-text-muted text-[0.95rem] leading-relaxed border-t border-border/30 pt-4">
                                            {faq.a}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Contact Info */}
                        <div className="lg:col-span-5 relative">
                            <div className="sticky top-28 bg-surface/50 border border-border/50 rounded-3xl p-8 backdrop-blur shadow-xl shadow-black/5">
                                <h3 className="text-xl font-bold mb-6">Bog'lanish</h3>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                            <Phone size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg mb-0.5">+998 71 123 45 67</p>
                                            <p className="text-sm text-text-muted">Ish vaqti: Du-Ju | 09:00 - 18:00</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[1.05rem] mb-0.5">arm@jbnuu.uz</p>
                                            <p className="text-sm text-text-muted">24/7 onlayn qabul va murojaatlar</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[1.05rem] mb-1 line-clamp-2 leading-tight">
                                                Jizzax viloyati, Jizzax shahri Sh.Rashidov shox ko'chasi, 259 uy
                                            </p>
                                            {/* <a href="#" className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors font-medium hover:underline">Xaritada ko'rish</a> */}
                                        </div>
                                    </div>
                                </div>

                                {/* Decor */}
                                <div className="absolute -z-10 -bottom-10 -right-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-emerald-500/5 border-t border-emerald-500/10 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold mb-4">Kitob o'qishni bugundan boshlang</h2>
                    {/* <p className="text-text-muted mb-8 text-lg">Platformamizga a'zo bo'ling va minglab kitoblarga ega bo'ling.</p> */}
                    <Link to="/login" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        Hoziroq foydalanish
                    </Link>
                </div>
            </section>

            {/* Footer
            <footer className="py-8 border-t border-border/50 bg-surface/80 text-center text-sm text-text-muted">
                <p>© {new Date().getFullYear()} Tizim. Barcha huquqlar himoyalangan.</p>
            </footer> */}
        </div>
    )
}
