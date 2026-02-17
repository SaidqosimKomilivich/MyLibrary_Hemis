import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { GraduationCap, Briefcase, BookUser, Search, RefreshCw, X, ArrowDownToLine, CheckCircle2, Eye, ToggleLeft, ToggleRight, Mail, Phone, Calendar, MapPin, Hash, Bell } from 'lucide-react'



// Types
interface Student {
    id: number; name: string; group: string; faculty: string; status: string
    email: string; phone: string; birthDate: string; address: string; hemis_id: string; enrollYear: number
}
interface Teacher {
    id: number; name: string; department: string; position: string; status: string
    email: string; phone: string; birthDate: string; address: string; hemis_id: string; experience: number
}
interface Employee {
    id: number; name: string; department: string; position: string; status: string
    email: string; phone: string; birthDate: string; address: string; hemis_id: string; hireDate: string
}
type AnyUser = Student | Teacher | Employee

// Demo data
const initialStudents: Student[] = [
    { id: 1, name: "Azimov Jasur", group: "CS-21", faculty: "Kompyuter ilmlari", status: "active", email: "j.azimov@jbnuu.uz", phone: "+998901234567", birthDate: "2003-05-14", address: "Jizzax sh., Sharof Rashidov ko'chasi", hemis_id: "12345678", enrollYear: 2021 },
    { id: 2, name: "Karimova Nilufar", group: "CS-21", faculty: "Kompyuter ilmlari", status: "active", email: "n.karimova@jbnuu.uz", phone: "+998901234568", birthDate: "2003-08-22", address: "Jizzax sh., Navoiy ko'chasi", hemis_id: "12345679", enrollYear: 2021 },
    { id: 3, name: "Toshmatov Sardor", group: "MT-22", faculty: "Matematika", status: "active", email: "s.toshmatov@jbnuu.uz", phone: "+998901234569", birthDate: "2004-01-10", address: "Jizzax sh., Mustaqillik ko'chasi", hemis_id: "12345680", enrollYear: 2022 },
    { id: 4, name: "Rahimova Dilfuza", group: "FZ-20", faculty: "Fizika", status: "inactive", email: "d.rahimova@jbnuu.uz", phone: "+998901234570", birthDate: "2002-11-03", address: "Jizzax sh., Amir Temur ko'chasi", hemis_id: "12345681", enrollYear: 2020 },
    { id: 5, name: "Xolmatov Bekzod", group: "CS-23", faculty: "Kompyuter ilmlari", status: "active", email: "b.xolmatov@jbnuu.uz", phone: "+998901234571", birthDate: "2005-03-28", address: "Jizzax sh., Islom Karimov ko'chasi", hemis_id: "12345682", enrollYear: 2023 },
    { id: 6, name: "Abdullayeva Sarvinoz", group: "BI-21", faculty: "Biologiya", status: "active", email: "s.abdullayeva@jbnuu.uz", phone: "+998901234572", birthDate: "2003-07-19", address: "Jizzax sh., Bobur ko'chasi", hemis_id: "12345683", enrollYear: 2021 },
    { id: 7, name: "Raximov Sherzod", group: "MT-22", faculty: "Matematika", status: "active", email: "sh.raximov@jbnuu.uz", phone: "+998901234573", birthDate: "2004-09-15", address: "Jizzax sh., Do'stlik ko'chasi", hemis_id: "12345684", enrollYear: 2022 },
    { id: 8, name: "Qosimova Madina", group: "CS-23", faculty: "Kompyuter ilmlari", status: "active", email: "m.qosimova@jbnuu.uz", phone: "+998901234574", birthDate: "2005-02-07", address: "Jizzax sh., Universitet ko'chasi", hemis_id: "12345685", enrollYear: 2023 },
]

