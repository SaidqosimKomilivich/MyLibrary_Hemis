import { useState, useRef } from 'react'
import {
    FileSpreadsheet,
    Download,
    Upload,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Trash2,
    X,
    Layers,
    Info,
    ArrowRight,
    BookOpen,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import type { SkippedBookInfo } from '../services/api.types'
import {
    generateArmExcelTemplate,
    parseBooksFromExcel,
    convertParsedRowsToCreateRequests,
    exportSkippedBooksToExcel,
    exportInvalidPreviewRowsToExcel,
    type ParsedBookRow,
} from '../utils/excelBookParser'
import { getCategoryLabel, getGenreLabel, getLanguageLabel } from '../constants/bookClassification'

interface ExcelImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type ModalStep = 'upload' | 'preview' | 'result'

export default function ExcelImportModal({ isOpen, onClose, onSuccess }: ExcelImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [step, setStep] = useState<ModalStep>('upload')
    const [isParsing, setIsParsing] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [fileName, setFileName] = useState<string>('')
    const [parsedRows, setParsedRows] = useState<ParsedBookRow[]>([])

    // Import natijasi
    const [importResult, setImportResult] = useState<{
        success: boolean
        message: string
        importedCount: number
        skippedCount: number
        skippedBooks: SkippedBookInfo[]
    } | null>(null)

    if (!isOpen) return null

    // Faylni tanlash va parse qilish
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setIsParsing(true)

        try {
            const result = await parseBooksFromExcel(file)
            if (result.rows.length === 0) {
                toast.error("Excel faylida kitob ma'lumotlari topilmadi")
                return
            }
            setParsedRows(result.rows)
            setStep('preview')
            toast.info(`${result.rows.length} ta kitob qatori o'qildi`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Faylni o'qishda xatolik yuz berdi"
            toast.error(msg)
        } finally {
            setIsParsing(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Drag and drop
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            toast.error("Faqat .xlsx yoki .xls formatidagi fayllar qabul qilinadi")
            return
        }

        setFileName(file.name)
        setIsParsing(true)

        try {
            const result = await parseBooksFromExcel(file)
            if (result.rows.length === 0) {
                toast.error("Excel faylida kitob ma'lumotlari topilmadi")
                return
            }
            setParsedRows(result.rows)
            setStep('preview')
            toast.info(`${result.rows.length} ta kitob qatori o'qildi`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Faylni o'qishda xatolik yuz berdi"
            toast.error(msg)
        } finally {
            setIsParsing(false)
        }
    }

    // Qatorni ro'yxatdan o'chirish
    const handleDeleteRow = (index: number) => {
        setParsedRows(prev => prev.filter((_, i) => i !== index))
    }

    // Importni boshlash
    const handleStartImport = async () => {
        const validPayload = convertParsedRowsToCreateRequests(parsedRows)
        if (validPayload.length === 0) {
            toast.error("Yuklash uchun yaroqli kitoblar mavjud emas")
            return
        }

        setIsImporting(true)
        try {
            const res = await api.importBooks({ books: validPayload })
            setImportResult({
                success: res.success,
                message: res.message,
                importedCount: res.imported_count,
                skippedCount: res.skipped_count,
                skippedBooks: res.skipped_books || [],
            })
            setStep('result')
            if (onSuccess) onSuccess()

            if (res.skipped_count > 0) {
                toast.warning(res.message, { autoClose: 6000 })
            } else {
                toast.success(res.message)
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Import qilishda xatolik yuz berdi"
            toast.error(msg)
        } finally {
            setIsImporting(false)
        }
    }

    // Modalni tozalab yopish
    const handleCloseModal = () => {
        setStep('upload')
        setParsedRows([])
        setImportResult(null)
        setFileName('')
        onClose()
    }

    const validCount = parsedRows.filter(r => r.isValid).length
    const errorCount = parsedRows.filter(r => !r.isValid).length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface-hover/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text">Excel orqali kitoblarni import qilish</h2>
                            <p className="text-xs text-text-muted">Axborot-resurs markazi (ARM) umumiy fondi shabloni asosida</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseModal}
                        disabled={isImporting}
                        className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-white/5 transition-colors cursor-pointer border-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* ========================================================================= */}
                    {/* STEP 1: UPLOAD & TEMPLATE DOWNLOAD */}
                    {/* ========================================================================= */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Shablon yuklab olish banner */}
                            <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                        <Download size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-text">Namunaviy Excel shablonini yuklab oling</h3>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            ARM fondi namunaviy jadvali (10 ta ustun: Fan nomi, Kitob nomi, Muallifi, Tili, Yili, Turi, Soni va narxi)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={generateArmExcelTemplate}
                                    type="button"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer border-none"
                                >
                                    <Download size={16} />
                                    <span>Shablonni yuklab olish (.xlsx)</span>
                                </button>
                            </div>

                            {/* Qoidalar va xususiyatlar kartasi */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-text">Dublikatdan himoya</p>
                                        <p className="text-[0.75rem] text-text-muted mt-0.5">
                                            Bazada allaqachon mavjud kitoblar qayta qo'shilmaydi va ro'yxatda hisobot beriladi.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                                        <Layers size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-text">Aqlli xaritalash</p>
                                        <p className="text-[0.75rem] text-text-muted mt-0.5">
                                            Til va fan nomlari tizim bilan moslashadi, yangi fanlar asl holicha qabul qilinadi.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                        <BookOpen size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-text">Standart muqova</p>
                                        <p className="text-[0.75rem] text-text-muted mt-0.5">
                                            Muqovasi yo'q kitoblarga avtomatik ravishda tayyorlangan ARM logotipi qo'yiladi.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Dropzone */}
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border hover:border-primary/60 bg-surface-hover/20 hover:bg-surface-hover/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>

                                <h4 className="text-base font-semibold text-text mb-1">
                                    Excel (.xlsx) faylini bu yerga tashlang yoki tanlang
                                </h4>
                                <p className="text-xs text-text-muted max-w-md">
                                    ARM namunaviy shablonidagi ustunlar tartibiga mos keluvchi Excel faylini tanlang. Maksimal hajm: 20MB.
                                </p>

                                {isParsing && (
                                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary">
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <span>Fayl o'qilmoqda va tahlil qilinmoqda...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* STEP 2: DATA PREVIEW & VALIDATION */}
                    {/* ========================================================================= */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Stats bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface-hover/40 border border-border">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-text-muted">Fayl:</span>
                                    <span className="text-xs font-semibold text-text bg-white/5 px-2 py-1 rounded-lg">
                                        {fileName}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-text border border-white/10">
                                        Jami: <b>{parsedRows.length} ta</b>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 size={13} />
                                        Yaroqli: <b>{validCount} ta</b>
                                    </span>
                                    {errorCount > 0 && (
                                        <>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                <XCircle size={13} />
                                                Xatolik: <b>{errorCount} ta</b>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => exportInvalidPreviewRowsToExcel(parsedRows)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer"
                                                title="250 belgidan oshgan yoki xatosi bor qatorlarni Excel fayl shaklida yuklab olish"
                                            >
                                                <Download size={13} />
                                                <span>Xatolikli kitoblarni yuklab olish ({errorCount})</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border border-border rounded-2xl overflow-hidden max-h-[46vh] overflow-y-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 z-10 bg-surface border-b border-border text-text-muted uppercase text-[0.65rem] tracking-wider">
                                        <tr>
                                            <th className="py-3 px-3 w-10 text-center">№</th>
                                            <th className="py-3 px-3 w-14 text-center">Muqova</th>
                                            <th className="py-3 px-4">Kitob nomi va Muallifi</th>
                                            <th className="py-3 px-3">Fan (Kategoriya)</th>
                                            <th className="py-3 px-2 text-center">Til</th>
                                            <th className="py-3 px-3">Adabiyot turi</th>
                                            <th className="py-3 px-2 text-center">Yil</th>
                                            <th className="py-3 px-3 text-center">Nusxalar (Jami/Mavjud)</th>
                                            <th className="py-3 px-3 text-center w-14">Amal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {parsedRows.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className={`hover:bg-white/5 transition-colors ${!row.isValid ? 'bg-rose-500/5' : ''}`}
                                            >
                                                <td className="py-2.5 px-3 text-center text-text-muted font-mono text-[0.7rem]">
                                                    {row.rawIndex}
                                                </td>

                                                {/* Mini cover thumbnail */}
                                                <td className="py-2.5 px-3 text-center">
                                                    <div className="w-8 h-10 rounded-md bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 border border-white/20 flex items-center justify-center mx-auto overflow-hidden shadow-xs">
                                                        <img
                                                            src="/icon_arm.png"
                                                            alt="ARM"
                                                            className="w-6 h-6 object-contain"
                                                        />
                                                    </div>
                                                </td>

                                                {/* Kitob nomi */}
                                                <td className="py-2.5 px-4 max-w-xs">
                                                    <div className="font-semibold text-text truncate" title={row.title}>
                                                        {row.title || <span className="text-rose-400 italic">Kitob nomi yo'q</span>}
                                                    </div>
                                                    <div className="text-text-muted text-[0.7rem] truncate mt-0.5" title={row.author}>
                                                        {row.author}
                                                    </div>
                                                    {row.errors.length > 0 && (
                                                        <div className="text-rose-400 text-[0.65rem] mt-1 flex items-center gap-1">
                                                            <AlertTriangle size={11} /> {row.errors.join(', ')}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Fan nomi */}
                                                <td className="py-2.5 px-3">
                                                    <span className="inline-block px-2 py-0.5 rounded-md text-[0.7rem] font-medium bg-primary/10 text-primary border border-primary/20 max-w-36 truncate" title={row.originalCategory}>
                                                        {getCategoryLabel(row.category)}
                                                    </span>
                                                </td>

                                                {/* Til */}
                                                <td className="py-2.5 px-2 text-center">
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase bg-white/10 text-text tracking-wider">
                                                        {getLanguageLabel(row.language)}
                                                    </span>
                                                </td>

                                                {/* Turi */}
                                                <td className="py-2.5 px-3">
                                                    <span className="text-text-muted text-[0.72rem]">
                                                        {getGenreLabel(row.genre)}
                                                    </span>
                                                </td>

                                                {/* Yil */}
                                                <td className="py-2.5 px-2 text-center text-text-muted font-mono">
                                                    {row.publicationDate || '—'}
                                                </td>

                                                {/* Nusxalar */}
                                                <td className="py-2.5 px-3 text-center font-mono">
                                                    <span className="text-emerald-400 font-semibold">{row.availableQuantity}</span>
                                                    <span className="text-text-muted/60"> / </span>
                                                    <span className="text-text-muted">{row.totalQuantity}</span>
                                                </td>

                                                {/* Delete button */}
                                                <td className="py-2.5 px-3 text-center">
                                                    <button
                                                        onClick={() => handleDeleteRow(idx)}
                                                        title="Ro'yxatdan o'chirish"
                                                        className="p-1 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border-none"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* STEP 3: RESULT REPORT */}
                    {/* ========================================================================= */}
                    {step === 'result' && importResult && (
                        <div className="space-y-6 py-2">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-text">Muvaffaqiyatli saqlandi</h4>
                                        <p className="text-2xl font-bold text-emerald-400 mt-1">
                                            {importResult.importedCount} ta kitob
                                        </p>
                                        <p className="text-xs text-text-muted mt-1">
                                            Kutubxona fondiga kiritildi va katalogda faollashtirildi
                                        </p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                        <Info size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-text">Qo'shilmadi (Mavjud yoki cheklov)</h4>
                                        <p className="text-2xl font-bold text-amber-400 mt-1">
                                            {importResult.skippedCount} ta kitob
                                        </p>
                                        <p className="text-xs text-text-muted mt-1">
                                            Bazada mavjudligi yoki belgilar soni 250 tadan oshganligi sababli qo'shilmadi
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* O'tkazib yuborilgan kitoblar ro'yxati */}
                            {importResult.skippedBooks.length > 0 && (
                                <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4">
                                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-amber-400" />
                                            <h5 className="text-xs font-semibold text-text uppercase tracking-wider">
                                                Qayta qo'shilmagan kitoblar tafsiloti ({importResult.skippedBooks.length} ta)
                                            </h5>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => exportSkippedBooksToExcel(importResult.skippedBooks, 'Qayta_qoshilmagan_kitoblar_hisoboti.xlsx')}
                                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-semibold text-xs transition-all border border-amber-500/30 cursor-pointer shadow-xs"
                                        >
                                            <Download size={14} />
                                            <span>Hisobotni Excel (.xlsx) da yuklab olish</span>
                                        </button>
                                    </div>

                                    <div className="max-h-56 overflow-y-auto border border-border/70 rounded-xl bg-surface">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-surface-hover/50 border-b border-border text-text-muted text-[0.65rem]">
                                                <tr>
                                                    <th className="py-2 px-3 w-8 text-center">№</th>
                                                    <th className="py-2 px-3">Kitob nomi</th>
                                                    <th className="py-2 px-3">Muallifi</th>
                                                    <th className="py-2 px-3">Sababi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/40">
                                                {importResult.skippedBooks.map((item, i) => (
                                                    <tr key={i} className="hover:bg-white/5">
                                                        <td className="py-2 px-3 text-center text-text-muted text-[0.7rem]">{i + 1}</td>
                                                        <td className="py-2 px-3 font-medium text-text">{item.title}</td>
                                                        <td className="py-2 px-3 text-text-muted">{item.author}</td>
                                                        <td className="py-2 px-3">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[0.68rem] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                {item.reason}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-hover/30">
                    {step === 'upload' && (
                        <div className="text-xs text-text-muted flex items-center gap-1.5">
                            <Info size={14} /> Fayl tanlangach, ma'lumotlar oldindan tekshiriladi
                        </div>
                    )}

                    {step === 'preview' && (
                        <button
                            onClick={() => setStep('upload')}
                            className="text-xs font-medium text-text-muted hover:text-text px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border-none bg-transparent"
                        >
                            Boshqa fayl tanlash
                        </button>
                    )}

                    {step === 'result' && <div />}

                    <div className="flex items-center gap-3 ml-auto">
                        {step !== 'result' && (
                            <button
                                onClick={handleCloseModal}
                                disabled={isImporting}
                                className="px-4 py-2.5 rounded-xl border border-border text-text font-medium text-xs hover:bg-white/5 transition-all cursor-pointer"
                            >
                                Bekor qilish
                            </button>
                        )}

                        {step === 'preview' && (
                            <button
                                onClick={handleStartImport}
                                disabled={isImporting || validCount === 0}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md cursor-pointer border-none"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Baza bilan sinxronlanmoqda...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Baza bilan sinxronlash ({validCount} ta kitob)</span>
                                        <ArrowRight size={14} />
                                    </>
                                )}
                            </button>
                        )}

                        {step === 'result' && (
                            <div className="flex items-center gap-3">
                                {importResult && importResult.skippedBooks.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => exportSkippedBooksToExcel(importResult.skippedBooks, 'Qayta_qoshilmagan_kitoblar_hisoboti.xlsx')}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-surface-hover text-text font-semibold text-xs transition-all cursor-pointer shadow-xs"
                                    >
                                        <Download size={14} className="text-amber-400" />
                                        <span>Qayta qo'shilmaganlarni yuklab olish ({importResult.skippedBooks.length})</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer border-none"
                                >
                                    Oynani yopish va Katalogga qaytish
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
