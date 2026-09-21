import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {
    Activity,
    AlertTriangle,
    AlertCircle,
    Info,
    Search,
    RefreshCw,
    Download,
    Terminal,
    Copy,
    Check,
    X,
    Filter,
    Clock,
    FileText,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
    Zap,
    Cpu,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import type { SystemLogEntry, LogStats, LogFileInfo, SystemLogQuery } from '../../services/api.types'

export default function SystemLogsPage() {
    const { user, isLoading: isAuthLoading } = useAuth()

    // Faqat Super Admin uchun ruxsat!
    const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true

    // State
    const [logs, setLogs] = useState<SystemLogEntry[]>([])
    const [files, setFiles] = useState<LogFileInfo[]>([])
    const [currentFile, setCurrentFile] = useState<string>('')
    const [stats, setStats] = useState<LogStats>({
        total: 0,
        error_count: 0,
        warn_count: 0,
        info_count: 0,
        debug_count: 0,
    })
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

    // Filtirlar
    const [selectedLevel, setSelectedLevel] = useState<string>('ALL')
    const [selectedModule, setSelectedModule] = useState<string>('all')
    const [selectedStatusCode, setSelectedStatusCode] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [debouncedSearch, setDebouncedSearch] = useState<string>('')

    // Paginatsiya
    const [page, setPage] = useState<number>(1)
    const [perPage, setPerPage] = useState<number>(50)
    const [totalPages, setTotalPages] = useState<number>(1)
    const [totalFiltered, setTotalFiltered] = useState<number>(0)

    // Jonli yangilanish (Auto-refresh)
    const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(0) // 0 = disabled

    // Modal / Tafsilotlar
    const [selectedLog, setSelectedLog] = useState<SystemLogEntry | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Qidiruvni debounce qilish (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setPage(1)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Loglarni yuklash
    const fetchLogs = useCallback(
        async (isBackground = false) => {
            if (!isSuperAdmin) return

            if (isBackground) {
                setIsRefreshing(true)
            } else {
                setIsLoading(true)
            }

            try {
                const query: SystemLogQuery = {
                    page,
                    per_page: perPage,
                }

                if (currentFile) query.file = currentFile
                if (selectedLevel !== 'ALL') query.level = selectedLevel
                if (selectedModule !== 'all') query.module = selectedModule
                if (selectedStatusCode !== 'all') query.status_code = parseInt(selectedStatusCode, 10)
                if (debouncedSearch.trim()) query.search = debouncedSearch.trim()

                const res = await api.getSystemLogs(query)

                setLogs(res.logs)
                setStats(res.stats)
                setFiles(res.files)
                setCurrentFile(res.current_file)
                setTotalPages(res.total_pages)
                setTotalFiltered(res.total_filtered)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Loglarni yuklashda xatolik yuz berdi"
                if (!isBackground) {
                    toast.error(msg)
                }
            } finally {
                setIsLoading(false)
                setIsRefreshing(false)
            }
        },
        [isSuperAdmin, currentFile, selectedLevel, selectedModule, selectedStatusCode, debouncedSearch, page, perPage]
    )

    // Dastlabki va filtrlar o'zgarganda yuklash
    useEffect(() => {
        fetchLogs(false)
    }, [fetchLogs])

    // Jonli yangilanish taymeri
    useEffect(() => {
        if (autoRefreshSecs <= 0) return

        const interval = setInterval(() => {
            fetchLogs(true)
        }, autoRefreshSecs * 1000)

        return () => clearInterval(interval)
    }, [autoRefreshSecs, fetchLogs])

    // Faylni yuklab olish
    const handleDownload = async () => {
        if (!currentFile) {
            toast.error("Tanlangan log fayli topilmadi")
            return
        }

        try {
            const blob = await api.downloadSystemLogFile(currentFile)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = currentFile
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success(`${currentFile} fayli yuklab olindi`)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Faylni yuklab olishda xatolik yuz berdi"
            toast.error(msg)
        }
    }

    // Nusxa olish yordamchisi
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast.info("Buferga nusxalandi", { autoClose: 1500 })
        setTimeout(() => setCopiedId(null), 2000)
    }

    // Ruxsat tekshiruvi: Agar Super Admin bo'lmasa, sahifani ochmaymiz
    if (!isAuthLoading && !isSuperAdmin) {
        return <Navigate to="/admin" replace />
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {/* Sarlavha va asosiy tugmalar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface/80 backdrop-blur-md p-5 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center text-primary-light shadow-inner">
                        <Terminal size={26} className="text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-black tracking-tight text-text">Tizim Loglari</h1>
                            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
                                <ShieldAlert size={13} />
                                Faqat Super Admin
                            </span>
                        </div>
                        <p className="text-sm text-text-muted mt-0.5">
                            Server hodisalari, HTTP so'rovlari, xatoliklar va tizim faoliyatini real vaqtda kuzatish
                        </p>
                    </div>
                </div>

                {/* Boshqaruv tugmalari */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Auto-refresh selector */}
                    <div className="flex items-center gap-1.5 bg-surface-hover/70 border border-border rounded-xl px-3 py-2 text-xs font-medium text-text">
                        <Clock size={15} className="text-text-muted" />
                        <span>Jonli:</span>
                        <select
                            value={autoRefreshSecs}
                            onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
                            className="bg-transparent border-none text-primary font-semibold outline-none cursor-pointer text-xs"
                        >
                            <option value={0}>O'chirilgan</option>
                            <option value={5}>Har 5 sek</option>
                            <option value={10}>Har 10 sek</option>
                            <option value={30}>Har 30 sek</option>
                        </select>
                        {autoRefreshSecs > 0 && (
                            <span className="relative flex h-2 w-2 ml-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        )}
                    </div>

                    {/* Yangilash tugmasi */}
                    <button
                        onClick={() => fetchLogs(false)}
                        disabled={isLoading || isRefreshing}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-border text-text font-semibold text-xs transition border border-border active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                        title="Loglarni yangilash"
                    >
                        <RefreshCw size={15} className={isRefreshing || isLoading ? 'animate-spin text-primary' : ''} />
                        <span>Yangilash</span>
                    </button>

                    {/* Faylni yuklab olish tugmasi */}
                    <button
                        onClick={handleDownload}
                        disabled={!currentFile || isLoading}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark font-semibold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20"
                        title="Joriy log faylini to'liq yuklab olish"
                    >
                        <Download size={15} />
                        <span>Faylni yuklab olish</span>
                    </button>
                </div>
            </div>

            {/* Statistika Kartalari (Stats Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Jami loglar */}
                <div
                    onClick={() => { setSelectedLevel('ALL'); setPage(1); }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedLevel === 'ALL'
                            ? 'bg-primary/10 border-primary/40 shadow-sm ring-1 ring-primary/30'
                            : 'bg-surface/80 border-border hover:border-border-hover'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Jami loglar</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                            <Activity size={18} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-text">{stats.total.toLocaleString()}</span>
                        <span className="text-xs text-text-muted">yozuv</span>
                    </div>
                </div>

                {/* Xatoliklar (ERROR) */}
                <div
                    onClick={() => { setSelectedLevel(selectedLevel === 'ERROR' ? 'ALL' : 'ERROR'); setPage(1); }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedLevel === 'ERROR'
                            ? 'bg-rose-500/15 border-rose-500/50 shadow-sm ring-1 ring-rose-500/30'
                            : 'bg-surface/80 border-border hover:border-border-hover'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Xatoliklar (ERROR)</span>
                        <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center relative">
                            <AlertCircle size={18} />
                            {stats.error_count > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                            )}
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${stats.error_count > 0 ? 'text-rose-400' : 'text-text'}`}>
                            {stats.error_count.toLocaleString()}
                        </span>
                        <span className="text-xs text-text-muted">ta xato</span>
                    </div>
                </div>

                {/* Ogohlantirishlar (WARN) */}
                <div
                    onClick={() => { setSelectedLevel(selectedLevel === 'WARN' ? 'ALL' : 'WARN'); setPage(1); }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedLevel === 'WARN'
                            ? 'bg-amber-500/15 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                            : 'bg-surface/80 border-border hover:border-border-hover'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Ogohlantirishlar (WARN)</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                            <AlertTriangle size={18} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${stats.warn_count > 0 ? 'text-amber-400' : 'text-text'}`}>
                            {stats.warn_count.toLocaleString()}
                        </span>
                        <span className="text-xs text-text-muted">ta ogohlantirish</span>
                    </div>
                </div>

                {/* Axborot (INFO) */}
                <div
                    onClick={() => { setSelectedLevel(selectedLevel === 'INFO' ? 'ALL' : 'INFO'); setPage(1); }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedLevel === 'INFO'
                            ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                            : 'bg-surface/80 border-border hover:border-border-hover'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Axborot (INFO)</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                            <Info size={18} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-400">{stats.info_count.toLocaleString()}</span>
                        <span className="text-xs text-text-muted">ta amaliyot</span>
                    </div>
                </div>
            </div>

            {/* Filtrlash Paneli (Comprehensive Filter Bar) */}
            <div className="bg-surface/80 backdrop-blur-md p-4.5 rounded-2xl border border-border shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                    <Filter size={14} className="text-primary" />
                    <span>Filtrlar va qidiruv</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Log fayli / Sana */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                            <Calendar size={13} />
                            Fayl / Sana
                        </label>
                        <select
                            value={currentFile}
                            onChange={(e) => {
                                setCurrentFile(e.target.value)
                                setPage(1)
                            }}
                            className="w-full bg-surface-hover/80 border border-border rounded-xl px-3 py-2 text-xs font-medium text-text outline-none focus:border-primary transition cursor-pointer"
                        >
                            {files.map((f) => (
                                <option key={f.filename} value={f.filename}>
                                    {f.date} {f.is_current ? " (Joriy kun)" : ""} - ({(f.size_bytes / 1024).toFixed(1)} KB)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Log darajasi (Level) */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                            <AlertCircle size={13} />
                            Daraja (Level)
                        </label>
                        <select
                            value={selectedLevel}
                            onChange={(e) => {
                                setSelectedLevel(e.target.value)
                                setPage(1)
                            }}
                            className="w-full bg-surface-hover/80 border border-border rounded-xl px-3 py-2 text-xs font-medium text-text outline-none focus:border-primary transition cursor-pointer"
                        >
                            <option value="ALL">Barchasi (Hammasi)</option>
                            <option value="ERROR">🔴 ERROR (Xatoliklar)</option>
                            <option value="WARN">🟡 WARN (Ogohlantirishlar)</option>
                            <option value="INFO">🟢 INFO (Axborot)</option>
                            <option value="DEBUG">⚪ DEBUG (Tuzatish)</option>
                        </select>
                    </div>

                    {/* Tizim Moduli (Module) */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                            <Cpu size={13} />
                            Modul
                        </label>
                        <select
                            value={selectedModule}
                            onChange={(e) => {
                                setSelectedModule(e.target.value)
                                setPage(1)
                            }}
                            className="w-full bg-surface-hover/80 border border-border rounded-xl px-3 py-2 text-xs font-medium text-text outline-none focus:border-primary transition cursor-pointer"
                        >
                            <option value="all">Barcha modullar</option>
                            <option value="auth">🔑 Autentifikatsiya (Auth/Login)</option>
                            <option value="http">🌐 HTTP So'rovlar (API/Middleware)</option>
                            <option value="scheduler">⏰ Rejalashtiruvchi (Schedulers)</option>
                            <option value="db">🗄️ Ma'lumotlar bazasi (SQLx/DB)</option>
                            <option value="system">⚙️ Tizim (Server/Seeder)</option>
                            <option value="other">Boshqalar</option>
                        </select>
                    </div>

                    {/* HTTP Status kodi */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                            <Zap size={13} />
                            HTTP Status
                        </label>
                        <select
                            value={selectedStatusCode}
                            onChange={(e) => {
                                setSelectedStatusCode(e.target.value)
                                setPage(1)
                            }}
                            className="w-full bg-surface-hover/80 border border-border rounded-xl px-3 py-2 text-xs font-medium text-text outline-none focus:border-primary transition cursor-pointer"
                        >
                            <option value="all">Barcha statuslar</option>
                            <option value="2">2xx (Muvaffaqiyatli - 200..299)</option>
                            <option value="4">4xx (Mijoz xatosi - 400..499)</option>
                            <option value="400">400 (Bad Request)</option>
                            <option value="401">401 (Unauthorized)</option>
                            <option value="403">403 (Forbidden)</option>
                            <option value="404">404 (Not Found)</option>
                            <option value="5">5xx (Server xatosi - 500..599)</option>
                        </select>
                    </div>

                    {/* Matnli qidiruv */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5">
                            <Search size={13} />
                            Tezkor qidiruv
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Xabar, IP, User ID, Route..."
                                className="w-full bg-surface-hover/80 border border-border rounded-xl pl-8 pr-7 py-2 text-xs font-medium text-text outline-none focus:border-primary transition placeholder:text-text-muted/60"
                            />
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer p-0.5"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loglar Jadvali / Terminal Ko'rinishi */}
            <div className="bg-surface/80 backdrop-blur-md rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                {/* Jadval tepasidagi ma'lumot qatori */}
                <div className="p-4 border-b border-border flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                        <Terminal size={15} className="text-primary" />
                        <span className="font-semibold text-text">Tizim yozuvlari</span>
                        <span>({totalFiltered.toLocaleString()} ta mos keldi)</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline">Har sahifada:</span>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value))
                                setPage(1)
                            }}
                            className="bg-surface-hover border border-border rounded-lg px-2 py-1 text-xs text-text font-medium outline-none cursor-pointer"
                        >
                            <option value={25}>25 ta</option>
                            <option value={50}>50 ta</option>
                            <option value={100}>100 ta</option>
                            <option value={200}>200 ta</option>
                        </select>
                    </div>
                </div>

                {/* Log satrlari ro'yxati */}
                {isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3 text-text-muted text-sm">
                        <RefreshCw size={28} className="animate-spin text-primary" />
                        <span>Loglar yuklanmoqda...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center text-text-muted">
                            <FileText size={28} />
                        </div>
                        <span className="font-semibold text-text text-sm">Belgilangan filtrlarga mos loglar topilmadi</span>
                        <p className="text-xs text-text-muted max-w-sm">
                            Filtr parametrlarini o'zgartirib yoki qidiruv so'zini tozalab qayta urinib ko'ring.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/60 overflow-x-auto">
                        {logs.map((entry) => {
                            const isError = entry.level === 'ERROR'
                            const isWarn = entry.level === 'WARN'
                            const isDebug = entry.level === 'DEBUG'

                            // Vaqtni chiroyli formatlash
                            const timeStr = entry.timestamp
                                ? entry.timestamp.replace('T', ' ').replace('Z', '').slice(11, 23)
                                : '--:--:--'

                            return (
                                <div
                                    key={entry.id}
                                    onClick={() => setSelectedLog(entry)}
                                    className={`p-3.5 sm:px-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-hover/80 transition cursor-pointer font-mono text-xs ${
                                        isError
                                            ? 'bg-rose-500/5 hover:bg-rose-500/10'
                                            : isWarn
                                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                            : ''
                                    }`}
                                >
                                    {/* Chap qism: Vaqt, Level, Modul va Xabar */}
                                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                                        {/* Vaqt */}
                                        <span className="text-text-muted shrink-0 text-[11px] font-semibold tracking-wider">
                                            {timeStr}
                                        </span>

                                        {/* Daraja Badge */}
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 ${
                                                isError
                                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                    : isWarn
                                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                    : isDebug
                                                    ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            }`}
                                        >
                                            {entry.level}
                                        </span>

                                        {/* Modul Badge */}
                                        <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-hover text-text-muted border border-border shrink-0">
                                            {entry.module}
                                        </span>

                                        {/* Xabar */}
                                        <span className="text-text font-medium truncate flex-1 leading-relaxed">
                                            {entry.message || entry.error_details || 'Xabar matni mavjud emas'}
                                        </span>
                                    </div>

                                    {/* O'ng qism: HTTP tafsilotlari yoki Foydalanuvchi */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-[11px]">
                                        {/* HTTP Method & Route */}
                                        {entry.http_method && (
                                            <span className="px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
                                                <span className="font-bold text-primary-light">{entry.http_method}</span>{' '}
                                                <span className="text-text-muted/80">{entry.http_route || ''}</span>
                                            </span>
                                        )}

                                        {/* HTTP Status */}
                                        {entry.http_status && (
                                            <span
                                                className={`px-2 py-0.5 rounded font-bold ${
                                                    entry.http_status >= 500
                                                        ? 'bg-rose-500/20 text-rose-400'
                                                        : entry.http_status >= 400
                                                        ? 'bg-amber-500/20 text-amber-400'
                                                        : 'bg-emerald-500/20 text-emerald-400'
                                                }`}
                                            >
                                                {entry.http_status}
                                            </span>
                                        )}

                                        {/* User ID */}
                                        {entry.user_id && (
                                            <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                                @{entry.user_id}
                                            </span>
                                        )}

                                        {/* Client IP */}
                                        {entry.client_ip && (
                                            <span className="hidden lg:inline text-text-muted/70 text-[10px]">
                                                {entry.client_ip}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Paginatsiya paneli */}
                <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
                    <div>
                        Sahifa <span className="font-semibold text-text">{page}</span> /{' '}
                        <span className="font-semibold text-text">{totalPages}</span> (Jami: {totalFiltered.toLocaleString()} ta log)
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || isLoading}
                            className="p-1.5 rounded-lg bg-surface-hover hover:bg-border text-text disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer border border-border"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 py-1 font-semibold text-text">{page}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isLoading}
                            className="p-1.5 rounded-lg bg-surface-hover hover:bg-border text-text disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer border border-border"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Tafsilotlari Modali (Inspector Drawer / Modal) */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-110 flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
                    <div className="bg-surface border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-hover/50">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                        selectedLog.level === 'ERROR'
                                            ? 'bg-rose-500/20 text-rose-400'
                                            : selectedLog.level === 'WARN'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-primary/20 text-primary-light'
                                    }`}
                                >
                                    <Terminal size={19} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-text">Log Yozuvi Tafsiloti</h3>
                                    <p className="text-xs text-text-muted font-mono">{selectedLog.timestamp}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleCopy(selectedLog.raw_json, 'modal')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-hover hover:bg-border text-text text-xs font-semibold border border-border transition cursor-pointer"
                                >
                                    {copiedId === 'modal' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    <span>{copiedId === 'modal' ? 'Nusxalandi' : 'JSON nusxalash'}</span>
                                </button>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-hover transition cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto space-y-4 text-xs">
                            {/* Asosiy ma'lumotlar kartasi */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-surface-hover/70 border border-border">
                                <div>
                                    <span className="text-text-muted block text-[11px]">Daraja:</span>
                                    <span className="font-bold text-text uppercase">{selectedLog.level}</span>
                                </div>
                                <div>
                                    <span className="text-text-muted block text-[11px]">Modul:</span>
                                    <span className="font-semibold text-text">{selectedLog.module}</span>
                                </div>
                                <div>
                                    <span className="text-text-muted block text-[11px]">Nishon (Target):</span>
                                    <span className="font-mono text-text truncate block">{selectedLog.target}</span>
                                </div>
                                <div>
                                    <span className="text-text-muted block text-[11px]">HTTP Status:</span>
                                    <span className="font-bold text-text">{selectedLog.http_status || 'Yo\'q'}</span>
                                </div>
                            </div>

                            {/* Xabar yoki Xatolik */}
                            <div className="space-y-1.5">
                                <span className="font-semibold text-text block">Hodisa xabari:</span>
                                <div className="p-3.5 rounded-xl bg-black/40 border border-border font-mono text-text leading-relaxed wrap-break-word whitespace-pre-wrap">
                                    {selectedLog.message || selectedLog.error_details || 'Xabar mavjud emas'}
                                </div>
                            </div>

                            {/* HTTP & Mijoz ma'lumotlari */}
                            {(selectedLog.http_route || selectedLog.client_ip || selectedLog.request_id || selectedLog.user_id) && (
                                <div className="space-y-1.5">
                                    <span className="font-semibold text-text block">So'rov tafsilotlari:</span>
                                    <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                                        {selectedLog.http_method && (
                                            <div>
                                                <span className="text-text-muted">Metod:</span>{' '}
                                                <span className="font-bold text-primary">{selectedLog.http_method}</span>
                                            </div>
                                        )}
                                        {selectedLog.http_route && (
                                            <div className="truncate">
                                                <span className="text-text-muted">Route:</span>{' '}
                                                <span className="text-text">{selectedLog.http_route}</span>
                                            </div>
                                        )}
                                        {selectedLog.client_ip && (
                                            <div>
                                                <span className="text-text-muted">IP manzil:</span>{' '}
                                                <span className="text-text">{selectedLog.client_ip}</span>
                                            </div>
                                        )}
                                        {selectedLog.user_id && (
                                            <div>
                                                <span className="text-text-muted">Foydalanuvchi:</span>{' '}
                                                <span className="font-bold text-indigo-300">@{selectedLog.user_id}</span>
                                            </div>
                                        )}
                                        {selectedLog.request_id && (
                                            <div className="col-span-1 sm:col-span-2 truncate">
                                                <span className="text-text-muted">Request ID:</span>{' '}
                                                <span className="text-text select-all">{selectedLog.request_id}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Xatolik tafsilotlari (Stack trace / Exception) */}
                            {selectedLog.error_details && (
                                <div className="space-y-1.5">
                                    <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} />
                                        Xatolik tafsiloti (Exception details):
                                    </span>
                                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[11px] leading-relaxed wrap-break-word whitespace-pre-wrap">
                                        {selectedLog.error_details}
                                    </div>
                                </div>
                            )}

                            {/* To'liq Formatlangan JSON */}
                            <div className="space-y-1.5">
                                <span className="font-semibold text-text-muted block">To'liq JSON ma'lumoti:</span>
                                <pre className="p-3.5 rounded-xl bg-black/60 border border-border font-mono text-[11px] text-emerald-400/90 overflow-x-auto leading-relaxed max-h-60">
                                    {JSON.stringify(JSON.parse(selectedLog.raw_json || '{}'), null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 border-t border-border flex justify-end bg-surface-hover/30">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 rounded-xl bg-surface-hover hover:bg-border text-text font-semibold text-xs transition cursor-pointer border border-border"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
