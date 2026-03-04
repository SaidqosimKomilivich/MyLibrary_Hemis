import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Briefcase, Search, RefreshCw, X, ArrowDownToLine, CheckCircle2, Eye, KeyRound, Power, AlertCircle, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, ShieldAlert, UserCog, Hash, BookUser, Mail, Phone, Calendar } from 'lucide-react'
import { CustomSelect } from '../../components/CustomSelect'
import { api } from '../../services/api'
import type { UserData } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-toastify'

// Sync progress helper
function getSyncLabel(progress: number): string {
    if (progress === 0) return ''
    if (progress < 20) return 'HEMIS platformasiga ulanilmoqda...'
    if (progress < 50) return "Ma'lumotlar yuklanmoqda..."
    if (progress < 80) return "Ma'lumotlar qayta ishlanmoqda..."
    if (progress < 100) return 'Yakunlanmoqda...'
    return 'Muvaffaqiyatli sinxronlandi!'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useHemisSync(syncFn: () => Promise<any>, reloadFn: () => Promise<void>) {
    const [progress, setProgress] = useState(0)
    const [syncResult, setSyncResult] = useState<{ created: number; updated: number; total: number } | null>(null)

    const handleSync = useCallback(async () => {
        setProgress(10)
        setSyncResult(null)

        const progressInterval = setInterval(() => {
            setProgress(p => (p < 90 ? p + Math.random() * 15 : 90))
        }, 800)

        try {
            const resp = await syncFn()
            clearInterval(progressInterval)

            if (resp.success) {
                setProgress(100)
                setSyncResult({ created: resp.created, updated: resp.updated, total: resp.total })
                toast.success(resp.message || 'Sinxronlash muvaffaqiyatli')
                await reloadFn()
            } else {
                setProgress(0)
                toast.error(resp.message || 'Sinxronlashda xatolik')
            }
        } catch (e) {
            clearInterval(progressInterval)
            setProgress(0)
            toast.error(e instanceof Error ? e.message : 'HEMIS bilan aloqa uzildi')
        }
    }, [syncFn, reloadFn])

    const reset = useCallback(() => {
        setProgress(0)
        setSyncResult(null)
    }, [])

    return { progress, syncResult, handleSync, reset }
}

function UserDetailModal({ user, onClose }: { user: UserData; onClose: () => void }) {
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('')

    const infoRows = [
        { icon: <Hash size={16} />, label: 'ID', value: user.user_id },
        { icon: <Briefcase size={16} />, label: "Bo'lim", value: user.department_name || "Noma'lum" },
        { icon: <BookUser size={16} />, label: 'Lavozim', value: user.staff_position || "Noma'lum" },
        { icon: <ShieldAlert size={16} />, label: 'Rol', value: user.role === 'staff' ? 'Kutubxon' : user.role === 'admin' ? 'Administrator' : user.role === 'teacher' ? "O'qituvchi" : user.role },
        { icon: <Mail size={16} />, label: 'Email', value: user.email || '-' },
        { icon: <Phone size={16} />, label: 'Telefon', value: user.phone || '-' },
        { icon: <Calendar size={16} />, label: "Tug'ilgan sana", value: user.birth_date || '-' },
    ]

    return createPortal(
        <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="relative w-full max-w-[480px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-3.5 right-3.5 flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-text-muted hover:bg-surface-hover hover:text-text transition-colors z-10" onClick={onClose}>
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-linear-to-b from-indigo-500/15 to-transparent border-b border-border gap-3">
                    <div className="relative p-1.5 rounded-3xl bg-linear-to-br from-indigo-500/30 to-indigo-500/5 shadow-[0_0_40px_rgba(99,102,241,0.25)] mb-2">
                        {user.image_url ? (
                            <img src={user.image_url} alt={user.full_name} className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
                        ) : (
                            <div className="flex items-center justify-center w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-600 font-bold text-[2.5rem] tracking-[2px] text-white shadow-[0_8px_24px_rgba(99,102,241,0.4)]">
                                {getInitials(user.full_name)}
                            </div>
                        )}
                    </div>
                    <h3 className="text-[1.35rem] leading-tight max-w-[90%] font-extrabold text-text text-center uppercase tracking-wide">{user.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center py-1.5 px-4 rounded-full text-[0.8rem] font-bold tracking-wide ${user.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                            {user.active ? 'Faol' : 'Nofaol'}
                        </span>
                        <span className="inline-flex items-center py-1.5 px-4 rounded-full text-[0.8rem] font-bold bg-white/10 border border-white/20 text-text-muted shadow-sm">
                            {user.role === 'admin' ? '👑 Admin' : '💼 Kutubxonachi'}
                        </span>
                    </div>
                </div>

                {/* Info rows */}
                <div className="flex flex-col gap-1 p-5 pb-6">
                    {infoRows.map((row, i) => (
                        <div key={i} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl transition-colors hover:bg-white/5 group">
                            <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-border text-text-muted group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
                                {row.icon}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-text-muted mb-0.5">{row.label}</span>
                                <span className="text-[0.9rem] font-medium text-text wrap-break-word leading-tight">{row.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    )
}

// Per-page options
const PER_PAGE_OPTIONS = [20, 40, 60, 80, 100]

interface PaginationState {
    currentPage: number
    perPage: number
    totalItems: number
    totalPages: number
}

const defaultPagination: PaginationState = {
    currentPage: 1,
    perPage: 20,
    totalItems: 0,
    totalPages: 1,
}

export default function AdminEmployeesPage() {
    const { user } = useAuth()
    const isSuperAdmin = user?.is_super_admin === true

    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [syncModalOpen, setSyncModalOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [subTab, setSubTab] = useState<'staff' | 'admins'>('staff')

    const [staff, setStaff] = useState<UserData[]>([])
    const [loading, setLoading] = useState(false)

    const [admins, setAdmins] = useState<UserData[]>([])
    const [loadingAdmins, setLoadingAdmins] = useState(false)

    const [pag, setPag] = useState<PaginationState>({ ...defaultPagination })
    const [adminsPag, setAdminsPag] = useState<PaginationState>({ ...defaultPagination })

    // Modals state
    const [viewUser, setViewUser] = useState<UserData | null>(null)
    const [resetUser, setResetUser] = useState<UserData | null>(null)
    const [resetLoading, setResetLoading] = useState(false)
    const [roleUser, setRoleUser] = useState<UserData | null>(null)
    const [selectedRole, setSelectedRole] = useState('')
    const [roleLoading, setRoleLoading] = useState(false)
    const [statusUser, setStatusUser] = useState<UserData | null>(null)
    const [statusLoading, setStatusLoading] = useState(false)

    // Debounce search
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(search)
        }, 400)
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
    }, [search])

    useEffect(() => {
        setPag(prev => ({ ...prev, currentPage: 1 }))
        setAdminsPag(prev => ({ ...prev, currentPage: 1 }))
    }, [debouncedSearch, statusFilter])

    const loadStaff = useCallback(async () => {
        setLoading(true)
        try {
            const resp = await api.getStaff({
                page: pag.currentPage,
                per_page: pag.perPage,
                search: debouncedSearch || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            })
            if (resp.success) {
                setStaff(resp.data)
                setPag(prev => ({
                    ...prev,
                    totalItems: resp.pagination.total_items,
                    totalPages: resp.pagination.total_pages,
                }))
            }
        } catch (e) { console.error('Kutubxonachilarni yuklashda xato:', e) }
        finally { setLoading(false) }
    }, [pag.currentPage, pag.perPage, debouncedSearch, statusFilter])

    useEffect(() => { loadStaff() }, [loadStaff])

    const loadAdmins = useCallback(async () => {
        if (!isSuperAdmin) return
        setLoadingAdmins(true)
        try {
            const resp = await api.getAdmins({
                page: adminsPag.currentPage,
                per_page: adminsPag.perPage,
                search: debouncedSearch || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            })
            if (resp.success) {
                setAdmins(resp.data)
                setAdminsPag(prev => ({
                    ...prev,
                    totalItems: resp.pagination.total_items,
                    totalPages: resp.pagination.total_pages,
                }))
            }
        } catch (e) { console.error('Adminlarni yuklashda xato:', e) }
        finally { setLoadingAdmins(false) }
    }, [adminsPag.currentPage, adminsPag.perPage, debouncedSearch, statusFilter, isSuperAdmin])

    useEffect(() => { loadAdmins() }, [loadAdmins])

    const employeeSync = useHemisSync(api.syncHemisEmployees, loadStaff)

    // const handleOpenSyncModal = () => {
    //     employeeSync.reset()
    //     setSyncModalOpen(true)
    // }

    // Modal handlers
    const handleView = (user: UserData) => setViewUser(user)

    const confirmResetPassword = async () => {
        if (!resetUser) return
        setResetLoading(true)
        try {
            const res = await api.resetPassword(resetUser.id)
            toast.success(res.message || 'Parol muvaffaqiyatli tiklandi')
            setResetUser(null)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Parolni tiklashda xatolik')
        } finally {
            setResetLoading(false)
        }
    }

    const confirmChangeRole = async () => {
        if (!roleUser || !selectedRole) return
        setRoleLoading(true)
        try {
            const res = await api.updateUserRole(roleUser.id, selectedRole)
            toast.success(res.message || 'Rol muvaffaqiyatli o\'zgartirildi')
            setRoleUser(null)
            loadStaff()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Rolni o\'zgartirishda xatolik')
        } finally {
            setRoleLoading(false)
        }
    }

    const confirmToggleStatus = async () => {
        if (!statusUser) return
        setStatusLoading(true)
        try {
            const newActive = !statusUser.active
            const res = await api.updateUserStatus(statusUser.id, newActive)
            toast.success(res.message || 'Holat o\'zgartirildi')
            setStatusUser(null)
            loadStaff()
            loadAdmins()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Holatni o\'zgartirishda xatolik')
        } finally {
            setStatusLoading(false)
        }
    }

    const activePag = subTab === 'admins' ? adminsPag : pag

    const handlePageChange = (page: number) => {
        if (subTab === 'admins') setAdminsPag(prev => ({ ...prev, currentPage: page }))
        else setPag(prev => ({ ...prev, currentPage: page }))
    }

    const handlePerPageChange = (perPage: number) => {
        if (subTab === 'admins') setAdminsPag(prev => ({ ...prev, perPage, currentPage: 1 }))
        else setPag(prev => ({ ...prev, perPage, currentPage: 1 }))
    }

    const generatePageNumbers = () => {
        const pages: (number | '...')[] = []
        const { totalPages: total, currentPage: current } = activePag
        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i)
        } else {
            pages.push(1)
            if (current > 3) pages.push('...')
            const start = Math.max(2, current - 1)
            const end = Math.min(total - 1, current + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (current < total - 2) pages.push('...')
            pages.push(total)
        }
        return pages
    }

    return (
        <div className="animate-page-enter">
            {/* <div className="flex justify-between items-start gap-4 mb-6 flex-wrap">
                <div>
                    <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Xodimlar (Kutubxonachi)</h1>
                    <p className="text-[0.9rem] text-text-muted">Kutubxonada ishlovchi va tizimni boshqaruvchi xodimlarni nazorat qilish</p>
                </div>
                <button
                    className="flex items-center gap-2 py-2.5 px-5 bg-linear-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-[0.9rem] shadow-[0_4px_16px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-0.5"
                    onClick={handleOpenSyncModal}
                >
                    <RefreshCw size={18} />
                    Sinxronlash
                </button>
            </div> */}

            {/* Search & Filter Bar */}
            <div className="flex items-center justify-between gap-4 mb-6 p-1.5 bg-surface border border-border rounded-2xl max-md:flex-col max-md:p-3 max-md:gap-3">
                <div className="flex items-center relative flex-1 min-w-[280px] max-md:w-full">
                    <Search size={18} className="absolute left-4 text-text-muted" />
                    <input
                        type="text"
                        className="w-full bg-surface-hover border border-transparent focus:border-border focus:bg-surface rounded-xl py-2.5 pl-11 pr-10 text-[0.9rem] transition-all outline-none placeholder:text-text-muted/60"
                        placeholder="Ism, bo'lim yoki lavozim bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="absolute right-3 p-1 rounded-md text-text-muted hover:bg-surface-hover hover:text-text transition-colors" onClick={() => setSearch('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 px-3 max-md:w-full max-md:justify-between max-md:px-1">
                    <div className="flex items-center gap-2 text-text-muted">
                        <Filter size={15} />
                        <span className="text-[0.82rem] font-medium whitespace-nowrap">Holat:</span>
                        <div className="flex gap-1 p-1 bg-surface-hover/50 rounded-xl border border-border">
                            {[
                                { value: 'all', label: 'Hammasi' },
                                { value: 'active', label: 'Faol' },
                                { value: 'inactive', label: 'Nofaol' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    className={`py-1.5 px-3 rounded-lg text-[0.8rem] font-medium transition-all ${statusFilter === opt.value ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                                    onClick={() => setStatusFilter(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            {isSuperAdmin && (
                <div className="flex gap-2 w-full overflow-x-auto pb-2 mb-4 scrollbar-hide">
                    <button
                        className={`flex flex-1 justify-center items-center gap-2.5 py-2.5 px-5 rounded-xl font-semibold text-[0.9rem] whitespace-nowrap transition-all border ${subTab === 'staff' ? 'bg-indigo-500 text-white border-transparent shadow-[0_4px_12px_rgba(99,102,241,0.25)]' : 'bg-surface border-border text-text-muted hover:border-indigo-500/30 hover:text-text hover:bg-surface-hover'}`}
                        onClick={() => setSubTab('staff')}
                    >
                        <span className={subTab === 'staff' ? 'text-white' : 'text-indigo-400'}><Briefcase size={16} /></span>
                        Barcha xodimlar
                        <span className={`py-0.5 px-2 rounded-full text-[0.75rem] font-bold ${subTab === 'staff' ? 'bg-surface-hover/50 text-white' : 'bg-indigo-500/10 text-indigo-400'}`}>
                            {pag.totalItems}
                        </span>
                    </button>
                    <button
                        className={`flex flex-1 justify-center items-center gap-2.5 py-2.5 px-5 rounded-xl font-semibold text-[0.9rem] whitespace-nowrap transition-all border ${subTab === 'admins' ? 'bg-indigo-500 text-white border-transparent shadow-[0_4px_12px_rgba(99,102,241,0.25)]' : 'bg-surface border-border text-text-muted hover:border-indigo-500/30 hover:text-text hover:bg-surface-hover'}`}
                        onClick={() => setSubTab('admins')}
                    >
                        <span className={subTab === 'admins' ? 'text-white' : 'text-indigo-400'}><ShieldAlert size={16} /></span>
                        Adminlar ro'yxati
                        <span className={`py-0.5 px-2 rounded-full text-[0.75rem] font-bold ${subTab === 'admins' ? 'bg-surface-hover/50 text-white' : 'bg-indigo-500/10 text-indigo-400'}`}>
                            {adminsPag.totalItems}
                        </span>
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-surface border border-border rounded-xl overflow-x-auto shadow-sm">
                {subTab === 'staff' ? (
                    loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Kutubxonachilar yuklanmoqda...</span>
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
                            <AlertCircle size={32} />
                            <p className="text-[0.875rem]">Xodim topilmadi</p>
                            <p className="text-[0.75rem] opacity-60">Sinxronlash tugmasini bosing yoki qidiruvni o'zgartiring</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">#</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Ism</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Bo'lim</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Lavozim</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Holat</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staff.map((u, i) => (
                                    <tr key={u.id} className="transition-colors hover:bg-surface-hover/50 group border-b border-border/50">
                                        <td className="py-3 px-4 text-[0.875rem] text-text-muted">{(pag.currentPage - 1) * pag.perPage + i + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3 font-semibold text-[0.9rem]">
                                                {u.image_url ? (
                                                    <img src={u.image_url} alt={u.full_name} className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-indigo-500/20" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-[0.85rem] shrink-0 shadow-sm">{u.full_name.charAt(0)}</div>
                                                )}
                                                <span className="truncate max-w-[200px]">{u.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-[0.875rem] text-text-muted">{u.department_name || '-'}</td>
                                        <td className="py-3 px-4 text-[0.875rem] text-text-muted">{u.staff_position || '-'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-bold tracking-wide whitespace-nowrap ${u.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-surface-hover/50 text-slate-400 border border-slate-500/20'}`}>
                                                {u.active ? 'Faol' : 'Nofaol'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors" title="Ko'rish" onClick={() => handleView(u)}>
                                                    <Eye size={15} />
                                                </button>
                                                <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors" title="Parolni tiklash" onClick={() => setResetUser(u)}>
                                                    <KeyRound size={15} />
                                                </button>
                                                <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors" title="Rolni o'zgartirish" onClick={() => { setRoleUser(u); setSelectedRole(u.role); }}>
                                                    <UserCog size={15} />
                                                </button>
                                                <button className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${u.active ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`} title={u.active ? 'Nofaol qilish' : 'Faol qilish'} onClick={() => setStatusUser(u)}>
                                                    <Power size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : (
                    loadingAdmins ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Adminlar yuklanmoqda...</span>
                        </div>
                    ) : admins.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
                            <AlertCircle size={32} />
                            <p className="text-[0.875rem]">Admin topilmadi</p>
                            <p className="text-[0.75rem] opacity-60">Qidiruvni o'zgartirib ko'ring</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">#</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Ism</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Logini (ID)</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Lavozim</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Holat</th>
                                    <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map((u, i) => (
                                    <tr key={u.id} className="transition-colors hover:bg-surface-hover/50 group border-b border-border/50">
                                        <td className="py-3 px-4 text-[0.875rem] text-text-muted">{(adminsPag.currentPage - 1) * adminsPag.perPage + i + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3 font-semibold text-[0.9rem]">
                                                {u.image_url ? (
                                                    <img src={u.image_url} alt={u.full_name} className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-indigo-500/20" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-[0.85rem] shrink-0 shadow-sm">{u.full_name.charAt(0)}</div>
                                                )}
                                                <span className="truncate max-w-[200px]">{u.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-[0.875rem] text-text-muted">
                                            <span className="inline-flex py-1 px-3 bg-surface-hover border border-border rounded-lg font-mono font-medium">{u.user_id}</span>
                                        </td>
                                        <td className="py-3 px-4 text-[0.875rem] text-text-muted">{u.staff_position || 'Administrator'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-bold tracking-wide whitespace-nowrap ${u.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-surface-hover/50 text-slate-400 border border-slate-500/20'}`}>
                                                {u.active ? 'Faol' : 'Nofaol'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors" title="Ko'rish" onClick={() => handleView(u)}>
                                                    <Eye size={15} />
                                                </button>
                                                <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors" title="Parolni tiklash" onClick={() => setResetUser(u)}>
                                                    <KeyRound size={15} />
                                                </button>
                                                <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors" title="Rolni o'zgartirish" onClick={() => { setRoleUser(u); setSelectedRole(u.role); }}>
                                                    <UserCog size={15} />
                                                </button>
                                                <button className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${u.active ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`} title={u.active ? 'Nofaol qilish' : 'Faol qilish'} onClick={() => setStatusUser(u)}>
                                                    <Power size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>

            {/* Pagination */}
            {activePag.totalItems > 0 && (
                <div className="flex items-center justify-between gap-4 mt-5 p-4 bg-surface border border-border rounded-xl flex-wrap max-md:flex-col max-md:justify-center">
                    <div className="text-[0.85rem] text-text-muted">
                        Jami <strong className="text-text font-semibold">{activePag.totalItems}</strong> ta natija, {' '}
                        <strong className="text-text font-semibold">{(activePag.currentPage - 1) * activePag.perPage + 1}</strong>–
                        <strong className="text-text font-semibold">{Math.min(activePag.currentPage * activePag.perPage, activePag.totalItems)}</strong> ko'rsatilmoqda
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 disabled:opacity-40 disabled:hover:bg-transparent" disabled={activePag.currentPage <= 1} onClick={() => handlePageChange(1)}>
                            <ChevronsLeft size={16} />
                        </button>
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 disabled:opacity-40 disabled:hover:bg-transparent" disabled={activePag.currentPage <= 1} onClick={() => handlePageChange(activePag.currentPage - 1)}>
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex gap-1 mx-2">
                            {generatePageNumbers().map((p, i) =>
                                p === '...' ? (
                                    <span key={`dots-${i}`} className="flex items-center justify-center w-8 h-8 text-text-muted text-[0.85rem] tracking-widest">...</span>
                                ) : (
                                    <button
                                        key={p}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg text-[0.85rem] font-medium transition-all ${activePag.currentPage === p ? 'bg-indigo-500 text-white shadow-md' : 'border border-border text-text-muted hover:text-indigo-400 hover:bg-indigo-500/5'}`}
                                        onClick={() => handlePageChange(p as number)}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        </div>
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 disabled:opacity-40 disabled:hover:bg-transparent" disabled={activePag.currentPage >= activePag.totalPages} onClick={() => handlePageChange(activePag.currentPage + 1)}>
                            <ChevronRight size={16} />
                        </button>
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 disabled:opacity-40 disabled:hover:bg-transparent" disabled={activePag.currentPage >= activePag.totalPages} onClick={() => handlePageChange(activePag.totalPages)}>
                            <ChevronsRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-[0.82rem] font-medium text-text-muted">Sahifada:</label>
                        <CustomSelect
                            value={String(activePag.perPage)}
                            onChange={(val) => handlePerPageChange(Number(val))}
                            options={PER_PAGE_OPTIONS.map(n => ({ value: String(n), label: String(n) }))}
                            buttonClassName="py-1.5 pl-3 pr-2 w-[70px] bg-surface-hover border border-border rounded-lg text-[0.85rem] text-text font-medium outline-none focus:border-indigo-500"
                            dropUp
                        />
                    </div>
                </div>
            )}

            {/* Modals */}
            {viewUser && <UserDetailModal user={viewUser} onClose={() => setViewUser(null)} />}

            {/* Sync Modal */}
            {syncModalOpen && createPortal(
                <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setSyncModalOpen(false)}>
                    <div className="relative w-full max-w-[500px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-5 border-b border-border">
                            <div className="flex items-center gap-3.5">
                                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white shadow-sm">
                                    <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                                </div>
                                <div>
                                    <h2 className="text-[1.1rem] font-bold text-text">Xodimlarni Sinxronlash</h2>
                                    <p className="text-[0.82rem] text-text-muted mt-0.5">Xodimlarni HEMIS platformasidan yangilash</p>
                                </div>
                            </div>
                            <button className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-text-muted hover:bg-surface-hover hover:text-text transition-colors" onClick={() => setSyncModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 p-5 px-6">
                            <div className={`p-4 border rounded-xl transition-all duration-250 ${employeeSync.progress === 100 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg text-white" style={{ background: 'var(--stat-purple)' }}>
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[0.95rem] font-semibold text-text">Xodimlar (Kutubxonachi)</h3>
                                            <span className="text-[0.78rem] text-text-muted">{pag.totalItems} ta foydalanuvchi</span>
                                        </div>
                                    </div>
                                    <button
                                        className={`flex items-center gap-1.5 py-2 px-4 border rounded-lg font-semibold text-[0.82rem] transition-colors ${employeeSync.progress === 100 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' :
                                            employeeSync.progress > 0 && employeeSync.progress < 100 ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 cursor-wait' :
                                                'bg-white/5 border-border text-text hover:bg-indigo-500/15 hover:border-indigo-500 hover:text-indigo-400'
                                            }`}
                                        onClick={employeeSync.handleSync}
                                        disabled={employeeSync.progress > 0 && employeeSync.progress < 100}
                                    >
                                        {employeeSync.progress === 100 ? (
                                            <><CheckCircle2 size={16} /> Yangilandi</>
                                        ) : employeeSync.progress > 0 && employeeSync.progress < 100 ? (
                                            <><RefreshCw size={16} className="animate-spin" /> Sinxron...<br /></>
                                        ) : (
                                            <><ArrowDownToLine size={16} /> Yangilash</>
                                        )}
                                    </button>
                                </div>

                                {(employeeSync.progress > 0) && (
                                    <div className="mt-3.5 pt-3.5 border-t border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[0.8rem] font-medium text-text-muted">
                                                {employeeSync.progress === 100 && employeeSync.syncResult
                                                    ? `${employeeSync.syncResult.created} ta yangi, ${employeeSync.syncResult.updated} ta yangilandi`
                                                    : getSyncLabel(employeeSync.progress)}
                                            </span>
                                            <span className={`text-[0.85rem] font-bold tabular-nums ${employeeSync.progress === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                                {Math.round(employeeSync.progress)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-[width] duration-300 ${employeeSync.progress === 100 ? 'bg-linear-to-r from-emerald-500 to-emerald-400' : 'bg-linear-to-r from-primary to-primary-light'}`}
                                                style={{ width: `${employeeSync.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Same reset, role, status modals as UsersPage */}
            {resetUser && createPortal(
                <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => !resetLoading && setResetUser(null)}>
                    <div className="relative w-full max-w-[440px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-5 border-b border-border">
                            <div className="flex items-center gap-3.5">
                                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500 text-black shadow-sm"><ShieldAlert size={22} /></div>
                                <div><h2 className="text-[1.1rem] font-bold text-text">Parolni tiklash</h2></div>
                            </div>
                            <button className="text-text-muted transition-colors" onClick={() => !resetLoading && setResetUser(null)}><X size={18} /></button>
                        </div>
                        <div className="p-6">
                            <p className="m-0"><strong className="text-amber-500">Diqqat!</strong> {resetUser.full_name} paroli tiklanadi.</p>
                            <p className="mt-2 text-amber-500/90 font-mono">Yangi parol: {resetUser.user_id}</p>
                        </div>
                        <div className="flex justify-end p-4 border-t border-border">
                            <button className="mr-3 text-text-muted hover:text-text" onClick={() => setResetUser(null)}>Bekor qilish</button>
                            <button className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-medium" onClick={confirmResetPassword} disabled={resetLoading}>
                                {resetLoading ? 'Tiklanmoqda...' : 'Tasdiqlash'}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {roleUser && createPortal(
                <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => !roleLoading && setRoleUser(null)}>
                    <div className="relative w-full max-w-[440px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 pb-5 border-b border-border">
                            <h2 className="text-[1.1rem] font-bold text-text mb-2">Rolni o'zgartirish</h2>
                            <p className="text-text-muted">{roleUser.full_name}</p>
                        </div>
                        <div className="p-6">
                            <CustomSelect value={selectedRole} onChange={setSelectedRole} options={[
                                { value: 'admin', label: '👑 Administrator' },
                                { value: 'staff', label: '💼 Kutubxonachi' },
                                { value: 'teacher', label: '👨‍🏫 O\'qituvchi' },
                                { value: 'employee', label: '👷 Oddiy Xodim' },
                                { value: 'student', label: '🎓 Talaba' }
                            ]} />
                        </div>
                        <div className="flex justify-end p-4 border-t border-border">
                            <button className="mr-3 text-text-muted hover:text-text" onClick={() => setRoleUser(null)}>Bekor qilish</button>
                            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={confirmChangeRole} disabled={roleLoading}>Saqlash</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {statusUser && createPortal(
                <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => !statusLoading && setStatusUser(null)}>
                    <div className="relative w-full max-w-[440px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 pb-5 border-b border-border">
                            <h2 className="text-[1.1rem] font-bold text-text mb-2 animate-pulse">{statusUser.active ? "Foydalanuvchini Nofaol qilish" : "Foydalanuvchini Faol qilish"}</h2>
                            <p className="text-text-muted text-sm">Shu xodim qat'iy boshqaruvchi sifatida {statusUser.active ? "ruxsatsiz qoladi" : "tizimga kiroladi"}.</p>
                        </div>
                        <div className="flex justify-end p-4 border-t border-border">
                            <button className="mr-3 text-text-muted hover:text-text" onClick={() => setStatusUser(null)}>Bekor qilish</button>
                            <button className={`px-4 py-2 text-white rounded-lg ${statusUser.active ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`} onClick={confirmToggleStatus} disabled={statusLoading}>Tasdiqlash</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    )
}
