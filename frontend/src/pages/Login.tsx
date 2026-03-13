import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, User, ArrowLeft, AlertCircle, RefreshCcw } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

export default function Login() {
    const [hemisId, setHemisId] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Captcha states
    const [captchaId, setCaptchaId] = useState('')
    const [captchaText, setCaptchaText] = useState('')
    const [captchaValue, setCaptchaValue] = useState('')

    // Block timer states
    const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
    const [timeLeft, setTimeLeft] = useState('')

    const navigate = useNavigate()
    const location = useLocation()
    const { login } = useAuth()

    // Book ID passed from PublicCatalog when user clicked a book while logged out
    const returnToBookId: string | undefined = (location.state as { returnToBookId?: string } | null)?.returnToBookId

    // Fetch CAPTCHA on mount
    useEffect(() => {
        fetchCaptcha()
    }, [])

    const fetchCaptcha = async () => {
        try {
            const res = await api.getCaptcha()
            if (res.success) {
                setCaptchaId(res.captcha_id)
                setCaptchaText(res.text)
                setCaptchaValue('') // reset local input
            }
        } catch {
            toast.error("Captcha yuklashda xatolik yuz berdi")
        }
    }

    // Timer logic
    useEffect(() => {
        if (!blockedUntil) return

        const updateTimer = () => {
            const now = Math.floor(Date.now() / 1000)
            const diff = blockedUntil - now

            if (diff <= 0) {
                setBlockedUntil(null)
                setTimeLeft('')
            } else {
                const m = Math.floor(diff / 60).toString().padStart(2, '0')
                const s = (diff % 60).toString().padStart(2, '0')
                setTimeLeft(`${m}:${s}`)
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [blockedUntil])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (blockedUntil) {
            toast.warning(`Siz bloklangansiz. Qolgan vaqt: ${timeLeft}`)
            return
        }

        if (!hemisId.trim() || !password.trim()) {
            toast.error("Hemis ID va parolni kiriting")
            return
        }

        if (!captchaValue.trim()) {
            toast.error("Matematik hisob-kitobni kiriting")
            return
        }

        const numericCaptcha = parseInt(captchaValue, 10)
        if (isNaN(numericCaptcha)) {
            toast.error("Hisob-kitobga faqat raqam kiriting")
            return
        }

        setIsLoading(true)

        try {
            const role = await login(hemisId.trim(), password, captchaId, numericCaptcha)
            toast.success("Tizimga muvaffaqiyatli kirdingiz!")

            // Agar katalogdan kitob bosilgan bo'lsa, to'g'ridan-to'g'ri Library sahifasiga yo'naltiramiz
            const libraryRouteByRole: Record<string, string> = {
                student: '/student/library',
                teacher: '/teacher/available',
                employee: '/employee/library',
                staff: '/staff/catalog',
                admin: '/admin/books',
            }
            const destination = returnToBookId
                ? (libraryRouteByRole[role] ?? `/${role}`)
                : `/${role}`

            setTimeout(() => navigate(destination, {
                state: returnToBookId ? { autoOpenBookId: returnToBookId } : undefined
            }), 500)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Tizimga kirishda xatolik yuz berdi"
            toast.error(message)
            fetchCaptcha() // har qanday xatolikda yangi captcha keltiramiz

            // Rate Limit
            const apiErr = err as { status?: number; data?: { blocked_until?: string } }
            if (apiErr.status === 429 && apiErr.data?.blocked_until) {
                // Parse timestamp
                setBlockedUntil(parseInt(apiErr.data.blocked_until, 10))
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative flex items-center justify-center min-h-dvh p-6 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute rounded-full blur-[100px] opacity-35 pointer-events-none animate-float w-125 h-125 bg-primary -top-30 -right-20 max-sm:w-75 max-sm:h-75" style={{ animationDelay: '0s' }} />
            <div className="absolute rounded-full blur-[100px] opacity-35 pointer-events-none animate-float w-100 h-100 bg-accent -bottom-25 -left-15 max-sm:w-62.5 max-sm:h-62.5" style={{ animationDelay: '-4s' }} />
            <div className="absolute rounded-full blur-[100px] opacity-18 pointer-events-none animate-float-center w-75 h-75 bg-[#8b5cf6] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '-8s' }} />

            <div className="relative w-full max-w-105 bg-surface backdrop-blur-2xl saturate-150 border border-border rounded-lg p-10 px-8 pb-8 shadow-card animate-card-enter max-sm:px-5 max-sm:pt-8 max-sm:pb-6">

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                    title="Ortga qaytish"
                >
                    <ArrowLeft size={20} />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4 mt-2">
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

                {/* Blocked Message */}
                {blockedUntil && (
                    <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 animate-fade-in">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                            <h4 className="text-[0.9rem] font-bold mb-0.5">Vaqtinchalik cheklov</h4>
                            <p className="text-[0.8rem] opacity-90 leading-relaxed mb-2">
                                3 marta noto'g'ri urinish amalga oshirildi. Xavfsizlik maqsadida tizimga kirish vaqtinchalik cheklandi.
                            </p>
                            <div className="inline-flex items-center self-start gap-1.5 py-1 px-3 bg-red-500/20 rounded-full font-mono font-bold text-[0.95rem]">
                                {timeLeft}
                            </div>
                        </div>
                    </div>
                )}


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
                                disabled={!!blockedUntil}
                                className="w-full py-3 pr-3.5 pl-10.5 bg-canvas/40 border border-border rounded-md text-text text-[0.95rem] font-inherit outline-none transition-all duration-250 hover:border-text-muted/30 hover:bg-canvas/60 focus:border-primary-light focus:ring-[3px] focus:ring-primary/20 focus:bg-canvas/80 placeholder:text-text-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                disabled={!!blockedUntil}
                                className="w-full py-3 pr-11 pl-10.5 bg-canvas/40 border border-border rounded-md text-text text-[0.95rem] font-inherit outline-none transition-all duration-250 hover:border-text-muted/30 hover:bg-canvas/60 focus:border-primary-light focus:ring-[3px] focus:ring-primary/20 focus:bg-canvas/80 placeholder:text-text-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={!!blockedUntil}
                                className="absolute right-2.5 flex items-center justify-center w-8 h-8 border-none rounded-lg bg-transparent text-text-muted cursor-pointer transition-colors duration-250 hover:text-text hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Math CAPTCHA */}
                    {!blockedUntil && captchaText && (
                        <div className="flex flex-col gap-1.5 animate-fade-in">
                            {/* <label htmlFor="captcha" className="text-[0.8rem] font-medium text-text-muted uppercase tracking-[0.06em]">
                                Matematik hisoblash
                            </label> */}
                            <div className="flex gap-2">
                                <div className="flex items-center justify-center min-w-25 shrink-0 bg-surface-hover border border-border rounded-md text-text font-bold font-mono text-[1.2rem] shadow-sm select-none">
                                    {captchaText} =
                                </div>
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={fetchCaptcha}
                                        className="flex items-center justify-center w-11 h-11 border border-border rounded-md bg-canvas/40 text-text-muted cursor-pointer transition-colors duration-250 hover:text-text hover:bg-surface-hover hover:border-text-muted/30"
                                        title="Yangi captcha yuklash"
                                    >
                                        <RefreshCcw size={18} />
                                    </button>
                                </div>
                                <div className="relative flex items-center group flex-1">
                                    <input
                                        id="captcha"
                                        type="number"
                                        placeholder="Javobni kiriting"
                                        value={captchaValue}
                                        onChange={(e) => setCaptchaValue(e.target.value)}
                                        className="w-full py-3 px-3.5 bg-canvas/40 border border-border rounded-md text-text text-[0.95rem] font-inherit outline-none transition-all duration-250 hover:border-text-muted/30 hover:bg-canvas/60 focus:border-primary-light focus:ring-[3px] focus:ring-primary/20 focus:bg-canvas/80 placeholder:text-text-muted/50 appearance-none m-0"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={
                            isLoading ||
                            !!blockedUntil ||
                            !hemisId.trim() ||
                            !password.trim() ||
                            (!blockedUntil && !!captchaText && !captchaValue.trim())
                        }
                        className="flex items-center justify-center gap-2 w-full py-3.25 mt-1 font-inherit text-[0.95rem] font-semibold text-white bg-linear-to-br from-primary to-primary-light border-none rounded-md cursor-pointer transition-all duration-250 shadow-[0_4px_16px_rgba(79,70,229,0.35)] hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_8px_24px_rgba(79,70,229,0.45)] active:not-disabled:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="inline-block w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                        ) : blockedUntil ? (
                            'Vaqtinchalik cheklangan'
                        ) : (
                            'Tizimga kirish'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