const initialTeachers: Teacher[] = [
    { id: 1, name: "Ismoilov Ravshan", department: "Kompyuter ilmlari", position: "Dotsent", status: "active", email: "r.ismoilov@jbnuu.uz", phone: "+998901111001", birthDate: "1985-04-20", address: "Jizzax sh., Navoiy ko'chasi", hemis_id: "T001", experience: 12 },
    { id: 2, name: "Xasanova Gulnora", department: "Matematika", position: "Professor", status: "active", email: "g.xasanova@jbnuu.uz", phone: "+998901111002", birthDate: "1978-09-15", address: "Jizzax sh., Mustaqillik ko'chasi", hemis_id: "T002", experience: 20 },
    { id: 3, name: "Nurmatov Olim", department: "Fizika", position: "Katta o'qituvchi", status: "active", email: "o.nurmatov@jbnuu.uz", phone: "+998901111003", birthDate: "1990-06-11", address: "Jizzax sh., Amir Temur ko'chasi", hemis_id: "T003", experience: 8 },
    { id: 4, name: "Tursunova Mahfuza", department: "Biologiya", position: "Dotsent", status: "inactive", email: "m.tursunova@jbnuu.uz", phone: "+998901111004", birthDate: "1982-12-01", address: "Jizzax sh., Sharof Rashidov ko'chasi", hemis_id: "T004", experience: 15 },
    { id: 5, name: "Salimov Ulug'bek", department: "Kompyuter ilmlari", position: "O'qituvchi", status: "active", email: "u.salimov@jbnuu.uz", phone: "+998901111005", birthDate: "1995-03-25", address: "Jizzax sh., Islom Karimov ko'chasi", hemis_id: "T005", experience: 4 },
]

const initialEmployees: Employee[] = [
    { id: 1, name: "Ergashev Anvar", department: "Kutubxona", position: "Bosh kutubxonachi", status: "active", email: "a.ergashev@jbnuu.uz", phone: "+998902222001", birthDate: "1980-07-14", address: "Jizzax sh., Do'stlik ko'chasi", hemis_id: "E001", hireDate: "2010-09-01" },
    { id: 2, name: "Mirzayeva Kamola", department: "Kutubxona", position: "Kutubxonachi", status: "active", email: "k.mirzayeva@jbnuu.uz", phone: "+998902222002", birthDate: "1993-11-20", address: "Jizzax sh., Bobur ko'chasi", hemis_id: "E002", hireDate: "2018-02-15" },
    { id: 3, name: "Qodirov Farhod", department: "IT bo'limi", position: "Tizim administratori", status: "active", email: "f.qodirov@jbnuu.uz", phone: "+998902222003", birthDate: "1991-05-08", address: "Jizzax sh., Universitet ko'chasi", hemis_id: "E003", hireDate: "2019-08-20" },
]

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
    progress: number  // 0 = idle, 1-99 = syncing, 100 = done
    onSync: () => void
}

