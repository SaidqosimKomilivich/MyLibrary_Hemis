import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../../services/api"
import type { News, NewsListParams } from "../../services/api"
import { toast } from "react-toastify"
import AddNewsModal from "./AddNewsModal"
import NewsCoverImage from "../../components/NewsCoverImage"
import {
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Pin,
    Eye,
    Paperclip,
    Search,
    Plus,
    Edit3,
} from "lucide-react"
import { CustomSelect } from "../../components/CustomSelect"

const CATEGORIES = [
    { value: "", label: "Barcha ruknlar" },
    { value: "E'lon", label: "E'lon" },
    { value: "Yangilik", label: "Yangilik" },
]

const SORT_OPTIONS = [
    { value: "", label: "Standart (Eng yangilar)" },
    { value: "views", label: "Ko'rishlar soni bo'yicha" },
    { value: "published_at", label: "Nashr sanasi bo'yicha" },
]

export default function NewsPage() {
    const [news, setNews] = useState<News[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [limit, setLimit] = useState(20)

    // Filters
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("")
    const [sortBy, setSortBy] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingNews, setEditingNews] = useState<News | null>(null)

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [newsToDelete, setNewsToDelete] = useState<News | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchNews = async () => {
        setIsLoading(true)
        try {
            const params: NewsListParams = {
                page,
                limit,
                search: search.trim() || undefined,
                category: category || undefined,
                sort_by: sortBy || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            }
            const res = await api.getNewsList(params)
            if (res.success) {
                setNews(res.data)
                setTotalPages(res.pagination.total_pages || 1)
                setTotalItems(res.pagination.total_items || 0)
            }
        } catch (error: any) {
            toast.error(error.message || "Yangiliklarni yuklashda xatolik")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchNews()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, category, sortBy, dateFrom, dateTo])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchNews()
    }

    const resetFilters = () => {
        setSearch("")
        setCategory("")
        setSortBy("")
        setDateFrom("")
        setDateTo("")
        setPage(1)
    }

    const handleDeleteClick = (item: News) => {
        setNewsToDelete(item)
        setDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!newsToDelete) return

        setIsDeleting(true)
        try {
            await api.deleteNews(newsToDelete.id)
            toast.success("Yangilik muvaffaqiyatli o'chirildi")
            fetchNews()
            setDeleteModalOpen(false)
            setNewsToDelete(null)
        } catch (error: any) {
            toast.error(error.message || "O'chirishda xatolik")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleTogglePublish = async (id: string) => {
        try {
            await api.toggleNewsPublish(id)
            toast.success("Nashr holati o'zgartirildi")
            fetchNews()
        } catch (error: any) {
            toast.error(error.message || "Holatni o'zgartirishda xatolik")
        }
    }

    const handleTogglePin = async (id: string) => {
        try {
            const res = await api.toggleNewsPin(id)
            if (res.data?.is_pinned) {
                toast.success("Yangilik qadab qo'yildi (doim birinchi ko'rinadi)")
            } else {
                toast.info("Yangilik qadab qo'yishdan chiqarildi")
            }
            fetchNews()
        } catch (error: any) {
            toast.error(error.message || "Qadashda xatolik")
        }
    }

    const openAddModal = () => {
        setEditingNews(null)
        setIsModalOpen(true)
    }

    const openEditModal = (item: News) => {
        setEditingNews(item)
        setIsModalOpen(true)
    }

    const generatePageNumbers = () => {
        const pages: (number | "...")[] = []
        const total = totalPages
        const current = page

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

    const handlePerPageChange = (newLimit: number) => {
        setLimit(newLimit)
        setPage(1)
    }

    return (
        <div className="space-y-6">
            {/* Top bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Yangiliklar & E'lonlar</h1>
                    <p className="text-text-muted text-sm mt-1">
                        Barcha yangiliklar, e'lonlar va biriktirilgan hujjatlar boshqaruvi
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Yangi qo'shish
                </button>
            </div>

            {/* Filter toolbar */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap">
                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-55">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Sarlavha yoki mazmun bo'yicha qidirish..."
                        className="w-full pl-9 pr-3 py-2 bg-surface-hover/50 border border-border rounded-xl text-sm text-text placeholder:text-text-muted/60 outline-none focus:border-primary transition-colors"
                    />
                </form>

                {/* Category select */}
                <div className="w-45 min-w-35">
                    <CustomSelect
                        value={category}
                        onChange={(val) => {
                            setCategory(val)
                            setPage(1)
                        }}
                        options={CATEGORIES}
                        buttonClassName="w-full bg-surface-hover/50 border border-border text-text py-2 px-3 rounded-xl text-sm outline-none"
                    />
                </div>

                {/* Sort select */}
                <div className="w-55 min-w-45">
                    <CustomSelect
                        value={sortBy}
                        onChange={(val) => {
                            setSortBy(val)
                            setPage(1)
                        }}
                        options={SORT_OPTIONS}
                        buttonClassName="w-full bg-surface-hover/50 border border-border text-text py-2 px-3 rounded-xl text-sm outline-none"
                    />
                </div>

                {/* Date range inputs */}
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value)
                            setPage(1)
                        }}
                        className="bg-surface-hover/50 border border-border text-text py-1.5 px-2.5 rounded-xl text-xs outline-none"
                        title="Boshlanish sanasi"
                    />
                    <span>—</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value)
                            setPage(1)
                        }}
                        className="bg-surface-hover/50 border border-border text-text py-1.5 px-2.5 rounded-xl text-xs outline-none"
                        title="Tugash sanasi"
                    />
                </div>

                {/* Reset button if filters active */}
                {(search || category || sortBy || dateFrom || dateTo) && (
                    <button
                        onClick={resetFilters}
                        className="px-3 py-2 text-xs font-medium text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
                        Filtrlarni tozalash
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border text-text-muted text-sm">
                                <th className="px-6 py-4 font-medium">Sarlavha & Muqova</th>
                                <th className="px-4 py-4 font-medium">Rukn</th>
                                <th className="px-4 py-4 font-medium">Ko'rishlar</th>
                                <th className="px-4 py-4 font-medium">Holat</th>
                                <th className="px-4 py-4 font-medium">Sana</th>
                                <th className="px-6 py-4 font-medium text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                                        Yuklanmoqda...
                                    </td>
                                </tr>
                            ) : news.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                                        Yangiliklar topilmadi
                                    </td>
                                </tr>
                            ) : (
                                news.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-surface-hover/50 transition-colors group ${
                                            item.is_pinned ? "bg-amber-500/3" : ""
                                        }`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {/* News Cover Image with /icon_arm.png fallback */}
                                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0 bg-surface">
                                                    <NewsCoverImage
                                                        images={item.images}
                                                        className="w-full h-full object-cover"
                                                        fallbackClassName="w-7 h-7 object-contain opacity-35 filter grayscale"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {item.is_pinned && (
                                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                                                <Pin size={10} className="fill-amber-500" />
                                                                QADALGAN
                                                            </span>
                                                        )}
                                                        <span className="text-text font-medium line-clamp-1">
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <a
                                                            href={`/news/${item.slug}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 text-xs line-clamp-1"
                                                        >
                                                            /{item.slug}
                                                        </a>
                                                        {item.attachments && item.attachments.length > 0 && (
                                                            <span
                                                                className="flex items-center gap-0.5 text-xs text-text-muted/80 bg-surface-hover px-1.5 py-0.5 rounded"
                                                                title={`${item.attachments.length} ta biriktirilgan hujjat`}
                                                            >
                                                                <Paperclip size={11} />
                                                                {item.attachments.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-hover text-text border border-border">
                                                {item.category || "Boshqa"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-text-muted text-sm">
                                            <div className="flex items-center gap-1.5">
                                                <Eye size={14} className="text-text-muted/60" />
                                                <span>{item.views ?? 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleTogglePublish(item.id)}
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                    item.is_published
                                                        ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                                                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                        item.is_published ? "bg-green-400" : "bg-yellow-400"
                                                    }`}
                                                ></span>
                                                {item.is_published ? "Nashr qilingan" : "Qoralama"}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-text-muted text-sm">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Pin toggle button */}
                                                <button
                                                    onClick={() => handleTogglePin(item.id)}
                                                    className={`p-1.5 rounded-lg transition-colors ${
                                                        item.is_pinned
                                                            ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                                                            : "bg-surface-hover text-text-muted hover:text-amber-500 hover:bg-amber-500/10"
                                                    }`}
                                                    title={item.is_pinned ? "Qadashni bekor qilish" : "Qadab qo'yish"}
                                                >
                                                    <Pin size={15} className={item.is_pinned ? "fill-amber-500" : ""} />
                                                </button>

                                                {/* Edit button */}
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                    title="Tahrirlash"
                                                >
                                                    <Edit3 size={15} />
                                                </button>

                                                {/* Delete button */}
                                                <button
                                                    onClick={() => handleDeleteClick(item)}
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                    title="O'chirish"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="flex items-center justify-between gap-4 p-4 border-t border-border flex-wrap max-md:flex-col max-md:justify-center">
                        <div className="text-[0.85rem] text-text-muted flex items-center gap-3">
                            <span>
                                Jami <strong className="text-text font-semibold">{totalItems}</strong> ta yangilik
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">Sahifada:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                    className="bg-surface-hover/60 border border-border rounded-lg text-xs py-1 px-2 text-text outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                                disabled={page <= 1}
                                onClick={() => setPage(1)}
                                title="Birinchi sahifa"
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                title="Oldingi sahifa"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex gap-1 mx-2">
                                {generatePageNumbers().map((p, i) =>
                                    p === "..." ? (
                                        <span
                                            key={`dots-${i}`}
                                            className="flex items-center justify-center w-8 h-8 text-text-muted text-[0.85rem] tracking-widest"
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            key={p}
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg text-[0.85rem] font-medium transition-all ${
                                                page === p
                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                    : "border border-border text-text-muted hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5"
                                            }`}
                                            onClick={() => setPage(p as number)}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                            </div>

                            <button
                                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                title="Keyingi sahifa"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                                disabled={page >= totalPages}
                                onClick={() => setPage(totalPages)}
                                title="Oxirgi sahifa"
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddNewsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchNews}
                editingNews={editingNews}
            />

            {deleteModalOpen && newsToDelete && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setDeleteModalOpen(false)}
                >
                    <div
                        className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                                <Trash2 size={20} />
                            </div>
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-text mb-2">Yangilikni o'chirish</h3>
                        <p className="text-text-muted text-sm leading-relaxed mb-6">
                            Haqiqatan ham{" "}
                            <strong className="text-text font-semibold">"{newsToDelete.title}"</strong>{" "}
                            yangiligini o'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl border border-border text-text text-sm font-medium hover:bg-surface-hover transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                {isDeleting ? "O'chirilmoqda..." : "Ha, o'chirilsin"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
