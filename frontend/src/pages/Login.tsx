import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, Lock, User } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

export default function Login() {
    const [hemisId, setHemisId] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuth()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!hemisId.trim() || !password.trim()) {
            toast.error("Hemis ID va parolni kiriting")
            return
        }

        setIsLoading(true)

        try {
            const role = await login(hemisId.trim(), password)
            toast.success("Tizimga muvaffaqiyatli kirdingiz!")
            setTimeout(() => navigate(`/${role}`), 500)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Tizimga kirishda xatolik yuz berdi"
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-page">
            {/* Background decorative elements */}
            <div className="login-bg-decor login-bg-decor--1" />
            <div className="login-bg-decor login-bg-decor--2" />
            <div className="login-bg-decor login-bg-decor--3" />

            <div className="login-card">
                {/* Header */}
                <div className="login-header">
                    <div className="login-logo">
                        <GraduationCap size={32} strokeWidth={1.8} />
                    </div>
                    <h1 className="login-title">Kutubxona Tizimi</h1>
                    <p className="login-subtitle">
                        O'zbekiston Milliy Universiteti — Jizzax filiali
                    </p>
                </div>



                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* Hemis ID */}
                    <div className="login-field">
                        <label htmlFor="hemisId" className="login-label">
                            Hemis ID
                        </label>
                        <div className="login-input-wrapper">
                            <User size={18} className="login-input-icon" />
                            <input
                                id="hemisId"
                                type="text"
                                placeholder="Hemis ID ni kiriting"
                                value={hemisId}
                                onChange={(e) => setHemisId(e.target.value)}
                                className="login-input"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="login-field">
                        <label htmlFor="password" className="login-label">
                            Parol
                        </label>
                        <div className="login-input-wrapper">
                            <Lock size={18} className="login-input-icon" />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Parolni kiriting"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input login-input--password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="login-eye-btn"
                                aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="login-submit"
                    >
                        {isLoading ? (
                            <span className="login-spinner" />
                        ) : (
                            'Tizimga kirish'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="login-footer">
                    © 2026 Kutubxona Axborot Tizimi
                </p>
            </div>
        </div>
    )
}

