import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    BookOpen, Upload, X, CheckCircle, Clock, PlusCircle,
    FileText, Image as ImageIcon, AlertCircle, RefreshCw,
    Eye, Download, ExternalLink, Calendar, Globe, Hash, Layers,
    Loader2, Check
} from 'lucide-react'
import { api, type Book } from '../../services/api'
import { toast } from 'react-toastify'
import { CustomSelect } from '../../components/CustomSelect'
import { useAuth } from '../../context/AuthContext'
import PdfViewerModal from '../../components/PdfViewerModal'

interface BookFormData {
    title: string
    author: string
    publisher: string
    publication_date: string
    language: string
    category: string
    description: string
    page_count: string
    cover_image_url: string
    digital_file_url: string
    total_quantity: string
}

const EMPTY_FORM: BookFormData = {
    title: '',
    author: '',
    publisher: '',
    publication_date: '',
    language: "O'zbek",
    category: '',
    description: '',
    page_count: '',
    cover_image_url: '',
    digital_file_url: '',
    total_quantity: '1',
}

const CATEGORIES = [
    'Darslik', "Qo'llanma", 'Monografiya', 'Ilmiy maqola', "Metodik qo'llanma",
    'Ensiklopediya', "Lug'at", 'Badiiy adabiyot', 'Tarix', 'Falsafa',
    'Iqtisodiyot', 'Texnika', 'Tibbiyot', 'Huquq', 'Boshqa'
]
const LANGUAGES = ["O'zbek", 'Rus', 'Ingliz', 'Boshqa']

