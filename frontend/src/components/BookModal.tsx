import { useState, useEffect, useRef, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Upload, Check } from 'lucide-react'
import { toast } from 'react-toastify'
import { api, type CreateBookRequest, type Book } from '../services/api'

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
    isbn_13: '',
    total_quantity: 1,
    available_quantity: 1,
    publisher: '',
    publication_date: new Date().getFullYear(),
    language: 'uz',
    description: '',
    page_count: 0,
    shelf_location: '',
    format: '',
    cover_image_url: '',
    digital_file_url: '',
    duration_seconds: 0,
}

export default function BookModal({ isOpen, mode, book, onClose, onSuccess }: BookModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isUploadingCover, setIsUploadingCover] = useState(false)
    const [isUploadingFile, setIsUploadingFile] = useState(false)
    const [coverProgress, setCoverProgress] = useState(0)
    const [fileProgress, setFileProgress] = useState(0)
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
                isbn_13: book.isbn_13 || '',
                total_quantity: book.total_quantity || 1,
                available_quantity: book.available_quantity || 1,
                publisher: book.publisher || '',
                publication_date: book.publication_date || new Date().getFullYear(),
                language: book.language || 'uz',
                description: book.description || '',
                page_count: book.page_count || 0,
                shelf_location: book.shelf_location || '',
                format: book.format || '',
                cover_image_url: book.cover_image_url || '',
                digital_file_url: book.digital_file_url || '',
                duration_seconds: book.duration_seconds || 0,
            })
        } else {
            setFormData({ ...emptyForm })
        }
    }, [mode, book, isOpen])

    if (!isOpen) return null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }))
    }

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingCover(true)
        setCoverProgress(0)
        try {
            const { promise, xhr } = api.uploadFile(file, (p) => setCoverProgress(p))
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
        } finally {
            setIsUploadingCover(false)
            setCoverProgress(0)
            coverXhrRef.current = null
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingFile(true)
        setFileProgress(0)
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
            setFileProgress(0)
            fileXhrRef.current = null
        }
    }

    const handleCancelCoverUpload = () => {
        coverXhrRef.current?.abort()
    }

    const handleCancelFileUpload = () => {
        fileXhrRef.current?.abort()
    }

    const handleRemoveCover = async () => {
        const url = formData.cover_image_url
        if (url) {
            try { await api.deleteFile(url) } catch { /* ignore */ }
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose} style={{ pointerEvents: isLoading || isUploadingCover || isUploadingFile ? 'none' : 'auto' }}>
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
                        {/* Title */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Kitob nomi *</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" required name="title" value={formData.title} onChange={handleChange} placeholder="Masalan: O'tkan kunlar" />
                        </div>

                        {/* Author */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Muallif *</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" required name="author" value={formData.author} onChange={handleChange} placeholder="Masalan: Abdulla Qodiriy" />
                        </div>

                        {/* Category */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Kategoriya</label>
                            <select className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-size-[20px] bg-position-[calc(100%-12px)_center] bg-no-repeat focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="category" value={formData.category} onChange={handleChange}>
                                <option className="bg-slate-800" value="">Tanlang</option>
                                <option className="bg-slate-800" value="Badiiy adabiyot">Badiiy adabiyot</option>
                                <option className="bg-slate-800" value="Darslik">Darslik</option>
                                <option className="bg-slate-800" value="Ilmiy">Ilmiy</option>
                                <option className="bg-slate-800" value="Siyosiy">Siyosiy</option>
                                <option className="bg-slate-800" value="Tarixiy">Tarixiy</option>
                                <option className="bg-slate-800" value="Texnologiya">Texnologiya</option>
                            </select>
                        </div>

                        {/* Format */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Format</label>
                            <select className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-size-[20px] bg-position-[calc(100%-12px)_center] bg-no-repeat focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="format" value={formData.format} onChange={handleChange}>
                                <option className="bg-slate-800" value="">Oddiy kitob</option>
                                <option className="bg-slate-800" value="pdf">PDF</option>
                                <option className="bg-slate-800" value="audio">Audio</option>
                            </select>
                        </div>

                        {/* ISBN */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">ISBN</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="isbn_13" value={formData.isbn_13} onChange={handleChange} maxLength={13} placeholder="9781234567890" />
                        </div>

                        {/* Total quantity */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Umumiy soni</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" min="1" name="total_quantity" value={formData.total_quantity} onChange={handleChange} />
                        </div>

                        {/* Publisher */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nashriyot</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="publisher" value={formData.publisher} onChange={handleChange} />
                        </div>

                        {/* Publication year */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nashr yili</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" name="publication_date" value={formData.publication_date} onChange={handleChange} />
                        </div>

                        {/* Language */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Til</label>
                            <select className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-size-[20px] bg-position-[calc(100%-12px)_center] bg-no-repeat focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="language" value={formData.language} onChange={handleChange}>
                                <option className="bg-slate-800" value="uz">O'zbek</option>
                                <option className="bg-slate-800" value="ru">Rus</option>
                                <option className="bg-slate-800" value="en">Ingliz</option>
                            </select>
                        </div>

                        {/* Page count */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Sahifalar soni</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" name="page_count" value={formData.page_count} onChange={handleChange} />
                        </div>

                        {/* Shelf location */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Joylashuvi (Polka)</label>
                            <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" name="shelf_location" value={formData.shelf_location} onChange={handleChange} placeholder="A-12" />
                        </div>

                        {/* Duration (audio only) */}
                        {formData.format === 'audio' && (
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Davomiyligi (soniya)</label>
                                <input className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" type="number" name="duration_seconds" value={formData.duration_seconds} onChange={handleChange} />
                            </div>
                        )}

                        {/* Description - full width */}
                        <div className="flex flex-col gap-1.5 min-w-0 md:col-span-2">
                            <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Tavsif</label>
                            <textarea className="w-full bg-black/20 border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] resize-y min-h-[100px]" name="description" value={formData.description} onChange={handleChange} rows={3} />
                        </div>

                        {/* File uploads */}
                        <div className="md:col-span-2 flex flex-col md:flex-row gap-5">
                            {/* Cover image upload */}
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Muqova rasmi</label>
                                <div className="border border-dashed border-border rounded-xl p-2 bg-black/10 transition-colors hover:border-text-muted/50 hover:bg-black/20 flex-1 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                                    {formData.cover_image_url ? (
                                        <div className="flex flex-col items-center justify-center gap-2 group w-full h-full relative">
                                            <img src={formData.cover_image_url} alt="Muqova" className="max-h-[110px] w-auto rounded object-cover shadow-sm bg-white" />
                                            <button type="button" onClick={handleRemoveCover} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-rose-500/90 text-white flex items-center justify-center border-none cursor-pointer opacity-0 transition-all scale-90 group-hover:opacity-100 group-hover:scale-100 hover:bg-rose-500 shadow-md">
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center gap-2 text-text-muted cursor-pointer w-full h-full">
                                            {isUploadingCover ? (
                                                <div className="w-[80%] flex flex-col gap-2">
                                                    <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${coverProgress}%` }} />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[0.8rem]">
                                                        <span className="font-semibold text-primary">{coverProgress}%</span>
                                                        <button type="button" className="text-rose-400 bg-transparent border-none cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); handleCancelCoverUpload() }}>
                                                            Bekor qilish
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={28} className="opacity-50 group-hover:opacity-100 group-hover:-translate-y-1 transition-all" />
                                                    <span className="text-[0.9rem] font-medium">Rasm yuklash</span>
                                                </>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleCoverUpload} hidden disabled={isUploadingCover} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Digital file upload (PDF/Audio) */}
                            {formData.format && (
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">{formData.format === 'pdf' ? 'PDF fayl' : 'Audio fayl'}</label>
                                    <div className="border border-dashed border-border rounded-xl p-2 bg-black/10 transition-colors hover:border-text-muted/50 hover:bg-black/20 flex-1 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                                        {formData.digital_file_url ? (
                                            <div className="flex flex-col items-center justify-center gap-3 w-full h-full text-emerald-400">
                                                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                                    <Check size={28} />
                                                </div>
                                                <span className="text-[0.9rem] font-semibold">Fayl yuklangan</span>
                                                <button type="button" onClick={handleRemoveDigitalFile} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/20 text-text-muted flex items-center justify-center border-none cursor-pointer transition-colors hover:bg-rose-500 hover:text-white">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center gap-2 text-text-muted cursor-pointer w-full h-full">
                                                {isUploadingFile ? (
                                                    <div className="w-[80%] flex flex-col gap-2">
                                                        <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${fileProgress}%` }} />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[0.8rem]">
                                                            <span className="font-semibold text-primary">{fileProgress}%</span>
                                                            <button type="button" className="text-rose-400 bg-transparent border-none cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); handleCancelFileUpload() }}>
                                                                Bekor qilish
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload size={28} className="opacity-50 group-hover:opacity-100 group-hover:-translate-y-1 transition-all" />
                                                        <span className="text-[0.9rem] font-medium">{formData.format === 'pdf' ? 'PDF yuklash' : 'Audio yuklash'}</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept={formData.format === 'pdf' ? '.pdf' : 'audio/*'}
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
                    <div className="flex justify-end gap-3 p-5 border-t border-border bg-black/20 rounded-b-2xl mt-auto shrink-0">
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
