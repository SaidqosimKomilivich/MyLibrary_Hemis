import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Lock, Save } from 'lucide-react';
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
    const { logout } = useAuth();

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

        if (newPassword.length < 6) {
            toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
            return;
        }

        setIsLoading(true);

        try {
            const res = await api.changePassword(oldPassword, newPassword);
            if (res.success) {
                toast.success("Parol muvaffaqiyatli o'zgartirildi! Iltimos, qaytadan kiring.");
                // Logout to force re-login with new token and updated user state
                await logout();
                navigate('/login');
            }
        } catch (err: any) {
            toast.error(err.message || "Parolni o'zgartirishda xatolik yuz berdi");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-5 bg-background relative overflow-hidden isolate">
            {/* Reuse login background styles */}
            <div className="absolute top-1/2 left-1/2 w-full max-w-[800px] aspect-square bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 -z-10 mix-blend-screen pointer-events-none animate-float-center" />
            <div className="absolute top-[-10%] right-[-5%] w-[400px] aspect-square bg-accent/20 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none animate-float" style={{ animationDelay: '-4s' }} />
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] aspect-square bg-indigo-500/20 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none animate-float" style={{ animationDelay: '-8s' }} />

            <div className="w-full max-w-[440px] bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-card animate-card-enter">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-linear-to-br from-primary to-primary-light text-white mb-6 shadow-[0_8px_24px_rgba(79,70,229,0.4)] relative">
                        <GraduationCap size={32} strokeWidth={1.8} />
                        <div className="absolute inset-0 rounded-2xl border border-white/20" />
                    </div>
                    <h1 className="text-[1.8rem] font-extrabold text-white mb-2 tracking-tight">Parolni Yangilash</h1>
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
                                className="w-full bg-black/20 border border-border text-white px-4 py-3.5 pl-11 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-black/30 placeholder:text-text-muted/50"
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
                                className="w-full bg-black/20 border border-border text-white px-4 py-3.5 pl-11 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-black/30 placeholder:text-text-muted/50"
                            />
                        </div>
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
                                className="w-full bg-black/20 border border-border text-white px-4 py-3.5 pl-11 pr-12 rounded-xl text-[1rem] outline-none transition-all focus:border-primary-light focus:bg-black/30 placeholder:text-text-muted/50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 p-1.5 bg-transparent border-none text-text-muted cursor-pointer transition-colors hover:text-white rounded-lg hover:bg-white/10 flex items-center justify-center outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
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

                    <div className="text-center mt-4 pt-4 border-t border-white/10" style={{ marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={async () => { await logout(); navigate('/login'); }}
                            className="bg-transparent border-none text-[0.9rem] font-medium text-text-muted cursor-pointer transition-colors hover:text-white hover:underline decoration-white/30 underline-offset-4 outline-none"
                        >
                            Chiqish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