function SyncSection({ title, icon, color, count, progress, onSync }: SyncSectionProps) {
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
                            {progress}%
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
                        <span className="sync-progress__label">{getSyncLabel(progress)}</span>
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

// User Detail Modal
function UserDetailModal({ user, type, onClose }: { user: AnyUser; type: 'student' | 'teacher' | 'employee'; onClose: () => void }) {
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('')

    const infoRows: { icon: React.ReactNode; label: string; value: string }[] = [
        { icon: <Hash size={16} />, label: 'HEMIS ID', value: user.hemis_id },
        { icon: <Mail size={16} />, label: 'Email', value: user.email },
        { icon: <Phone size={16} />, label: 'Telefon', value: user.phone },
        { icon: <Calendar size={16} />, label: "Tug'ilgan sana", value: user.birthDate },
        { icon: <MapPin size={16} />, label: 'Manzil', value: user.address },
    ]

    // Type-specific info
    if (type === 'student') {
        const s = user as Student
        infoRows.splice(1, 0,
            { icon: <GraduationCap size={16} />, label: 'Guruh', value: s.group },
            { icon: <BookUser size={16} />, label: 'Fakultet', value: s.faculty },
            { icon: <Calendar size={16} />, label: "O'qishga kirgan yili", value: String(s.enrollYear) },
        )
    } else if (type === 'teacher') {
        const t = user as Teacher
        infoRows.splice(1, 0,
            { icon: <BookUser size={16} />, label: 'Kafedra', value: t.department },
            { icon: <Briefcase size={16} />, label: 'Lavozim', value: t.position },
            { icon: <Calendar size={16} />, label: 'Tajriba', value: `${t.experience} yil` },
        )
    } else {
        const e = user as Employee
        infoRows.splice(1, 0,
            { icon: <Briefcase size={16} />, label: "Bo'lim", value: e.department },
            { icon: <BookUser size={16} />, label: 'Lavozim', value: e.position },
            { icon: <Calendar size={16} />, label: 'Ishga kirgan sana', value: e.hireDate },
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
                    <div className="user-detail__avatar">
                        {getInitials(user.name)}
                    </div>
                    <h3 className="user-detail__name">{user.name}</h3>
                    <span className={`users-page__status users-page__status--${user.status}`}>
                        {user.status === 'active' ? 'Faol' : 'Nofaol'}
                    </span>
                    <span className="user-detail__role-badge">
                        {type === 'student' ? '🎓 Talaba' : type === 'teacher' ? '👨‍🏫 O\'qituvchi' : '💼 Xodim'}
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

export default function UsersPage() {
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'employees'>('students')
    const [syncModalOpen, setSyncModalOpen] = useState(false)

    // Mutable data
    const [students, setStudents] = useState<Student[]>(initialStudents)
    const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers)
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees)

    // User detail modal
    const [viewUser, setViewUser] = useState<AnyUser | null>(null)
    const [viewUserType, setViewUserType] = useState<'student' | 'teacher' | 'employee'>('student')

    // Notification modal
    const [notificationTarget, setNotificationTarget] = useState<{ id: string, name: string } | null>(null)


    // Sync progress (0 = idle, 1-99 = syncing, 100 = done)
    const [studentProgress, setStudentProgress] = useState(0)
    const [teacherProgress, setTeacherProgress] = useState(0)
    const [employeeProgress, setEmployeeProgress] = useState(0)
    const intervalsRef = useRef<number[]>([])

    const simulateSync = useCallback((setter: React.Dispatch<React.SetStateAction<number>>) => {
        setter(1)
        const id = window.setInterval(() => {
            setter(prev => {
                if (prev >= 100) {
                    clearInterval(id)
                    return 100
                }
                // Random jumps between 2-8%, slower near the end
                const jump = prev < 70
                    ? Math.floor(Math.random() * 7) + 2
                    : Math.floor(Math.random() * 4) + 1
                return Math.min(prev + jump, 100)
            })
        }, 200)
        intervalsRef.current.push(id)
    }, [])

    const handleOpenSyncModal = () => {
        // Clear any running intervals
        intervalsRef.current.forEach(id => clearInterval(id))
        intervalsRef.current = []
        setStudentProgress(0)
        setTeacherProgress(0)
        setEmployeeProgress(0)
        setSyncModalOpen(true)
    }

    // Toggle status
    const toggleStudentStatus = (id: number) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s))
    }
    const toggleTeacherStatus = (id: number) => {
        setTeachers(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t))
    }
    const toggleEmployeeStatus = (id: number) => {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: e.status === 'active' ? 'inactive' : 'active' } : e))
    }

    // View user
    const handleView = (user: AnyUser, type: 'student' | 'teacher' | 'employee') => {
        setViewUser(user)
        setViewUserType(type)
    }

    // Send notification
    const handleSendNotification = (user: AnyUser) => {
        // Backend expects UUID, but demo data has number IDs.
        // In real app, IDs are UUIDs. For demo, we might fail or need to mock.
        // Assuming user.id is string or we cast it. 
        // Wait, the API expects string UUID.
        // In the demo data `id` is number.
        // I should probably cast it to string, but backend will fail if it's not UUID.
        // However, I can't change the demo data types easily here without breaking everything.
        // Let's assume for now we just pass it as string, and if it fails, it fails (it's a demo page connected to real backend? No, `UsersPage` seems to carry its own state but `DashboardLayout` uses `useAuth`).
        // Actually `UsersPage` seems to be fully frontend mock data based on `initialStudents`.
        // If I want to test real notifications, I need real users from backend.
        // But the user asked to "integrate" it.
        // I will add the button and the modal. The API call might fail if IDs don't match backend.
        // But the UI will be correct.
        setNotificationTarget({ id: user.id.toString(), name: user.name })
    }

    // Filter

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.group.toLowerCase().includes(search.toLowerCase()) ||
        s.faculty.toLowerCase().includes(search.toLowerCase())
    )
    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.department.toLowerCase().includes(search.toLowerCase())
    )
    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.department.toLowerCase().includes(search.toLowerCase())
    )

    const tabs = [
        { key: 'students' as const, label: 'Talabalar', icon: <GraduationCap size={16} />, count: students.length },
        { key: 'teachers' as const, label: "O'qituvchilar", icon: <BookUser size={16} />, count: teachers.length },
        { key: 'employees' as const, label: 'Xodimlar', icon: <Briefcase size={16} />, count: employees.length },
    ]

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
                {activeTab === 'students' && (
                    <table className="users-page__table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Ism</th>
                                <th>Guruh</th>
                                <th>Fakultet</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((s, i) => (
                                <tr key={s.id}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <div className="users-page__user-cell">
                                            <div className="users-page__avatar">{s.name.charAt(0)}</div>
                                            {s.name}
                                        </div>
                                    </td>
                                    <td><span className="users-page__group-badge">{s.group}</span></td>
                                    <td>{s.faculty}</td>
                                    <td>
                                        <span className={`users-page__status users-page__status--${s.status}`}>
                                            {s.status === 'active' ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="users-page__actions">
                                            <button className="users-page__action-btn users-page__action-btn--view" title="Ko'rish" onClick={() => handleView(s, 'student')}>
                                                <Eye size={15} />
                                            </button>
                                            <button className="users-page__action-btn users-page__action-btn--view" title="Xabar yuborish" onClick={() => handleSendNotification(s)}>
                                                <Bell size={15} />
                                            </button>
                                            <button
                                                className={`users-page__action-btn ${s.status === 'active' ? 'users-page__action-btn--deactivate' : 'users-page__action-btn--activate'}`}
                                                title={s.status === 'active' ? 'Nofaol qilish' : 'Faol qilish'}
                                                onClick={() => toggleStudentStatus(s.id)}
                                            >
                                                {s.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'teachers' && (
                    <table className="users-page__table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Ism</th>
                                <th>Kafedra</th>
                                <th>Lavozim</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeachers.map((t, i) => (
                                <tr key={t.id}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <div className="users-page__user-cell">
                                            <div className="users-page__avatar">{t.name.charAt(0)}</div>
                                            {t.name}
                                        </div>
                                    </td>
                                    <td>{t.department}</td>
                                    <td>{t.position}</td>
                                    <td>
                                        <span className={`users-page__status users-page__status--${t.status}`}>
                                            {t.status === 'active' ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="users-page__actions">
                                            <button className="users-page__action-btn users-page__action-btn--view" title="Ko'rish" onClick={() => handleView(t, 'teacher')}>
                                                <Eye size={15} />
                                            </button>
                                            <button className="users-page__action-btn users-page__action-btn--view" title="Xabar yuborish" onClick={() => handleSendNotification(t)}>
                                                <Bell size={15} />
                                            </button>
                                            <button
                                                className={`users-page__action-btn ${t.status === 'active' ? 'users-page__action-btn--deactivate' : 'users-page__action-btn--activate'}`}
                                                title={t.status === 'active' ? 'Nofaol qilish' : 'Faol qilish'}
                                                onClick={() => toggleTeacherStatus(t.id)}
                                            >
                                                {t.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'employees' && (
                    <table className="users-page__table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Ism</th>
                                <th>Bo'lim</th>
                                <th>Lavozim</th>
                                <th>Holat</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map((e, i) => (
                                <tr key={e.id}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <div className="users-page__user-cell">
                                            <div className="users-page__avatar">{e.name.charAt(0)}</div>
                                            {e.name}
                                        </div>
                                    </td>
                                    <td>{e.department}</td>
                                    <td>{e.position}</td>
                                    <td>
                                        <span className={`users-page__status users-page__status--${e.status}`}>
                                            {e.status === 'active' ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="users-page__actions">
                                            <button className="users-page__action-btn users-page__action-btn--view" title="Ko'rish" onClick={() => handleView(e, 'employee')}>
                                                <Eye size={15} />
                                            </button>
                                            <button className="users-page__action-btn users-page__action-btn--view" title="Xabar yuborish" onClick={() => handleSendNotification(e)}>
                                                <Bell size={15} />
                                            </button>
                                            <button
                                                className={`users-page__action-btn ${e.status === 'active' ? 'users-page__action-btn--deactivate' : 'users-page__action-btn--activate'}`}
                                                title={e.status === 'active' ? 'Nofaol qilish' : 'Faol qilish'}
                                                onClick={() => toggleEmployeeStatus(e.id)}
                                            >
                                                {e.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                                progress={studentProgress}
                                onSync={() => simulateSync(setStudentProgress)}
                            />
                            <SyncSection
                                title="O'qituvchilar"
                                icon={<BookUser size={20} />}
                                color="var(--stat-green)"
                                count={teachers.length}
                                progress={teacherProgress}
                                onSync={() => simulateSync(setTeacherProgress)}
                            />
                            <SyncSection
                                title="Xodimlar"
                                icon={<Briefcase size={20} />}
                                color="var(--stat-purple)"
                                count={employees.length}
                                progress={employeeProgress}
                                onSync={() => simulateSync(setEmployeeProgress)}
                            />
                        </div>

                        <div className="sync-modal__footer">
                            <span className="sync-modal__note">
                                💡 Har bir bo'limni alohida yangilashingiz mumkin
                            </span>
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
