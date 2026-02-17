import { useState, useRef } from 'react'
import {
    User,
    Mail,
    Phone,
    Building2,
    GraduationCap,
    BookOpen,
    Calendar,
    Shield,
    Lock,
    Eye,
    EyeOff,
    Check,
    Loader2,
    Download,
    IdCard,
    RotateCw,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import html2canvas from 'html2canvas'

const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    staff: 'Xodim',
    employee: 'Xodim',
    teacher: "O'qituvchi",
    student: 'Talaba',
}

export default function ProfilePage() {
    const { user, role } = useAuth()
    const [activeTab, setActiveTab] = useState<'info' | 'password' | 'card'>('info')
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showOld, setShowOld] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [cardFlipped, setCardFlipped] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    if (!user) return null

    const displayRole = roleLabels[role || user.role] || user.role

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error("Yangi parollar mos kelmaydi")
            return
        }
        if (newPassword.length < 6) {
            toast.error("Parol kamida 6 belgidan iborat bo'lishi kerak")
            return
        }
        setLoading(true)
        try {
            await api.changePassword(oldPassword, newPassword)
            toast.success("Parol muvaffaqiyatli o'zgartirildi")
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err: any) {
            // If backend endpoint doesn't exist yet (404), show info
            if (err.status === 404) {
                toast.info("Parol o'zgartirish funksiyasi hali backend tomonida tayyor emas")
            } else {
                toast.error(err.message || "Parolni o'zgartirishda xatolik")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadCard = async () => {
        if (!cardRef.current) return
        // Make sure front side is visible for download
        const wasFlipped = cardFlipped
        if (wasFlipped) setCardFlipped(false)
        // Small delay for flip animation
        await new Promise(r => setTimeout(r, wasFlipped ? 400 : 0))
        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
            })
            const link = document.createElement('a')
            link.download = `${user.full_name || 'id-card'}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
        } catch {
            toast.error("Yuklab olishda xatolik")
        }
    }

    // Role-specific info items
    const commonItems = [
        { icon: <User size={18} />, label: 'F.I.Sh', value: user.full_name },
        { icon: <Shield size={18} />, label: 'ID', value: user.user_id },
        { icon: <Shield size={18} />, label: 'Lavozim', value: displayRole },
        { icon: <Mail size={18} />, label: 'Email', value: user.email },
        { icon: <Phone size={18} />, label: 'Telefon', value: user.phone },
        { icon: <Calendar size={18} />, label: "Tug'ilgan sana", value: user.birth_date },
    ]

    const roleSpecificItems = (() => {
        const r = role || user.role
        if (r === 'student') return [
            { icon: <Building2 size={18} />, label: 'Fakultet', value: user.department_name },
            { icon: <GraduationCap size={18} />, label: "Yo'nalish", value: user.specialty_name },
            { icon: <BookOpen size={18} />, label: 'Guruh', value: user.group_name },
            { icon: <GraduationCap size={18} />, label: "Ta'lim shakli", value: user.education_form },
        ]
        if (r === 'teacher') return [
            { icon: <Building2 size={18} />, label: 'Kafedra', value: user.department_name },
            { icon: <GraduationCap size={18} />, label: 'Mutaxassislik', value: user.specialty_name },
            { icon: <Building2 size={18} />, label: 'Lavozimi', value: user.staff_position },
        ]
        if (r === 'employee' || r === 'staff') return [
            { icon: <Building2 size={18} />, label: "Bo'lim", value: user.department_name },
            { icon: <Building2 size={18} />, label: 'Lavozimi', value: user.staff_position },
        ]
        // admin
        return [
            { icon: <Building2 size={18} />, label: "Bo'lim", value: user.department_name },
            { icon: <Building2 size={18} />, label: 'Lavozimi', value: user.staff_position },
        ]
    })()

    const infoItems = [...commonItems, ...roleSpecificItems].filter(item => item.value)

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Profil</h1>
                <p className="page-subtitle">Shaxsiy ma'lumotlar va sozlamalar</p>
            </div>

            {/* Profile Header Card */}
            <div className="profile-hero">
                <div className="profile-hero-avatar">
                    {user.image_url ? (
                        <img src={user.image_url} alt={user.full_name} className="profile-hero-img" />
                    ) : (
                        <span className="profile-hero-initial">
                            {(user.full_name || user.user_id || '?').charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="profile-hero-status" />
                </div>
                <div className="profile-hero-info">
                    <h2 className="profile-hero-name">{user.full_name || user.user_id}</h2>
                    <span className="profile-hero-role">{displayRole}</span>
                    {user.department_name && (
                        <p className="profile-hero-dept">{user.department_name}</p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
                <button
                    className={`profile-tab ${activeTab === 'info' ? 'profile-tab--active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    <User size={16} />
                    <span>Ma'lumotlar</span>
                </button>
                <button
                    className={`profile-tab ${activeTab === 'password' ? 'profile-tab--active' : ''}`}
                    onClick={() => setActiveTab('password')}
                >
                    <Lock size={16} />
                    <span>Parol</span>
                </button>
                <button
                    className={`profile-tab ${activeTab === 'card' ? 'profile-tab--active' : ''}`}
                    onClick={() => setActiveTab('card')}
                >
                    <IdCard size={16} />
                    <span>ID Karta</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="profile-tab-content">
                {/* ===== INFO TAB ===== */}
                {activeTab === 'info' && (
                    <div className="profile-info-grid">
                        {infoItems.map((item, i) => (
                            <div className="profile-info-item" key={i}>
                                <div className="profile-info-icon">{item.icon}</div>
                                <div>
                                    <div className="profile-info-label">{item.label}</div>
                                    <div className="profile-info-value">{item.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ===== PASSWORD TAB ===== */}
                {activeTab === 'password' && (
                    <div className="profile-password-card">
                        <div className="profile-password-header">
                            <Lock size={20} />
                            <div>
                                <h3>Parolni o'zgartirish</h3>
                                <p>Xavfsizlik uchun parolingizni muntazam yangilab turing</p>
                            </div>
                        </div>
                        <form className="profile-password-form" onSubmit={handlePasswordChange}>
                            {/* Old password */}
                            <div className="profile-field">
                                <label className="profile-field-label">Joriy parol</label>
                                <div className="profile-input-wrap">
                                    <input
                                        type={showOld ? 'text' : 'password'}
                                        className="profile-input"
                                        placeholder="Joriy parolni kiriting"
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="profile-eye-btn"
                                        onClick={() => setShowOld(!showOld)}
                                    >
                                        {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {/* New password */}
                            <div className="profile-field">
                                <label className="profile-field-label">Yangi parol</label>
                                <div className="profile-input-wrap">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        className="profile-input"
                                        placeholder="Yangi parolni kiriting"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="profile-eye-btn"
                                        onClick={() => setShowNew(!showNew)}
                                    >
                                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {/* Confirm password */}
                            <div className="profile-field">
                                <label className="profile-field-label">Parolni tasdiqlash</label>
                                <div className="profile-input-wrap">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className="profile-input"
                                        placeholder="Yangi parolni qayta kiriting"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="profile-eye-btn"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                    >
                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                <p className="profile-error">Parollar mos kelmaydi!</p>
                            )}
                            <button
                                type="submit"
                                className="profile-submit-btn"
                                disabled={loading || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="login-spinner" /> O'zgartirilmoqda...</>
                                ) : (
                                    <><Check size={18} /> Parolni o'zgartirish</>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* ===== ID CARD TAB ===== */}
                {activeTab === 'card' && (
                    <div className="profile-card-section">
                        <p className="profile-card-desc">
                            Kutubxona tizimida ro'yxatdan o'tganligingizni tasdiqlovchi ID karta
                        </p>

                        {/* Flip Card */}
                        <div className="id-card-flipper-container">
                            <div className={`id-card-flipper ${cardFlipped ? 'id-card-flipper--flipped' : ''}`} ref={cardRef}>
                                {/* ===== FRONT SIDE ===== */}
                                <div className="id-card id-card-front">
                                    {/* Header band */}
                                    <div className="id-card-header">
                                        <img src="/logo.png" alt="Logo" className="id-card-logo" />
                                        <div className="id-card-header-text">
                                            <div className="id-card-uni-name">MIRZO ULUG'BEK NOMIDAGI</div>
                                            <div className="id-card-uni-name">O'ZBEKISTON MILLIY UNIVERSITETI</div>
                                            <div className="id-card-branch">JIZZAX FILIALI</div>
                                        </div>
                                    </div>

                                    {/* Gold stripe */}
                                    <div className="id-card-gold-stripe" />

                                    {/* Body */}
                                    <div className="id-card-body">
                                        {/* Photo */}
                                        <div className="id-card-photo-wrap">
                                            {user.image_url ? (
                                                <img src={user.image_url} alt={user.full_name} className="id-card-photo" />
                                            ) : (
                                                <div className="id-card-photo-placeholder">
                                                    <User size={32} />
                                                </div>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div className="id-card-info">
                                            <div className="id-card-name">{user.full_name || user.user_id}</div>
                                            <div className="id-card-role-badge">{displayRole}</div>
                                            {user.department_name && (
                                                <div className="id-card-detail">
                                                    <span className="id-card-detail-label">
                                                        {(role === 'student') ? 'Fakultet:' : (role === 'teacher') ? 'Kafedra:' : "Bo'lim:"}
                                                    </span> {user.department_name}
                                                </div>
                                            )}
                                            {user.group_name && (
                                                <div className="id-card-detail">
                                                    <span className="id-card-detail-label">Guruh:</span> {user.group_name}
                                                </div>
                                            )}
                                            <div className="id-card-detail">
                                                <span className="id-card-detail-label">ID Raqam:</span> {user.user_id}
                                            </div>
                                            {user.staff_position && (
                                                <div className="id-card-detail">
                                                    <span className="id-card-detail-label">Lavozim:</span> {user.staff_position}
                                                </div>
                                            )}
                                            {user.specialty_name && (
                                                <div className="id-card-detail">
                                                    <span className="id-card-detail-label">
                                                        {role === 'student' ? "Yo'nalish:" : 'Mutaxassislik:'}
                                                    </span> {user.specialty_name}
                                                </div>
                                            )}
                                        </div>
                                        {/* QR / Badge */}
                                        <div className="id-card-qr-area">
                                            <div className="id-card-qr">
                                                <svg viewBox="0 0 80 80" width="80" height="80">
                                                    <rect x="0" y="0" width="80" height="80" fill="#fff" />
                                                    <rect x="4" y="4" width="20" height="20" fill="#1a237e" />
                                                    <rect x="56" y="4" width="20" height="20" fill="#1a237e" />
                                                    <rect x="4" y="56" width="20" height="20" fill="#1a237e" />
                                                    <rect x="8" y="8" width="12" height="12" fill="#fff" />
                                                    <rect x="60" y="8" width="12" height="12" fill="#fff" />
                                                    <rect x="8" y="60" width="12" height="12" fill="#fff" />
                                                    <rect x="11" y="11" width="6" height="6" fill="#1a237e" />
                                                    <rect x="63" y="11" width="6" height="6" fill="#1a237e" />
                                                    <rect x="11" y="63" width="6" height="6" fill="#1a237e" />
                                                    <rect x="28" y="4" width="4" height="4" fill="#1a237e" />
                                                    <rect x="36" y="4" width="4" height="4" fill="#1a237e" />
                                                    <rect x="44" y="4" width="4" height="4" fill="#1a237e" />
                                                    <rect x="28" y="12" width="4" height="4" fill="#1a237e" />
                                                    <rect x="40" y="12" width="4" height="4" fill="#1a237e" />
                                                    <rect x="48" y="12" width="4" height="4" fill="#1a237e" />
                                                    <rect x="28" y="20" width="4" height="4" fill="#1a237e" />
                                                    <rect x="36" y="20" width="4" height="4" fill="#1a237e" />
                                                    <rect x="44" y="20" width="4" height="4" fill="#1a237e" />
                                                    <rect x="4" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="12" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="20" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="28" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="36" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="44" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="56" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="68" y="28" width="4" height="4" fill="#1a237e" />
                                                    <rect x="4" y="36" width="4" height="4" fill="#1a237e" />
                                                    <rect x="16" y="36" width="4" height="4" fill="#1a237e" />
                                                    <rect x="32" y="36" width="4" height="4" fill="#1a237e" />
                                                    <rect x="40" y="36" width="4" height="4" fill="#1a237e" />
                                                    <rect x="60" y="36" width="4" height="4" fill="#1a237e" />
                                                    <rect x="72" y="36" width="4" height="4" fill="#1a237e" />
                                                    <rect x="4" y="44" width="4" height="4" fill="#1a237e" />
                                                    <rect x="12" y="44" width="4" height="4" fill="#1a237e" />
                                                    <rect x="24" y="44" width="4" height="4" fill="#1a237e" />
                                                    <rect x="36" y="44" width="4" height="4" fill="#1a237e" />
                                                    <rect x="48" y="44" width="4" height="4" fill="#1a237e" />
                                                    <rect x="56" y="44" width="4" height="4" fill="#1a237e" />
                                                    <rect x="68" y="44" width="4" height="4" fill="#1a237e" />
                                                    <rect x="28" y="56" width="4" height="4" fill="#1a237e" />
                                                    <rect x="36" y="56" width="4" height="4" fill="#1a237e" />
                                                    <rect x="48" y="56" width="4" height="4" fill="#1a237e" />
                                                    <rect x="56" y="56" width="4" height="4" fill="#1a237e" />
                                                    <rect x="64" y="56" width="4" height="4" fill="#1a237e" />
                                                    <rect x="28" y="64" width="4" height="4" fill="#1a237e" />
                                                    <rect x="40" y="64" width="4" height="4" fill="#1a237e" />
                                                    <rect x="52" y="64" width="4" height="4" fill="#1a237e" />
                                                    <rect x="60" y="64" width="4" height="4" fill="#1a237e" />
                                                    <rect x="72" y="64" width="4" height="4" fill="#1a237e" />
                                                    <rect x="28" y="72" width="4" height="4" fill="#1a237e" />
                                                    <rect x="36" y="72" width="4" height="4" fill="#1a237e" />
                                                    <rect x="44" y="72" width="4" height="4" fill="#1a237e" />
                                                    <rect x="56" y="72" width="4" height="4" fill="#1a237e" />
                                                    <rect x="68" y="72" width="4" height="4" fill="#1a237e" />
                                                </svg>
                                            </div>
                                            <div className="id-card-purpose">KUTUBXONA<br />TIZIMI UCHUN</div>
                                        </div>
                                    </div>

                                    {/* Footer wave */}
                                    <div className="id-card-footer">
                                        <svg viewBox="0 0 500 40" preserveAspectRatio="none" className="id-card-wave">
                                            <path d="M0,25 C80,0 150,40 250,20 C350,0 420,35 500,15 L500,40 L0,40 Z" fill="#1565C0" opacity="0.5" />
                                            <path d="M0,30 C100,10 200,40 300,25 C400,10 450,35 500,20 L500,40 L0,40 Z" fill="#1976D2" opacity="0.6" />
                                        </svg>
                                    </div>
                                </div>

                                {/* ===== BACK SIDE ===== */}
                                <div className="id-card id-card-back">
                                    {/* Back header */}
                                    <div className="id-card-back-header">
                                        <div className="id-card-back-title">KUTUBXONA QOIDALARI</div>
                                        <img src="/logo.png" alt="Logo" className="id-card-back-logo" />
                                    </div>

                                    {/* Gold stripe */}
                                    <div className="id-card-gold-stripe" />

                                    {/* Rules content */}
                                    <div className="id-card-back-body">
                                        <ol className="id-card-rules">
                                            <li>Kutubxona tizimi qoidalariga rioya qilish majburiy.</li>
                                            <li>Kitoblar belgilangan muddatda qaytarilishi shart.</li>
                                            <li>Kutubxona materiallarini ehtiyotkorlik bilan saqlang.</li>
                                            <li>Boshqa o'quvchilarga kitob berish man etiladi.</li>
                                            <li>Yo'qotilgan yoki shikastlangan kitoblar uchun javobgar bo'lasiz.</li>
                                            <li>Kutubxonada tartib va jimlikni saqlang.</li>
                                        </ol>

                                        <div className="id-card-back-contacts">
                                            <div className="id-card-back-contact-row">
                                                <span>📧</span> info@jf.nuu.uz
                                            </div>
                                            <div className="id-card-back-contact-row">
                                                <span>📞</span> +998 72 031 33 29 01
                                            </div>
                                            <div className="id-card-back-contact-row">
                                                <span>🌐</span> www.jf.nuu.uz
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer wave */}
                                    <div className="id-card-footer">
                                        <svg viewBox="0 0 500 40" preserveAspectRatio="none" className="id-card-wave">
                                            <path d="M0,25 C80,0 150,40 250,20 C350,0 420,35 500,15 L500,40 L0,40 Z" fill="#1565C0" opacity="0.5" />
                                            <path d="M0,30 C100,10 200,40 300,25 C400,10 450,35 500,20 L500,40 L0,40 Z" fill="#1976D2" opacity="0.6" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-card-actions">
                            <button className="profile-flip-btn" onClick={() => setCardFlipped(!cardFlipped)}>
                                <RotateCw size={18} />
                                {cardFlipped ? 'Old tomoni' : 'Orqa tomoni'}
                            </button>
                            <button className="profile-download-btn" onClick={handleDownloadCard}>
                                <Download size={18} />
                                Yuklab olish
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
