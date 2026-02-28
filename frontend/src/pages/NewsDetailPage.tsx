import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../services/api"
import type { News } from "../services/api"
import { toast } from "react-toastify"
import { ChevronLeft, ChevronRight, Circle, CircleDot, X, Maximize } from "lucide-react"
export default function NewsDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const [news, setNews] = useState<News | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        if (!news?.images || news.images.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % news.images.length);
        }, 5000); // 10 seconds

        return () => clearInterval(interval);
    }, [news]);

    const handlePrevImage = () => {
        if (!news?.images) return;
        setCurrentImageIndex(prev => (prev - 1 + news.images.length) % news.images.length);
    };

    const handleNextImage = () => {
        if (!news?.images) return;
        setCurrentImageIndex(prev => (prev + 1) % news.images.length);
    };

    useEffect(() => {
        const fetchNews = async () => {
            if (!slug) return
            try {
                // Public endpoint
                const res = await api.getNewsDetail(slug, true)
                if (res.success) {
                    setNews(res.data)
                }
            } catch (error: any) {
                toast.error(error.message || "Yangilik topilmadi")
            } finally {
                setIsLoading(false)
            }
        }
        fetchNews()
    }, [slug])

    if (isLoading) {
        return (
            <div className="w-full h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!news) {
        return (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold text-white mb-4">404</h1>
                <p className="text-white/60 mb-8">Yangilik topilmadi yoki o'chirilgan.</p>
                <Link to="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors">
                    Bosh sahifaga qaytish
                </Link>
            </div>
        )
    }

    return (
        <div className="w-full pb-12 px-4 pt-10">
            {/* Nav / Back */}
            <div className="max-w-4xl mx-auto mb-8">
                <Link to="/" className="inline-flex items-center text-white/50 hover:text-white transition-colors gap-2 text-sm font-medium">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Orqaga
                </Link>
            </div>

            <article className="max-w-4xl mx-auto bg-[#1a1b26] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                {/* Cover Image Carousel */}
                {news.images && news.images.length > 0 && (
                    <div className="w-full aspect-21/9 relative overflow-hidden bg-black/20 group">
                        {news.images.map((imgUrl, idx) => (
                            <img
                                key={idx}
                                src={imgUrl}
                                alt={`${news.title} ${idx + 1}`}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${idx === currentImageIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'
                                    }`}
                            />
                        ))}
                        <div className="absolute inset-0 bg-linear-to-t from-[#1a1b26] via-[#1a1b26]/20 to-transparent z-10 pointer-events-none"></div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="absolute top-6 right-6 p-2.5 bg-black/40 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md z-30 shadow-lg scale-95 hover:scale-100"
                            title="To'liq ekranda ko'rish"
                        >
                            <Maximize size={20} />
                        </button>

                        {/* Carousel Navigation */}
                        {news.images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
                                >
                                    <ChevronRight size={24} />
                                </button>

                                {/* Indicators */}
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                                    {news.images.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            className="transition-colors p-1"
                                        >
                                            {idx === currentImageIndex ? (
                                                <CircleDot size={14} className="text-blue-500 fill-blue-500" />
                                            ) : (
                                                <Circle size={12} className="text-white/50 fill-white/50 hover:text-white/80" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="p-8 md:p-12 -mt-16 md:-mt-24 relative z-10">
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        {news.category && (
                            <span className="bg-blue-600 inline-block px-4 py-1.5 rounded-full text-xs font-bold text-white tracking-wider uppercase backdrop-blur-md shadow-lg">
                                {news.category}
                            </span>
                        )}
                        <span className="text-white/60 text-sm font-medium drop-shadow-md bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                            {new Date(news.published_at || news.created_at).toLocaleDateString('uz-UZ', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-md">
                        {news.title}
                    </h1>

                    {/* Summary */}
                    {news.summary && (
                        <p className="text-xl text-white/80 font-medium mb-10 leading-relaxed border-l-4 border-blue-500 pl-6 drop-shadow-sm">
                            {news.summary}
                        </p>
                    )}

                    {/* Content (Basic rendering - replace with Markdown parser later if needed) */}
                    <div className="text-white/70 prose prose-invert prose-blue max-w-none text-lg leading-relaxed space-y-6">
                        {news.content.split('\n').map((paragraph, idx) => (
                            <p key={idx}>{paragraph}</p>
                        ))}
                    </div>

                    {/* Tags */}
                    {news.tags.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-2">
                            {news.tags.map(tag => (
                                <span key={tag} className="bg-white/5 border border-white/10 text-white/60 px-3 py-1 rounded-lg text-sm transition-colors hover:bg-white/10 hover:text-white cursor-default">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </article>

            {/* Image Modal */}
            {isModalOpen && news.images && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    onClick={() => setIsModalOpen(false)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
                    >
                        <X size={24} />
                    </button>

                    <div
                        className="relative w-full max-w-6xl max-h-screen flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={news.images[currentImageIndex]}
                            alt={news.title}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />

                        {/* Modal Navigation */}
                        {news.images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                                    className="absolute -left-4 md:left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-50"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                                    className="absolute -right-4 md:right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-50"
                                >
                                    <ChevronRight size={32} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
