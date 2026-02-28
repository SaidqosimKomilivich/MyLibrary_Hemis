import { useState, useRef } from "react"
import { api } from "../../services/api"
import type { CreateNewsRequest } from "../../services/api"
import { toast } from "react-toastify"

interface AdminNewsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingNews: any | null
}

const CATEGORIES = ["E'lon", "Yangilik", "Yangilanish", "Boshqa"]

export default function AdminNewsModal({
    isOpen,
    onClose,
    onSuccess,
    editingNews
}: AdminNewsModalProps) {
    const [title, setTitle] = useState(editingNews?.title || "")
    const [summary, setSummary] = useState(editingNews?.summary || "")
    const [content, setContent] = useState(editingNews?.content || "")
    const [category, setCategory] = useState(editingNews?.category || CATEGORIES[0])
    const [tags, setTags] = useState<string[]>(editingNews?.tags || [])
    const [tagInput, setTagInput] = useState("")
    const [images, setImages] = useState<string[]>(editingNews?.images || [])
    const [isPublished, setIsPublished] = useState(editingNews?.is_published || false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const newTag = tagInput.trim()
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag])
            }
            setTagInput("")
        }
    }

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove))
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        setIsUploading(true)
        try {
            // Promise.all to map over files and upload
            const uploadPromises = files.map(file => {
                const { promise } = api.uploadFile(file, () => { })
                return promise
            })

            const results = await Promise.all(uploadPromises)

            const newImageUrls = results
                .filter(res => res.success && res.files.length > 0)
                .map(res => res.files[0].url)

            if (newImageUrls.length > 0) {
                setImages(prev => [...prev, ...newImageUrls])
                toast.success(`${newImageUrls.length} ta rasm yuklandi`)
            }
        } catch (error: any) {
            toast.error(error.message || 'Rasm yuklashda xatolik')
        } finally {
            setIsUploading(false)
            // reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const removeImage = (indexToRemove: number) => {
        setImages(prev => prev.filter((_, i) => i !== indexToRemove))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) {
            toast.error("Sarlavha va matn kiritilishi shart")
            return
        }

        setIsSubmitting(true)
        try {
            const payload: CreateNewsRequest = {
                title,
                summary: summary || undefined,
                content,
                category,
                tags,
                images,
                is_published: isPublished
            }

            if (editingNews) {
                await api.updateNews(editingNews.id, payload)
                toast.success("Yangilik muvaffaqiyatli yangilandi")
            } else {
                await api.createNews(payload)
                toast.success("Yangilik muvaffaqiyatli yaratildi")
            }

            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || "Xatolik yuz berdi")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1a1b26] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-semibold text-white">
                        {editingNews ? "Yangilikni Tahrirlash" : "Yangi Yangilik Qo'shish"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <form id="news-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">
                                Sarlavha <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/30"
                                placeholder="Yangilik sarlavhasi (min 3 harf)"
                                required
                            />
                        </div>

                        {/* Category & Publish status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">Rukn</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end pb-3">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 focus:ring-offset-0 transition-colors"
                                    />
                                    <span className="text-white/80 group-hover:text-white transition-colors">Darxol nashr qilinadimi?</span>
                                </label>
                            </div>
                        </div>

                        {/* Image Upload Gallery */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-white/70">
                                    Rasmlar galereyasi
                                </label>
                                <span className="text-white/40 text-xs">{images.length} ta rasm yuklangan</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                {images.map((imgUrl, idx) => (
                                    <div key={idx} className="relative rounded-xl overflow-hidden group border border-white/10 aspect-video">
                                        <img
                                            src={imgUrl}
                                            alt={`Gallery ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 top-0 p-2 flex justify-end bg-linear-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg backdrop-blur-sm transition-all"
                                                title="Rasmni o'chirish"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                        {idx === 0 && (
                                            <div className="absolute bottom-2 left-2 bg-blue-500/90 backdrop-blur text-[0.65rem] font-bold px-2 py-0.5 rounded text-white shadow-sm">
                                                Asosiy (Muqova)
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Upload Button inside Grid */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group aspect-video"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        multiple
                                    />
                                    {isUploading ? (
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <svg className="w-5 h-5 text-white/50 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>
                                            <p className="text-white/60 text-[0.8rem] px-2">Rasm yuklash</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Qisqacha mazmuni</label>
                            <textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/30 resize-none h-20"
                                placeholder="..."
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">
                                To'liq matn <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/30 resize-y min-h-[150px]"
                                placeholder="Yangilikning to'liq matni (Markdown yozish matni ham maqsadga muvofiq)"
                                required
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Teglar (Vergul yoki Enter)</label>
                            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-2 flex flex-wrap gap-2 focus-within:ring-2 ring-blue-500 transition-all">
                                {tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 bg-white/10 text-white px-3 py-1 rounded-full text-sm">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-white/50 hover:text-red-400 transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    placeholder={tags.length === 0 ? "Teg yozing..." : ""}
                                    className="bg-transparent border-none outline-none text-white text-sm flex-1 min-w-[120px] px-2 py-1 placeholder:text-white/30"
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-3 shrink-0 bg-white/2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all font-medium border border-transparent"
                    >
                        Bekor qilish
                    </button>
                    <button
                        type="submit"
                        form="news-form"
                        disabled={isSubmitting || isUploading}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saqlanmoqda...
                            </>
                        ) : (
                            editingNews ? "Yangilash" : "Saqlash"
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