export default function TeacherBookSubmit() {
    const { user } = useAuth()
    const [form, setForm] = useState<BookFormData>({ ...EMPTY_FORM, author: user?.full_name || '' })
    const [submitting, setSubmitting] = useState(false)
    const [submittedBooks, setSubmittedBooks] = useState<Book[]>([])
    const [loadingBooks, setLoadingBooks] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedBook, setSelectedBook] = useState<Book | null>(null)
    const [pdfBook, setPdfBook] = useState<Book | null>(null)

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

    const loadMySubmissions = async () => {
        setLoadingBooks(true)
        try {
            const res = await api.getMySubmissions()
            setSubmittedBooks(res.data || [])
        } catch { /* skip */ }
        finally { setLoadingBooks(false) }
    }

    useEffect(() => { loadMySubmissions() }, [])

    const handleChange = (field: keyof BookFormData, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setCoverUploading(true); setCoverProgress(0)
        const { promise, xhr } = api.uploadFile(file, p => setCoverProgress(p))
        coverXhrRef.current = xhr
        promise
            .then(res => setForm(prev => ({ ...prev, cover_image_url: res.files?.[0]?.url || '' })))
            .catch(() => toast.error('Muqova yuklanmadi'))
            .finally(() => { setCoverUploading(false); setCoverProgress(0) })
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileUploading(true); setFileProgress(0)
        const { promise, xhr } = api.uploadFile(file, p => setFileProgress(p))
        fileXhrRef.current = xhr
        promise
            .then(res => { setForm(prev => ({ ...prev, digital_file_url: res.files?.[0]?.url || '' })); toast.success('Fayl yuklandi') })
            .catch(() => toast.error('Fayl yuklanmadi'))
            .finally(() => { setFileUploading(false); setFileProgress(0) })
    }

    const handleCloseModal = () => {
        if (coverUploading || fileUploading) return
        coverXhrRef.current?.abort()
        fileXhrRef.current?.abort()
        setForm({ ...EMPTY_FORM, author: user?.full_name || '' })
        setModalOpen(false)
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
                publisher: form.publisher || undefined,
                publication_date: form.publication_date ? parseInt(form.publication_date) : undefined,
                language: form.language || undefined,
                category: form.category || undefined,
                description: form.description || undefined,
                page_count: form.page_count ? parseInt(form.page_count) : undefined,
                cover_image_url: form.cover_image_url || undefined,
                digital_file_url: form.digital_file_url || undefined,
                total_quantity: form.total_quantity ? parseInt(form.total_quantity) : 1,
                available_quantity: form.total_quantity ? parseInt(form.total_quantity) : 1,
            })
            toast.success("Kitob muvaffaqiyatli taqdim etildi! Admin ko'rib chiqadi.")
            setForm({ ...EMPTY_FORM, author: user?.full_name || '' })
            setModalOpen(false)
            loadMySubmissions()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
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
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-hover transition-all shadow-sm shrink-0"
                >
                    <PlusCircle size={18} />
                    Yangi kitob taqdim etish
                </button>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm text-indigo-300">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold mb-0.5">Qanday ishlaydi?</p>
                    <p className="text-indigo-300/80">Siz taqdim etgan kitob admin tomonidan ko'rib chiqiladi. Tasdiqlangach foydalanuvchilarga ko'rinadi.</p>
                </div>
            </div>

            {/* Submitted books list */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-5 border-b border-border bg-white/3">
                    <Clock size={18} className="text-amber-400" />
                    <h2 className="text-base font-bold text-text">Mening taqdim etgan kitoblarim</h2>
                    <span className="ml-auto text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                        {submittedBooks.length}
                    </span>
                    <button onClick={loadMySubmissions} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors" title="Yangilash">
                        <RefreshCw size={14} className={loadingBooks ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loadingBooks ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-7 h-7 rounded-full border-2 border-border border-t-primary animate-spin" />
                    </div>
                ) : submittedBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-3">
                        <BookOpen size={36} className="opacity-20" />
                        <p className="text-sm">Hali kitob taqdim etilmagan</p>
                        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary/15 text-primary-light border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/25 transition-colors">
                            <PlusCircle size={16} /> Birinchi kitobni taqdim eting
                        </button>
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
                                    {book.category && <span className="text-xs text-primary-light mt-0.5">{book.category}</span>}
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
                                    <button onClick={() => setSelectedBook(book)} className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-primary-light transition-colors" title="Ko'rish">
                                        <Eye size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════════════ SUBMIT MODAL ══════════════════════════ */}
            {modalOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={handleCloseModal}
                    style={{ pointerEvents: submitting || coverUploading || fileUploading ? 'none' : 'auto' }}
                >
                    <div
                        className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl shrink-0">
                            <h2 className="m-0 text-lg font-bold text-text">Kitob ma'lumotlarini kiriting</h2>
                            <button onClick={handleCloseModal} className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal body — scrollable */}
                        <div className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5 contents-start">

                                {/* Kitob nomi */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Kitob nomi <span className="text-rose-400">*</span></label>
                                    <input
                                        className="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                        placeholder="Masalan: O'tkan kunlar"
                                        value={form.title}
                                        onChange={e => handleChange('title', e.target.value)}
                                    />
                                </div>

                                {/* Muallif */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Muallif <span className="text-rose-400">*</span></label>
                                    <input
                                        className="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                        placeholder="Masalan: Abdulla Qodiriy"
                                        value={form.author}
                                        onChange={e => handleChange('author', e.target.value)}
                                    />
                                </div>

                                {/* Nashriyot */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nashriyot</label>
                                    <input
                                        className="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                        placeholder="Nashriyot nomi"
                                        value={form.publisher}
                                        onChange={e => handleChange('publisher', e.target.value)}
                                    />
                                </div>

                                {/* Kategoriya */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Kategoriya</label>
                                    <CustomSelect
                                        value={form.category}
                                        onChange={(val) => handleChange('category', val)}
                                        options={[
                                            { value: '', label: 'Tanlang' },
                                            ...CATEGORIES.map(c => ({ value: c, label: c }))
                                        ]}
                                        buttonClassName="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                    />
                                </div>

                                {/* Til */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Til</label>
                                    <CustomSelect
                                        value={form.language}
                                        onChange={(val) => handleChange('language', val)}
                                        options={[
                                            { value: '', label: 'Tanlang' },
                                            ...LANGUAGES.map(l => ({ value: l, label: l }))
                                        ]}
                                        buttonClassName="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                    />
                                </div>

                                {/* Nashr yili */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nashr yili</label>
                                    <input
                                        type="number"
                                        className="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                        placeholder="2024"
                                        value={form.publication_date}
                                        onChange={e => handleChange('publication_date', e.target.value)}
                                    />
                                </div>

                                {/* Sahifalar soni */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Sahifalar soni</label>
                                    <input
                                        type="number"
                                        className="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                        placeholder="Masalan: 320"
                                        value={form.page_count}
                                        onChange={e => handleChange('page_count', e.target.value)}
                                    />
                                </div>

                                {/* Nusxa soni */}
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Nusxa soni</label>
                                    <input
                                        type="number" min="1"
                                        className="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                                        placeholder="1"
                                        value={form.total_quantity}
                                        onChange={e => handleChange('total_quantity', e.target.value)}
                                    />
                                </div>

                                {/* Tavsif */}
                                <div className="md:col-span-2 flex flex-col gap-1.5 min-w-0">
                                    <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Qisqacha tavsif (Annotatsiya)</label>
                                    <textarea
                                        className="w-full bg-surface-hover border border-border text-text py-2.5 px-3 rounded-xl text-[0.95rem] outline-none transition-all placeholder:text-text-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] resize-y min-h-[100px]"
                                        placeholder="Kitob haqida ma'lumot qoldiring..."
                                        value={form.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                    />
                                </div>

                                {/* Fayl va rasm yuklash -> span 2 */}
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
                                    {/* Muqova rasm yuklash */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Muqova rasmi</label>
                                        <div className="flex items-center gap-4">
                                            {form.cover_image_url ? (
                                                <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-border group shrink-0 shadow-md">
                                                    <img src={form.cover_image_url} alt="Cover preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={e => { e.preventDefault(); setForm(p => ({ ...p, cover_image_url: '' })) }}
                                                            className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                                                            title="O'chirish"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-20 h-28 rounded-lg border-2 border-dashed border-border/60 bg-white/5 flex flex-col items-center justify-center text-text-muted shrink-0 gap-1.5">
                                                    <ImageIcon size={24} className="opacity-40" />
                                                    <span className="text-[0.65rem] uppercase tracking-wider font-semibold opacity-60">Muqova</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                                                <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                                                <button
                                                    type="button"
                                                    onClick={() => !coverUploading && coverInputRef.current?.click()}
                                                    disabled={coverUploading}
                                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-border bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-text"
                                                >
                                                    {coverUploading ? (
                                                        <><Loader2 size={16} className="animate-spin" /> {coverProgress}%</>
                                                    ) : (
                                                        <><Upload size={16} /> Rasm tanlash</>
                                                    )}
                                                </button>
                                                {coverUploading && (
                                                    <button type="button" onClick={() => coverXhrRef.current?.abort()} className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium">Bekoq qilish</button>
                                                )}
                                                <p className="text-xs text-text-muted mt-1 leading-relaxed">Tavsiya qilingan o'lcham: 800x1200 px. Faqat JPG, PNG, WEBP fayllar.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Elektron fayl */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[0.85rem] font-semibold text-text-muted tracking-wide">Elektron nusxasi (ixtiyoriy)</label>
                                        <div className="bg-surface-hover border border-border p-4 rounded-xl flex flex-col items-center justify-center gap-3 text-center min-h-[112px]">
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.epub,.doc,.docx,.mp3,.m4a" className="hidden" />

                                            {form.digital_file_url ? (
                                                <div className="flex flex-col items-center gap-2 w-full">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
                                                        <Check size={20} />
                                                    </div>
                                                    <div className="flex items-center gap-2 overflow-hidden w-full px-2">
                                                        <span className="text-sm font-medium truncate flex-1 leading-none text-emerald-400 text-center">Yuklandi</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.preventDefault(); setForm(p => ({ ...p, digital_file_url: '' })) }}
                                                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                                                    >
                                                        O'chirish va qayta yuklash
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary-light shrink-0">
                                                        <FileText size={20} />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => !fileUploading && fileInputRef.current?.click()}
                                                        disabled={fileUploading}
                                                        className="w-full py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
                                                    >
                                                        {fileUploading ? `Yuklanmoqda... ${fileProgress}%` : 'Fayl tanlash'}
                                                    </button>
                                                    {fileUploading && (
                                                        <button type="button" onClick={() => fileXhrRef.current?.abort()} className="text-xs text-rose-400 font-medium">Bekor qilish</button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 p-5 border-t border-border bg-white/2 rounded-b-2xl shrink-0 mt-auto">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl border border-transparent font-semibold text-text hover:bg-white/5 transition-colors text-[0.95rem] disabled:opacity-50"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting || !form.title || !form.author}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors text-[0.95rem] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    Taqdim etish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ══════════════════════════ DETAIL MODAL ══════════════════════════ */}
            {selectedBook && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedBook(null)}>
                    <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl shrink-0">
                            <h3 className="flex items-center gap-2 m-0 text-lg font-bold text-text">
                                <BookOpen size={18} className="text-primary-light" />
                                Kitob tafsilotlari
                            </h3>
                            <button onClick={() => setSelectedBook(null)} className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex gap-5 mb-5">
                                {selectedBook.cover_image_url ? (
                                    <img src={selectedBook.cover_image_url} alt={selectedBook.title} className="w-28 h-40 object-cover rounded-xl border border-border shrink-0 shadow-md" />
                                ) : (
                                    <div className="w-28 h-40 bg-white/5 border border-border rounded-xl flex items-center justify-center shrink-0">
                                        <BookOpen size={28} className="text-text-muted" />
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 min-w-0">
                                    <h2 className="text-lg font-bold text-text leading-tight">{selectedBook.title}</h2>
                                    <p className="text-sm text-text-muted">{selectedBook.author}</p>
                                    {selectedBook.translator && <p className="text-xs text-text-muted">Tarjimon: {selectedBook.translator}</p>}
                                    {selectedBook.category && (
                                        <span className="text-xs bg-primary/15 text-primary-light px-2.5 py-1 rounded-full w-fit border border-primary/20">
                                            {selectedBook.category}
                                        </span>
                                    )}
                                    <div className="mt-auto flex flex-col gap-2">
                                        <div>
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
                                        {selectedBook.admin_comment && (
                                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mt-1">
                                                <p className="text-[0.7rem] font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                    <AlertCircle size={12} />
                                                    Admin izohi
                                                </p>
                                                <p className="text-sm text-indigo-200/90 leading-snug">
                                                    {selectedBook.admin_comment}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    { icon: <Layers size={14} />, label: 'Nashriyot', val: selectedBook.publisher },
                                    { icon: <Calendar size={14} />, label: 'Nashr yili', val: selectedBook.publication_date?.toString() },
                                    { icon: <Globe size={14} />, label: 'Til', val: selectedBook.language },
                                    { icon: <Hash size={14} />, label: 'Sahifalar', val: selectedBook.page_count ? `${selectedBook.page_count} bet` : undefined },
                                    { icon: <Layers size={14} />, label: 'Nusxa soni', val: selectedBook.total_quantity ? `${selectedBook.total_quantity} ta` : undefined },
                                ].filter(r => r.val).map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 bg-white/3 rounded-xl border border-border">
                                        <span className="text-text-muted mt-0.5 shrink-0">{r.icon}</span>
                                        <div>
                                            <p className="text-xs text-text-muted">{r.label}</p>
                                            <p className="text-sm text-text font-medium">{r.val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedBook.description && (
                                <div className="mb-5 p-4 bg-white/3 rounded-xl border border-border">
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tavsif</p>
                                    <p className="text-sm text-text leading-relaxed">{selectedBook.description}</p>
                                </div>
                            )}

                            {selectedBook.digital_file_url ? (
                                <div className="p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Elektron nusxa</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setPdfBook(selectedBook)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer">
                                            <ExternalLink size={15} /> Brauzerda ochish
                                        </button>
                                        <a href={selectedBook.digital_file_url} download
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-border text-text rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors">
                                            <Download size={15} /> Yuklab olish
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
                </div>,
                document.body
            )}

            {/* PDF Viewer Modal */}
            {pdfBook && (
                <PdfViewerModal
                    title={pdfBook.title}
                    fileUrl={pdfBook.digital_file_url || ''}
                    onClose={() => setPdfBook(null)}
                />
            )}
        </div>
    )
}
