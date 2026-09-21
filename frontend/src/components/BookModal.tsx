import { useState, useEffect, useRef, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Upload, Check, AlertTriangle, Sparkles, FileText, Image as ImageIcon } from 'lucide-react'
import { toast } from 'react-toastify'
import { api, type CreateBookRequest, type Book, type UploadProgress } from '../services/api'
import { compressImage } from '../utils/imageCompressor'
import { CustomSelect } from './CustomSelect'
import {
    BOOK_CATEGORIES,
    BOOK_GENRES,
    BOOK_AUDIENCES,
    BOOK_FORMATS,
    BOOK_LANGUAGES
} from '../constants/bookClassification'

interface BookModalProps {
    isOpen: boolean
    mode: 'add' | 'edit'
    book?: Book | null
    onClose: () => void
    onSuccess: () => void
}

const emptyForm: CreateBookRequest = {
    title: '',
    author: '',
    category: '',
    genre: '',
    target_audience: '',
    isbn_13: '',
    total_quantity: 1,
    available_quantity: 1,
    publisher: '',
    publication_date: new Date().getFullYear(),
    language: 'uz',
    description: '',
    page_count: 0,
    shelf_location: '',
    format: 'bosma',
    cover_image_url: '',
    digital_file_url: '',
    duration_seconds: 0,
}

