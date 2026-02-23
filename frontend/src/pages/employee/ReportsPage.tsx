import { useState, useEffect } from 'react'
import { api, type ReportDashboardResponse } from '../../services/api'
import { Loader2, Calendar as CalendarIcon, Download, ArrowRightLeft, BookOpen, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'

export default function ReportsPage() {
    const [dashboardData, setDashboardData] = useState<ReportDashboardResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [exporting, setExporting] = useState<'rentals' | 'controls' | null>(null)

    // Export filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

    const fetchDashboard = async () => {
        setIsLoading(true)
        try {
            const res = await api.getReportDashboard()
            if (res.success) {
                setDashboardData(res.data)
            }
        } catch (err: any) {
            toast.error(err.message || "Hisobotlarni yuklashda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboard()
    }, [])

    const handleExport = async (type: 'rentals' | 'controls') => {
        setExporting(type)
        try {
            const blob = await api.exportReportExcel(type, startDate, endDate)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `report_${type}_${startDate}_to_${endDate}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success("Excel fayl muvaffaqiyatli yuklandi!")
        } catch (err: any) {
            // Backend sends 404 AppError strings if table is empty
            toast.warning(err.message || "Xatolik yuz berdi", {
                icon: <AlertCircle size={24} color="#f59e0b" />
            })
        } finally {
            setExporting(null)
        }
    }

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-'
        const d = new Date(dateStr)
        return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="p-8 md:p-10 max-w-[1600px] mx-auto min-h-screen">
            {/* <div className="flex justify-between items-center mb-10 bg-linear-to-br from-emerald-500/15 to-blue-500/15 p-8 md:p-10 rounded-3xl border border-white/10 relative overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,0.3)] flex-wrap gap-6">
                <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_50%)] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-[2.2rem] font-extrabold m-0 mb-2 bg-linear-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent tracking-tight">Umumiy Hisobotlar</h1>
                    <p className="text-text-muted m-0 text-[1.1rem] font-medium">Tizimdagi keldi-ketdi va ijaralarni Excel formatida yuklash</p>
                </div>
                <div className="relative z-10 py-4 px-5 bg-white/5 rounded-2xl flex items-center gap-3 border border-white/10">
                    <FileSpreadsheet size={28} className="text-emerald-400" />
                    <div>
                        <div className="text-[0.85rem] text-text-muted font-medium">Admin Eksport</div>
                        <div className="text-white font-bold">.XLSX Generator</div>
                    </div>
                </div>
            </div> */}

            <div className="bg-slate-800/40 border border-white/5 rounded-[20px] p-6 mb-8 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3 text-slate-100 font-semibold text-[1.1rem] mr-auto">
                    <Download size={22} className="text-blue-400" />
                    Ma'lumotlarni qazib olish
                </div>

                <div className="flex items-center gap-3 bg-black/20 py-2 px-4 rounded-xl border border-white/5">
                    <CalendarIcon size={18} className="text-text-muted" />
                    <span className="text-text-muted text-[0.95rem]">dan:</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-white outline-none text-[0.95rem] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                </div>

                <div className="flex items-center gap-3 bg-black/20 py-2 px-4 rounded-xl border border-white/5">
                    <CalendarIcon size={18} className="text-text-muted" />
                    <span className="text-text-muted text-[0.95rem]">gacha:</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-white outline-none text-[0.95rem] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        className="flex items-center gap-2 py-2.5 px-5 rounded-xl border-none font-semibold cursor-pointer transition-all text-white bg-linear-to-br from-blue-500 to-blue-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        onClick={() => handleExport('rentals')}
                        disabled={exporting !== null}
                    >
                        {exporting === 'rentals' ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
                        Ijaralarni yuklash
                    </button>

                    <button
                        className="flex items-center gap-2 py-2.5 px-5 rounded-xl border-none font-semibold cursor-pointer transition-all text-white bg-linear-to-br from-emerald-500 to-emerald-600 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        onClick={() => handleExport('controls')}
                        disabled={exporting !== null}
                    >
                        {exporting === 'controls' ? <Loader2 size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
                        Keldi-ketdini yuklash
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-24">
                    <Loader2 size={48} className="text-emerald-400 opacity-80 animate-spin" />
                </div>
            ) : dashboardData && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Keldi Ketdi */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-[20px] overflow-hidden">
                        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3 bg-black/20">
                            <ArrowRightLeft size={20} className="text-emerald-400" />
                            <h3 className="m-0 text-white text-[1.15rem] font-semibold">Oxirgi 10 ta Keldi-Ketdi</h3>
                        </div>
                        <div>
                            {dashboardData.recent_controls.length === 0 ? (
                                <div className="p-10 text-center text-text-muted">Ma'lumot yo'q</div>
                            ) : dashboardData.recent_controls.map(item => (
                                <div key={item.id} className="px-6 py-4 border-b border-dashed border-white/5 flex items-center gap-4 last:border-b-0">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 shrink-0">
                                        <ArrowRightLeft size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="m-0 mb-1 text-slate-50 font-semibold text-[0.95rem] truncate">
                                            {item.full_name || 'Noma\'lum'}
                                            <span className="font-normal text-text-muted ml-2">
                                                ({item.role === 'student' ? 'Talaba' : item.role === 'employee' ? 'Xodim' : item.role === 'teacher' ? 'O\'qituvchi' : item.role})
                                            </span>
                                        </p>
                                        <p className="m-0 text-text-muted text-[0.85rem] flex items-center gap-1.5 flex-wrap">
                                            <span className="text-emerald-400">Kirdi: {formatDate(item.arrival)}</span>
                                            {item.departure && (
                                                <>
                                                    <span className="mx-1 text-slate-600">|</span>
                                                    <span className="text-red-400">Ketdi: {formatDate(item.departure)}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ijaralar */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-[20px] overflow-hidden">
                        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3 bg-black/20">
                            <BookOpen size={20} className="text-blue-400" />
                            <h3 className="m-0 text-white text-[1.15rem] font-semibold">Oxirgi 10 ta Ijara</h3>
                        </div>
                        <div>
                            {dashboardData.recent_rentals.length === 0 ? (
                                <div className="p-10 text-center text-text-muted">Ma'lumot yo'q</div>
                            ) : dashboardData.recent_rentals.map(item => (
                                <div key={item.id} className="px-6 py-4 border-b border-dashed border-white/5 flex items-center gap-4 last:border-b-0">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-500 shrink-0">
                                        <BookOpen size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="m-0 mb-1 text-slate-50 font-semibold text-[0.95rem] truncate">{item.book_title}</p>
                                        <p className="m-0 mb-1 text-slate-200 text-[0.85rem] truncate">
                                            {item.user_full_name || 'Noma\'lum'}
                                            <span className="font-normal text-text-muted ml-1.5">
                                                ({item.role === 'student' ? 'Talaba' : item.role === 'employee' ? 'Xodim' : item.role === 'teacher' ? 'O\'qituvchi' : item.role})
                                            </span>
                                        </p>
                                        <p className="m-0 text-text-muted text-[0.85rem] flex items-center gap-1.5 flex-wrap">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock size={12} />
                                                Berildi: {item.loan_date} / Gacha: {item.due_date}
                                            </span>
                                            {item.return_date && item.status === 'returned' && (
                                                <span className="inline-flex items-center gap-1 ml-2 text-emerald-400">
                                                    | Qaytardi: {item.return_date}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[0.75rem] font-semibold tracking-wide border ${item.status === 'returned' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
