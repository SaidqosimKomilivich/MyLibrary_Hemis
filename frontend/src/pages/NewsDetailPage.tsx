import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "../services/api"
import type { News } from "../services/api"
import { toast } from "react-toastify"
import {
    ChevronLeft,
    ChevronRight,
    Circle,
    CircleDot,
    X,
    Maximize,
    Eye,
    Pin,
    Calendar,
    Paperclip,
    Download,
    FileText,
    ArrowLeft,
} from "lucide-react"
import MarkdownRenderer from "../components/MarkdownRenderer"
import { formatBytes } from "../utils/formatBytes"

export default function NewsDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const [news, setNews] = useState<News | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        if (!news?.images || news.images.length <= 1) return

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % news.images.length)
        }, 6000)

        return () => clearInterval(interval)
    }, [news])

    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "auto"
        }
        return () => {
            document.body.style.overflow = "auto"
        }
    }, [isModalOpen])

    const handlePrevImage = () => {
        if (!news?.images) return
        setCurrentImageIndex((prev) => (prev - 1 + news.images.length) % news.images.length)
    }

    const handleNextImage = () => {
        if (!news?.images) return
        setCurrentImageIndex((prev) => (prev + 1) % news.images.length)
    }

    useEffect(() => {
        const fetchNews = async () => {
            if (!slug) return
            try {
                // Public detail endpoint (backend views sonini avtomatik oshiradi)
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
                <h1 className="text-4xl font-bold text-text mb-4">404</h1>
                <p className="text-text-muted mb-8">Yangilik topilmadi yoki o'chirilgan.</p>
                <Link
                    to="/news"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium shadow-lg shadow-blue-500/20"
                >
                    Yangiliklar ro'yxatiga qaytish
                </Link>
            </div>
        )
    }

    const hasImages = news.images && news.images.length > 0

    return (
        <div className="w-full pb-16 px-4 pt-10 min-h-screen bg-canvas">
            {/* Back button */}
            <div className="max-w-4xl mx-auto mb-6">
                <Link
                    to="/news"
                    className="inline-flex items-center text-text-muted hover:text-text transition-colors gap-2 text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Barcha yangiliklar
                </Link>
            </div>

            <article className="max-w-4xl mx-auto bg-surface rounded-3xl border border-border/60 overflow-hidden shadow-2xl">
                {/* Cover Image Carousel or Default ARM Header */}
                {hasImages ? (
                    <div className="w-full aspect-21/9 relative overflow-hidden bg-black/30 group">
                        {news.images.map((imgUrl, idx) => (
                            <img
                                key={idx}
                                src={imgUrl}
                                alt={`${news.title} ${idx + 1}`}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                                    idx === currentImageIndex ? "opacity-100 z-0" : "opacity-0 -z-10"
                                }`}
                            />
                        ))}
                        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/30 to-transparent z-10 pointer-events-none" />

                        {/* Fullscreen Button */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="absolute top-5 right-5 p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md z-30 shadow-lg scale-95 hover:scale-100"
                            title="To'liq ekranda ko'rish"
                        >
                            <Maximize size={18} />
                        </button>

                        {/* Carousel Navigation */}
                        {news.images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
                                >
                                    <ChevronRight size={22} />
                                </button>

                                {/* Indicators */}
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                                    {news.images.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            className="transition-colors p-1"
                                        >
                                            {idx === currentImageIndex ? (
                                                <CircleDot size={14} className="text-blue-500 fill-blue-500" />
                                            ) : (
                                                <Circle
                                                    size={12}
                                                    className="text-white/50 fill-white/50 hover:text-white/80"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    /* Default banner when no images */
                    <div className="w-full h-44 bg-linear-to-r from-surface via-surface-hover to-surface border-b border-border/50 flex items-center justify-center relative overflow-hidden select-none">
                        <img
                            src="/icon_arm.png"
                            alt="ARM Kutubxona"
                            className="w-24 h-24 object-contain opacity-25 filter grayscale"
                        />
                    </div>
                )}

                <div className={`p-6 sm:p-10 md:p-12 relative z-10 ${hasImages ? "-mt-14 md:-mt-20" : ""}`}>
                    {/* Meta Bar */}
                    <div className="flex flex-wrap items-center gap-2.5 mb-6">
                        {news.is_pinned && (
                            <span className="flex items-center gap-1 bg-amber-500/95 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                <Pin size={12} className="fill-white" /> QADALGAN
                            </span>
                        )}
                        {news.category && (
                            <span className="bg-blue-600 px-3.5 py-1 rounded-full text-xs font-bold text-white tracking-wider uppercase shadow-md">
                                {news.category}
                            </span>
                        )}
                        <span className="text-text-muted text-xs sm:text-sm font-medium border border-border/50 bg-surface-hover/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                            <Calendar size={13} className="text-blue-400" />
                            {new Date(news.published_at || news.created_at).toLocaleDateString("uz-UZ", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </span>
                        <span className="text-text-muted text-xs sm:text-sm font-medium border border-border/50 bg-surface-hover/80 px-3 py-1 rounded-full flex items-center gap-1.5 ml-auto">
                            <Eye size={13} className="text-text-muted" />
                            {news.views ?? 0} marta ko'rildi
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text mb-6 leading-tight">
                        {news.title}
                    </h1>

                    {/* Summary */}
                    {news.summary && (
                        <div className="text-lg text-text-muted font-medium mb-8 leading-relaxed border-l-4 border-blue-500 pl-5 py-1 bg-blue-500/5 rounded-r-xl">
                            {news.summary}
                        </div>
                    )}

                    {/* Content (Rendered with MarkdownRenderer) */}
                    <div className="border-t border-border/50 pt-8">
                        <MarkdownRenderer content={news.content} />
                    </div>

                    {/* Attached Documents (Attachments) */}
                    {news.attachments && news.attachments.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-border">
                            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                                <Paperclip className="text-blue-500" size={18} />
                                Biriktirilgan hujjatlar ({news.attachments.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {news.attachments.map((att) => (
                                    <div
                                        key={att.id}
                                        className="flex items-center justify-between p-4 rounded-2xl border border-border bg-surface-hover/40 hover:bg-surface-hover/80 hover:border-blue-500/40 transition-all group shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                                                <FileText size={22} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-text truncate">
                                                    {att.file_name}
                                                </p>
                                                <p className="text-xs text-text-muted uppercase">
                                                    {att.file_type} • {formatBytes(att.file_size)}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={att.file_url}
                                            download={att.file_name}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ml-3 p-2 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors shrink-0"
                                            title="Yuklab olish"
                                        >
                                            <Download size={18} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {news.tags && news.tags.length > 0 && (
                        <div className="mt-10 pt-6 border-t border-border/50 flex flex-wrap gap-2">
                            {news.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="bg-surface-hover border border-border text-text-muted px-3 py-1 rounded-lg text-xs font-medium"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </article>

            {/* Image Fullscreen Modal */}
            {isModalOpen && news.images && (
                <div
                    className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 h-screen w-screen overflow-hidden"
                    onClick={() => setIsModalOpen(false)}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsModalOpen(false)
                        }}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50 cursor-pointer"
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
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handlePrevImage()
                                    }}
                                    className="absolute -left-4 md:left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-50 cursor-pointer"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleNextImage()
                                    }}
                                    className="absolute -right-4 md:right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-50 cursor-pointer"
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
