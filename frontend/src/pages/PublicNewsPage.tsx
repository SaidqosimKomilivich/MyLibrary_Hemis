import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Calendar, Megaphone } from "lucide-react"
import { api } from "../services/api"
import type { News } from "../services/api"
import { toast } from "react-toastify"

export default function PublicNewsPage() {
    const [newsList, setNewsList] = useState<News[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Pagination/Filter states if needed later
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true)
            try {
                // Fetch paginated public news (limit to 12 per page)
                const res = await api.getPublicNewsList({ page: currentPage, limit: 12 })
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
        fetchNews()
    }, [currentPage])

    return (
        <div className="w-full">
            <main className="pt-10 pb-20 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border/50 pb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3">
                            <Megaphone className="text-blue-500" size={36} />
                            Barcha yangiliklar
                        </h1>
                        <p className="text-text-muted text-lg max-w-2xl">
                            Kutubxonamizdagi eng so'nggi va muhim e'lonlar, voqealar xronikasi va ma'lumotlar to'plami.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {isLoading ? (
                        Array(8).fill(0).map((_, i) => (
                            <div key={i} className="bg-surface border border-border/50 rounded-3xl p-4 animate-pulse h-80" />
                        ))
                    ) : newsList.length > 0 ? (
                        newsList.map((item, i) => (
                            <Link to={`/news/${item.slug}`} key={item.id || i} className="group bg-surface border border-border/50 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col h-full">
                                {item.images && item.images.length > 0 ? (
                                    <div className="aspect-video bg-surface-hover border-b border-border/50 overflow-hidden shrink-0 relative">
                                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" />
                                        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-surface-hover border-b border-border/50 flex flex-col justify-center items-center shrink-0">
                                        <Megaphone size={48} className="text-blue-500/20 mb-3 group-hover:scale-110 transition-transform duration-500" />
                                        <span className="text-blue-500/30 font-bold tracking-widest text-xs uppercase">{item.category || "E'lon"}</span>
                                    </div>
                                )}

                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        {item.category && (
                                            <span className="bg-blue-500/10 text-blue-400 text-[0.7rem] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md">
                                                {item.category}
                                            </span>
                                        )}
                                        <span className="text-text-muted flex items-center gap-1.5 text-xs ml-auto font-medium bg-canvas px-2.5 py-1 rounded-md border border-border/50">
                                            <Calendar size={14} className="text-blue-400" />
                                            {new Date(item.published_at || item.created_at).toLocaleDateString('uz-UZ')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-xl mb-3 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                                        {item.title}
                                    </h3>
                                    {item.summary && (
                                        <p className="text-sm text-text-muted line-clamp-3 leading-relaxed mt-auto">
                                            {item.summary}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full py-24 text-center text-text-muted border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center bg-surface/30">
                            <Megaphone size={48} className="text-blue-500/20 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Hozircha yangiliklar yo'q</h3>
                            <p>Tez orada bu yerda yangi e'lonlar paydo bo'ladi.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && !isLoading && (
                    <div className="mt-16 flex justify-center gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${pageNum === currentPage
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-surface border border-border/50 text-text-muted hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
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
