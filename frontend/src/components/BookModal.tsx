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
        <div className="book-modal__backdrop">
            <div className="book-modal">
                {/* Header */}
                <div className="book-modal__header">
                    <h2>{modalTitle}</h2>
                    <button onClick={onClose} className="book-modal__close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="book-modal__form">
                    <div className="book-modal__grid">
                        {/* Title */}
                        <div className="book-modal__field">
                            <label>Kitob nomi *</label>
                            <input required name="title" value={formData.title} onChange={handleChange} placeholder="Masalan: O'tkan kunlar" />
                        </div>

                        {/* Author */}
                        <div className="book-modal__field">
                            <label>Muallif *</label>
                            <input required name="author" value={formData.author} onChange={handleChange} placeholder="Masalan: Abdulla Qodiriy" />
                        </div>

                        {/* Category */}
                        <div className="book-modal__field">
                            <label>Kategoriya</label>
                            <select name="category" value={formData.category} onChange={handleChange}>
                                <option value="">Tanlang</option>
                                <option value="Badiiy adabiyot">Badiiy adabiyot</option>
                                <option value="Darslik">Darslik</option>
                                <option value="Ilmiy">Ilmiy</option>
                                <option value="Siyosiy">Siyosiy</option>
                                <option value="Tarixiy">Tarixiy</option>
                                <option value="Texnologiya">Texnologiya</option>
                            </select>
                        </div>

                        {/* Format */}
                        <div className="book-modal__field">
                            <label>Format</label>
                            <select name="format" value={formData.format} onChange={handleChange}>
                                <option value="">Oddiy kitob</option>
                                <option value="pdf">PDF</option>
                                <option value="audio">Audio</option>
                            </select>
                        </div>

                        {/* ISBN */}
                        <div className="book-modal__field">
                            <label>ISBN</label>
                            <input name="isbn_13" value={formData.isbn_13} onChange={handleChange} maxLength={13} placeholder="9781234567890" />
                        </div>

                        {/* Total quantity */}
                        <div className="book-modal__field">
                            <label>Umumiy soni</label>
                            <input type="number" min="1" name="total_quantity" value={formData.total_quantity} onChange={handleChange} />
                        </div>

                        {/* Publisher */}
                        <div className="book-modal__field">
                            <label>Nashriyot</label>
                            <input name="publisher" value={formData.publisher} onChange={handleChange} />
                        </div>

                        {/* Publication year */}
                        <div className="book-modal__field">
                            <label>Nashr yili</label>
                            <input type="number" name="publication_date" value={formData.publication_date} onChange={handleChange} />
                        </div>

                        {/* Language */}
                        <div className="book-modal__field">
                            <label>Til</label>
                            <select name="language" value={formData.language} onChange={handleChange}>
                                <option value="uz">O'zbek</option>
                                <option value="ru">Rus</option>
                                <option value="en">Ingliz</option>
                            </select>
                        </div>

                        {/* Page count */}
                        <div className="book-modal__field">
                            <label>Sahifalar soni</label>
                            <input type="number" name="page_count" value={formData.page_count} onChange={handleChange} />
                        </div>

                        {/* Shelf location */}
                        <div className="book-modal__field">
                            <label>Joylashuvi (Polka)</label>
                            <input name="shelf_location" value={formData.shelf_location} onChange={handleChange} placeholder="A-12" />
                        </div>

                        {/* Duration (audio only) */}
                        {formData.format === 'audio' && (
                            <div className="book-modal__field">
                                <label>Davomiyligi (soniya)</label>
                                <input type="number" name="duration_seconds" value={formData.duration_seconds} onChange={handleChange} />
                            </div>
                        )}
                    </div>

                    {/* Description - full width */}
                    <div className="book-modal__field book-modal__field--full">
                        <label>Tavsif</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} />
                    </div>

                    {/* File uploads */}
                    <div className="book-modal__uploads">
                        {/* Cover image upload */}
                        <div className="book-modal__upload-block">
                            <label>Muqova rasmi</label>
                            <div className="book-modal__upload-area">
                                {formData.cover_image_url ? (
                                    <div className="book-modal__upload-preview">
                                        <img src={formData.cover_image_url} alt="Muqova" />
                                        <button type="button" onClick={handleRemoveCover}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="book-modal__upload-label">
                                        {isUploadingCover ? (
                                            <div className="book-modal__progress">
                                                <div className="book-modal__progress-bar">
                                                    <div className="book-modal__progress-fill" style={{ width: `${coverProgress}%` }} />
                                                </div>
                                                <div className="book-modal__progress-info">
                                                    <span>{coverProgress}%</span>
                                                    <button type="button" className="book-modal__cancel-btn" onClick={(e) => { e.preventDefault(); handleCancelCoverUpload() }}>
                                                        Bekor qilish
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={24} />
                                                <span>Rasm yuklash</span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleCoverUpload} hidden disabled={isUploadingCover} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Digital file upload (PDF/Audio) */}
                        {formData.format && (
                            <div className="book-modal__upload-block">
                                <label>{formData.format === 'pdf' ? 'PDF fayl' : 'Audio fayl'}</label>
                                <div className="book-modal__upload-area">
                                    {formData.digital_file_url ? (
                                        <div className="book-modal__upload-done">
                                            <Check size={20} />
                                            <span>Fayl yuklangan</span>
                                            <button type="button" onClick={handleRemoveDigitalFile}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="book-modal__upload-label">
                                            {isUploadingFile ? (
                                                <div className="book-modal__progress">
                                                    <div className="book-modal__progress-bar">
                                                        <div className="book-modal__progress-fill" style={{ width: `${fileProgress}%` }} />
                                                    </div>
                                                    <div className="book-modal__progress-info">
                                                        <span>{fileProgress}%</span>
                                                        <button type="button" className="book-modal__cancel-btn" onClick={(e) => { e.preventDefault(); handleCancelFileUpload() }}>
                                                            Bekor qilish
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={24} />
                                                    <span>{formData.format === 'pdf' ? 'PDF yuklash' : 'Audio yuklash'}</span>
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

                    {/* Actions */}
                    <div className="book-modal__actions">
                        <button type="button" onClick={onClose} className="book-modal__btn book-modal__btn--cancel">
                            Bekor qilish
                        </button>
                        <button type="submit" disabled={isLoading || isUploadingCover || isUploadingFile} className="book-modal__btn book-modal__btn--save">
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
