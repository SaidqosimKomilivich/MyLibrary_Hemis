import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Lock, Save, Mail, Phone, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { logout, role, user } = useAuth();

    const needsEmail = !user?.email;
    const needsPhone = !user?.phone;

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('+998 ');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            toast.error("Barcha maydonlarni to'ldiring");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Yangi parollar mos kelmadi");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Parol kamida 8 ta belgidan iborat bo'lishi kerak");
            return;
        }

        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasDigit = /[0-9]/.test(newPassword);
        const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

        if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            toast.error("Parolda kamida bitta katta harf, bitta kichik harf, bitta raqam va bitta maxsus belgi bo'lishi kerak");
            return;
        }

        if (needsEmail && !email.trim()) {
            toast.error("Iltimos, email manzilini kiriting");
            return;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (needsPhone && phoneDigits.length !== 12) {
            toast.error("Iltimos, to'liq telefon raqamini kiriting (+998 XX XXX XX XX)");
            return;
        }

        setIsLoading(true);

        try {
            const res = await api.changePassword(
                oldPassword,
                newPassword,
                needsEmail ? email.trim() : undefined,
                needsPhone ? phone.trim() : undefined
            );
            if (res.success) {
                toast.success("Parol muvaffaqiyatli o'zgartirildi!");

                if (role) {
                    // Parolni yangilagach qaysi rolga tegishli bo'lsa o'sha dashbordga yuboramiz.
                    // To'liq sahifa yangilanadi, bu AuthContextdagi 'is_password_update' holatini to'g'irlaydi
                    window.location.href = `/${role}`;
                } else {
                    await logout();
                    navigate('/');
                }
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Parolni o'zgartirishda xatolik yuz berdi");
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid =
        oldPassword.trim().length > 0 &&
        newPassword.trim().length >= 8 &&
        /[A-Z]/.test(newPassword) &&
        /[a-z]/.test(newPassword) &&
        /[0-9]/.test(newPassword) &&
        /[^A-Za-z0-9]/.test(newPassword) &&
        confirmPassword.length > 0 &&
        confirmPassword.trim() === newPassword.trim() &&
        (!needsEmail || email.trim().length > 0) &&
        (!needsPhone || phone.replace(/\D/g, '').length === 12);

    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const allCriteriaMet = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial;

    return (
        <div className="min-h-screen flex items-center justify-center p-5 bg-background relative overflow-hidden isolate">
            {/* Reuse login background styles */}
            <div className="absolute top-1/2 left-1/2 w-full max-w-200 aspect-square bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 -z-10 mix-blend-screen pointer-events-none animate-float-center" />
            <div className="absolute top-[-10%] right-[-5%] w-100 aspect-square bg-accent/20 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none animate-float" style={{ animationDelay: '-4s' }} />
            <div className="absolute bottom-[-10%] left-[-5%] w-125 aspect-square bg-indigo-500/20 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none animate-float" style={{ animationDelay: '-8s' }} />

            <div className="w-full max-w-110 bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-card animate-card-enter">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-linear-to-br from-primary to-primary-light text-white mb-6 shadow-[0_8px_24px_rgba(79,70,229,0.4)] relative">
                        <GraduationCap size={32} strokeWidth={1.8} />
                        <div className="absolute inset-0 rounded-2xl border border-white/20" />
                    </div>
                    <h1 className="text-[1.8rem] font-extrabold text-text mb-2 tracking-tight">Parolni yangilash</h1>
                    <p className="text-[0.95rem] text-text-muted m-0">
                        Xavfsizlik uchun parolingizni yangilashingiz shart
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Old Password */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[0.85rem] font-semibold text-text-muted ml-1 uppercase tracking-wider">Joriy Parol</label>
                        <div className="relative flex items-center group">
                            <Lock size={18} className="absolute left-4 text-text-muted pointer-events-none transition-colors group-focus-within:text-primary-light" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Joriy parolni kiriting"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full bg-surface-hover border border-border text-text px-4 py-3.5 pl-11 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-canvas/50 placeholder:text-text-muted/50"
                            />
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[0.85rem] font-semibold text-text-muted ml-1 uppercase tracking-wider">Yangi Parol</label>
                        <div className="relative flex items-center group">
                            <Lock size={18} className="absolute left-4 text-text-muted pointer-events-none transition-colors group-focus-within:text-primary-light" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Yangi parolni kiriting"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-surface-hover border border-border text-text px-4 py-3.5 pl-11 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-canvas/50 placeholder:text-text-muted/50"
                            />
                        </div>
                        {!allCriteriaMet && (
                            <div className="mt-2 flex flex-col gap-1.5 p-3 rounded-lg bg-surface-hover/50 border border-border">
                                <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-1">Parol talablari:</span>
                                <div className={`flex items-center gap-2 text-[0.8rem] font-semibold transition-colors ${hasMinLen ? 'text-emerald-500' : 'text-red-400'}`}>
                                    {hasMinLen ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />} Kamida 8 ta belgi
                                </div>
                                <div className={`flex items-center gap-2 text-[0.8rem] font-semibold transition-colors ${hasUpper ? 'text-emerald-500' : 'text-red-400'}`}>
                                    {hasUpper ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />} Katta harf
                                </div>
                                <div className={`flex items-center gap-2 text-[0.8rem] font-semibold transition-colors ${hasLower ? 'text-emerald-500' : 'text-red-400'}`}>
                                    {hasLower ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />} Kichik harf
                                </div>
                                <div className={`flex items-center gap-2 text-[0.8rem] font-semibold transition-colors ${hasDigit ? 'text-emerald-500' : 'text-red-400'}`}>
                                    {hasDigit ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />} Raqam
                                </div>
                                <div className={`flex items-center gap-2 text-[0.8rem] font-semibold transition-colors ${hasSpecial ? 'text-emerald-500' : 'text-red-400'}`}>
                                    {hasSpecial ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />} Qo'shimcha belgi
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[0.85rem] font-semibold text-text-muted ml-1 uppercase tracking-wider">Yangi Parolni Tasdiqlash</label>
                        <div className="relative flex items-center group">
                            <Lock size={18} className="absolute left-4 text-text-muted pointer-events-none transition-colors group-focus-within:text-primary-light" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Yangi parolni qayta kiriting"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-surface-hover border border-border text-text px-4 py-3.5 pl-11 pr-12 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-canvas/50 placeholder:text-text-muted/50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 p-1.5 bg-transparent border-none text-text-muted cursor-pointer transition-colors hover:text-text rounded-lg hover:bg-surface-hover flex items-center justify-center outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                            <span className="text-red-400 text-[0.85rem] font-semibold ml-1 mt-1">Moslik topilmadi</span>
                        )}
                    </div>

                    {/* Email Input (Conditional) */}
                    {needsEmail && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.85rem] font-semibold text-text-muted ml-1 uppercase tracking-wider">Email Manzili</label>
                            <div className="relative flex items-center group">
                                <Mail size={18} className="absolute left-4 text-text-muted pointer-events-none transition-colors group-focus-within:text-primary-light" />
                                <input
                                    type="email"
                                    placeholder="namunaviy@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-surface-hover border border-border text-text px-4 py-3.5 pl-11 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-canvas/50 placeholder:text-text-muted/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Phone Input (Conditional) */}
                    {needsPhone && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[0.85rem] font-semibold text-text-muted ml-1 uppercase tracking-wider">Telefon Raqam</label>
                            <div className="relative flex items-center group">
                                <Phone size={18} className="absolute left-4 text-text-muted pointer-events-none transition-colors group-focus-within:text-primary-light" />
                                <input
                                    type="tel"
                                    placeholder="+998 90 123 45 67"
                                    value={phone}
                                    onChange={(e) => {
                                        const prefix = '+998 '
                                        let raw = e.target.value
                                        if (!raw.startsWith(prefix)) {
                                            raw = prefix
                                        }
                                        const digits = raw.slice(prefix.length).replace(/\D/g, '').slice(0, 9)
                                        let formatted = prefix
                                        if (digits.length > 0) formatted += digits.slice(0, 2)
                                        if (digits.length > 2) formatted += ' ' + digits.slice(2, 5)
                                        if (digits.length > 5) formatted += ' ' + digits.slice(5, 7)
                                        if (digits.length > 7) formatted += ' ' + digits.slice(7, 9)
                                        setPhone(formatted)
                                    }}
                                    onFocus={(e) => {
                                        if (!e.target.value.startsWith('+998 ')) setPhone('+998 ')
                                    }}
                                    className="w-full bg-surface-hover border border-border text-text px-4 py-3.5 pl-11 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-canvas/50 placeholder:text-text-muted/50"
                                />
                            </div>
                        </div>
                    )}


                    <button
                        type="submit"
                        disabled={isLoading || !isFormValid}
                        className="w-full mt-2 py-3.5 px-4 bg-linear-to-r from-primary to-primary-light text-white font-semibold text-[1rem] rounded-xl border-none cursor-pointer transition-all shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,229,0.4)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={18} />
                                Saqlash
                            </>
                        )}
                    </button>

                    <div className="text-center mt-4 pt-4 border-t border-border" style={{ marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={async () => { await logout(); navigate('/'); }}
                            className="bg-transparent border-none text-[0.9rem] font-medium text-text-muted cursor-pointer transition-colors hover:text-text hover:underline decoration-text/30 underline-offset-4 outline-none"
                        >
                            Chiqish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
