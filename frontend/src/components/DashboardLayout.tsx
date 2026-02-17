import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import {
    LayoutDashboard,
    BookOpen,
    Users,
    UserCog,
    BarChart3,
    UserCircle,
    LogOut,
    Menu,
    X,
    GraduationCap,
    ClipboardList,
    UserCheck,
    Library,
    Bell,
    Loader2,
    ScanLine,
} from 'lucide-react'

import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'


export type UserRole = 'admin' | 'employee' | 'teacher' | 'student'

interface NavItem {
    label: string
    path: string
    icon: React.ReactNode
}

const navByRole: Record<UserRole, NavItem[]> = {
    admin: [
        { label: 'Boshqaruv paneli', path: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'Foydalanuvchilar', path: '/admin/users', icon: <Users size={20} /> },
        { label: 'Kitoblar', path: '/admin/books', icon: <BookOpen size={20} /> },
        { label: 'Xodimlar', path: '/admin/employees', icon: <UserCog size={20} /> },
        { label: 'Statistika', path: '/admin/stats', icon: <BarChart3 size={20} /> },
        { label: 'Profil', path: '/admin/profile', icon: <UserCircle size={20} /> },
    ],
    employee: [
        { label: 'Boshqaruv paneli', path: '/employee', icon: <LayoutDashboard size={20} /> },
        { label: 'Kitoblar katalogi', path: '/employee/catalog', icon: <Library size={20} /> },
        { label: 'Nazorat', path: '/employee/access-control', icon: <ScanLine size={20} /> },
        { label: "O'quvchilar", path: '/employee/readers', icon: <UserCheck size={20} /> },
        { label: 'Profil', path: '/employee/profile', icon: <UserCircle size={20} /> },
    ],
    teacher: [
        { label: 'Boshqaruv paneli', path: '/teacher', icon: <LayoutDashboard size={20} /> },
        { label: 'Mavjud kitoblar', path: '/teacher/available', icon: <Library size={20} /> },
        { label: "O'qiyotgan kitoblar", path: '/teacher/my-books', icon: <BookOpen size={20} /> },
        { label: "So'rovlar", path: '/teacher/requests', icon: <ClipboardList size={20} /> },
        { label: 'Profil', path: '/teacher/profile', icon: <UserCircle size={20} /> },
    ],
    student: [
        { label: 'Boshqaruv paneli', path: '/student', icon: <LayoutDashboard size={20} /> },
        { label: 'Kutubxona', path: '/student/library', icon: <Library size={20} /> },
        { label: "O'qiyotgan kitoblar", path: '/student/my-books', icon: <BookOpen size={20} /> },
        { label: "So'rovlar", path: '/student/requests', icon: <ClipboardList size={20} /> },
        { label: 'Profil', path: '/student/profile', icon: <UserCircle size={20} /> },
    ],
}

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrator',
    employee: 'Xodim',
    teacher: "O'qituvchi",
    student: 'Talaba',
}

interface DashboardLayoutProps {
    role: UserRole
}

export default function DashboardLayout({ role }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const navigate = useNavigate()
    const { user, isLoading, isAuthenticated, logout } = useAuth()
    const navItems = navByRole[role]

    const handleLogout = async () => {
        await logout()
        toast.info("Tizimdan chiqdingiz")
        navigate('/login')
    }

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                gap: '0.75rem',
                fontSize: '1rem',
            }}>
                <Loader2 size={24} className="login-spinner" />
                Yuklanmoqda...
            </div>
        )
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Force password update if required
    if (user && !user.is_password_update) {
        // Prevent infinite loop if we are already on the change password page (though DashboardLayout shouldn't be used there)
        return <Navigate to="/change-password" replace />
    }

    const displayName = user?.full_name || user?.user_id || roleLabels[role]

    return (
        <div className="dashboard">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <GraduationCap size={24} />
                    </div>
                    <span className="sidebar-brand">Kutubxona</span>
                    <button
                        className="sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === `/${role}`}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-link sidebar-link--logout" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Chiqish</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="dashboard-main">
                {/* Top bar */}
                <header className="topbar">
                    <button
                        className="topbar-menu"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={22} />
                    </button>
                    <div className="topbar-role-badge">{roleLabels[role]}</div>
                    <div className="topbar-right">
                        <NotificationBell />
                        <div className="topbar-avatar" title={displayName}>

                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="dashboard-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
