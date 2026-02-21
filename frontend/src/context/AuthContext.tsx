import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, type UserData } from '../services/api'
import { toast } from 'react-toastify'

/** Backend 'staff' → frontend 'employee' mapping */
function mapRole(backendRole: string): string {
    if (backendRole === 'staff') return 'employee'
    return backendRole
}

/** Frontend 'employee' → backend 'staff' reverse mapping */
export function mapRoleToBackend(frontendRole: string): string {
    if (frontendRole === 'employee') return 'staff'
    return frontendRole
}

interface AuthContextType {
    user: UserData | null
    /** Frontend mapped role ('admin' | 'employee' | 'teacher' | 'student') */
    role: string | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (userId: string, password: string) => Promise<string>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Check auth on mount (page refresh)
    useEffect(() => {
        api.getMe()
            .then((res) => {
                setUser(res.user)
            })
            .catch(() => {
                setUser(null)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    const login = useCallback(async (userId: string, password: string): Promise<string> => {
        const res = await api.login(userId, password)
        setUser(res.user)
        return mapRole(res.user.role)
    }, [])

    const logout = useCallback(async () => {
        try {
            await api.logout()
        } catch {
            // Even if API fails, clear local state
        }
        setUser(null)
    }, [])

    // Token muddati tugaganda avtomatik logout
    useEffect(() => {
        const handleUnauthorized = () => {
            setUser(null)
            toast.warning('Sessiya muddati tugadi. Iltimos, qayta kiring.', { toastId: 'session-expired' })
        }

        window.addEventListener('auth:unauthorized', handleUnauthorized)
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }, [])

    const role = user ? mapRole(user.role) : null

    return (
        <AuthContext.Provider
            value={{
                user,
                role,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return ctx
}
