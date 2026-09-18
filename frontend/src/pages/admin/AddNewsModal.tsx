import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { api } from "../../services/api"
import type { CreateNewsRequest, News, AttachmentInput } from "../../services/api"
import { toast } from "react-toastify"
import {
    X,
    Loader2,
    Pin,
    Paperclip,
    FileText,
    Upload,
    CheckCircle2,
} from "lucide-react"
import { Editor } from "@tinymce/tinymce-react"
import { useTheme } from "../../context/ThemeContext"
import { formatBytes } from "../../utils/formatBytes"

interface AdminNewsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingNews: News | null
}

export default function AdminNewsModal({
    isOpen,
    onClose,
    onSuccess,
    editingNews,
}: AdminNewsModalProps) {
    const { theme } = useTheme()

    // Faqat kerakli maydonlar: Sarlavha, Matn (TinyMCE) va Biriktirilgan fayllar
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [attachments, setAttachments] = useState<AttachmentInput[]>([])
    const [isPublished, setIsPublished] = useState(true)
    const [isPinned, setIsPinned] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploadingDoc, setIsUploadingDoc] = useState(false)
    const [isEditorReady, setIsEditorReady] = useState(false)
    const [usePlainEditor, setUsePlainEditor] = useState(false)

    const docInputRef = useRef<HTMLInputElement>(null)

    // Sync editingNews into form state
    useEffect(() => {
        if (editingNews) {
            setTitle(editingNews.title || "")
            setContent(editingNews.content || "")
            setIsPublished(editingNews.is_published ?? true)
            setIsPinned(editingNews.is_pinned ?? false)
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
            setContent("")
            setAttachments([])
            setIsPublished(true)
            setIsPinned(false)
        }
    }, [editingNews, isOpen])

    if (!isOpen) return null

    // Document Upload (DOCX, DOC, PDF, XLSX, ZIP)
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
            toast.success("Hujjatlar biriktirildi")
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
                title: title.trim(),
                content: content.trim(),
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

    return createPortal(
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-999 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-surface border border-border rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface-hover/30 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-text">
                            {editingNews ? "Yangilik / E'lonni tahrirlash" : "Yangi qo'shish"}
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5">
                            Sarlavha, vizual matn (rasmlar bilan) va biriktirilgan hujjatlarni kiriting
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                        title="Yopish"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 1. Sarlavha (Title) */}
                    <div>
                        <label className="block text-sm font-semibold text-text mb-2">
                            Sarlavha <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Yangilik yoki e'lon sarlavhasini kiriting..."
                            className="w-full px-4 py-3 bg-surface-hover/50 border border-border rounded-2xl text-text font-medium placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-colors shadow-sm text-base"
                        />
                    </div>

                    {/* 2. Yangilik va E'lon Matni (TinyMCE WYSIWYG Editor) */}
                    <div>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <label className="text-sm font-semibold text-text flex items-center gap-1.5">
                                Yangilik / E'lon matni <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-text-muted hidden sm:inline">
                                    Rasmlarni to'g'ridan-to'g'ri joylashtirishingiz mumkin
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setUsePlainEditor(!usePlainEditor)}
                                    className="text-xs text-blue-500 hover:text-blue-400 font-medium px-2.5 py-1 rounded-lg hover:bg-blue-500/10 transition-colors border border-blue-500/20"
                                >
                                    {usePlainEditor ? "⚡ Vizual muharrir (TinyMCE)" : "📝 Oddiy matn (HTML)"}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-border shadow-inner bg-canvas relative">
                            {usePlainEditor ? (
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Yangilik yoki e'lon matnini kiriting (HTML formatda)..."
                                    rows={16}
                                    className="w-full bg-canvas text-text p-4 outline-none font-sans text-[0.95rem] leading-relaxed resize-y border border-border min-h-105"
                                />
                            ) : (
                                <div className="relative min-h-115">
                                    {!isEditorReady && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-text-muted bg-surface/90 backdrop-blur-xs gap-3">
                                            <Loader2 size={32} className="animate-spin text-primary" />
                                            <span className="text-sm font-medium">Vizual muharrir tayyorlanmoqda...</span>
                                            <button
                                                type="button"
                                                onClick={() => setUsePlainEditor(true)}
                                                className="text-xs text-primary hover:underline mt-1"
                                            >
                                                Kutishni istamasangiz, oddiy matn rejimiga o'tish
                                            </button>
                                        </div>
                                    )}
                                    <Editor
                                            key={`tinymce-${theme}-${editingNews?.id || "new"}`}
                                            tinymceScriptSrc="/tinymce/tinymce.min.js"
                                            licenseKey="gpl"
                                            value={content}
                                            onEditorChange={(newVal) => setContent(newVal)}
                                            onInit={() => setIsEditorReady(true)}
                                            init={{
                                                base_url: "/tinymce",
                                                suffix: ".min",
                                                height: 460,
                                                menubar: false,
                                                plugins: [
                                                    "advlist",
                                                    "autolink",
                                                    "lists",
                                                    "link",
                                                    "image",
                                                    "charmap",
                                                    "preview",
                                                    "anchor",
                                                    "searchreplace",
                                                    "visualblocks",
                                                    "code",
                                                    "fullscreen",
                                                    "insertdatetime",
                                                    "media",
                                                    "table",
                                                    "help",
                                                    "wordcount",
                                                ],
                                                toolbar:
                                                    "undo redo | blocks | bold italic underline strikethrough | " +
                                                    "alignleft aligncenter alignright alignjustify | " +
                                                    "bullist numlist outdent indent | link image table | " +
                                                    "removeformat code fullscreen",
                                                toolbar_mode: "sliding",
                                                skin: theme === "dark" ? "oxide-dark" : "oxide",
                                                content_css: theme === "dark" ? "dark" : "default",
                                                content_style:
                                                    "body { font-family: Inter, sans-serif; font-size: 15px; line-height: 1.6; padding: 14px; } " +
                                                    "img { max-width: 100%; height: auto; border-radius: 10px; margin: 8px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); } " +
                                                    "table { border-collapse: collapse; width: 100%; margin: 12px 0; } " +
                                                    "table th, table td { border: 1px solid #cbd5e1; padding: 8px; }",
                                                branding: false,
                                                statusbar: true,
                                                elementpath: false,
                                                paste_data_images: true,
                                                automatic_uploads: true,
                                                images_upload_handler: (blobInfo: any) => {
                                                    return new Promise((resolve, reject) => {
                                                        const formData = new FormData()
                                                        formData.append("file", blobInfo.blob(), blobInfo.filename())

                                                        fetch("/api/tinymce-upload", {
                                                            method: "POST",
                                                            credentials: "include",
                                                            body: formData,
                                                        })
                                                            .then(async (res) => {
                                                                if (!res.ok) {
                                                                    const errJson = await res.json().catch(() => ({}))
                                                                    throw new Error(errJson.message || `Yuklashda xatolik: ${res.status}`)
                                                                }
                                                                return res.json()
                                                            })
                                                            .then((data) => {
                                                                if (!data.location) {
                                                                    throw new Error("Serverdan rasm manzili olinmadi")
                                                                }
                                                                resolve(data.location)
                                                            })
                                                            .catch((err) => {
                                                                reject(err.message || "Rasm yuklashda xatolik yuz berdi")
                                                            })
                                                    })
                                                },
                                            }}
                                        />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Unga biriktirilgan fayllar (Attachments) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className=" text-sm font-semibold text-text flex items-center gap-1.5">
                                <Paperclip size={16} className="text-blue-500" />
                                Biriktirilgan hujjatlar / fayllar (PDF, DOCX va h.k.)
                            </label>
                            <span className="text-xs text-text-muted">Maks. 25 MB</span>
                        </div>

                        <div className="space-y-3">
                            {/* Upload trigger button */}
                            <div>
                                <input
                                    type="file"
                                    ref={docInputRef}
                                    onChange={handleDocUpload}
                                    multiple
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => docInputRef.current?.click()}
                                    disabled={isUploadingDoc}
                                    className="w-full py-4 border-2 border-dashed border-border hover:border-blue-500/60 rounded-2xl bg-surface-hover/30 hover:bg-surface-hover/60 transition-all flex flex-col items-center justify-center gap-1.5 text-text-muted hover:text-text cursor-pointer disabled:opacity-50"
                                >
                                    {isUploadingDoc ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin text-blue-500" />
                                            <span className="text-xs font-medium">Hujjatlar yuklanmoqda...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={22} className="text-blue-500" />
                                            <span className="text-xs font-medium text-text">
                                                Fayllarni yuklash uchun bosing yoki shu yerga tashlang
                                            </span>
                                            <span className="text-[0.7rem] text-text-muted">
                                                PDF, Word, Excel, Taqdimot yoki arxiv fayllar
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Attached files list */}
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {attachments.map((att, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-hover/40 text-xs shadow-xs"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-text truncate max-w-50">
                                                        {att.file_name}
                                                    </p>
                                                    <p className="text-[0.65rem] text-text-muted uppercase">
                                                        {att.file_type} • {formatBytes(att.file_size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(idx)}
                                                className="p-1 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-2 shrink-0"
                                                title="O'chirish"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Sozlamalar: Nashr qilish va Qadash switchlari */}
                    <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6 flex-wrap">
                            {/* Publish toggle */}
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-text">
                                    Darhol nashr etilsin (Ommaga ko'rinsin)
                                </span>
                            </label>

                            {/* Pin toggle */}
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                                />
                                <span className="text-sm font-medium text-text flex items-center gap-1">
                                    <Pin size={14} className={isPinned ? "fill-amber-500 text-amber-500" : "text-text-muted"} />
                                    Bosh sahifada yuqoriga qadab qo'yish
                                </span>
                            </label>
                        </div>
                    </div>
                </form>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-hover/30 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl border border-border text-text text-sm font-medium hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                        Bekor qilish
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim()}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Saqlanmoqda...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                {editingNews ? "O'zgarishlarni saqlash" : "Nashr qilish"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
