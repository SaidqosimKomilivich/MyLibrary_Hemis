import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GraduationCap, Briefcase, BookUser, Search, RefreshCw, X, ArrowDownToLine, CheckCircle2, Eye, Mail, Phone, Calendar, MapPin, Hash, Bell, AlertCircle, Loader2 } from 'lucide-react'
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

export default function UsersPage() {
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'employees'>('students')
    const [syncModalOpen, setSyncModalOpen] = useState(false)

    // Data from API
    const [students, setStudents] = useState<UserData[]>([])
    const [teachers, setTeachers] = useState<UserData[]>([])
    const [employees, setEmployees] = useState<UserData[]>([])
    const [loading, setLoading] = useState({ students: false, teachers: false, employees: false })

    // User detail modal
    const [viewUser, setViewUser] = useState<UserData | null>(null)
    const [viewUserType, setViewUserType] = useState<'student' | 'teacher' | 'employee'>('student')

    // Load functions
    const loadStudents = useCallback(async () => {
        setLoading(prev => ({ ...prev, students: true }))
        try {
            const resp = await api.getStudents()
            if (resp.success && resp.data) setStudents(resp.data)
        } catch (e) { console.error('Talabalarni yuklashda xato:', e) }
        finally { setLoading(prev => ({ ...prev, students: false })) }
    }, [])

    const loadTeachers = useCallback(async () => {
        setLoading(prev => ({ ...prev, teachers: true }))
        try {
            const resp = await api.getTeachers()
            if (resp.success && resp.data) setTeachers(resp.data)
        } catch (e) { console.error("O'qituvchilarni yuklashda xato:", e) }
        finally { setLoading(prev => ({ ...prev, teachers: false })) }
    }, [])

    const loadEmployees = useCallback(async () => {
        setLoading(prev => ({ ...prev, employees: true }))
        try {
            const resp = await api.getEmployees()
            if (resp.success && resp.data) setEmployees(resp.data)
        } catch (e) { console.error('Xodimlarni yuklashda xato:', e) }
        finally { setLoading(prev => ({ ...prev, employees: false })) }
    }, [])

    useEffect(() => {
        loadStudents()
        loadTeachers()
        loadEmployees()
    }, [loadStudents, loadTeachers, loadEmployees])

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

    // Filter
    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.group_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.department_name || '').toLowerCase().includes(search.toLowerCase())
    )
    const filteredTeachers = teachers.filter(t =>
        t.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (t.department_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.staff_position || '').toLowerCase().includes(search.toLowerCase())
    )
    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (e.department_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.staff_position || '').toLowerCase().includes(search.toLowerCase())
    )

    const tabs = [
        { key: 'students' as const, label: 'Talabalar', icon: <GraduationCap size={16} />, count: students.length },
        { key: 'teachers' as const, label: "O'qituvchilar", icon: <BookUser size={16} />, count: teachers.length },
        { key: 'employees' as const, label: 'Xodimlar', icon: <Briefcase size={16} />, count: employees.length },
    ]

    // Table renderer for each tab (all use UserData now)
    const renderUserTable = (
        data: UserData[],
        isLoading: boolean,
        emptyLabel: string,
        type: 'student' | 'teacher' | 'employee',
        columns: { header: string; render: (u: UserData) => React.ReactNode }[]
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
                            <td>{i + 1}</td>
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
                                    <button className="users-page__action-btn users-page__action-btn--view" title="Xabar yuborish">
                                        <Bell size={15} />
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

            {/* Search */}
            <div className="users-page__toolbar">
                <div className="library-page__search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Ism, guruh yoki bo'lim bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                    filteredStudents, loading.students, 'Talabalar', 'student',
                    [
                        { header: 'Guruh', render: u => <span className="users-page__group-badge">{u.group_name || '-'}</span> },
                        { header: 'Fakultet', render: u => u.department_name || '-' },
                    ]
                )}
                {activeTab === 'teachers' && renderUserTable(
                    filteredTeachers, loading.teachers, "O'qituvchilar", 'teacher',
                    [
                        { header: 'Kafedra', render: u => u.department_name || '-' },
                        { header: 'Lavozim', render: u => u.staff_position || '-' },
                    ]
                )}
                {activeTab === 'employees' && renderUserTable(
                    filteredEmployees, loading.employees, 'Xodimlar', 'employee',
                    [
                        { header: "Bo'lim", render: u => u.department_name || '-' },
                        { header: 'Lavozim', render: u => u.staff_position || '-' },
                    ]
                )}
            </div>

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
                                count={students.length}
                                progress={studentSync.progress}
                                onSync={studentSync.handleSync}
                                syncResult={studentSync.syncResult}
                            />
                            <SyncSection
                                title="O'qituvchilar"
                                icon={<BookUser size={20} />}
                                color="var(--stat-green)"
                                count={teachers.length}
                                progress={teacherSync.progress}
                                onSync={teacherSync.handleSync}
                                syncResult={teacherSync.syncResult}
                            />
                            <SyncSection
                                title="Xodimlar"
                                icon={<Briefcase size={20} />}
                                color="var(--stat-purple)"
                                count={employees.length}
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

        </div>
    )
}
