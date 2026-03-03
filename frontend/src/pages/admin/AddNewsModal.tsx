import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { api } from "../../services/api"
import type { CreateNewsRequest } from "../../services/api"
import { toast } from "react-toastify"
import { X, Image as ImageIcon, Loader2, Tag, AlignLeft } from "lucide-react"
import { CustomSelect } from "../../components/CustomSelect"

interface AdminNewsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingNews: any | null
}

const CATEGORIES = ["E'lon", "Yangilik"]

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
            if (fileInputRef.current) fileInputRef.current.value = ''
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

    const inputClass = "w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
    const labelClass = "text-[0.85rem] font-semibold text-text-muted tracking-wide"

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
            style={{ pointerEvents: isSubmitting || isUploading ? 'none' : 'auto' }}
        >
            <div
                className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl">
                    <h2 className="m-0 text-lg font-bold text-text">
                        {editingNews ? "Yangilikni Tahrirlash" : "Yangi Yangilik Qo'shish"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form body */}
                <form id="news-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5 content-start">

                        {/* Title — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                            <label className={labelClass}>Sarlavha <span className="text-rose-400">*</span></label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className={inputClass}
                                placeholder="Yangilik sarlavhasi"
                                required
                            />
                        </div>

                        {/* Image gallery — full width */}
                        <div className="md:col-span-2 flex flex-col gap-2 min-w-0">
                            <div className="flex items-center justify-between">
                                <label className={`${labelClass} flex items-center gap-1.5`}>
                                    <ImageIcon size={13} /> Rasmlar galereyasi
                                </label>
                                <span className="text-[0.75rem] text-text-muted/60">{images.length} ta rasm yuklangan</span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {images.map((imgUrl, idx) => (
                                    <div key={idx} className="relative rounded-xl overflow-hidden group border border-border aspect-square">
                                        <img
                                            src={imgUrl}
                                            alt={`Gallery ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="w-8 h-8 bg-rose-500/90 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition-all"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        {idx === 0 && (
                                            <div className="absolute bottom-1 left-1 bg-primary/90 text-[0.6rem] font-bold px-1.5 py-0.5 rounded text-white">
                                                Muqova
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Upload slot */}
                                <div
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all aspect-square group"
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
                                        <Loader2 size={22} className="text-primary animate-spin" />
                                    ) : (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center mb-1 group-hover:bg-primary/10 transition-colors">
                                                <ImageIcon size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                                            </div>
                                            <p className="text-text-muted text-[0.7rem] text-center px-1">Rasm qo'sh</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className={labelClass}>Rukn</label>
                            <CustomSelect
                                value={category}
                                onChange={(val) => setCategory(val)}
                                options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                                buttonClassName="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                            />
                        </div>

                        {/* Publish toggle */}
                        <div className="flex flex-col gap-1.5 min-w-0 justify-end">
                            <label className={labelClass}>Nashr holati</label>
                            <label className="flex items-center gap-3 h-[42px] px-3 border border-border rounded-xl bg-surface/50 cursor-pointer group select-none">
                                <div className={`relative w-10 h-6 rounded-full transition-all duration-200 ${isPublished ? 'bg-emerald-500' : 'bg-border'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${isPublished ? 'left-5' : 'left-1'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="hidden"
                                />
                                <span className={`text-[0.9rem] font-medium transition-colors ${isPublished ? 'text-emerald-500' : 'text-text-muted'}`}>
                                    {isPublished ? 'Nashr qilindi' : 'Qoralama'}
                                </span>
                            </label>
                        </div>

                        {/* Summary — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                            <label className={labelClass}>
                                <span className="flex items-center gap-1.5"><AlignLeft size={13} /> Qisqacha mazmun</span>
                            </label>
                            <textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className={`${inputClass} resize-none h-20`}
                                placeholder="..."
                            />
                        </div>

                        {/* Content — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                            <label className={labelClass}>
                                To'liq matn <span className="text-rose-400">*</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className={`${inputClass} resize-y min-h-[120px]`}
                                placeholder="Yangilik matni"
                                required
                            />
                        </div>

                        {/* Tags — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                            <label className={`${labelClass} flex items-center gap-1.5`}>
                                <Tag size={13} /> Teglar
                                <span className="font-normal text-text-muted/60 normal-case">(Vergul yoki Enter)</span>
                            </label>
                            <div className="w-full bg-surface/50 border border-border rounded-xl px-3 py-2 flex flex-wrap gap-2 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all min-h-[42px]">
                                {tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-[0.8rem] font-semibold">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-primary/50 hover:text-rose-400 transition-colors ml-0.5">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    placeholder={tags.length === 0 ? "Teg yozing..." : ""}
                                    className="bg-transparent border-none outline-none text-text text-[0.9rem] flex-1 min-w-[100px] py-0.5 placeholder:text-text-muted/50"
                                />
                            </div>
                        </div>

                        

                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 p-5 border-t border-border bg-surface-hover rounded-b-2xl mt-auto shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl border border-white/10 bg-transparent text-text font-semibold cursor-pointer transition-colors hover:bg-white/5 disabled:opacity-50"
                        >
                            Bekor qilish
                        </button>
                        <button
                            type="submit"
                            form="news-form"
                            disabled={isSubmitting || isUploading || !title || !content}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-none font-semibold cursor-pointer transition-all bg-primary text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        >
                            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                            {editingNews ? "Yangilash" : "Saqlash"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
