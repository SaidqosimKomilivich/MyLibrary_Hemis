import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { api } from "../../services/api"
import type { CreateNewsRequest, News, AttachmentInput } from "../../services/api"
import { toast } from "react-toastify"
import {
    X,
    Image as ImageIcon,
    Loader2,
    Tag,
    AlignLeft,
    Pin,
    Paperclip,
    FileText,
    Bold,
    Italic,
    List,
    Link as LinkIcon,
    Code,
    Heading1,
    Heading2,
    Eye,
    Edit3,
} from "lucide-react"
import { CustomSelect } from "../../components/CustomSelect"
import MarkdownRenderer from "../../components/MarkdownRenderer"
import { formatBytes } from "../../utils/formatBytes"

interface AdminNewsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingNews: News | null
}

const CATEGORIES = ["E'lon", "Yangilik"]

export default function AdminNewsModal({
    isOpen,
    onClose,
    onSuccess,
    editingNews,
}: AdminNewsModalProps) {
    const [title, setTitle] = useState("")
    const [summary, setSummary] = useState("")
    const [content, setContent] = useState("")
    const [category, setCategory] = useState(CATEGORIES[0])
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")
    const [images, setImages] = useState<string[]>([])
    const [attachments, setAttachments] = useState<AttachmentInput[]>([])
    const [isPublished, setIsPublished] = useState(false)
    const [isPinned, setIsPinned] = useState(false)
    const [contentTab, setContentTab] = useState<"edit" | "preview">("edit")

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploadingImages, setIsUploadingImages] = useState(false)
    const [isUploadingDoc, setIsUploadingDoc] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const docInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Sync editingNews into form state
    useEffect(() => {
        if (editingNews) {
            setTitle(editingNews.title || "")
            setSummary(editingNews.summary || "")
            setContent(editingNews.content || "")
            setCategory(editingNews.category || CATEGORIES[0])
            setTags(editingNews.tags || [])
            setImages(editingNews.images || [])
            setIsPublished(editingNews.is_published || false)
            setIsPinned(editingNews.is_pinned || false)
            setAttachments(
                editingNews.attachments?.map((a) => ({
                    file_url: a.file_url,
                    file_name: a.file_name,
                    file_size: a.file_size,
                    file_type: a.file_type,
                })) || []
            )
        } else {
            setTitle("")
            setSummary("")
            setContent("")
            setCategory(CATEGORIES[0])
            setTags([])
            setImages([])
            setAttachments([])
            setIsPublished(false)
            setIsPinned(false)
        }
        setContentTab("edit")
    }, [editingNews, isOpen])

    if (!isOpen) return null

    // Tag handlers
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            const newTag = tagInput.trim()
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag])
            }
            setTagInput("")
        }
    }

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove))
    }

    // Image Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024)
        if (validFiles.length < files.length) {
            toast.error("Ba'zi rasmlar hajmi 5 MB dan oshganligi sababli yuklanmadi")
        }

        if (!validFiles.length) {
            if (fileInputRef.current) fileInputRef.current.value = ""
            return
        }

        setIsUploadingImages(true)
        try {
            const uploadPromises = validFiles.map((file) => {
                const { promise } = api.uploadFile(file, () => {})
                return promise
            })
            const results = await Promise.all(uploadPromises)
            const newImageUrls = results
                .filter((res) => res.success && res.files.length > 0)
                .map((res) => res.files[0].url)

            if (newImageUrls.length > 0) {
                setImages((prev) => [...prev, ...newImageUrls])
                toast.success(`${newImageUrls.length} ta rasm yuklandi`)
            }
        } catch (error: any) {
            toast.error(error.message || "Rasm yuklashda xatolik")
        } finally {
            setIsUploadingImages(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const removeImage = (indexToRemove: number) => {
        setImages((prev) => prev.filter((_, i) => i !== indexToRemove))
    }

    // Document Upload (DOCX, DOC, PDF)
    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        const validFiles = files.filter((file) => file.size <= 25 * 1024 * 1024)
        if (validFiles.length < files.length) {
            toast.error("Ba'zi fayllar hajmi 25 MB dan oshganligi sababli yuklanmadi")
        }

        if (!validFiles.length) {
            if (docInputRef.current) docInputRef.current.value = ""
            return
        }

        setIsUploadingDoc(true)
        try {
            for (const file of validFiles) {
                const { promise } = api.uploadFile(file, () => {})
                const res = await promise
                if (res.success && res.files.length > 0) {
                    const uploaded = res.files[0]
                    setAttachments((prev) => [
                        ...prev,
                        {
                            file_url: uploaded.url,
                            file_name: uploaded.original_name || file.name,
                            file_size: uploaded.size,
                            file_type: uploaded.extension || file.name.split(".").pop()?.toLowerCase() || "",
                        },
                    ])
                }
            }
            toast.success("Hujjatlar yuklandi")
        } catch (error: any) {
            toast.error(error.message || "Hujjat yuklashda xatolik")
        } finally {
            setIsUploadingDoc(false)
            if (docInputRef.current) docInputRef.current.value = ""
        }
    }

    const removeAttachment = (indexToRemove: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== indexToRemove))
    }

    // Markdown insertion helper
    const insertMarkdown = (prefix: string, suffix: string = "", placeholder: string = "") => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value
        const selected = text.substring(start, end) || placeholder

        const replacement = `${prefix}${selected}${suffix}`
        const updated = text.substring(0, start) + replacement + text.substring(end)
        setContent(updated)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(
                start + prefix.length,
                start + prefix.length + selected.length
            )
        }, 10)
    }

    // Form submission
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
                is_published: isPublished,
                is_pinned: isPinned,
                attachments: attachments.length > 0 ? attachments : undefined,
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

    const inputClass =
        "w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
    const labelClass = "text-[0.85rem] font-semibold text-text-muted tracking-wide"

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ pointerEvents: isSubmitting || isUploadingImages || isUploadingDoc ? "none" : "auto" }}
        >
            <div
                className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl">
                    <div className="flex items-center gap-2.5">
                        <h2 className="m-0 text-lg font-bold text-text">
                            {editingNews ? "Yangilikni tahrirlash" : "Yangilik qo'shish"}
                        </h2>
                        {isPinned && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                <Pin size={11} className="fill-amber-400" /> Qadalgan
                            </span>
                        )}
                    </div>
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
                            <label className={labelClass}>
                                Sarlavha <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className={inputClass}
                                placeholder="Yangilik yoki e'lon sarlavhasi"
                                required
                            />
                        </div>

                        {/* Image gallery — full width */}
                        <div className="md:col-span-2 flex flex-col gap-2 min-w-0">
                            <div className="flex items-center justify-between">
                                <label className={`${labelClass} flex items-center gap-1.5`}>
                                    <ImageIcon size={13} /> Rasmlar galereyasi
                                </label>
                                <span className="text-[0.75rem] text-text-muted/70">
                                    {images.length > 0
                                        ? `${images.length} ta rasm yuklangan (1-rasm asosiy muqova)`
                                        : "Rasm yuklanmasa, standart ARM logotipi chiqadi"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {images.map((imgUrl, idx) => (
                                    <div
                                        key={idx}
                                        className="relative rounded-xl overflow-hidden group border border-border aspect-square bg-surface"
                                    >
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
                                            <div className="absolute bottom-1 left-1 bg-blue-600 text-[0.6rem] font-bold px-1.5 py-0.5 rounded text-white shadow">
                                                Muqova
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Upload slot */}
                                <div
                                    onClick={() => !isUploadingImages && fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all aspect-square group"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        multiple
                                    />
                                    {isUploadingImages ? (
                                        <Loader2 size={22} className="text-primary animate-spin" />
                                    ) : (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center mb-1 group-hover:bg-primary/10 transition-colors">
                                                <ImageIcon
                                                    size={16}
                                                    className="text-text-muted group-hover:text-primary transition-colors"
                                                />
                                            </div>
                                            <p className="text-text-muted text-[0.7rem] text-center px-1">
                                                Rasm qo'shish
                                            </p>
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
                                options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                                buttonClassName="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                            />
                        </div>

                        {/* Status toggles (Publish & Pin) */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Publish toggle */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <label className={labelClass}>Nashr holati</label>
                                <label className="flex items-center gap-2.5 h-10.5 px-3 border border-border rounded-xl bg-surface/50 cursor-pointer group select-none">
                                    <div
                                        className={`relative w-8 h-5 rounded-full transition-all duration-200 ${
                                            isPublished ? "bg-emerald-500" : "bg-border"
                                        }`}
                                    >
                                        <div
                                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                                                isPublished ? "left-3.5" : "left-0.5"
                                            }`}
                                        />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span
                                        className={`text-xs font-medium truncate ${
                                            isPublished ? "text-emerald-500" : "text-text-muted"
                                        }`}
                                    >
                                        {isPublished ? "Nashr" : "Qoralama"}
                                    </span>
                                </label>
                            </div>

                            {/* Pin toggle */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <label className={labelClass}>Qadab qo'yish</label>
                                <label className="flex items-center gap-2.5 h-10.5 px-3 border border-border rounded-xl bg-surface/50 cursor-pointer group select-none">
                                    <div
                                        className={`relative w-8 h-5 rounded-full transition-all duration-200 ${
                                            isPinned ? "bg-amber-500" : "bg-border"
                                        }`}
                                    >
                                        <div
                                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                                                isPinned ? "left-3.5" : "left-0.5"
                                            }`}
                                        />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isPinned}
                                        onChange={(e) => setIsPinned(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span
                                        className={`text-xs font-medium flex items-center gap-1 truncate ${
                                            isPinned ? "text-amber-500 font-semibold" : "text-text-muted"
                                        }`}
                                    >
                                        <Pin size={11} className={isPinned ? "fill-amber-500" : ""} />
                                        {isPinned ? "Qadalgan" : "Oddiy"}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Summary — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                            <label className={labelClass}>
                                <span className="flex items-center gap-1.5">
                                    <AlignLeft size={13} /> Qisqacha mazmun (ixtiyoriy)
                                </span>
                            </label>
                            <textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className={`${inputClass} resize-none h-18`}
                                placeholder="Kartochkada chiqadigan qisqacha ma'lumot..."
                            />
                        </div>

                        {/* Content (Markdown Editor) — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                            <div className="flex items-center justify-between">
                                <label className={labelClass}>
                                    To'liq matn (Markdown) <span className="text-rose-400">*</span>
                                </label>
                                {/* Edit / Preview tabs */}
                                <div className="flex bg-surface-hover/80 border border-border/80 rounded-lg p-0.5 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setContentTab("edit")}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                                            contentTab === "edit"
                                                ? "bg-primary text-white shadow-sm"
                                                : "text-text-muted hover:text-text"
                                        }`}
                                    >
                                        <Edit3 size={12} /> Tahrirlash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setContentTab("preview")}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                                            contentTab === "preview"
                                                ? "bg-primary text-white shadow-sm"
                                                : "text-text-muted hover:text-text"
                                        }`}
                                    >
                                        <Eye size={12} /> Ko'rib chiqish
                                    </button>
                                </div>
                            </div>

                            {/* Markdown formatting toolbar (visible in edit mode) */}
                            {contentTab === "edit" ? (
                                <div className="flex flex-col rounded-xl border border-border overflow-hidden bg-surface/50 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all">
                                    <div className="flex items-center gap-1 p-1.5 bg-surface-hover/50 border-b border-border/50 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("# ", "", "Katta Sarlavha")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text text-xs"
                                            title="Sarlavha 1"
                                        >
                                            <Heading1 size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("## ", "", "Kichik Sarlavha")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text text-xs"
                                            title="Sarlavha 2"
                                        >
                                            <Heading2 size={15} />
                                        </button>
                                        <div className="w-[1px] h-4 bg-border mx-1" />
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("**", "**", "qalin matn")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text"
                                            title="Qalin (Bold)"
                                        >
                                            <Bold size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("*", "*", "kursiv matn")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text"
                                            title="Kursiv (Italic)"
                                        >
                                            <Italic size={14} />
                                        </button>
                                        <div className="w-[1px] h-4 bg-border mx-1" />
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("- ", "", "Ro'yxat elementi")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text"
                                            title="Belgili ro'yxat"
                                        >
                                            <List size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("[", "](https://example.com)", "Havola nomi")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text"
                                            title="Havola qo'shish"
                                        >
                                            <LinkIcon size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("`", "`", "kod")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text"
                                            title="Kod"
                                        >
                                            <Code size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertMarkdown("> ", "", "Muhim eslatma")}
                                            className="p-1.5 rounded hover:bg-surface text-text-muted hover:text-text text-xs font-serif"
                                            title="Iqtibos (Quote)"
                                        >
                                            &ldquo;&rdquo;
                                        </button>
                                    </div>
                                    <textarea
                                        ref={textareaRef}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="w-full bg-transparent text-text p-3 text-[0.95rem] outline-none resize-y min-h-40 leading-relaxed font-sans"
                                        placeholder="Yangilik to'liq matnini Markdown formatida yozing..."
                                        required
                                    />
                                </div>
                            ) : (
                                <div className="border border-border rounded-xl p-4 bg-surface/30 min-h-40 max-h-80 overflow-y-auto custom-scrollbar">
                                    {content.trim() ? (
                                        <MarkdownRenderer content={content} />
                                    ) : (
                                        <div className="text-text-muted/50 italic text-center py-8">
                                            Matn kiritilmagan. Tahrirlash bo'limiga o'ting.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Attachments (DOCX, PDF) — full width */}
                        <div className="md:col-span-2 flex flex-col gap-2 min-w-0">
                            <div className="flex items-center justify-between">
                                <label className={`${labelClass} flex items-center gap-1.5`}>
                                    <Paperclip size={13} /> Biriktirilgan hujjatlar (DOCX, DOC, PDF)
                                </label>
                                <span className="text-[0.75rem] text-text-muted/70">
                                    {attachments.length} ta hujjat
                                </span>
                            </div>

                            {/* Attached files list */}
                            {attachments.length > 0 && (
                                <div className="space-y-2">
                                    {attachments.map((att, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-surface/50 hover:bg-surface-hover/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <a
                                                        href={att.file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sm font-medium text-text hover:text-blue-400 truncate block transition-colors"
                                                    >
                                                        {att.file_name}
                                                    </a>
                                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                                        <span className="uppercase font-semibold">
                                                            {att.file_type}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{formatBytes(att.file_size)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(idx)}
                                                className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                title="Hujjatni o'chirish"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upload document button */}
                            <div
                                onClick={() => !isUploadingDoc && docInputRef.current?.click()}
                                className="border border-dashed border-border rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-text-muted hover:text-primary group"
                            >
                                <input
                                    type="file"
                                    ref={docInputRef}
                                    onChange={handleDocUpload}
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    className="hidden"
                                    multiple
                                />
                                {isUploadingDoc ? (
                                    <>
                                        <Loader2 size={16} className="text-primary animate-spin" />
                                        <span>Hujjat yuklanmoqda...</span>
                                    </>
                                ) : (
                                    <>
                                        <Paperclip size={16} className="group-hover:scale-110 transition-transform" />
                                        <span>Hujjat biriktirish (.docx, .pdf, max 25MB)</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tags — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                            <label className={`${labelClass} flex items-center gap-1.5`}>
                                <Tag size={13} /> Teglar
                                <span className="font-normal text-text-muted/60 normal-case">
                                    (Vergul yoki Enter)
                                </span>
                            </label>
                            <div className="w-full bg-surface/50 border border-border rounded-xl px-3 py-2 flex flex-wrap gap-2 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all min-h-10.5">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-[0.8rem] font-semibold"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="text-primary/50 hover:text-rose-400 transition-colors ml-0.5"
                                        >
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
                                    className="bg-transparent border-none outline-none text-text text-[0.9rem] flex-1 min-w-25 py-0.5 placeholder:text-text-muted/50"
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
                            disabled={isSubmitting || isUploadingImages || isUploadingDoc || !title || !content}
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
