import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { GraduationCap, Briefcase, BookUser, Search, RefreshCw, X, ArrowDownToLine, CheckCircle2, Eye, Mail, Phone, Calendar, MapPin, Hash, AlertCircle, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, KeyRound, ShieldAlert, UserCog, Power, Download } from 'lucide-react'
import { CustomSelect } from '../../components/CustomSelect'
import { api } from '../../services/api'
import type { UserData } from '../../services/api'
import { toast } from 'react-toastify'
import { highlightText } from '../../utils/highlightText'

// Sync progress helper
function getSyncLabel(progress: number): string {
    if (progress === 0) return ''
    if (progress < 5) return 'HEMIS platformasiga ulanilmoqda...'
    if (progress < 30) return "Ma'lumotlar yuklanmoqda..."
    if (progress < 70) return "Ma'lumotlar qayta ishlanmoqda..."
    if (progress < 90) return 'Yakunlanmoqda...'
    return 'Muvaffaqiyatli sinxronlandi!'
}

interface SyncSectionProps {
    title: string
    icon: React.ReactNode
    color: string
    count: number
    progress: number
    onSync: () => void
    syncResult?: { created: number; updated: number; total: number } | null
    streamMessage?: string
}

function SyncSection({ title, icon, color, count, progress, onSync, syncResult, streamMessage }: SyncSectionProps) {
    const isActive = progress > 0 && progress < 100
    const isDone = progress === 100

    return (
        <div className={`p-4 border rounded-xl transition-all duration-250 ${isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg text-white" style={{ background: color }}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-[0.95rem] font-semibold text-text">{title}</h3>
                        <span className="text-[0.78rem] text-text-muted">{count} ta foydalanuvchi</span>
                    </div>
                </div>
                <button
                    className={`flex items-center gap-1.5 py-2 px-4 border rounded-lg font-semibold text-[0.82rem] transition-colors ${isDone ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' :
                        isActive ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 cursor-wait' :
                            'bg-surface-hover border-border text-text hover:bg-indigo-500/15 hover:border-indigo-500 hover:text-indigo-400'
                        }`}
                    onClick={onSync}
                    disabled={isActive}
                >
                    {isDone ? (
                        <>
                            <CheckCircle2 size={16} />
                            Yangilandi
                        </>
                    ) : isActive ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            Sinxronlanmoqda...
                        </>
                    ) : (
                        <>
                            <ArrowDownToLine size={16} />
                            Yangilash
                        </>
                    )}
                </button>
            </div>

            {(isActive || isDone) && (
                <div className="mt-3.5 pt-3.5 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[0.8rem] font-medium text-text-muted">
                            {isDone && syncResult
                                ? `${syncResult.created} ta yangi, ${syncResult.updated} ta yangilandi (jami: ${syncResult.total})`
                                : streamMessage || getSyncLabel(progress)}
                        </span>
                        <span className={`text-[0.85rem] font-bold tabular-nums ${isDone ? 'text-emerald-400' : 'text-indigo-400'}`}>
                            {progress}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-[width] duration-300 ${isDone ? 'bg-linear-to-r from-emerald-500 to-emerald-400' : 'bg-linear-to-r from-primary to-primary-light'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function UserDetailModal({ user, type, onClose }: { user: UserData; type: 'student' | 'teacher' | 'employee'; onClose: () => void }) {
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('')

    const infoRows: { icon: React.ReactNode; label: string; value: string }[] = []

    if (type === 'student') {
        infoRows.push(
            { icon: <Hash size={16} />, label: 'Student ID', value: user.user_id },
            { icon: <GraduationCap size={16} />, label: 'Guruh', value: user.group_name || '-' },
            { icon: <BookUser size={16} />, label: 'Fakultet', value: user.department_name || '-' },
            { icon: <MapPin size={16} />, label: "Mutaxassislik", value: user.specialty_name || '-' },
            { icon: <Calendar size={16} />, label: "Ta'lim shakli", value: user.education_form || '-' },
            { icon: <Mail size={16} />, label: 'Email', value: user.email || '-' },
            { icon: <Phone size={16} />, label: 'Telefon', value: user.phone || '-' },
            { icon: <Calendar size={16} />, label: "Tug'ilgan sana", value: user.birth_date || '-' },
            { icon: <Download size={16} />, label: 'ID karta yuklab olingan', value: `${user.id_card ?? 0} marta` },
        )
    } else if (type === 'teacher') {
        infoRows.push(
            { icon: <Hash size={16} />, label: 'ID', value: user.user_id },
            { icon: <BookUser size={16} />, label: 'Kafedra', value: user.department_name || '-' },
            { icon: <Briefcase size={16} />, label: 'Lavozim', value: user.staff_position || '-' },
            { icon: <Mail size={16} />, label: 'Email', value: user.email || '-' },
            { icon: <Phone size={16} />, label: 'Telefon', value: user.phone || '-' },
            { icon: <Calendar size={16} />, label: "Tug'ilgan sana", value: user.birth_date || '-' },
            { icon: <Download size={16} />, label: 'ID karta yuklab olingan', value: `${user.id_card ?? 0} marta` },
        )
    } else {
        infoRows.push(
            { icon: <Hash size={16} />, label: 'ID', value: user.user_id },
            { icon: <Briefcase size={16} />, label: "Bo'lim", value: user.department_name || '-' },
            { icon: <BookUser size={16} />, label: 'Lavozim', value: user.staff_position || '-' },
            { icon: <Mail size={16} />, label: 'Email', value: user.email || '-' },
            { icon: <Phone size={16} />, label: 'Telefon', value: user.phone || '-' },
            { icon: <Calendar size={16} />, label: "Tug'ilgan sana", value: user.birth_date || '-' },
            { icon: <Download size={16} />, label: 'ID karta yuklab olingan', value: `${user.id_card ?? 0} marta` },
        )
    }

    return createPortal(
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="relative w-full max-w-[480px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-3.5 right-3.5 flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-text-muted hover:bg-white/10 hover:text-text transition-colors z-10" onClick={onClose}>
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
                        <span className="inline-flex items-center py-1.5 px-4 rounded-full text-[0.8rem] font-bold bg-surface-hover border border-border text-text-muted shadow-sm">
                            {type === 'student' ? '🎓 Talaba' : type === 'teacher' ? "👨‍🏫 O'qituvchi" : '💼 Xodim'}
                        </span>
                    </div>
                </div>

                {/* Info rows */}
                <div className="flex flex-col gap-1 p-5 pb-6">
                    {infoRows.map((row, i) => (
                        <div key={i} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl transition-colors hover:bg-surface-hover group">
                            <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-surface-hover border border-border text-text-muted group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
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

// Haqiqiy HEMIS sinxronlash hook
// function useHemisSync(
//     syncFn: () => Promise<{ success: boolean; message: string; created: number; updated: number; total: number }>,
//     reloadFn: () => Promise<void>,
// ) {
//     const [progress, setProgress] = useState(0)
//     const [syncResult, setSyncResult] = useState<{ created: number; updated: number; total: number } | null>(null)

//     const handleSync = useCallback(async () => {
//         setProgress(10)
//         setSyncResult(null)

//         const progressInterval = window.setInterval(() => {
//             setProgress(prev => {
//                 if (prev >= 90) return prev
//                 return prev + Math.floor(Math.random() * 5) + 1
//             })
//         }, 300)

//         try {
//             const resp = await syncFn()
//             clearInterval(progressInterval)

//             if (resp.success) {
//                 setProgress(100)
//                 setSyncResult({ created: resp.created, updated: resp.updated, total: resp.total })
//                 toast.success(resp.message || 'Sinxronlash muvaffaqiyatli')
//                 await reloadFn()
//             } else {
//                 setProgress(0)
//                 toast.error(resp.message || 'Sinxronlashda xatolik')
//             }
//         } catch (e) {
//             clearInterval(progressInterval)
//             setProgress(0)
//             toast.error(e instanceof Error ? e.message : 'HEMIS bilan aloqa uzildi')
//         }
//     }, [syncFn, reloadFn])

//     const reset = useCallback(() => {
//         setProgress(0)
//         setSyncResult(null)
//     }, [])

//     return { progress, syncResult, handleSync, reset, streamMessage: '' }
// }

// SSE (Server-Sent Events) orqali haqiqiy progress oluvchi hook — universal
type StreamFn = (onEvent: (event: { stage: string; message: string; processed: number; total: number; created: number; updated: number; current_page: number; total_pages: number }) => void) => { promise: Promise<void>; abort: () => void }

function useHemisStreamSync(streamFn: StreamFn, reloadFn: () => Promise<void>) {
    const [progress, setProgress] = useState(0)
    const [syncResult, setSyncResult] = useState<{ created: number; updated: number; total: number } | null>(null)
    const [streamMessage, setStreamMessage] = useState('')

    const handleSync = useCallback(async () => {
        setProgress(5)
        setSyncResult(null)
        setStreamMessage('HEMIS platformasiga ulanilmoqda...')

        try {
            const { promise } = streamFn((event) => {
                // Haqiqiy progress foizini hisoblash
                if (event.stage === 'complete') {
                    setProgress(100)
                    setSyncResult({ created: event.created, updated: event.updated, total: event.processed })
                    setStreamMessage(event.message)
                    toast.success(event.message)
                } else if (event.stage === 'error') {
                    setProgress(0)
                    setStreamMessage('')
                    toast.error(event.message)
                } else {
                    // fetching yoki processing
                    const pct = event.total_pages > 0
                        ? Math.min(95, Math.round((event.current_page / event.total_pages) * 95))
                        : 10
                    setProgress(Math.max(5, pct))
                    setStreamMessage(event.message)
                }
            })

            await promise
            await reloadFn()
        } catch (e) {
            setProgress(0)
            setStreamMessage('')
            toast.error(e instanceof Error ? e.message : 'HEMIS bilan aloqa uzildi')
        }
    }, [streamFn, reloadFn])

    const reset = useCallback(() => {
        setProgress(0)
        setSyncResult(null)
        setStreamMessage('')
    }, [])

    return { progress, syncResult, handleSync, reset, streamMessage }
}

// Per-page options
const PER_PAGE_OPTIONS = [20, 40, 60, 80, 100]

// Pagination state type
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


export default function UsersPage() {
    const [search, setSearch] = useState({ students: '', teachers: '', employees: '' })
    const [debouncedSearch, setDebouncedSearch] = useState({ students: '', teachers: '', employees: '' })
    const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'employees'>('students')
    const [syncModalOpen, setSyncModalOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState({ students: 'all', teachers: 'all', employees: 'all' })

    // Data from API
    const [students, setStudents] = useState<UserData[]>([])
    const [teachers, setTeachers] = useState<UserData[]>([])
    const [employees, setEmployees] = useState<UserData[]>([])
    const [loading, setLoading] = useState({ students: false, teachers: false, employees: false })

    // Pagination state per tab
    const [studentsPag, setStudentsPag] = useState<PaginationState>({ ...defaultPagination })
    const [teachersPag, setTeachersPag] = useState<PaginationState>({ ...defaultPagination })
    const [employeesPag, setEmployeesPag] = useState<PaginationState>({ ...defaultPagination })

    // Total counts for tabs (from pagination)
    const [totalCounts, setTotalCounts] = useState({ students: 0, teachers: 0, employees: 0 })

    // User detail modal
    const [viewUser, setViewUser] = useState<UserData | null>(null)
    const [viewUserType, setViewUserType] = useState<'student' | 'teacher' | 'employee'>('student')

    // Password reset modal
    const [resetUser, setResetUser] = useState<UserData | null>(null)
    const [resetLoading, setResetLoading] = useState(false)

    // Role change modal
    const [roleUser, setRoleUser] = useState<UserData | null>(null)
    const [selectedRole, setSelectedRole] = useState('')
    const [roleLoading, setRoleLoading] = useState(false)

    // Status toggle modal
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

    // Reset page when search or status changes
    useEffect(() => {
        setStudentsPag(prev => ({ ...prev, currentPage: 1 }))
    }, [debouncedSearch.students, statusFilter.students])

    useEffect(() => {
        setTeachersPag(prev => ({ ...prev, currentPage: 1 }))
    }, [debouncedSearch.teachers, statusFilter.teachers])

    useEffect(() => {
        setEmployeesPag(prev => ({ ...prev, currentPage: 1 }))
    }, [debouncedSearch.employees, statusFilter.employees])

    // Load functions
    const loadStudents = useCallback(async () => {
        setLoading(prev => ({ ...prev, students: true }))
        try {
            const resp = await api.getStudents({
                page: studentsPag.currentPage,
                per_page: studentsPag.perPage,
                search: debouncedSearch.students || undefined,
                status: statusFilter.students !== 'all' ? statusFilter.students : undefined,
            })
            if (resp.success) {
                setStudents(resp.data)
                setStudentsPag(prev => ({
                    ...prev,
                    totalItems: resp.pagination.total_items,
                    totalPages: resp.pagination.total_pages,
                }))
                setTotalCounts(prev => ({ ...prev, students: resp.pagination.total_items }))
            }
        } catch (e) { console.error('Talabalarni yuklashda xato:', e) }
        finally { setLoading(prev => ({ ...prev, students: false })) }
    }, [studentsPag.currentPage, studentsPag.perPage, debouncedSearch.students, statusFilter.students])

    const loadTeachers = useCallback(async () => {
        setLoading(prev => ({ ...prev, teachers: true }))
        try {
            const resp = await api.getTeachers({
                page: teachersPag.currentPage,
                per_page: teachersPag.perPage,
                search: debouncedSearch.teachers || undefined,
                status: statusFilter.teachers !== 'all' ? statusFilter.teachers : undefined,
            })
            if (resp.success) {
                setTeachers(resp.data)
                setTeachersPag(prev => ({
                    ...prev,
                    totalItems: resp.pagination.total_items,
                    totalPages: resp.pagination.total_pages,
                }))
                setTotalCounts(prev => ({ ...prev, teachers: resp.pagination.total_items }))
            }
        } catch (e) { console.error("O'qituvchilarni yuklashda xato:", e) }
        finally { setLoading(prev => ({ ...prev, teachers: false })) }
    }, [teachersPag.currentPage, teachersPag.perPage, debouncedSearch.teachers, statusFilter.teachers])

    const loadEmployees = useCallback(async () => {
        setLoading(prev => ({ ...prev, employees: true }))
        try {
            const resp = await api.getEmployees({
                page: employeesPag.currentPage,
                per_page: employeesPag.perPage,
                search: debouncedSearch.employees || undefined,
                status: statusFilter.employees !== 'all' ? statusFilter.employees : undefined,
            })
            if (resp.success) {
                setEmployees(resp.data)
                setEmployeesPag(prev => ({
                    ...prev,
                    totalItems: resp.pagination.total_items,
                    totalPages: resp.pagination.total_pages,
                }))
                setTotalCounts(prev => ({ ...prev, employees: resp.pagination.total_items }))
            }
        } catch (e) { console.error('Xodimlarni yuklashda xato:', e) }
        finally { setLoading(prev => ({ ...prev, employees: false })) }
    }, [employeesPag.currentPage, employeesPag.perPage, debouncedSearch.employees, statusFilter.employees])

    useEffect(() => { loadStudents() }, [loadStudents])
    useEffect(() => { loadTeachers() }, [loadTeachers])
    useEffect(() => { loadEmployees() }, [loadEmployees])

    // Sync hooks
    const studentSync = useHemisStreamSync(api.syncHemisStudentsStream.bind(api), loadStudents)
    const teacherSync = useHemisStreamSync(api.syncHemisTeachersStream.bind(api), loadTeachers)
    const employeeSync = useHemisStreamSync(api.syncHemisEmployeesStream.bind(api), loadEmployees)

    const handleOpenSyncModal = () => {
        studentSync.reset()
        teacherSync.reset()
        employeeSync.reset()
        setSyncModalOpen(true)
    }

    // View user
    const handleView = (user: UserData, type: 'student' | 'teacher' | 'employee') => {
        setViewUser(user)
        setViewUserType(type)
    }

    // Parolni default holatga qaytarish
    const handleResetPassword = (user: UserData) => {
        setResetUser(user)
    }

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

    const handleChangeRole = (user: UserData) => {
        setRoleUser(user)
        setSelectedRole(user.role)
    }

    const confirmChangeRole = async () => {
        if (!roleUser || !selectedRole) return
        setRoleLoading(true)
        try {
            const res = await api.updateUserRole(roleUser.id, selectedRole)
            toast.success(res.message || 'Rol muvaffaqiyatli o\'zgartirildi')
            setRoleUser(null)
            // Jadvalni yangilash
            loadStudents(); loadTeachers(); loadEmployees()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Rolni o\'zgartirishda xatolik')
        } finally {
            setRoleLoading(false)
        }
    }

    // Holatni o'zgartirish
    const handleToggleStatus = (user: UserData) => {
        setStatusUser(user)
    }

    const confirmToggleStatus = async () => {
        if (!statusUser) return
        setStatusLoading(true)
        try {
            const newActive = !statusUser.active
            const res = await api.updateUserStatus(statusUser.id, newActive)
            toast.success(res.message || 'Holat o\'zgartirildi')
            setStatusUser(null)
            // Jadvalni yangilash
            loadStudents(); loadTeachers(); loadEmployees()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Holatni o\'zgartirishda xatolik')
        } finally {
            setStatusLoading(false)
        }
    }

    // Active pagination state
    const getActivePag = () => {
        if (activeTab === 'students') return studentsPag
        if (activeTab === 'teachers') return teachersPag
        return employeesPag
    }

    const setActivePag = (updater: (prev: PaginationState) => PaginationState) => {
        if (activeTab === 'students') setStudentsPag(updater)
        else if (activeTab === 'teachers') setTeachersPag(updater)
        else setEmployeesPag(updater)
    }

    const handlePageChange = (page: number) => {
        setActivePag(prev => ({ ...prev, currentPage: page }))
    }

    const handlePerPageChange = (perPage: number) => {
        setActivePag(prev => ({ ...prev, perPage, currentPage: 1 }))
    }

    const pag = getActivePag()

    const tabs = [
        { key: 'students' as const, label: 'Talabalar', icon: <GraduationCap size={16} />, count: totalCounts.students },
        { key: 'teachers' as const, label: "O'qituvchilar", icon: <BookUser size={16} />, count: totalCounts.teachers },
        { key: 'employees' as const, label: 'Xodimlar', icon: <Briefcase size={16} />, count: totalCounts.employees },
    ]

    // Generate pagination page numbers
    const generatePageNumbers = () => {
        const pages: (number | '...')[] = []
        const total = pag.totalPages
        const current = pag.currentPage

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

    // Table renderer for each tab (all use UserData now)
    const renderUserTable = (
        data: UserData[],
        isLoading: boolean,
        emptyLabel: string,
        type: 'student' | 'teacher' | 'employee',
        columns: { header: string; render: (u: UserData) => React.ReactNode }[],
        pagState: PaginationState,
        activeSearch: string,
    ) => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
                    <Loader2 size={20} className="animate-spin" />
                    <span>{emptyLabel} yuklanmoqda...</span>
                </div>
            )
        }
        if (data.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
                    <AlertCircle size={32} />
                    <p className="text-[0.875rem]">{emptyLabel} topilmadi</p>
                    <p className="text-[0.75rem] opacity-60">HEMIS sinxronlash tugmasini bosing</p>
                </div>
            )
        }
        return (
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">#</th>
                        <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Ism</th>
                        {columns.map((col, i) => <th key={i} className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">{col.header}</th>)}
                        <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Holat</th>
                        <th className="py-3 px-4 text-left text-[0.75rem] font-semibold text-text-muted uppercase tracking-[0.05em] bg-surface-hover/50 border-b border-border">Amallar</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((u, i) => (
                        <tr key={u.id} className="transition-colors hover:bg-indigo-500/5 group border-b border-border/50">
                            <td className="py-3 px-4 text-[0.875rem] text-text-muted">{(pagState.currentPage - 1) * pagState.perPage + i + 1}</td>
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-3 font-semibold text-[0.9rem]">
                                    {u.image_url ? (
                                        <img src={u.image_url} alt={u.full_name} className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-indigo-500/20" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-[0.85rem] shrink-0 shadow-sm">{u.full_name.charAt(0)}</div>
                                    )}
                                    <span className="truncate max-w-[200px]">{highlightText(u.full_name, activeSearch)}</span>
                                </div>
                            </td>
                            {columns.map((col, ci) => <td key={ci} className="py-3 px-4 text-[0.875rem] text-text-muted">{col.render(u)}</td>)}
                            <td className="py-3 px-4">
                                <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[0.75rem] font-bold tracking-wide whitespace-nowrap ${u.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
                                    {u.active ? 'Faol' : 'Nofaol'}
                                </span>
                            </td>
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors" title="Ko'rish" onClick={() => handleView(u, type)}>
                                        <Eye size={15} />
                                    </button>
                                    <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors" title="Parolni tiklash" onClick={() => handleResetPassword(u)}>
                                        <KeyRound size={15} />
                                    </button>
                                    <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors" title="Rolni o'zgartirish" onClick={() => handleChangeRole(u)}>
                                        <UserCog size={15} />
                                    </button>
                                    <button className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${u.active ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`} title={u.active ? 'Nofaol qilish' : 'Faol qilish'} onClick={() => handleToggleStatus(u)}>
                                        <Power size={15} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    }

    return (
        <div className="animate-page-enter">
            <div className="flex justify-between items-start gap-4 mb-6 flex-wrap">
                <div>
                    <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] mb-1">Foydalanuvchilar</h1>
                    <p className="text-[0.9rem] text-text-muted">Tizim foydalanuvchilarini boshqarish</p>
                </div>
                <button
                    className="flex items-center gap-2 py-2.5 px-5 bg-linear-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-[0.9rem] shadow-[0_4px_16px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-0.5"
                    onClick={handleOpenSyncModal}
                >
                    <RefreshCw size={18} />
                    Sinxronlash
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center justify-between gap-4 mb-6 p-1.5 bg-surface border border-border rounded-2xl max-md:flex-col max-md:p-3 max-md:gap-3">
                <div className="flex items-center relative flex-1 min-w-[280px] max-md:w-full">
                    <Search size={18} className="absolute left-4 text-text-muted" />
                    <input
                        type="text"
                        className="w-full bg-surface-hover border border-transparent focus:border-border focus:bg-surface rounded-xl py-2.5 pl-11 pr-10 text-[0.9rem] transition-all outline-none placeholder:text-text-muted/60"
                        placeholder="Ism, guruh, kafedra yoki lavozim bo'yicha qidirish..."
                        value={search[activeTab]}
                        onChange={(e) => setSearch(prev => ({ ...prev, [activeTab]: e.target.value }))}
                    />
                    {search[activeTab] && (
                        <button className="absolute right-3 p-1 rounded-md text-text-muted hover:bg-surface-hover hover:text-text transition-colors" onClick={() => setSearch(prev => ({ ...prev, [activeTab]: '' }))}>
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
                                    className={`py-1.5 px-3 rounded-lg text-[0.8rem] font-medium transition-all ${statusFilter[activeTab] === opt.value ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                                    onClick={() => setStatusFilter(prev => ({ ...prev, [activeTab]: opt.value }))}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 w-full overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`flex flex-1 justify-center items-center gap-2.5 py-2.5 px-5 rounded-xl font-semibold text-[0.9rem] whitespace-nowrap transition-all border ${activeTab === tab.key ? 'bg-indigo-500 text-white border-transparent shadow-[0_4px_12px_rgba(99,102,241,0.25)]' : 'bg-surface border-border text-text-muted hover:border-indigo-500/30 hover:text-text hover:bg-surface-hover'}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span className={activeTab === tab.key ? 'text-white' : 'text-indigo-400'}>{tab.icon}</span>
                        {tab.label}
                        <span className={`py-0.5 px-2 rounded-full text-[0.75rem] font-bold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-xl overflow-x-auto shadow-sm">
                {activeTab === 'students' && renderUserTable(
                    students, loading.students, 'Talabalar', 'student',
                    [
                        { header: 'Guruh', render: u => <span className="inline-flex py-1 px-3 bg-surface-hover border border-border rounded-lg text-[0.8rem] font-medium font-mono">{highlightText(u.group_name || '-', debouncedSearch.students)}</span> },
                        {
                            header: 'Fakultet', render: u => (
                                <span className="inline-flex py-1 px-3 bg-surface-hover border border-border rounded-lg text-[0.8rem] font-medium truncate max-w-[220px]" title={u.department_name || '-'}>
                                    {highlightText(u.department_name || '-', debouncedSearch.students)}
                                </span>
                            )
                        },
                        {
                            header: 'ID karta', render: u => (
                                <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[0.75rem] font-bold border ${(u.id_card ?? 0) > 0
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-surface-hover text-text-muted border-border'
                                    }`}>
                                    <Download size={12} />
                                    {u.id_card ?? 0} marta
                                </span>
                            )
                        },
                    ],
                    studentsPag,
                    debouncedSearch.students,
                )}
                {activeTab === 'teachers' && renderUserTable(
                    teachers, loading.teachers, "O'qituvchilar", 'teacher',
                    [
                        {
                            header: 'Kafedra', render: u => (
                                <span className="inline-flex py-1 px-3 bg-surface-hover border border-border rounded-lg text-[0.8rem] font-medium truncate max-w-[220px]" title={u.department_name || '-'}>
                                    {highlightText(u.department_name || '-', debouncedSearch.teachers)}
                                </span>
                            )
                        },
                        {
                            header: 'Lavozim', render: u => (
                                <span className="inline-flex py-1 px-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[0.8rem] font-medium text-indigo-400">
                                    {highlightText(u.staff_position || '-', debouncedSearch.teachers)}
                                </span>
                            )
                        },
                        {
                            header: 'ID karta', render: u => (
                                <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[0.75rem] font-bold border ${(u.id_card ?? 0) > 0
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-surface-hover text-text-muted border-border'
                                    }`}>
                                    <Download size={12} />
                                    {u.id_card ?? 0} marta
                                </span>
                            )
                        },
                    ],
                    teachersPag,
                    debouncedSearch.teachers,
                )}
                {activeTab === 'employees' && renderUserTable(
                    employees, loading.employees, 'Xodimlar', 'employee',
                    [
                        {
                            header: "Bo'lim", render: u => (
                                <span className="inline-flex py-1 px-3 bg-surface-hover border border-border rounded-lg text-[0.8rem] font-medium truncate max-w-[220px]" title={u.department_name || '-'}>
                                    {highlightText(u.department_name || '-', debouncedSearch.employees)}
                                </span>
                            )
                        },
                        {
                            header: 'Lavozim', render: u => (
                                <span className="inline-flex py-1 px-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[0.8rem] font-medium text-blue-400">
                                    {highlightText(u.staff_position || '-', debouncedSearch.employees)}
                                </span>
                            )
                        },
                        {
                            header: 'ID karta', render: u => (
                                <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[0.75rem] font-bold border ${(u.id_card ?? 0) > 0
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-surface-hover text-text-muted border-border'
                                    }`}>
                                    <Download size={12} />
                                    {u.id_card ?? 0} marta
                                </span>
                            )
                        },
                    ],
                    employeesPag,
                    debouncedSearch.employees,
                )}
            </div>

            {/* Pagination */}
            {pag.totalItems > 0 && (
                <div className="flex items-center justify-between gap-4 mt-5 p-4 bg-surface border border-border rounded-xl flex-wrap max-md:flex-col max-md:justify-center">
                    <div className="text-[0.85rem] text-text-muted">
                        Jami <strong className="text-text font-semibold">{pag.totalItems}</strong> ta natija, {' '}
                        <strong className="text-text font-semibold">{(pag.currentPage - 1) * pag.perPage + 1}</strong>–
                        <strong className="text-text font-semibold">{Math.min(pag.currentPage * pag.perPage, pag.totalItems)}</strong> ko'rsatilmoqda
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                            disabled={pag.currentPage <= 1}
                            onClick={() => handlePageChange(1)}
                            title="Birinchi sahifa"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                            disabled={pag.currentPage <= 1}
                            onClick={() => handlePageChange(pag.currentPage - 1)}
                            title="Oldingi sahifa"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex gap-1 mx-2">
                            {generatePageNumbers().map((p, i) =>
                                p === '...' ? (
                                    <span key={`dots-${i}`} className="flex items-center justify-center w-8 h-8 text-text-muted text-[0.85rem] tracking-widest">...</span>
                                ) : (
                                    <button
                                        key={p}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg text-[0.85rem] font-medium transition-all ${pag.currentPage === p ? 'bg-indigo-500 text-white shadow-md' : 'border border-border text-text-muted hover:border-indigo-500/30 hover:text-indigo-400 hover:bg-indigo-500/5'}`}
                                        onClick={() => handlePageChange(p as number)}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        </div>

                        <button
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                            disabled={pag.currentPage >= pag.totalPages}
                            onClick={() => handlePageChange(pag.currentPage + 1)}
                            title="Keyingi sahifa"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:text-text-muted transition-all"
                            disabled={pag.currentPage >= pag.totalPages}
                            onClick={() => handlePageChange(pag.totalPages)}
                            title="Oxirgi sahifa"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-[0.82rem] font-medium text-text-muted">Sahifada:</label>
                        <CustomSelect
                            value={String(pag.perPage)}
                            onChange={(val) => handlePerPageChange(Number(val))}
                            options={PER_PAGE_OPTIONS.map(n => ({ value: String(n), label: String(n) }))}
                            buttonClassName="py-1.5 pl-3 pr-2 w-[70px] bg-surface-hover border border-border rounded-lg text-[0.85rem] text-text font-medium outline-none focus:border-indigo-500"
                            dropUp
                        />
                    </div>
                </div>
            )}

            {/* User Detail Modal */}
            {viewUser && (
                <UserDetailModal
                    user={viewUser}
                    type={viewUserType}
                    onClose={() => setViewUser(null)}
                />
            )}

            {/* HEMIS Sync Modal */}
            {syncModalOpen && createPortal(
                <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" >
                    <div className="relative w-full max-w-[560px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-5 border-b border-border">
                            <div className="flex items-center gap-3.5">
                                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 text-white shadow-sm">
                                    <RefreshCw size={22} className={loading.students || loading.teachers || loading.employees ? 'animate-spin' : ''} />
                                </div>
                                <div>
                                    <h2 className="text-[1.1rem] font-bold text-text">HEMIS Sinxronlash</h2>
                                    {/* <p className="text-[0.82rem] text-text-muted mt-0.5">Foydalanuvchilarni HEMIS platformasidan yangilash</p> */}
                                </div>
                            </div>
                            <button className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-text-muted hover:bg-surface-hover hover:text-text transition-colors" onClick={() => setSyncModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 p-5 px-6">
                            <SyncSection
                                title="Talabalar"
                                icon={<GraduationCap size={20} />}
                                color="var(--stat-blue)"
                                count={totalCounts.students}
                                progress={studentSync.progress}
                                onSync={studentSync.handleSync}
                                syncResult={studentSync.syncResult}
                                streamMessage={studentSync.streamMessage}
                            />
                            <SyncSection
                                title="O'qituvchilar"
                                icon={<BookUser size={20} />}
                                color="var(--stat-green)"
                                count={totalCounts.teachers}
                                progress={teacherSync.progress}
                                onSync={teacherSync.handleSync}
                                syncResult={teacherSync.syncResult}
                                streamMessage={teacherSync.streamMessage}
                            />
                            <SyncSection
                                title="Xodimlar"
                                icon={<Briefcase size={20} />}
                                color="var(--stat-purple)"
                                count={totalCounts.employees}
                                progress={employeeSync.progress}
                                onSync={employeeSync.handleSync}
                                syncResult={employeeSync.syncResult}
                                streamMessage={employeeSync.streamMessage}
                            />
                        </div>

                        <div className="flex items-center justify-end py-4 px-6 border-t border-border bg-white/5">
                            <button className="py-2 px-5 rounded-lg border border-border bg-white/5 text-text font-medium text-[0.85rem] hover:bg-white/10 transition-colors" onClick={() => setSyncModalOpen(false)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Password Reset Modal */}
            {resetUser && createPortal(
                <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => !resetLoading && setResetUser(null)}>
                    <div className="relative w-full max-w-[440px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-5 border-b border-border">
                            <div className="flex items-center gap-3.5">
                                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500 text-black shadow-sm">
                                    <ShieldAlert size={22} />
                                </div>
                                <div>
                                    <h2 className="text-[1.1rem] font-bold text-text">Parolni tiklash</h2>
                                    <p className="text-[0.82rem] text-text-muted mt-0.5">Parol default holatga qaytariladi</p>
                                </div>
                            </div>
                            <button className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-text-muted hover:bg-white/10 hover:text-text transition-colors" onClick={() => !resetLoading && setResetUser(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-5">
                                {resetUser.image_url ? (
                                    <img src={resetUser.image_url} alt={resetUser.full_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 font-bold text-[1.125rem] text-white shrink-0">
                                        {resetUser.full_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="font-semibold text-[1rem] text-text">{resetUser.full_name}</div>
                                    {/* <div className="text-[0.8rem] opacity-60 text-text-muted">ID: {resetUser.user_id}</div> */}
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 px-4 text-[0.85rem] leading-[1.6] text-amber-500/90">
                                <p className="m-0">
                                    <strong className="text-amber-500">Diqqat!</strong> Bu foydalanuvchining paroli default holatga qaytariladi.
                                </p>
                                {/* <p className="mt-2 mb-0 opacity-80 flex items-center gap-2">
                                    Yangi parol: <code className="bg-white/10 px-2 py-0.5 rounded text-[0.9rem] font-semibold text-amber-400">{resetUser.user_id}</code>
                                </p> */}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 py-4 px-6 border-t border-border bg-white/5">
                            <button
                                className="py-2 px-5 rounded-lg border border-border bg-transparent text-text font-medium text-[0.85rem] hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setResetUser(null)}
                                disabled={resetLoading}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className="flex items-center justify-center py-2 px-5 rounded-lg border border-transparent bg-amber-500 text-black font-semibold text-[0.85rem] hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px]"
                                onClick={confirmResetPassword}
                                disabled={resetLoading}
                            >
                                {resetLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin mr-1.5" />
                                        Tiklanmoqda...
                                    </>
                                ) : (
                                    'Parolni tiklash'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Role Change Modal */}
            {roleUser && createPortal(
                <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => !roleLoading && setRoleUser(null)}>
                    <div className="relative w-full max-w-[440px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-5 border-b border-border">
                            <div className="flex items-center gap-3.5">
                                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-500 text-white shadow-sm">
                                    <UserCog size={22} />
                                </div>
                                <div>
                                    <h2 className="text-[1.1rem] font-bold text-text">Rolni o'zgartirish</h2>
                                    <p className="text-[0.82rem] text-text-muted mt-0.5">Foydalanuvchi rolini yangilash</p>
                                </div>
                            </div>
                            <button className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-text-muted hover:bg-white/10 hover:text-text transition-colors" onClick={() => !roleLoading && setRoleUser(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-5">
                                {roleUser.image_url ? (
                                    <img src={roleUser.image_url} alt={roleUser.full_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 font-bold text-[1.125rem] text-white shrink-0">
                                        {roleUser.full_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="font-semibold text-[1rem] text-text">{roleUser.full_name}</div>
                                    <div className="text-[0.8rem] opacity-60 text-text-muted">ID: {roleUser.user_id}</div>
                                </div>
                            </div>

                            <label className="block text-[0.85rem] font-medium mb-2 opacity-80 text-text">
                                Yangi rolni tanlang:
                            </label>
                            <CustomSelect
                                value={selectedRole}
                                onChange={(val) => setSelectedRole(val)}
                                options={[
                                    { value: 'admin', label: '👑 Administrator' },
                                    { value: 'staff', label: '💼 Xodim' },
                                    { value: 'teacher', label: '👨‍🏫 O\'qituvchi' },
                                    { value: 'student', label: '🎓 Talaba' }
                                ]}
                                buttonClassName="w-full py-2.5 px-3.5 rounded-lg border border-border bg-white/5 text-text text-[0.9rem] outline-none cursor-pointer hover:border-indigo-500/50 focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 py-4 px-6 border-t border-border bg-white/5">
                            <button
                                className="py-2 px-5 rounded-lg border border-border bg-transparent text-text font-medium text-[0.85rem] hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setRoleUser(null)}
                                disabled={roleLoading}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className="flex items-center justify-center py-2 px-5 rounded-lg border border-transparent bg-blue-500 text-white font-semibold text-[0.85rem] hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px]"
                                onClick={confirmChangeRole}
                                disabled={roleLoading}
                            >
                                {roleLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin mr-1.5" />
                                        Saqlanmoqda...
                                    </>
                                ) : (
                                    'Saqlash'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Status Toggle Modal */}
            {statusUser && createPortal(
                <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => !statusLoading && setStatusUser(null)}>
                    <div className="relative w-full max-w-[440px] bg-surface border border-border rounded-2xl overflow-hidden animate-modal-scale shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-5 border-b border-border">
                            <div className="flex items-center gap-3.5">
                                <div className={`flex items-center justify-center w-11 h-11 rounded-xl text-white shadow-sm ${statusUser.active ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                    <Power size={22} />
                                </div>
                                <div>
                                    <h2 className="text-[1.1rem] font-bold text-text">Holatni o'zgartirish</h2>
                                    <p className="text-[0.82rem] text-text-muted mt-0.5">
                                        {statusUser.active ? 'Foydalanuvchini nofaol qilish' : 'Foydalanuvchini faol qilish'}
                                    </p>
                                </div>
                            </div>
                            <button className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-text-muted hover:bg-white/10 hover:text-text transition-colors" onClick={() => !statusLoading && setStatusUser(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-5">
                                {statusUser.image_url ? (
                                    <img src={statusUser.image_url} alt={statusUser.full_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 font-bold text-[1.125rem] text-white shrink-0">
                                        {statusUser.full_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="font-semibold text-[1rem] text-text">{statusUser.full_name}</div>
                                    <div className="text-[0.8rem] opacity-60 text-text-muted mt-0.5">
                                        Hozirgi holat:{' '}
                                        <span className={`inline-flex items-center ml-1 py-0.5 px-2 rounded-full text-[0.7rem] font-bold tracking-wide ${statusUser.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
                                            {statusUser.active ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-lg p-3 px-4 text-[0.85rem] leading-[1.6] ${statusUser.active ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'}`}>
                                <p className="m-0">
                                    {statusUser.active
                                        ? <><strong className="text-red-500">Diqqat!</strong> Bu foydalanuvchi <strong className="text-red-500">nofaol</strong> qilinadi. U tizimga kira olmaydi.</>
                                        : <><strong className="text-emerald-500">Tasdiqlash:</strong> Bu foydalanuvchi <strong className="text-emerald-500">faol</strong> qilinadi va tizimga kirish imkoniyati beriladi.</>
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 py-4 px-6 border-t border-border bg-white/5">
                            <button
                                className="py-2 px-5 rounded-lg border border-border bg-transparent text-text font-medium text-[0.85rem] hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setStatusUser(null)}
                                disabled={statusLoading}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className={`flex items-center justify-center py-2 px-5 rounded-lg border border-transparent text-white font-semibold text-[0.85rem] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px] ${statusUser.active ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                onClick={confirmToggleStatus}
                                disabled={statusLoading}
                            >
                                {statusLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin mr-1.5" />
                                        O'zgartirilmoqda...
                                    </>
                                ) : statusUser.active ? (
                                    'Nofaol qilish'
                                ) : (
                                    'Faol qilish'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
