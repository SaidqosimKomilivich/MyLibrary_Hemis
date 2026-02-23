import { useState, useRef, useEffect } from 'react'
import { BookOpen, Upload, X, CheckCircle, Clock, PlusCircle, FileText, Image as ImageIcon, AlertCircle, RefreshCw, Eye, Download, ExternalLink, Calendar, Globe, Hash, Layers } from 'lucide-react'
import { api, type Book } from '../../services/api'
import { toast } from 'react-toastify'

interface BookFormData {
    title: string
    author: string
    subtitle: string
    translator: string
    publisher: string
    publication_date: string
    language: string
    category: string
    description: string
    page_count: string
    format: string
    cover_image_url: string
    digital_file_url: string
    total_quantity: string
}

const EMPTY_FORM: BookFormData = {
    title: '',
    author: '',
    subtitle: '',
    translator: '',
    publisher: '',
    publication_date: '',
    language: 'O\'zbek',
    category: '',
    description: '',
    page_count: '',
    format: 'Qog\'oz',
    cover_image_url: '',
    digital_file_url: '',
    total_quantity: '1',
}

const CATEGORIES = [
    'Darslik', 'Qo\'llanma', 'Monografiya', 'Ilmiy maqola', 'Metodik qo\'llanma',
    'Ensiklopediya', 'Lug\'at', 'Badiiy adabiyot', 'Tarix', 'Falsafa',
    'Iqtisodiyot', 'Texnika', 'Tibbiyot', 'Huquq', 'Boshqa'
]
const FORMATS = ["Qog'oz", 'Elektron', 'Ikkalasi']
const LANGUAGES = ["O'zbek", 'Rus', 'Ingliz', 'Boshqa']

