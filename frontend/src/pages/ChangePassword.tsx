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
        <div className="login-page">
            {/* Reuse login background styles */}
            <div className="login-bg-decor login-bg-decor--1" />
            <div className="login-bg-decor login-bg-decor--2" />
            <div className="login-bg-decor login-bg-decor--3" />

            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <GraduationCap size={32} strokeWidth={1.8} />
                    </div>
                    <h1 className="login-title">Parolni Yangilash</h1>
                    <p className="login-subtitle">
                        Xavfsizlik uchun parolingizni yangilashingiz shart
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {/* Old Password */}
                    <div className="login-field">
                        <label className="login-label">Joriy Parol</label>
                        <div className="login-input-wrapper">
                            <Lock size={18} className="login-input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Joriy parolni kiriting"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="login-input login-input--password"
                            />
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="login-field">
                        <label className="login-label">Yangi Parol</label>
                        <div className="login-input-wrapper">
                            <Lock size={18} className="login-input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Yangi parolni kiriting"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="login-input login-input--password"
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="login-field">
                        <label className="login-label">Yangi Parolni Tasdiqlash</label>
                        <div className="login-input-wrapper">
                            <Lock size={18} className="login-input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Yangi parolni qayta kiriting"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="login-input login-input--password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="login-eye-btn"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="login-submit"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {isLoading ? (
                            <span className="login-spinner" />
                        ) : (
                            <>
                                <Save size={18} />
                                Saqlash
                            </>
                        )}
                    </button>

                    <div className="login-footer" style={{ marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={async () => { await logout(); navigate('/login'); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Chiqish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
