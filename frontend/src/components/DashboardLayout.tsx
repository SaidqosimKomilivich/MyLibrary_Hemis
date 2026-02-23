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
    Loader2,
    ScanLine,

} from 'lucide-react'

import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'



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
        { label: 'Ijaralar', path: '/admin/rentals', icon: <BookOpen size={20} /> },
        { label: "So'rovlar", path: '/admin/requests', icon: <ClipboardList size={20} /> },
        { label: 'Xodimlar', path: '/admin/employees', icon: <UserCog size={20} /> },
        { label: 'Hisobotlar', path: '/admin/stats', icon: <BarChart3 size={20} /> },


        { label: 'Profil', path: '/admin/profile', icon: <UserCircle size={20} /> },
    ],
    employee: [
        { label: 'Boshqaruv paneli', path: '/employee', icon: <LayoutDashboard size={20} /> },
        { label: 'Kitoblar katalogi', path: '/employee/catalog', icon: <Library size={20} /> },
        { label: 'Ijaralar', path: '/employee/rentals', icon: <Library size={20} /> },
        { label: "So'rovlar", path: '/employee/requests', icon: <ClipboardList size={20} /> },
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
            <div className="flex items-center justify-center h-screen bg-surface text-text-muted gap-3 text-base">
                <Loader2 size={24} className="animate-spin" />
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
        <div className="flex min-h-dvh">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="hidden fixed inset-0 bg-black/50 z-99 max-md:block"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 w-[260px] h-dvh bg-slate-900/95 backdrop-blur-2xl border-r border-border flex flex-col z-100 transition-transform duration-250 max-md:-translate-x-full ${sidebarOpen ? 'max-md:translate-x-0' : ''}`}>
                <div className="flex items-center gap-2.5 p-5 border-b border-border">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-primary to-accent text-white shrink-0">
                        <GraduationCap size={24} />
                    </div>
                    <span className="text-[1.1rem] font-bold tracking-[-0.02em]">Kutubxona</span>
                    <button
                        className="hidden ml-auto bg-transparent border-none text-text-muted cursor-pointer p-1 max-md:block"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === `/${role}`}
                            className={({ isActive }) =>
                                `relative flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-[0.9rem] font-medium transition-colors duration-250 border-none bg-transparent cursor-pointer w-full font-inherit hover:bg-surface-hover hover:text-text ${isActive ? 'bg-indigo-500/15 text-primary-light before:content-[""] before:absolute before:left-0 before:w-[3px] before:h-6 before:bg-primary-light before:rounded-r-md' : 'text-text-muted'}`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t border-border">
                    <button className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-[0.9rem] font-medium transition-colors duration-250 border-none bg-transparent cursor-pointer w-full font-inherit text-red-400 hover:bg-red-500/10 hover:text-red-500" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Chiqish</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 ml-[260px] flex flex-col min-h-dvh max-md:ml-0">
                {/* Top bar */}
                <header className="sticky top-0 z-50 flex items-center gap-4 h-[64px] px-6 bg-slate-900/60 backdrop-blur-xl border-b border-border max-md:px-4">
                    <button
                        className="hidden bg-transparent border-none text-text cursor-pointer p-1.5 max-md:block"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={22} />
                    </button>
                    <div className="text-[0.8rem] font-semibold py-1 px-3 rounded-full bg-indigo-500/15 text-primary-light uppercase tracking-[0.05em]">{roleLabels[role]}</div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-accent text-white flex items-center justify-center font-bold text-[0.85rem]" title={displayName}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 max-md:p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

