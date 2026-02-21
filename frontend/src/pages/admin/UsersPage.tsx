import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { GraduationCap, Briefcase, BookUser, Search, RefreshCw, X, ArrowDownToLine, CheckCircle2, Eye, Mail, Phone, Calendar, MapPin, Hash, Bell, AlertCircle, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, KeyRound, ShieldAlert, UserCog, Power } from 'lucide-react'
import { api } from '../../services/api'
import type { UserData } from '../../services/api'
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

interface SyncSectionProps {
    title: string
    icon: React.ReactNode
    color: string
    count: number
    progress: number
    onSync: () => void
    syncResult?: { created: number; updated: number; total: number } | null
}

function SyncSection({ title, icon, color, count, progress, onSync, syncResult }: SyncSectionProps) {
    const isActive = progress > 0 && progress < 100
    const isDone = progress === 100

    return (
        <div className={`sync-section ${isDone ? 'sync-section--done' : ''}`}>
            <div className="sync-section__header">
                <div className="sync-section__info">
                    <div className="sync-section__icon" style={{ background: color }}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="sync-section__title">{title}</h3>
                        <span className="sync-section__count">{count} ta foydalanuvchi</span>
                    </div>
                </div>
                <button
                    className={`sync-section__btn ${isActive ? 'sync-section__btn--loading' : ''} ${isDone ? 'sync-section__btn--done' : ''}`}
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
                            <RefreshCw size={16} className="spin-animation" />
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
                <div className="sync-progress">
                    <div className="sync-progress__status">
                        <span className="sync-progress__label">
                            {isDone && syncResult
                                ? `${syncResult.created} ta yangi, ${syncResult.updated} ta yangilandi (jami: ${syncResult.total})`
                                : getSyncLabel(progress)}
                        </span>
                        <span className={`sync-progress__percent ${isDone ? 'sync-progress__percent--done' : ''}`}>
                            {progress}%
                        </span>
                    </div>
                    <div className="sync-progress__bar">
                        <div
                            className={`sync-progress__fill ${isDone ? 'sync-progress__fill--done' : ''}`}
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
        )
    } else if (type === 'teacher') {
        infoRows.push(
            { icon: <Hash size={16} />, label: 'ID', value: user.user_id },
            { icon: <BookUser size={16} />, label: 'Kafedra', value: user.department_name || '-' },
            { icon: <Briefcase size={16} />, label: 'Lavozim', value: user.staff_position || '-' },
            { icon: <Mail size={16} />, label: 'Email', value: user.email || '-' },
            { icon: <Phone size={16} />, label: 'Telefon', value: user.phone || '-' },
            { icon: <Calendar size={16} />, label: "Tug'ilgan sana", value: user.birth_date || '-' },
        )
    } else {
        infoRows.push(
            { icon: <Hash size={16} />, label: 'ID', value: user.user_id },
            { icon: <Briefcase size={16} />, label: "Bo'lim", value: user.department_name || '-' },
            { icon: <BookUser size={16} />, label: 'Lavozim', value: user.staff_position || '-' },
            { icon: <Mail size={16} />, label: 'Email', value: user.email || '-' },
            { icon: <Phone size={16} />, label: 'Telefon', value: user.phone || '-' },
            { icon: <Calendar size={16} />, label: "Tug'ilgan sana", value: user.birth_date || '-' },
        )
    }

    return createPortal(
        <div className="user-detail__backdrop" onClick={onClose}>
            <div className="user-detail" onClick={(e) => e.stopPropagation()}>
                <button className="user-detail__close" onClick={onClose}>
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="user-detail__header">
                    {user.image_url ? (
                        <img src={user.image_url} alt={user.full_name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div className="user-detail__avatar">
                            {getInitials(user.full_name)}
                        </div>
                    )}
                    <h3 className="user-detail__name">{user.full_name}</h3>
                    <span className={`users-page__status users-page__status--${user.active ? 'active' : 'inactive'}`}>
                        {user.active ? 'Faol' : 'Nofaol'}
                    </span>
                    <span className="user-detail__role-badge">
                        {type === 'student' ? '🎓 Talaba' : type === 'teacher' ? "👨‍🏫 O'qituvchi" : '💼 Xodim'}
                    </span>
                </div>

                {/* Info rows */}
                <div className="user-detail__info">
                    {infoRows.map((row, i) => (
                        <div key={i} className="user-detail__row">
                            <div className="user-detail__row-icon">{row.icon}</div>
                            <div className="user-detail__row-content">
                                <span className="user-detail__row-label">{row.label}</span>
                                <span className="user-detail__row-value">{row.value}</span>
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
function useHemisSync(
    syncFn: () => Promise<{ success: boolean; message: string; created: number; updated: number; total: number }>,
    reloadFn: () => Promise<void>,
) {
    const [progress, setProgress] = useState(0)
    const [syncResult, setSyncResult] = useState<{ created: number; updated: number; total: number } | null>(null)

    const handleSync = useCallback(async () => {
        setProgress(10)
        setSyncResult(null)

        const progressInterval = window.setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev
                return prev + Math.floor(Math.random() * 5) + 1
            })
        }, 300)

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
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'employees'>('students')
    const [syncModalOpen, setSyncModalOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('all')

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
        setTeachersPag(prev => ({ ...prev, currentPage: 1 }))
        setEmployeesPag(prev => ({ ...prev, currentPage: 1 }))
    }, [debouncedSearch, statusFilter])

    // Load functions
    const loadStudents = useCallback(async () => {
        setLoading(prev => ({ ...prev, students: true }))
        try {
            const resp = await api.getStudents({
                page: studentsPag.currentPage,
                per_page: studentsPag.perPage,
                search: debouncedSearch || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
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
    }, [studentsPag.currentPage, studentsPag.perPage, debouncedSearch, statusFilter])

    const loadTeachers = useCallback(async () => {
        setLoading(prev => ({ ...prev, teachers: true }))
        try {
            const resp = await api.getTeachers({
                page: teachersPag.currentPage,
                per_page: teachersPag.perPage,
                search: debouncedSearch || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
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
    }, [teachersPag.currentPage, teachersPag.perPage, debouncedSearch, statusFilter])

    const loadEmployees = useCallback(async () => {
        setLoading(prev => ({ ...prev, employees: true }))
        try {
            const resp = await api.getEmployees({
                page: employeesPag.currentPage,
                per_page: employeesPag.perPage,
                search: debouncedSearch || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
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
    }, [employeesPag.currentPage, employeesPag.perPage, debouncedSearch, statusFilter])

    useEffect(() => { loadStudents() }, [loadStudents])
    useEffect(() => { loadTeachers() }, [loadTeachers])
    useEffect(() => { loadEmployees() }, [loadEmployees])

    // Sync hooks
    const studentSync = useHemisSync(api.syncHemisStudents, loadStudents)
    const teacherSync = useHemisSync(api.syncHemisTeachers, loadTeachers)
    const employeeSync = useHemisSync(api.syncHemisEmployees, loadEmployees)

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

    // Rolni o'zgartirish
    const handleChangeRole = (user: UserData) => {
        // Backend 'staff', frontend 'employee' — backendga mos rolni olish
        setRoleUser(user)
        setSelectedRole(user.role === 'employee' ? 'staff' : user.role)
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
    ) => {
        if (isLoading) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12, color: 'var(--color-text-muted)' }}>
                    <Loader2 size={20} className="spin-animation" />
                    <span>{emptyLabel} yuklanmoqda...</span>
                </div>
            )
        }
        if (data.length === 0) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12, color: 'var(--color-text-muted)' }}>
                    <AlertCircle size={32} />
                    <p style={{ fontSize: '0.875rem' }}>{emptyLabel} topilmadi</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>HEMIS sinxronlash tugmasini bosing</p>
                </div>
            )
        }
        return (
            <table className="users-page__table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ism</th>
                        {columns.map((col, i) => <th key={i}>{col.header}</th>)}
                        <th>Holat</th>
                        <th>Amallar</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((u, i) => (
                        <tr key={u.id}>
                            <td>{(pagState.currentPage - 1) * pagState.perPage + i + 1}</td>
                            <td>
                                <div className="users-page__user-cell">
                                    {u.image_url ? (
                                        <img src={u.image_url} alt={u.full_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                        <div className="users-page__avatar">{u.full_name.charAt(0)}</div>
                                    )}
                                    {u.full_name}
                                </div>
                            </td>
                            {columns.map((col, ci) => <td key={ci}>{col.render(u)}</td>)}
                            <td>
                                <span className={`users-page__status users-page__status--${u.active ? 'active' : 'inactive'}`}>
                                    {u.active ? 'Faol' : 'Nofaol'}
                                </span>
                            </td>
                            <td>
                                <div className="users-page__actions">
                                    <button className="users-page__action-btn users-page__action-btn--view" title="Ko'rish" onClick={() => handleView(u, type)}>
                                        <Eye size={15} />
                                    </button>
                                    <button className="users-page__action-btn users-page__action-btn--view" title="Parolni tiklash" onClick={() => handleResetPassword(u)}>
                                        <KeyRound size={15} />
                                    </button>
                                    <button className="users-page__action-btn users-page__action-btn--view" title="Rolni o'zgartirish" onClick={() => handleChangeRole(u)}>
                                        <UserCog size={15} />
                                    </button>
                                    <button className="users-page__action-btn users-page__action-btn--view" title={u.active ? 'Nofaol qilish' : 'Faol qilish'} onClick={() => handleToggleStatus(u)}>
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
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Foydalanuvchilar</h1>
                    <p className="page-subtitle">Tizim foydalanuvchilarini boshqarish</p>
                </div>
                <button className="users-page__sync-btn" onClick={handleOpenSyncModal}>
                    <RefreshCw size={18} />
                    Sinxronlash
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="users-page__toolbar">
                <div className="users-page__search-wrapper">
                    <Search size={18} className="users-page__search-icon" />
                    <input
                        type="text"
                        className="users-page__search-input"
                        placeholder="Ism, guruh, kafedra yoki lavozim bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="users-page__search-clear" onClick={() => setSearch('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="users-page__filters">
                    <div className="users-page__filter-group">
                        <Filter size={15} />
                        <span className="users-page__filter-label">Holat:</span>
                        <div className="users-page__status-filter">
                            {[
                                { value: 'all', label: 'Hammasi' },
                                { value: 'active', label: 'Faol' },
                                { value: 'inactive', label: 'Nofaol' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    className={`users-page__status-btn ${statusFilter === opt.value ? 'users-page__status-btn--active' : ''}`}
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
            <div className="users-page__tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`users-page__tab ${activeTab === tab.key ? 'users-page__tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.icon}
                        {tab.label}
                        <span className="users-page__tab-badge">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="users-page__table-wrapper">
                {activeTab === 'students' && renderUserTable(
                    students, loading.students, 'Talabalar', 'student',
                    [
                        { header: 'Guruh', render: u => <span className="users-page__group-badge">{u.group_name || '-'}</span> },
                        { header: 'Fakultet', render: u => u.department_name || '-' },
                    ],
                    studentsPag,
                )}
                {activeTab === 'teachers' && renderUserTable(
                    teachers, loading.teachers, "O'qituvchilar", 'teacher',
                    [
                        { header: 'Kafedra', render: u => u.department_name || '-' },
                        { header: 'Lavozim', render: u => u.staff_position || '-' },
                    ],
                    teachersPag,
                )}
                {activeTab === 'employees' && renderUserTable(
                    employees, loading.employees, 'Xodimlar', 'employee',
                    [
                        { header: "Bo'lim", render: u => u.department_name || '-' },
                        { header: 'Lavozim', render: u => u.staff_position || '-' },
                    ],
                    employeesPag,
                )}
            </div>

            {/* Pagination */}
            {pag.totalItems > 0 && (
                <div className="users-page__pagination">
                    <div className="users-page__pagination-info">
                        <span>
                            Jami <strong>{pag.totalItems}</strong> ta natija,{' '}
                            <strong>{(pag.currentPage - 1) * pag.perPage + 1}</strong>–
                            <strong>{Math.min(pag.currentPage * pag.perPage, pag.totalItems)}</strong> ko'rsatilmoqda
                        </span>
                    </div>

                    <div className="users-page__pagination-controls">
                        <button
                            className="users-page__pag-btn"
                            disabled={pag.currentPage <= 1}
                            onClick={() => handlePageChange(1)}
                            title="Birinchi sahifa"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            className="users-page__pag-btn"
                            disabled={pag.currentPage <= 1}
                            onClick={() => handlePageChange(pag.currentPage - 1)}
                            title="Oldingi sahifa"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {generatePageNumbers().map((p, i) =>
                            p === '...' ? (
                                <span key={`dots-${i}`} className="users-page__pag-dots">...</span>
                            ) : (
                                <button
                                    key={p}
                                    className={`users-page__pag-btn users-page__pag-num ${pag.currentPage === p ? 'users-page__pag-num--active' : ''}`}
                                    onClick={() => handlePageChange(p as number)}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        <button
                            className="users-page__pag-btn"
                            disabled={pag.currentPage >= pag.totalPages}
                            onClick={() => handlePageChange(pag.currentPage + 1)}
                            title="Keyingi sahifa"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            className="users-page__pag-btn"
                            disabled={pag.currentPage >= pag.totalPages}
                            onClick={() => handlePageChange(pag.totalPages)}
                            title="Oxirgi sahifa"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>

                    <div className="users-page__per-page">
                        <label className="users-page__per-page-label">Sahifada:</label>
                        <select
                            className="users-page__per-page-select"
                            value={pag.perPage}
                            onChange={(e) => handlePerPageChange(Number(e.target.value))}
                        >
                            {PER_PAGE_OPTIONS.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
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
                <div className="sync-modal__backdrop" onClick={() => setSyncModalOpen(false)}>
                    <div className="sync-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sync-modal__header">
                            <div className="sync-modal__header-info">
                                <div className="sync-modal__hemis-logo">
                                    <RefreshCw size={22} />
                                </div>
                                <div>
                                    <h2 className="sync-modal__title">HEMIS Sinxronlash</h2>
                                    <p className="sync-modal__subtitle">Foydalanuvchilarni HEMIS platformasidan yangilash</p>
                                </div>
                            </div>
                            <button className="sync-modal__close" onClick={() => setSyncModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sync-modal__body">
                            <SyncSection
                                title="Talabalar"
                                icon={<GraduationCap size={20} />}
                                color="var(--stat-blue)"
                                count={totalCounts.students}
                                progress={studentSync.progress}
                                onSync={studentSync.handleSync}
                                syncResult={studentSync.syncResult}
                            />
                            <SyncSection
                                title="O'qituvchilar"
                                icon={<BookUser size={20} />}
                                color="var(--stat-green)"
                                count={totalCounts.teachers}
                                progress={teacherSync.progress}
                                onSync={teacherSync.handleSync}
                                syncResult={teacherSync.syncResult}
                            />
                            <SyncSection
                                title="Xodimlar"
                                icon={<Briefcase size={20} />}
                                color="var(--stat-purple)"
                                count={totalCounts.employees}
                                progress={employeeSync.progress}
                                onSync={employeeSync.handleSync}
                                syncResult={employeeSync.syncResult}
                            />
                        </div>

                        <div className="sync-modal__footer flex justify-end">
                            <button className="sync-modal__done-btn" onClick={() => setSyncModalOpen(false)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Password Reset Modal */}
            {resetUser && createPortal(
                <div className="sync-modal__backdrop" onClick={() => !resetLoading && setResetUser(null)}>
                    <div className="sync-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="sync-modal__header">
                            <div className="sync-modal__header-info">
                                <div className="sync-modal__hemis-logo" style={{ background: 'var(--stat-orange, #f59e0b)' }}>
                                    <ShieldAlert size={22} />
                                </div>
                                <div>
                                    <h2 className="sync-modal__title">Parolni tiklash</h2>
                                    <p className="sync-modal__subtitle">Parol default holatga qaytariladi</p>
                                </div>
                            </div>
                            <button className="sync-modal__close" onClick={() => !resetLoading && setResetUser(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sync-modal__body" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                {resetUser.image_url ? (
                                    <img src={resetUser.image_url} alt={resetUser.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div className="users-page__avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                                        {resetUser.full_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{resetUser.full_name}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>ID: {resetUser.user_id}</div>
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 8,
                                padding: '12px 16px',
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                            }}>
                                <p style={{ margin: 0 }}>
                                    <strong>Diqqat!</strong> Bu foydalanuvchining paroli default holatga qaytariladi.
                                </p>
                                <p style={{ margin: '8px 0 0', opacity: 0.8 }}>
                                    Yangi parol: <code style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                    }}>{resetUser.user_id}</code>
                                </p>
                            </div>
                        </div>

                        <div className="sync-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                className="sync-modal__done-btn"
                                onClick={() => setResetUser(null)}
                                disabled={resetLoading}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className="sync-modal__done-btn"
                                onClick={confirmResetPassword}
                                disabled={resetLoading}
                                style={{ background: 'var(--stat-orange, #f59e0b)', color: '#000', fontWeight: 600 }}
                            >
                                {resetLoading ? (
                                    <>
                                        <Loader2 size={16} className="spin-animation" style={{ marginRight: 6 }} />
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
                <div className="sync-modal__backdrop" onClick={() => !roleLoading && setRoleUser(null)}>
                    <div className="sync-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="sync-modal__header">
                            <div className="sync-modal__header-info">
                                <div className="sync-modal__hemis-logo" style={{ background: 'var(--stat-blue, #3b82f6)' }}>
                                    <UserCog size={22} />
                                </div>
                                <div>
                                    <h2 className="sync-modal__title">Rolni o'zgartirish</h2>
                                    <p className="sync-modal__subtitle">Foydalanuvchi rolini yangilash</p>
                                </div>
                            </div>
                            <button className="sync-modal__close" onClick={() => !roleLoading && setRoleUser(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sync-modal__body" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                {roleUser.image_url ? (
                                    <img src={roleUser.image_url} alt={roleUser.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div className="users-page__avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                                        {roleUser.full_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{roleUser.full_name}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>ID: {roleUser.user_id}</div>
                                </div>
                            </div>

                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 8, opacity: 0.8 }}>
                                Yangi rolni tanlang:
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'inherit',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="admin">👑 Administrator</option>
                                <option value="staff">💼 Xodim</option>
                                <option value="teacher">👨‍🏫 O'qituvchi</option>
                                <option value="student">🎓 Talaba</option>
                            </select>
                        </div>

                        <div className="sync-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                className="sync-modal__done-btn"
                                onClick={() => setRoleUser(null)}
                                disabled={roleLoading}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className="sync-modal__done-btn"
                                onClick={confirmChangeRole}
                                disabled={roleLoading}
                                style={{ background: 'var(--stat-blue, #3b82f6)', fontWeight: 600 }}
                            >
                                {roleLoading ? (
                                    <>
                                        <Loader2 size={16} className="spin-animation" style={{ marginRight: 6 }} />
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
                <div className="sync-modal__backdrop" onClick={() => !statusLoading && setStatusUser(null)}>
                    <div className="sync-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="sync-modal__header">
                            <div className="sync-modal__header-info">
                                <div className="sync-modal__hemis-logo" style={{ background: statusUser.active ? 'var(--stat-red, #ef4444)' : 'var(--stat-green, #22c55e)' }}>
                                    <Power size={22} />
                                </div>
                                <div>
                                    <h2 className="sync-modal__title">Holatni o'zgartirish</h2>
                                    <p className="sync-modal__subtitle">
                                        {statusUser.active ? 'Foydalanuvchini nofaol qilish' : 'Foydalanuvchini faol qilish'}
                                    </p>
                                </div>
                            </div>
                            <button className="sync-modal__close" onClick={() => !statusLoading && setStatusUser(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sync-modal__body" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                {statusUser.image_url ? (
                                    <img src={statusUser.image_url} alt={statusUser.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div className="users-page__avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                                        {statusUser.full_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{statusUser.full_name}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                        Hozirgi holat:{' '}
                                        <span className={`users-page__status users-page__status--${statusUser.active ? 'active' : 'inactive'}`}>
                                            {statusUser.active ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: statusUser.active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                border: `1px solid ${statusUser.active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                borderRadius: 8,
                                padding: '12px 16px',
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                            }}>
                                <p style={{ margin: 0 }}>
                                    {statusUser.active
                                        ? <><strong>Diqqat!</strong> Bu foydalanuvchi <strong>nofaol</strong> qilinadi. U tizimga kira olmaydi.</>
                                        : <><strong>Tasdiqlash:</strong> Bu foydalanuvchi <strong>faol</strong> qilinadi va tizimga kirish imkoniyati beriladi.</>
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="sync-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                className="sync-modal__done-btn"
                                onClick={() => setStatusUser(null)}
                                disabled={statusLoading}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className="sync-modal__done-btn"
                                onClick={confirmToggleStatus}
                                disabled={statusLoading}
                                style={{
                                    background: statusUser.active ? 'var(--stat-red, #ef4444)' : 'var(--stat-green, #22c55e)',
                                    fontWeight: 600,
                                    color: '#fff',
                                }}
                            >
                                {statusLoading ? (
                                    <>
                                        <Loader2 size={16} className="spin-animation" style={{ marginRight: 6 }} />
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
