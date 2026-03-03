import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
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
        <div className="relative flex items-center justify-center min-h-dvh p-6 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute rounded-full blur-[100px] opacity-35 pointer-events-none animate-float w-[500px] h-[500px] bg-primary -top-[120px] -right-[80px] max-sm:w-[300px] max-sm:h-[300px]" style={{ animationDelay: '0s' }} />
            <div className="absolute rounded-full blur-[100px] opacity-35 pointer-events-none animate-float w-[400px] h-[400px] bg-accent -bottom-[100px] -left-[60px] max-sm:w-[250px] max-sm:h-[250px]" style={{ animationDelay: '-4s' }} />
            <div className="absolute rounded-full blur-[100px] opacity-18 pointer-events-none animate-float-center w-[300px] h-[300px] bg-[#8b5cf6] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '-8s' }} />

            <div className="relative w-full max-w-[420px] bg-surface backdrop-blur-2xl saturate-150 border border-border rounded-lg p-10 px-8 pb-8 shadow-card animate-card-enter max-sm:px-5 max-sm:pt-8 max-sm:pb-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <img
                            src="/icon_arm.png"
                            alt="ARM logo"
                            className="w-25 h-25 rounded-full p-0.5 object-contain drop-shadow-lg"
                        />
                    </div>
                    <h1 className="text-[1rem] font-bold tracking-tight text-text mb-1 leading-snug px-2">
                        Mirzo Ulug'bek nomidagi O'zbekiston Milliy universitetining Jizzax filiali
                    </h1>
                    <p className="text-[0.9rem] text-emerald-400 font-semibold mt-1">
                        "Axborot Resurs Markazi"
                    </p>
                </div>



                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Hemis ID */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="hemisId" className="text-[0.8rem] font-medium text-text-muted uppercase tracking-[0.06em]">
                            Hemis ID
                        </label>
                        <div className="relative flex items-center group">
                            <User size={18} className="absolute left-3.5 text-text-muted pointer-events-none transition-colors duration-250 group-focus-within:text-primary-light" />
                            <input
                                id="hemisId"
                                type="text"
                                placeholder="Hemis ID ni kiriting"
                                value={hemisId}
                                onChange={(e) => setHemisId(e.target.value)}
                                className="w-full py-3 pr-3.5 pl-[42px] bg-canvas/40 border border-border rounded-md text-text text-[0.95rem] font-inherit outline-none transition-all duration-250 hover:border-text-muted/30 hover:bg-canvas/60 focus:border-primary-light focus:ring-[3px] focus:ring-primary/20 focus:bg-canvas/80 placeholder:text-text-muted/50"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-[0.8rem] font-medium text-text-muted uppercase tracking-[0.06em]">
                            Parol
                        </label>
                        <div className="relative flex items-center group">
                            <Lock size={18} className="absolute left-3.5 text-text-muted pointer-events-none transition-colors duration-250 group-focus-within:text-primary-light" />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Parolni kiriting"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full py-3 pr-[44px] pl-[42px] bg-canvas/40 border border-border rounded-md text-text text-[0.95rem] font-inherit outline-none transition-all duration-250 hover:border-text-muted/30 hover:bg-canvas/60 focus:border-primary-light focus:ring-[3px] focus:ring-primary/20 focus:bg-canvas/80 placeholder:text-text-muted/50"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2.5 flex items-center justify-center w-8 h-8 border-none rounded-lg bg-transparent text-text-muted cursor-pointer transition-colors duration-250 hover:text-text hover:bg-surface-hover"
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
                        className="flex items-center justify-center gap-2 w-full py-[13px] mt-1 font-inherit text-[0.95rem] font-semibold text-white bg-linear-to-br from-primary to-primary-light border-none rounded-md cursor-pointer transition-all duration-250 shadow-[0_4px_16px_rgba(79,70,229,0.35)] hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_8px_24px_rgba(79,70,229,0.45)] active:not-disabled:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="inline-block w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Tizimga kirish'
                        )}
                    </button>
                </form>

                {/* Footer
                <p className="text-center mt-7 text-[0.75rem] text-text-muted opacity-60">
                    © 2026 Kutubxona Axborot Tizimi
                </p> */}
            </div>
        </div>
    )
}

