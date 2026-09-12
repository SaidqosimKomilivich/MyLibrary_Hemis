import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Calendar, Megaphone, Pin, Eye, Paperclip, Search, ArrowLeft } from "lucide-react"
import { api } from "../services/api"
import type { News, NewsListParams } from "../services/api"
import { toast } from "react-toastify"
import NewsCoverImage from "../components/NewsCoverImage"

const CATEGORIES = [
    { value: "", label: "Barchasi" },
    { value: "E'lon", label: "E'lonlar" },
    { value: "Yangilik", label: "Yangiliklar" },
]

export default function PublicNewsPage() {
    const [newsList, setNewsList] = useState<News[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Pagination & Filter states
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [search, setSearch] = useState("")
    const [activeCategory, setActiveCategory] = useState("")

    const fetchNews = async () => {
        setIsLoading(true)
        try {
            const params: NewsListParams = {
                page: currentPage,
                limit: 12,
                search: search.trim() || undefined,
                category: activeCategory || undefined,
            }
            const res = await api.getPublicNewsList(params)
            if (res.success) {
                setNewsList(res.data)
                if (res.pagination) {
                    setTotalPages(res.pagination.total_pages)
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Yangiliklarni yuklashda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchNews()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, activeCategory])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchNews()
    }

    const generatePageNumbers = () => {
        const pages: (number | "...")[] = []
        const total = totalPages
        const current = currentPage

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i)
        } else {
            pages.push(1)
            if (current > 3) pages.push("...")
            const start = Math.max(2, current - 1)
            const end = Math.min(total - 1, current + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (current < total - 2) pages.push("...")
            pages.push(total)
        }
        return pages
    }

    return (
        <div className="w-full min-h-screen bg-canvas">
            <main className="pt-10 pb-20 px-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border/50 pb-8">
                    <div>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-4 transition-colors font-medium"
                        >
                            <ArrowLeft size={16} /> Bosh sahifaga qaytish
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-bold mb-3 flex items-center gap-3 text-text">
                            <Megaphone className="text-blue-500" size={36} />
                            Yangiliklar & E'lonlar
                        </h1>
                        <p className="text-text-muted text-base md:text-lg max-w-2xl">
                            Kutubxonamizdagi eng so'nggi va muhim e'lonlar, voqealar xronikasi va ma'lumotlar to'plami.
                        </p>
                    </div>
                </div>

                {/* Search & Category Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
                    {/* Category tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => {
                                    setActiveCategory(cat.value)
                                    setCurrentPage(1)
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                                    activeCategory === cat.value
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                        : "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-hover"
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Search input */}
                    <form onSubmit={handleSearchSubmit} className="relative min-w-64 max-w-md w-full sm:w-auto">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Qidirish..."
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-muted/60 outline-none focus:border-primary transition-colors"
                        />
                    </form>
                </div>

                {/* News Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                    {isLoading ? (
                        Array(8)
                            .fill(0)
                            .map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-surface border border-border/50 rounded-3xl p-4 animate-pulse h-80"
                                />
                            ))
                    ) : newsList.length > 0 ? (
                        newsList.map((item, i) => (
                            <Link
                                to={`/news/${item.slug}`}
                                key={item.id || i}
                                className="group bg-surface border border-border/50 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col h-full relative"
                            >
                                {/* Cover Image */}
                                <div className="aspect-video bg-surface-hover border-b border-border/50 overflow-hidden shrink-0 relative">
                                    {/* Pinned badge */}
                                    {item.is_pinned && (
                                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-amber-500/95 text-white text-[0.65rem] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md">
                                            <Pin size={11} className="fill-white" />
                                            QADALGAN
                                        </div>
                                    )}
                                    <NewsCoverImage
                                        images={item.images}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                        fallbackClassName="w-18 h-18 object-contain opacity-35 filter grayscale group-hover:grayscale-0 group-hover:opacity-75 group-hover:scale-110 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                </div>

                                {/* Body */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 mb-3">
                                        {item.category && (
                                            <span className="bg-blue-500/10 text-blue-400 text-[0.7rem] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md">
                                                {item.category}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-2 text-text-muted text-xs ml-auto font-medium">
                                            <span className="flex items-center gap-1">
                                                <Eye size={12} /> {item.views ?? 0}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} className="text-blue-400" />
                                                {new Date(
                                                    item.published_at || item.created_at
                                                ).toLocaleDateString("uz-UZ")}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg mb-2.5 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors text-text">
                                        {item.title}
                                    </h3>

                                    {item.summary && (
                                        <p className="text-sm text-text-muted line-clamp-3 leading-relaxed mb-4">
                                            {item.summary}
                                        </p>
                                    )}

                                    {/* Footer with attachments if any */}
                                    <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-muted">
                                        {item.attachments && item.attachments.length > 0 ? (
                                            <span className="flex items-center gap-1 text-blue-400 font-medium">
                                                <Paperclip size={13} /> {item.attachments.length} ta hujjat
                                            </span>
                                        ) : (
                                            <span />
                                        )}
                                        <span className="text-blue-500 font-medium group-hover:translate-x-1 transition-transform">
                                            Batafsil →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full py-24 text-center text-text-muted border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center bg-surface/30">
                            <Megaphone size={48} className="text-blue-500/20 mb-4" />
                            <h3 className="text-xl font-bold text-text mb-2">Yangiliklar topilmadi</h3>
                            <p>Qidiruv shartlarini o'zgartirib ko'ring yoki keyinroq tashrif buyuring.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && !isLoading && (
                    <div className="mt-16 flex justify-center gap-2">
                        {generatePageNumbers().map((p, i) =>
                            p === "..." ? (
                                <span
                                    key={`dots-${i}`}
                                    className="w-10 h-10 flex items-center justify-center text-text-muted text-sm tracking-widest"
                                >
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p as number)}
                                    className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${
                                        p === currentPage
                                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                                            : "bg-surface border border-border/50 text-text-muted hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    {p}
                                </button>
                            )
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="py-8 border-t border-border/50 bg-surface/80 text-center text-sm text-text-muted">
                <p>© {new Date().getFullYear()} Tizim. Barcha huquqlar himoyalangan.</p>
            </footer>
        </div>
    )
}
