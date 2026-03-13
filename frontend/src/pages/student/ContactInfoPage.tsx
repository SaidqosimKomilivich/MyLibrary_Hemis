import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Mail, Phone, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import logo from '/icon_arm.png'

export default function ContactInfoPage() {
    const { user, isLoading, logout } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // --- Auth Guards ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 size={28} className="animate-spin text-primary" />
            </div>
        )
    }
    // Tizimga kirmagan foydalanuvchi => bosh sahifaga
    if (!user) {
        return <Navigate to="/" replace />
    }
    // Faqat student role uchun
    if (user.role !== 'student') {
        return <Navigate to="/" replace />
    }
    // Ma'lumotlar allaqachon to'liq => dashboardga
    if (user.email && user.phone) {
        return <Navigate to="/student" replace />
    }

    const isEmailMissing = !user.email
    const isPhoneMissing = !user.phone

    // Barcha kerakli maydonlar to'ldirilmasa Saqlash tugmasi o'chirilgan bo'ladi
    const isSaveDisabled =
        (isEmailMissing && !email.trim()) ||
        (isPhoneMissing && !phone.trim()) ||
        isSaving

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSaveDisabled) return

        setIsSaving(true)
        try {
            await api.updateContacts(
                isEmailMissing ? email.trim() : undefined,
                isPhoneMissing ? phone.trim() : undefined
            )
            toast.success("Ma'lumotlar muvaffaqiyatli saqlandi!")
            // Foydalanuvchi ma'lumotlarini yangilash uchun sahifani qayta yuklaymiz
            window.location.href = '/student'
        } catch (error: any) {
            toast.error(error.message || 'Xatolik yuz berdi')
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/')
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-light relative overflow-hidden">
            {/* Background accents */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] mix-blend-multiply opacity-70 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-120 h-120 bg-indigo-500/20 rounded-full blur-[120px] mix-blend-multiply opacity-70 pointer-events-none" />

            <div className="w-full max-w-[420px] px-6 relative z-10">
                <div className="bg-surface/80 backdrop-blur-xl rounded-4xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] border border-white/20 p-8 flex flex-col items-center">

                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 bg-white rounded-2xl p-2.5 shadow-sm border border-border/50 mb-5 relative group">
                            <div className="absolute inset-0 bg-primary/5 rounded-2xl transform group-hover:scale-105 transition-transform duration-300" />
                            <img src={logo} alt="Logo" className="w-full h-full object-contain relative z-10 drop-shadow-sm" />
                        </div>
                        <h1 className="text-2xl font-bold text-text text-center tracking-tight">Xush kelibsiz!</h1>
                        <p className="text-[0.95rem] text-text-muted text-center leading-relaxed mt-2.5 max-w-[290px]">
                            Tizimdan foydalanish uchun aloqa ma'lumotlaringizni to'ldiring.
                            Bu <strong>majburiy</strong> qadam.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSave} className="w-full space-y-4">

                        {isEmailMissing && (
                            <div className="space-y-1.5 focus-within:text-primary transition-colors">
                                <label htmlFor="contact-email" className="text-[0.8rem] font-semibold tracking-wide text-text-muted uppercase ml-1">
                                    Email manzil <span className="text-red-400">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                                        <Mail size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        placeholder="example@mail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-bg-light/50 border border-border text-text text-[0.95rem] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11! py-3 transition-all duration-200"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                        )}

                        {isPhoneMissing && (
                            <div className="space-y-1.5 focus-within:text-primary transition-colors">
                                <label htmlFor="contact-phone" className="text-[0.8rem] font-semibold tracking-wide text-text-muted uppercase ml-1">
                                    Telefon raqam <span className="text-red-400">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                                        <Phone size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        id="contact-phone"
                                        type="tel"
                                        placeholder="+998901234567"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-bg-light/50 border border-border text-text text-[0.95rem] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11! py-3 transition-all duration-200"
                                        autoComplete="tel"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="pt-3 pb-2">
                            <button
                                type="submit"
                                id="save-contact-info"
                                disabled={isSaveDisabled}
                                className="relative w-full overflow-hidden bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 group"
                            >
                                {isSaving ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        Saqlash va Davom etish
                                        <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 flex items-center justify-center w-full pt-6 border-t border-border/60">
                        <button
                            onClick={handleLogout}
                            className="text-[0.9rem] font-medium text-text-muted hover:text-red-500 transition-colors"
                        >
                            Bekor qilish va tizimdan chiqish
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}