export default function TeacherBookSubmit() {
    const [form, setForm] = useState<BookFormData>(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [submittedBooks, setSubmittedBooks] = useState<Book[]>([])
    const [loadingBooks, setLoadingBooks] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [selectedBook, setSelectedBook] = useState<Book | null>(null)

    // Cover image upload
    const [coverUploading, setCoverUploading] = useState(false)
    const [coverProgress, setCoverProgress] = useState(0)
    const coverXhrRef = useRef<XMLHttpRequest | null>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    // Digital file upload
    const [fileUploading, setFileUploading] = useState(false)
    const [fileProgress, setFileProgress] = useState(0)
    const fileXhrRef = useRef<XMLHttpRequest | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // O'qituvchi o'z kitoblarini yuklash
    const loadMySubmissions = async () => {
        setLoadingBooks(true)
        try {
            const res = await api.getMySubmissions()
            setSubmittedBooks(res.data || [])
        } catch {
            // skip
        } finally {
            setLoadingBooks(false)
        }
    }

    useEffect(() => { loadMySubmissions() }, [])

    const handleChange = (field: keyof BookFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setCoverUploading(true)
        setCoverProgress(0)
        const { promise, xhr } = api.uploadFile(file, (p) => setCoverProgress(p))
        coverXhrRef.current = xhr
        promise.then(res => {
            const url = res.files?.[0]?.url || ''
            setForm(prev => ({ ...prev, cover_image_url: url }))
            toast.success('Muqova yuklandi')
        }).catch(() => toast.error('Muqova yuklanmadi')).finally(() => {
            setCoverUploading(false)
            setCoverProgress(0)
        })
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileUploading(true)
        setFileProgress(0)
        const { promise, xhr } = api.uploadFile(file, (p) => setFileProgress(p))
        fileXhrRef.current = xhr
        promise.then(res => {
            const url = res.files?.[0]?.url || ''
            setForm(prev => ({ ...prev, digital_file_url: url }))
            toast.success('Fayl yuklandi')
        }).catch(() => toast.error('Fayl yuklanmadi')).finally(() => {
            setFileUploading(false)
            setFileProgress(0)
        })
    }

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.author.trim()) {
            toast.warning("Kitob nomi va muallif majburiy!")
            return
        }
        setSubmitting(true)
        try {
            await api.submitBook({
                title: form.title.trim(),
                author: form.author.trim(),
                subtitle: form.subtitle || undefined,
                translator: form.translator || undefined,
                publisher: form.publisher || undefined,
                publication_date: form.publication_date ? parseInt(form.publication_date) : undefined,
                language: form.language || undefined,
                category: form.category || undefined,
                description: form.description || undefined,
                page_count: form.page_count ? parseInt(form.page_count) : undefined,
                format: form.format || undefined,
                cover_image_url: form.cover_image_url || undefined,
                digital_file_url: form.digital_file_url || undefined,
                total_quantity: form.total_quantity ? parseInt(form.total_quantity) : 1,
                available_quantity: form.total_quantity ? parseInt(form.total_quantity) : 1,
            })
            toast.success("Kitob muvaffaqiyatli taqdim etildi! Admin ko'rib chiqadi.")
            setForm(EMPTY_FORM)
            setShowForm(false)
            loadMySubmissions()  // ro'yxatni yangilash
        } catch (err: any) {
            toast.error(err.message || "Taqdim etishda xatolik")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-[900px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-text">
                        <BookOpen size={28} className="text-primary-light" />
                        Kitob taqdim etish
                    </h1>
                    <p className="text-sm text-text-muted mt-2">
                        O'z kitobingiz yoki qo'llanmangizni kutubxonaga taqdim eting. Admin ko'rib chiqib tasdiqlaydi.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-hover transition-all shadow-sm shrink-0"
                >
                    <PlusCircle size={18} />
                    {showForm ? 'Yopish' : 'Yangi kitob taqdim etish'}
                </button>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm text-indigo-300">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold mb-0.5">Qanday ishlaydi?</p>
                    <p className="text-indigo-300/80">Siz taqdim etgan kitob admin tomonidan ko'rib chiqiladi. Tasdiqlangach foydalanuvchilarga ko'rinadi. Kutilayotgan kitoblar faqat admin va xodimlarga ko'rinadi.</p>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 p-5 border-b border-border bg-white/3">
                        <FileText size={20} className="text-primary-light" />
                        <h2 className="text-base font-bold text-text">Kitob ma'lumotlari</h2>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Title */}
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                                Kitob nomi <span className="text-red-400">*</span>
                            </label>
                            <input
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="Masalan: Matematika asoslari"
                                value={form.title}
                                onChange={e => handleChange('title', e.target.value)}
                            />
                        </div>

                        {/* Author */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                                Muallif(lar) <span className="text-red-400">*</span>
                            </label>
                            <input
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="Masalan: Karimov A.B., Toshmatov J.K."
                                value={form.author}
                                onChange={e => handleChange('author', e.target.value)}
                            />
                        </div>

                        {/* Subtitle */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Sarlavha (ixtiyoriy)</label>
                            <input
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="Qoshimcha sarlavha"
                                value={form.subtitle}
                                onChange={e => handleChange('subtitle', e.target.value)}
                            />
                        </div>

                        {/* Translator */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tarjimon</label>
                            <input
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="Tarjimon ismi"
                                value={form.translator}
                                onChange={e => handleChange('translator', e.target.value)}
                            />
                        </div>

                        {/* Publisher */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Nashriyot</label>
                            <input
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="Nashriyot nomi"
                                value={form.publisher}
                                onChange={e => handleChange('publisher', e.target.value)}
                            />
                        </div>

                        {/* Category */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Kategoriya</label>
                            <select
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors appearance-none"
                                value={form.category}
                                onChange={e => handleChange('category', e.target.value)}
                            >
                                <option value="">— Tanlang —</option>
                                {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                            </select>
                        </div>

                        {/* Language */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Til</label>
                            <select
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors appearance-none"
                                value={form.language}
                                onChange={e => handleChange('language', e.target.value)}
                            >
                                {LANGUAGES.map(l => <option key={l} value={l} className="bg-slate-800">{l}</option>)}
                            </select>
                        </div>

                        {/* Format */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Format</label>
                            <select
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors appearance-none"
                                value={form.format}
                                onChange={e => handleChange('format', e.target.value)}
                            >
                                {FORMATS.map(f => <option key={f} value={f} className="bg-slate-800">{f}</option>)}
                            </select>
                        </div>

                        {/* Pub year + pages */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Chiqarilgan yil</label>
                            <input
                                type="number"
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="2024"
                                value={form.publication_date}
                                onChange={e => handleChange('publication_date', e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Sahifalar soni</label>
                            <input
                                type="number"
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="250"
                                value={form.page_count}
                                onChange={e => handleChange('page_count', e.target.value)}
                            />
                        </div>

                        {/* Quantity */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Nusxa soni</label>
                            <input
                                type="number"
                                min="1"
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors"
                                placeholder="1"
                                value={form.total_quantity}
                                onChange={e => handleChange('total_quantity', e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tavsif</label>
                            <textarea
                                className="bg-white/5 border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-colors resize-none"
                                placeholder="Kitob haqida qisqacha ma'lumot..."
                                rows={3}
                                value={form.description}
                                onChange={e => handleChange('description', e.target.value)}
                            />
                        </div>

                        {/* Cover image upload */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Muqova rasm</label>
                            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                            {form.cover_image_url ? (
                                <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-border group">
                                    <img src={form.cover_image_url} alt="" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setForm(p => ({ ...p, cover_image_url: '' }))}
                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={coverUploading}
                                    className="flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-border rounded-xl text-text-muted hover:border-primary hover:text-primary-light transition-colors text-sm disabled:opacity-50"
                                >
                                    {coverUploading ? (
                                        <>
                                            <div className="w-6 h-6 rounded-full border-2 border-border border-t-primary animate-spin" />
                                            <span>{coverProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon size={24} />
                                            <span>Rasmni yuklang</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Digital file upload */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Elektron nusxa (PDF)</label>
                            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                            {form.digital_file_url ? (
                                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                    <CheckCircle size={16} className="shrink-0" />
                                    <span className="truncate">Fayl yuklandi</span>
                                    <button onClick={() => setForm(p => ({ ...p, digital_file_url: '' }))} className="ml-auto shrink-0 hover:text-red-400">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={fileUploading}
                                    className="flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-border rounded-xl text-text-muted hover:border-primary hover:text-primary-light transition-colors text-sm disabled:opacity-50"
                                >
                                    {fileUploading ? (
                                        <>
                                            <div className="w-6 h-6 rounded-full border-2 border-border border-t-primary animate-spin" />
                                            <span>{fileProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={24} />
                                            <span>PDF/DOC yuklang</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Submit button */}
                    <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-white/3">
                        <button
                            onClick={() => { setForm(EMPTY_FORM); setShowForm(false) }}
                            className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-text-muted hover:bg-white/5 transition-colors"
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !form.title.trim() || !form.author.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {submitting ? (
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                                <CheckCircle size={16} />
                            )}
                            Taqdim etish
                        </button>
                    </div>
                </div>
            )}

            {/* Submitted books list */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-5 border-b border-border bg-white/3">
                    <Clock size={18} className="text-amber-400" />
                    <h2 className="text-base font-bold text-text">Mening taqdim etgan kitoblarim</h2>
                    <span className="ml-auto text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                        {submittedBooks.length}
                    </span>
                    <button
                        onClick={loadMySubmissions}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors"
                        title="Yangilash"
                    >
                        <RefreshCw size={14} className={loadingBooks ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loadingBooks ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-7 h-7 rounded-full border-2 border-border border-t-primary animate-spin" />
                    </div>
                ) : submittedBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-text-muted gap-2">
                        <BookOpen size={28} className="opacity-30" />
                        <p className="text-sm">Hali kitob taqdim etilmagan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {submittedBooks.map(book => (
                            <div key={book.id} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors">
                                {book.cover_image_url ? (
                                    <img src={book.cover_image_url} alt="" className="w-10 h-14 object-cover rounded-lg border border-border shrink-0" />
                                ) : (
                                    <div className="w-10 h-14 bg-white/5 border border-border rounded-lg flex items-center justify-center shrink-0">
                                        <BookOpen size={16} className="text-text-muted" />
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-semibold text-sm text-text truncate">{book.title}</span>
                                    <span className="text-xs text-text-muted">{book.author}</span>
                                    {book.category && (
                                        <span className="text-xs text-primary-light mt-0.5">{book.category}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {book.is_active ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                            <CheckCircle size={11} /> Tasdiqlangan
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                            <Clock size={11} /> Ko'rib chiqilmoqda
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setSelectedBook(book)}
                                        className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-primary-light transition-colors"
                                        title="Ko'rish"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {selectedBook && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedBook(null)}
                >
                    <div
                        className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
                            <h3 className="flex items-center gap-2 font-bold text-text">
                                <BookOpen size={18} className="text-primary-light" />
                                Kitob tafsilotlari
                            </h3>
                            <button
                                onClick={() => setSelectedBook(null)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-5">
                            {/* Top: cover + main info */}
                            <div className="flex gap-5 mb-5">
                                {selectedBook.cover_image_url ? (
                                    <img
                                        src={selectedBook.cover_image_url}
                                        alt={selectedBook.title}
                                        className="w-28 h-40 object-cover rounded-xl border border-border shrink-0 shadow-md"
                                    />
                                ) : (
                                    <div className="w-28 h-40 bg-white/5 border border-border rounded-xl flex items-center justify-center shrink-0">
                                        <BookOpen size={28} className="text-text-muted" />
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 min-w-0">
                                    <h2 className="text-lg font-bold text-text leading-tight">{selectedBook.title}</h2>
                                    {selectedBook.subtitle && (
                                        <p className="text-sm text-text-muted italic">{selectedBook.subtitle}</p>
                                    )}
                                    <p className="text-sm text-text-muted">{selectedBook.author}</p>
                                    {selectedBook.translator && (
                                        <p className="text-xs text-text-muted">Tarjimon: {selectedBook.translator}</p>
                                    )}
                                    {selectedBook.category && (
                                        <span className="text-xs bg-primary/15 text-primary-light px-2.5 py-1 rounded-full w-fit border border-primary/20">
                                            {selectedBook.category}
                                        </span>
                                    )}
                                    <div className="mt-auto">
                                        {selectedBook.is_active ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                <CheckCircle size={13} /> Tasdiqlangan — Foydalanuvchilarga ko'rinarli
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                <Clock size={13} /> Admin ko'rib chiqmoqda
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Metadata grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {selectedBook.publisher && (
                                    <div className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-border">
                                        <Layers size={14} className="text-text-muted mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-text-muted">Nashriyot</p>
                                            <p className="text-sm text-text font-medium">{selectedBook.publisher}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedBook.publication_date && (
                                    <div className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-border">
                                        <Calendar size={14} className="text-text-muted mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-text-muted">Nashr yili</p>
                                            <p className="text-sm text-text font-medium">{selectedBook.publication_date}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedBook.language && (
                                    <div className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-border">
                                        <Globe size={14} className="text-text-muted mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-text-muted">Til</p>
                                            <p className="text-sm text-text font-medium">{selectedBook.language}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedBook.page_count && (
                                    <div className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-border">
                                        <Hash size={14} className="text-text-muted mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-text-muted">Sahifalar</p>
                                            <p className="text-sm text-text font-medium">{selectedBook.page_count} bet</p>
                                        </div>
                                    </div>
                                )}
                                {selectedBook.format && (
                                    <div className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-border">
                                        <FileText size={14} className="text-text-muted mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-text-muted">Format</p>
                                            <p className="text-sm text-text font-medium">{selectedBook.format}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedBook.total_quantity && (
                                    <div className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-border">
                                        <Layers size={14} className="text-text-muted mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-text-muted">Nusxa soni</p>
                                            <p className="text-sm text-text font-medium">{selectedBook.total_quantity} ta</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {selectedBook.description && (
                                <div className="mb-5 p-4 bg-white/3 rounded-xl border border-border">
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tavsif</p>
                                    <p className="text-sm text-text leading-relaxed">{selectedBook.description}</p>
                                </div>
                            )}

                            {/* Digital file */}
                            {selectedBook.digital_file_url ? (
                                <div className="p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Elektron nusxa</p>
                                    <div className="flex gap-3">
                                        <a
                                            href={selectedBook.digital_file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
                                        >
                                            <ExternalLink size={15} />
                                            Brauzerda ochish
                                        </a>
                                        <a
                                            href={selectedBook.digital_file_url}
                                            download
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-border text-text rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors"
                                        >
                                            <Download size={15} />
                                            Yuklab olish
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-white/3 border border-border rounded-xl text-sm text-text-muted">
                                    <FileText size={16} className="shrink-0 opacity-40" />
                                    Elektron nusxa yuklanmagan
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
