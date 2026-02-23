import { useState, useEffect } from 'react'
import { api, type ReportDashboardResponse } from '../../services/api'
import { FileSpreadsheet, Loader2, Calendar as CalendarIcon, Download, ArrowRightLeft, BookOpen, Clock, AlertCircle } from 'lucide-react'
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
        <div className="reports-page">
            <style>{`
                .reports-page {
                    padding: 32px 40px;
                    max-width: 1600px;
                    margin: 0 auto;
                    font-family: 'Inter', system-ui, sans-serif;
                    min-height: 100vh;
                }
                .rep-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
                    padding: 32px 40px;
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 40px -20px rgba(0,0,0,0.3);
                }
                .rep-header::after {
                    content: '';
                    position: absolute;
                    top: -50%; left: -50%;
                    width: 200%; height: 200%;
                    background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 50%);
                    pointer-events: none;
                }
                .rep-header h1 {
                    font-size: 2.2rem;
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    background: linear-gradient(to right, #34d399, #60a5fa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -0.5px;
                }
                .rep-header p {
                    color: #9ca3af;
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 500;
                }
                
                .export-panel {
                    background: rgba(31, 41, 55, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 32px;
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    flex-wrap: wrap;
                }
                
                .export-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #f3f4f6;
                    font-weight: 600;
                    font-size: 1.1rem;
                    margin-right: auto;
                }
                
                .date-input-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(0,0,0,0.2);
                    padding: 8px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                
                .date-input {
                    background: transparent;
                    border: none;
                    color: #fff;
                    font-family: inherit;
                    outline: none;
                    font-size: 0.95rem;
                }
                .date-input::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.6;
                    cursor: pointer;
                }
                
                .export-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border-radius: 12px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: white;
                }
                .btn-rentals { background: linear-gradient(135deg, #3b82f6, #2563eb); }
                .btn-controls { background: linear-gradient(135deg, #10b981, #059669); }
                .export-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px -4px rgba(0,0,0,0.3); }
                .export-btn:disabled { opacity: 0.7; cursor: not-allowed; }
                
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 32px;
                }
                @media (max-width: 1200px) {
                    .dashboard-grid { grid-template-columns: 1fr; }
                }
                
                .board-card {
                    background: rgba(31, 41, 55, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    overflow: hidden;
                }
                
                .board-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(0,0,0,0.2);
                }
                
                .board-header h3 {
                    margin: 0;
                    color: #fff;
                    font-size: 1.15rem;
                    font-weight: 600;
                }
                
                .list-item {
                    padding: 16px 24px;
                    border-bottom: 1px dashed rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .list-item:last-child { border-bottom: none; }
                
                .list-icon {
                    width: 40px; height: 40px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.05);
                    display: flex; align-items: center; justify-content: center;
                }
                
                .list-content { flex: 1; }
                .item-title { margin: 0 0 4px 0; color: #f9fafb; font-weight: 600; font-size: 0.95rem; }
                .item-sub { margin: 0; color: #9ca3af; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
                
                .status-badge {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }
                
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin-icon { animation: spin 1s linear infinite; }
            `}</style>

            <div className="rep-header">
                <div>
                    <h1>Umumiy Hisobotlar</h1>
                    <p>Tizimdagi keldi-ketdi va ijaralarni Excel formatida yuklash</p>
                </div>
                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <FileSpreadsheet size={28} color="#34d399" />
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>Admin Eksport</div>
                        <div style={{ color: '#fff', fontWeight: 700 }}>.XLSX Generator</div>
                    </div>
                </div>
            </div>

            <div className="export-panel">
                <div className="export-title">
                    <Download size={22} color="#60a5fa" />
                    Ma'lumotlarni qazib olish
                </div>

                <div className="date-input-group">
                    <CalendarIcon size={18} color="#9ca3af" />
                    <span>dan:</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="date-input"
                    />
                </div>

                <div className="date-input-group">
                    <CalendarIcon size={18} color="#9ca3af" />
                    <span>gacha:</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="date-input"
                    />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="export-btn btn-rentals"
                        onClick={() => handleExport('rentals')}
                        disabled={exporting !== null}
                    >
                        {exporting === 'rentals' ? <Loader2 size={18} className="spin-icon" /> : <BookOpen size={18} />}
                        Ijaralarni yuklash
                    </button>

                    <button
                        className="export-btn btn-controls"
                        onClick={() => handleExport('controls')}
                        disabled={exporting !== null}
                    >
                        {exporting === 'controls' ? <Loader2 size={18} className="spin-icon" /> : <ArrowRightLeft size={18} />}
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