export default function BookModal({ isOpen, mode, book, onClose, onSuccess }: BookModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isUploadingCover, setIsUploadingCover] = useState(false)
    const [isUploadingFile, setIsUploadingFile] = useState(false)
    const [coverProgress, setCoverProgress] = useState<UploadProgress | null>(null)
    const [fileProgress, setFileProgress] = useState<UploadProgress | null>(null)
    const [localCoverPreview, setLocalCoverPreview] = useState<string | null>(null)
    const [isDraggingCover, setIsDraggingCover] = useState(false)
    const [isDraggingFile, setIsDraggingFile] = useState(false)
    const [formData, setFormData] = useState<CreateBookRequest>({ ...emptyForm })

    // XHR refs for abort support
    const coverXhrRef = useRef<XMLHttpRequest | null>(null)
    const fileXhrRef = useRef<XMLHttpRequest | null>(null)

    useEffect(() => {
        if (mode === 'edit' && book) {
            setFormData({
                title: book.title,
                author: book.author,
                category: book.category || '',
                genre: book.genre || '',
                target_audience: book.target_audience || '',
                isbn_13: book.isbn_13 || '',
                total_quantity: book.total_quantity || 1,
                available_quantity: book.available_quantity || 1,
                publisher: book.publisher || '',
                publication_date: book.publication_date || new Date().getFullYear(),
                language: book.language || 'uz',
                description: book.description || '',
                page_count: book.page_count || 0,
                shelf_location: book.shelf_location || '',
                format: book.format || 'bosma',
                cover_image_url: book.cover_image_url || '',
                digital_file_url: book.digital_file_url || '',
                duration_seconds: book.duration_seconds || 0,
            })
        } else {
            setFormData({ ...emptyForm })
        }
        if (localCoverPreview) {
            URL.revokeObjectURL(localCoverPreview)
            setLocalCoverPreview(null)
        }
    }, [mode, book, isOpen])

    // Duplicate detection states
    const [duplicateBook, setDuplicateBook] = useState<Book | null>(null)
    const [duplicateMatchType, setDuplicateMatchType] = useState<'isbn' | 'title_author' | null>(null)
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
    const [duplicateDismissed, setDuplicateDismissed] = useState(false)

    // Duplicate detection debounce effect
    useEffect(() => {
        if (mode !== 'add' || !isOpen) {
            setDuplicateBook(null)
            setDuplicateMatchType(null)
            setDuplicateDismissed(false)
            return
        }

        const titleTrimmed = (formData.title || '').trim()
        const authorTrimmed = (formData.author || '').trim()
        const isbnTrimmed = (formData.isbn_13 || '').trim()

        const canCheck = isbnTrimmed.length >= 3 || (titleTrimmed.length >= 2 && authorTrimmed.length >= 2)

        if (!canCheck) {
            setDuplicateBook(null)
            setDuplicateMatchType(null)
            return
        }

        setIsCheckingDuplicate(true)
        const timer = setTimeout(async () => {
            try {
                const res = await api.checkBookDuplicate({
                    title: titleTrimmed || undefined,
                    author: authorTrimmed || undefined,
                    isbn: isbnTrimmed || undefined,
                })
                if (res.data && res.data.exists && res.data.book) {
                    setDuplicateBook(res.data.book)
                    setDuplicateMatchType(res.data.match_type)
                    setDuplicateDismissed(false)
                } else {
                    setDuplicateBook(null)
                    setDuplicateMatchType(null)
                }
            } catch {
                setDuplicateBook(null)
            } finally {
                setIsCheckingDuplicate(false)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [formData.title, formData.author, formData.isbn_13, mode, isOpen])

    const handleApplyDuplicateBook = () => {
        if (!duplicateBook) return
        setFormData(prev => ({
            ...prev,
            title: duplicateBook.title || prev.title,
            author: duplicateBook.author || prev.author,
            category: duplicateBook.category || prev.category,
            genre: duplicateBook.genre || prev.genre,
            target_audience: duplicateBook.target_audience || prev.target_audience,
            isbn_13: duplicateBook.isbn_13 || prev.isbn_13,
            publisher: duplicateBook.publisher || prev.publisher,
            publication_date: duplicateBook.publication_date || prev.publication_date,
            language: duplicateBook.language || prev.language,
            description: duplicateBook.description || prev.description,
            page_count: duplicateBook.page_count || prev.page_count,
            shelf_location: duplicateBook.shelf_location || prev.shelf_location,
            format: duplicateBook.format || prev.format,
            cover_image_url: duplicateBook.cover_image_url || prev.cover_image_url,
            digital_file_url: duplicateBook.digital_file_url || prev.digital_file_url,
            duration_seconds: duplicateBook.duration_seconds || prev.duration_seconds,
        }))
        toast.success("Kitob ma'lumotlari avtomatik to'ldirildi!")
        setDuplicateDismissed(true)
    }

    if (!isOpen) return null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }))
    }

    const processCoverFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error("Faqat rasm fayllari (JPG, PNG, WEBP) qabul qilinadi")
            return
        }

        if (file.size > 15 * 1024 * 1024) {
            toast.error("Rasm hajmi 15 MB dan oshmasligi kerak")
            return
        }

        // Instant local preview
        const previewUrl = URL.createObjectURL(file)
        setLocalCoverPreview(previewUrl)
        setIsUploadingCover(true)
        setCoverProgress(null)

        try {
            // Client-side WebP compression
            const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1600, quality: 0.82 })
            const { promise, xhr } = api.uploadFile(compressed, (p) => setCoverProgress(p))
            coverXhrRef.current = xhr
            const res = await promise
            const url = res.files[0]?.url
            if (url) {
                setFormData(prev => ({ ...prev, cover_image_url: url }))
                toast.success("Muqova rasmi yuklandi")
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Rasm yuklashda xatolik"
            if (message !== 'Yuklash bekor qilindi') toast.error(message)
            setLocalCoverPreview(null)
        } finally {
            setIsUploadingCover(false)
            setCoverProgress(null)
            coverXhrRef.current = null
        }
    }

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processCoverFile(file)
        e.target.value = ''
    }

    const processDigitalFile = async (file: File) => {
        if (file.size > 150 * 1024 * 1024) {
            toast.error("Fayl hajmi 150 MB dan oshmasligi kerak")
            return
        }

        setIsUploadingFile(true)
        setFileProgress(null)
        try {
            const { promise, xhr } = api.uploadFile(file, (p) => setFileProgress(p))
            fileXhrRef.current = xhr
            const res = await promise
            const uploaded = res.files[0]
            if (uploaded?.url) {
                setFormData(prev => ({ ...prev, digital_file_url: uploaded.url }))
                toast.success(`Fayl yuklandi: ${uploaded.original_name}`)
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Fayl yuklashda xatolik"
            if (message !== 'Yuklash bekor qilindi') toast.error(message)
        } finally {
            setIsUploadingFile(false)
            setFileProgress(null)
            fileXhrRef.current = null
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processDigitalFile(file)
        e.target.value = ''
    }

    const handleCancelCoverUpload = () => {
        coverXhrRef.current?.abort()
        if (localCoverPreview) {
            URL.revokeObjectURL(localCoverPreview)
            setLocalCoverPreview(null)
        }
    }

    const handleCancelFileUpload = () => {
        fileXhrRef.current?.abort()
    }

    const handleRemoveCover = async () => {
        const url = formData.cover_image_url
        if (url) {
            try { await api.deleteFile(url) } catch { /* ignore */ }
        }
        if (localCoverPreview) {
            URL.revokeObjectURL(localCoverPreview)
            setLocalCoverPreview(null)
        }
        setFormData(prev => ({ ...prev, cover_image_url: '' }))
    }

    const handleRemoveDigitalFile = async () => {
        const url = formData.digital_file_url
        if (url) {
            try { await api.deleteFile(url) } catch { /* ignore */ }
        }
        setFormData(prev => ({ ...prev, digital_file_url: '' }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Clean data: convert empty strings to undefined so they serialize as null
            const dataToSend: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(formData)) {
                if (typeof value === 'string' && value.trim() === '') {
                    continue // skip empty strings — backend will use NULL
                }
                if (typeof value === 'number' && value === 0 && key !== 'total_quantity' && key !== 'available_quantity') {
                    continue // skip zero values for optional number fields
                }
                dataToSend[key] = value
            }

            // ISBN-13 validation
            if (dataToSend.isbn_13 && String(dataToSend.isbn_13).length > 13) {
                toast.error("ISBN-13 maksimum 13 ta belgidan iborat bo'lishi kerak")
                setIsLoading(false)
                return
            }

            // Muallif bo'sh bo'lsa standart fallback
            if (!dataToSend.author || String(dataToSend.author).trim() === '') {
                dataToSend.author = "Noma'lum muallif"
            }

            // When adding new book, set available = total
            if (mode === 'add') {
                dataToSend.available_quantity = dataToSend.total_quantity
            }

            if (mode === 'edit' && book) {
                await api.updateBook(book.id, dataToSend as unknown as Partial<CreateBookRequest>)
                toast.success("Kitob muvaffaqiyatli yangilandi")
            } else {
                await api.createBook(dataToSend as unknown as CreateBookRequest)
                toast.success("Kitob muvaffaqiyatli qo'shildi")
            }

            onSuccess()
            onClose()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Xatolik yuz berdi"
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    const modalTitle = mode === 'edit' ? "Kitobni tahrirlash" : "Yangi kitob qo'shish"

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ pointerEvents: isLoading || isUploadingCover || isUploadingFile ? 'none' : 'auto' }}>
            <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl">
                    <h2 className="m-0 text-lg font-bold text-text">{modalTitle}</h2>
                    <button onClick={onClose} className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5 contents-start">
                        {/* Duplicate Alert Banner */}
                        {mode === 'add' && duplicateBook && !duplicateDismissed && (
                            <div 
                                className="md:col-span-2 bg-linear-to-r from-amber-500/15 to-orange-500/10 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200 transition-all hover:border-amber-500/60"
                            >
                                <div className="flex items-start gap-3.5 cursor-pointer flex-1" onClick={handleApplyDuplicateBook}>
                                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5 sm:mt-0 shrink-0 shadow-inner">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[0.95rem] font-bold text-amber-300">
                                                Tizimda ushbu kitob allaqachon mavjud!
                                            </span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                                                {duplicateMatchType === 'isbn' ? 'ISBN mosligi' : 'Nomi va muallif mosligi'}
                                            </span>
                                        </div>
                                        <p className="m-0 text-sm text-text-muted">
                                            <strong className="text-text font-semibold">"{duplicateBook.title}"</strong> — {duplicateBook.author}
                                            {duplicateBook.publication_date ? ` (${duplicateBook.publication_date}-yil)` : ''}
                                            {duplicateBook.total_quantity !== undefined && duplicateBook.total_quantity !== null && (
                                                <span className="ml-2 text-text font-medium opacity-90">| Fondda: {duplicateBook.total_quantity} dona</span>
                                            )}
                                        </p>
                                        <p className="m-0 text-xs text-amber-300/80 font-medium">
                                            💡 Shu kitob ma'lumotlarini (muqova, nashriyot, tavsif va h.k.) avtomatik yuklash uchun bosing
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 self-end sm:self-center">
                                    <button
                                        type="button"
                                        onClick={handleApplyDuplicateBook}
                                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition-all shadow-md cursor-pointer border-none active:scale-95"
                                    >
                                        <Sparkles size={16} />
                                        <span>Ma'lumotlarni to'ldirish</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setDuplicateDismissed(true)
                                        }}
                                        title="E'tiborsiz qoldirish (Yangi kitob deb hisoblash)"
                                        className="p-2.5 rounded-xl text-text-muted hover:text-text hover:bg-white/10 border border-border/50 cursor-pointer transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide flex items-center justify-between">
                                <span>Kitob nomi *</span>
                                {isCheckingDuplicate && (
                                    <span className="text-xs font-normal text-amber-400/90 flex items-center gap-1">
                                        <Loader2 className="animate-spin" size={12} />
                                        <span>Bazada tekshirilmoqda...</span>
                                    </span>
                                )}
                            </label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" required name="title" value={formData.title} onChange={handleChange} placeholder="Masalan: O'tkan kunlar" />
                        </div>

                        {/* Author */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Muallif *</label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" required name="author" value={formData.author} onChange={handleChange} placeholder="Masalan: Abdulla Qodiriy" />
                        </div>

                        {/* Category (Soha / Fan) */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Fan va soha</label>
                            <CustomSelect
                                value={formData.category || ''}
                                onChange={(val) => setFormData({ ...formData, category: val })}
                                options={[
                                    { value: '', label: 'Sohani tanlang' },
                                    ...BOOK_CATEGORIES
                                ]}
                                buttonClassName="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                            />
                        </div>

                        {/* Genre (Nashr / Adabiyot turi) */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nashr / Adabiyot turi</label>
                            <CustomSelect
                                value={formData.genre || ''}
                                onChange={(val) => setFormData({ ...formData, genre: val })}
                                options={[
                                    { value: '', label: 'Nashr turini tanlang' },
                                    ...BOOK_GENRES
                                ]}
                                buttonClassName="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                            />
                        </div>

                        {/* Target Audience (Kitobxon auditoriyasi) */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Kitobxon auditoriyasi</label>
                            <CustomSelect
                                value={formData.target_audience || ''}
                                onChange={(val) => setFormData({ ...formData, target_audience: val })}
                                options={[
                                    { value: '', label: 'Auditoriyani tanlang' },
                                    ...BOOK_AUDIENCES
                                ]}
                                buttonClassName="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                            />
                        </div>

                        {/* Format */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Format</label>
                            <CustomSelect
                                value={formData.format || 'bosma'}
                                onChange={(val) => setFormData({ ...formData, format: val })}
                                options={BOOK_FORMATS}
                                buttonClassName="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                            />
                        </div>

                        {/* ISBN */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">ISBN</label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="isbn_13" value={formData.isbn_13} onChange={handleChange} maxLength={13} placeholder="9781234567890" />
                        </div>

                        {/* Total quantity */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Umumiy soni</label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" min="1" name="total_quantity" value={formData.total_quantity} onChange={handleChange} />
                        </div>

                        {/* Publisher */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nashriyot</label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="publisher" value={formData.publisher} onChange={handleChange} />
                        </div>

                        {/* Publication year */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nashr yili</label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" name="publication_date" value={formData.publication_date} onChange={handleChange} />
                        </div>

                        {/* Language */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Til</label>
                            <CustomSelect
                                value={formData.language || 'uz'}
                                onChange={(val) => setFormData({ ...formData, language: val })}
                                options={BOOK_LANGUAGES}
                                buttonClassName="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                            />
                        </div>

                        {/* Page count */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Sahifalar soni</label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" name="page_count" value={formData.page_count} onChange={handleChange} />
                        </div>

                        {/* Shelf location */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Joylashuvi (Polka)</label>
                            <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="shelf_location" value={formData.shelf_location} onChange={handleChange} placeholder="A-12" />
                        </div>

                        {/* Duration (audio only) */}
                        {formData.format === 'audio' && (
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Davomiyligi (soniya)</label>
                                <input className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" name="duration_seconds" value={formData.duration_seconds} onChange={handleChange} />
                            </div>
                        )}

                        {/* Description - full width */}
                        <div className="flex flex-col gap-1.5 min-w-0 md:col-span-2">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Tavsif</label>
                            <textarea className="w-full bg-surface/50 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] resize-y min-h-25" name="description" value={formData.description} onChange={handleChange} rows={3} />
                        </div>

                        {/* File uploads */}
                        <div className="md:col-span-2 flex flex-col md:flex-row gap-5">
                            {/* Cover image upload */}
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Muqova rasmi</label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCover(true) }}
                                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCover(true) }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCover(false) }}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setIsDraggingCover(false)
                                        const f = e.dataTransfer.files?.[0]
                                        if (f) processCoverFile(f)
                                    }}
                                    className={`border-2 border-dashed rounded-xl p-3 bg-surface/50 transition-all flex-1 flex flex-col items-center justify-center min-h-36 relative overflow-hidden ${
                                        isDraggingCover
                                            ? 'border-primary bg-primary/10 shadow-lg scale-[1.01]'
                                            : 'border-border hover:border-border/80'
                                    }`}
                                >
                                    {localCoverPreview || formData.cover_image_url ? (
                                        <div className="flex flex-col items-center justify-center gap-2 group w-full h-full relative">
                                            <img
                                                src={localCoverPreview || formData.cover_image_url}
                                                alt="Muqova"
                                                className="max-h-28 w-auto rounded object-cover shadow-sm bg-surface"
                                            />
                                            {isUploadingCover && (
                                                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-center">
                                                    <div className="w-[90%] flex flex-col gap-1.5">
                                                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary transition-all duration-200"
                                                                style={{ width: `${coverProgress?.percent || 0}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[0.75rem] text-white">
                                                            <span className="font-semibold text-primary">{coverProgress?.percent || 0}%</span>
                                                            {coverProgress?.speed && (
                                                                <span className="text-[0.7rem] text-emerald-400 font-mono">{coverProgress.speed}</span>
                                                            )}
                                                        </div>
                                                        {coverProgress && (
                                                            <span className="text-[0.68rem] text-white/70">
                                                                {coverProgress.formattedLoaded} / {coverProgress.formattedTotal}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelCoverUpload}
                                                            className="text-rose-400 hover:text-rose-300 text-[0.75rem] underline mt-1"
                                                        >
                                                            Bekor qilish
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {!isUploadingCover && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveCover}
                                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-rose-500/90 text-white flex items-center justify-center border-none cursor-pointer opacity-0 transition-all scale-90 group-hover:opacity-100 group-hover:scale-100 hover:bg-rose-500 shadow-md"
                                                    title="O'chirish"
                                                >
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center gap-1.5 text-text-muted cursor-pointer w-full h-full p-2 text-center">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-0.5">
                                                <ImageIcon size={20} />
                                            </div>
                                            <span className="text-[0.88rem] font-medium text-text">
                                                {isDraggingCover ? 'Faylni shu yerga tashlang' : 'Rasm tanlash yoki sudrab tashlash'}
                                            </span>
                                            <span className="text-[0.72rem] text-text-muted">
                                                JPG, PNG, WEBP (Avtomatik siqiladi)
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCoverUpload}
                                                hidden
                                                disabled={isUploadingCover}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Digital file upload (PDF/Audio) */}
                            {formData.format && (
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">
                                        {formData.format === 'pdf' ? 'PDF fayl' : 'Audio fayl'}
                                    </label>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(true) }}
                                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(true) }}
                                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false) }}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setIsDraggingFile(false)
                                            const f = e.dataTransfer.files?.[0]
                                            if (f) processDigitalFile(f)
                                        }}
                                        className={`border-2 border-dashed rounded-xl p-3 bg-surface/50 transition-all flex-1 flex flex-col items-center justify-center min-h-36 relative overflow-hidden ${
                                            isDraggingFile
                                                ? 'border-primary bg-primary/10 shadow-lg scale-[1.01]'
                                                : 'border-border hover:border-border/80'
                                        }`}
                                    >
                                        {formData.digital_file_url ? (
                                            <div className="flex flex-col items-center justify-center gap-2 w-full h-full text-emerald-400">
                                                <div className="w-11 h-11 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                                    <Check size={24} />
                                                </div>
                                                <span className="text-[0.85rem] font-semibold">Fayl yuklangan</span>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveDigitalFile}
                                                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/30 text-text-muted flex items-center justify-center border-none cursor-pointer transition-colors hover:bg-rose-500 hover:text-white"
                                                    title="O'chirish"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center gap-1.5 text-text-muted cursor-pointer w-full h-full p-2 text-center">
                                                {isUploadingFile ? (
                                                    <div className="w-[85%] flex flex-col gap-1.5">
                                                        <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary transition-all duration-200"
                                                                style={{ width: `${fileProgress?.percent || 0}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[0.75rem]">
                                                            <span className="font-semibold text-primary">{fileProgress?.percent || 0}%</span>
                                                            {fileProgress?.speed && (
                                                                <span className="text-[0.7rem] text-emerald-400 font-mono">{fileProgress.speed}</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="text-rose-400 bg-transparent border-none cursor-pointer hover:underline"
                                                                onClick={(e) => { e.preventDefault(); handleCancelFileUpload() }}
                                                            >
                                                                Bekor qilish
                                                            </button>
                                                        </div>
                                                        {fileProgress && (
                                                            <div className="text-[0.68rem] text-text-muted">
                                                                {fileProgress.formattedLoaded} / {fileProgress.formattedTotal}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-0.5">
                                                            {formData.format === 'pdf' ? <FileText size={20} /> : <Upload size={20} />}
                                                        </div>
                                                        <span className="text-[0.88rem] font-medium text-text">
                                                            {isDraggingFile
                                                                ? 'Faylni shu yerga tashlang'
                                                                : formData.format === 'pdf' ? 'PDF tanlash yoki tashlash' : 'Audio tanlash yoki tashlash'}
                                                        </span>
                                                        <span className="text-[0.72rem] text-text-muted">
                                                            {formData.format === 'pdf' ? 'Maksimal 150 MB (.pdf)' : 'Maksimal 150 MB (.mp3, .m4a)'}
                                                        </span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept={formData.format === 'pdf' ? '.pdf,application/pdf' : 'audio/*,.mp3,.m4a,.wav,.ogg'}
                                                    onChange={handleFileUpload}
                                                    hidden
                                                    disabled={isUploadingFile}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 p-5 border-t border-border bg-surface-hover rounded-b-2xl mt-auto shrink-0">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-white/10 bg-transparent text-text font-semibold cursor-pointer transition-colors hover:bg-white/5">
                            Bekor qilish
                        </button>
                        <button type="submit" disabled={isLoading || isUploadingCover || isUploadingFile} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-none font-semibold cursor-pointer transition-all bg-primary text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                            {isLoading && <Loader2 size={18} className="animate-spin" />}
                            {mode === 'edit' ? 'Yangilash' : 'Saqlash'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
