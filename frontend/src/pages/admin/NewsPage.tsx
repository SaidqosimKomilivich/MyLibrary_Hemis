import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "../../services/api"
import type { News } from "../../services/api"
import { toast } from "react-toastify"
import AddNewsModal from "./AddNewsModal"
import { Trash2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { CustomSelect } from "../../components/CustomSelect"

export default function NewsPage() {
    const [news, setNews] = useState<News[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [limit, setLimit] = useState(20)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingNews, setEditingNews] = useState<News | null>(null)

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [newsToDelete, setNewsToDelete] = useState<News | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchNews = async () => {
        setIsLoading(true)
        try {
            const res = await api.getNewsList({ page, limit })
            if (res.success) {
                setNews(res.data)
                setTotalPages(res.pagination.total_pages || 1)
                setTotalItems(res.pagination.total_items || 0)
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (error: any) {
            toast.error(error.message || "Yangiliklarni yuklashda xatolik")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchNews()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit])

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
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (error: any) {
            toast.error(error.message || "O'chirishda xatolik")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleTogglePublish = async (id: string) => {
        try {
            await api.toggleNewsPublish(id)
            toast.success("Holat o'zgartirildi")
            fetchNews()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (error: any) {
            toast.error(error.message || "Holatni o'zgartirishda xatolik")
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
        const pages: (number | '...')[] = []
        const total = totalPages
        const current = page

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i)
        } else {
            pages.push(1)
            if (current > 3) pages.push('...')
            const start = Math.max(2, current - 1)
            const end = Math.min(total - 1, current + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (current < total - 2) pages.push('...')
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Yangiliklar</h1>
                    <p className="text-text-muted text-sm mt-1">Barcha e'lon va yangiliklar</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Yangi qo'shish
                </button>
            </div>

            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-hover/50 border-b border-border text-text-muted text-sm">
                                <th className="px-6 py-4 font-medium">Sarlavha</th>
                                <th className="px-6 py-4 font-medium">Rukn</th>
                                <th className="px-6 py-4 font-medium">Holat</th>
                                <th className="px-6 py-4 font-medium">Sana</th>
                                <th className="px-6 py-4 font-medium text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                                        Yuklanmoqda...
                                    </td>
                                </tr>
                            ) : news.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                                        Yangiliklar topilmadi
                                    </td>
                                </tr>
                            ) : (
                                news.map((item) => (
                                    <tr key={item.id} className="hover:bg-surface-hover/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {item.images && item.images.length > 0 ? (
                                                    <img src={item.images[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-surface-hover border border-border flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 7H20a2 2 0 012 2v1m-2 13v-m0 0l-m0 0h.01M12 12h4.01M12 16h4.01M16 8h.01" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-text font-medium line-clamp-1">{item.title}</div>
                                                    <a href={`/news/${item.slug}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-xs mt-0.5 line-clamp-1">/{item.slug}</a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-hover text-text border border-border">
                                                {item.category || 'Boshqa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleTogglePublish(item.id)}
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${item.is_published
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                                                    }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.is_published ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                                                {item.is_published ? 'Nashr qilingan' : 'Qoralama'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted text-sm truncate">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                    title="Tahrirlash"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(item)}
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                    title="O'chirish"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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
                        <div className="text-[0.85rem] text-text-muted">
                            Jami <strong className="text-text font-semibold">{totalItems}</strong> ta natija, {' '}
                            <strong className="text-text font-semibold">{(page - 1) * limit + 1}</strong>–
                            <strong className="text-text font-semibold">{Math.min(page * limit, totalItems)}</strong> ko'rsatilmoqda
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
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                title="Oldingi sahifa"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex gap-1 mx-2">
                                {generatePageNumbers().map((p, i) =>
                                    p === '...' ? (
                                        <span key={`dots-${i}`} className="flex items-center justify-center w-8 h-8 text-text-muted text-[0.85rem] tracking-widest">...</span>
                                    ) : (
                                        <button
                                            key={p}
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg text-[0.85rem] font-medium transition-all ${page === p ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'border border-border text-text-muted hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5'}`}
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
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

                        <div className="flex items-center gap-2">
                            <label className="text-[0.82rem] font-medium text-text-muted">Sahifada:</label>
                            <CustomSelect
                                value={String(limit)}
                                onChange={(val: string) => handlePerPageChange(Number(val))}
                                options={[10, 20, 50, 100].map(n => ({ value: String(n), label: String(n) }))}
                                buttonClassName="py-1.5 pl-3 pr-2 w-[70px] bg-surface-hover border border-border rounded-lg text-[0.85rem] text-text font-medium outline-none focus:border-blue-500"
                                dropUp
                            />
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <AddNewsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchNews}
                    editingNews={editingNews}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && newsToDelete && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => !isDeleting && setDeleteModalOpen(false)}
                >
                    <div
                        className="bg-surface border border-border rounded-2xl w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl">
                            <h2 className="m-0 text-lg font-bold text-text flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center">
                                    <Trash2 size={15} />
                                </span>
                                Yangilikni o'chirish
                            </h2>
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400 disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-11 h-11 shrink-0 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <p className="text-text font-semibold text-[0.95rem] m-0 mb-1">Bu amalni ortga qaytarib bo'lmaydi</p>
                                    <p className="text-text-muted text-[0.88rem] m-0 leading-relaxed">
                                        <span className="text-text font-medium">"{newsToDelete.title}"</span> yangiligi butunlay o'chirib tashlanadi.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="flex-1 px-5 py-2.5 rounded-xl border border-white/10 bg-transparent text-text font-semibold cursor-pointer transition-colors hover:bg-white/5 disabled:opacity-50"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex items-center justify-center gap-2 flex-1 px-6 py-2.5 rounded-xl border-none font-semibold cursor-pointer transition-all bg-red-600 text-white hover:bg-red-500 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(239,68,68,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                                >
                                    {isDeleting
                                        ? <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><Trash2 size={16} /> O'chirish</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
