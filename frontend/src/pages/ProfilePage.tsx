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
import { toPng } from 'html-to-image'

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
    const frontRef = useRef<HTMLDivElement>(null)
    const backRef = useRef<HTMLDivElement>(null)

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
    const targetRef = cardFlipped ? backRef : frontRef
    if (!targetRef.current) return

    const currentSideName = cardFlipped
        ? `${user.full_name || 'id-card'}_orqa`
        : `${user.full_name || 'id-card'}_old`

    let isTransformed = false

    try {
        if (cardFlipped && backRef.current) {
            backRef.current.style.transform = 'rotateY(0deg)'
            backRef.current.style.backfaceVisibility = 'visible'
            isTransformed = true
        }

        await new Promise(r => setTimeout(r, 50))

        const dataUrl = await toPng(targetRef.current, {
            cacheBust: true,
            pixelRatio: 1,
            backgroundColor: '#ffffff',
        })

        if (cardFlipped && backRef.current) {
            backRef.current.style.transform = 'rotateY(180deg)'
            backRef.current.style.backfaceVisibility = 'hidden'
        }

        // ✅ FIX: navigator.canShare() bilan tekshiring
        if (navigator.canShare && navigator.canShare({ files: [] })) {
            try {
                const blob = await (await fetch(dataUrl)).blob()
                const file = new File([blob], `${currentSideName}.png`, { type: 'image/png' })
                
                await navigator.share({ 
                    files: [file], 
                    title: currentSideName 
                })
                
                URL.revokeObjectURL(dataUrl)
            } catch (shareError) {
                console.log('Share cancel yoki error:', shareError)
                downloadImage(dataUrl, currentSideName)
            }
        } else {
            // Browser share qo'llab qolmasa
            downloadImage(dataUrl, currentSideName)
        }

    } catch (e) {
        console.error(e)
        toast.error("Yuklab olishda xatolik")
    } finally {
        if (isTransformed && backRef.current) {
            backRef.current.style.transform = 'rotateY(180deg)'
            backRef.current.style.backfaceVisibility = 'hidden'
        }
    }
}

const downloadImage = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.download = `${fileName}.png`
    link.href = dataUrl
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setTimeout(() => {
        URL.revokeObjectURL(dataUrl)
    }, 100)
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
                    <div className='grid justify-center'>
                        <div className='w-105 h-70 cursor-pointer' style={{perspective: '1000px'}} onClick={() => setCardFlipped(!cardFlipped)}>
                            <div className='relative w-full h-full transition-transform duration-700' style={{transformStyle: 'preserve-3d', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}}>
                                
                                {/* frontRef shu yerga */}
                                <div ref={frontRef} className='absolute inset-0 bg-white/40 rounded-2xl p-2 flex items-center justify-center' style={{backfaceVisibility: 'hidden'}}>
                                    <svg width="420" height="280" viewBox="0 0 420 280" className='rounded-2xl'>
                                        <defs>
                                            {/* <!-- Ko‘k gradient --> */}
                                            <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stop-color="#1e2a78"/>
                                                <stop offset="100%" stop-color="#1f6aa5"/>
                                            </linearGradient>

                                            {/* <!-- Oltin gradient --> */}
                                            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stop-color="#caa23a"/>
                                                <stop offset="50%" stop-color="#f6e27a"/>
                                                <stop offset="100%" stop-color="#b8860b"/>
                                            </linearGradient>

                                            {/* <!-- Och oltin (gap uchun) --> */}
                                            <linearGradient id="lightGold" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stop-color="#f8e9a1"/>
                                                <stop offset="100%" stop-color="#e6c65c"/>
                                            </linearGradient>

                                            {/* <!-- Shadow --> */}
                                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feDropShadow dx="0" dy="10" stdDeviation="15" flood-opacity="0.2"/>
                                            </filter>

                                            {/* <!-- Rounded clip --> */}
                                            <clipPath id="cardClip">
                                                <rect width="420" height="280" />
                                            </clipPath>
                                        </defs>

                                        {/* <!-- Karta --> */}
                                        <rect width="420" height="280" fill="#f4f4f6" filter="url(#shadow)"/>

                                        <g clip-path="url(#cardClip)">
                                            
                                            {/* <!-- Ko‘k qism --> */}
                                            <path d="M 0 0 L 420 0 L 420 90 C 330 80, 260 75, 200 90 C 140 105, 80 115, 0 100 Z " fill="url(#blueGrad)"/>

                                            {/* <!-- 1px och oltin separator --> */}
                                            <path d="M 0 100 C 100 115, 180 105, 240 90 C 300 75, 360 80, 420 90 L 420 91 C 360 81, 300 86, 240 101 C 180 116, 100 126, 0 111 Z " fill="url(#lightGold)" />

                                            {/* <!-- Oltin wave (5px ingichkaroq) --> */}
                                            <path d="M 0 106 C 100 121, 180 111, 240 96 C 300 81, 360 86, 420 96 L 420 101 C 360 91, 300 96, 240 111 C 180 126, 100 136, 0 121 Z" fill="url(#goldGrad)"/>
                                        </g>
                                    </svg>

                                </div>

                                {/* backRef shu yerga */}
                                <div ref={backRef} className='absolute inset-0 bg-white/40 rounded-2xl p-2 flex items-center justify-center' style={{backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}>
                                    <svg width="420" height="280" viewBox="0 0 420 280" className='rounded-2xl'>
                                        <defs>
                                            <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stop-color="#1e2a78"/>
                                                <stop offset="100%" stop-color="#1f6aa5"/>
                                            </linearGradient>

                                            <linearGradient id="darkBlue" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stop-color="#1b2a60"/>
                                                <stop offset="100%" stop-color="#174f7a"/>
                                            </linearGradient>

                                            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stop-color="#caa23a"/>
                                                <stop offset="50%" stop-color="#f6e27a"/>
                                                <stop offset="100%" stop-color="#b8860b"/>
                                            </linearGradient>

                                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.25"/>
                                            </filter>

                                            <clipPath id="cardClip">
                                                <rect width="420" height="280" />
                                            </clipPath>
                                        </defs>

                                        {/* <!-- Asosiy karta --> */}
                                        <rect width="420" height="280" fill="#f5f5f5" filter="url(#shadow)"/>

                                        <g clip-path="url(#cardClip)">

                                            {/* <!-- Yuqori ko‘k strip --> */}
                                            <rect x="0" y="25" width="420" height="45" fill="url(#blueGrad)" />

                                            {/* <!-- Pastki o‘ng ko‘k katta egri (7px past + 7px o‘ng) --> */}
                                            <path d="M 220 280 C 300 240, 370 220, 427 157 L 427 280 Z" fill="url(#blueGrad)"/>

                                            {/* <!-- To‘q ko‘k layer --> */}
                                            <path d="M 240 280 C 310 250, 375 225, 427 172 L 427 205 C 370 250, 305 270, 240 280 Z" fill="url(#darkBlue)" />

                                            {/* <!-- Oltin wave --> */}
                                            <path d="  M 235 280 C 315 245, 380 215, 427 157 L 427 172 C 375 225, 315 255, 255 280 Z" fill="url(#goldGrad)" />

                                        </g>

                                        </svg>

                                </div>
                            </div>
                        </div>

                        <div className='grid grid-cols-2 pt-5 gap-5'>
                            <button className='flex justify-center items-center gap-3 p-2.5 bg-gray-400 hover:bg-gray-300 hover:text-black rounded-2xl transition-transform duration-150 active:scale-85' onClick={() => setCardFlipped(!cardFlipped)}>
                                <RotateCw size={18} />
                                {cardFlipped ? "Old tomon" : "Orqa tomon"}
                            </button>

                            <button className='flex justify-center items-center gap-3 p-2.5 bg-green-400 hover:bg-green-300 hover:text-black transition-transform duration-150 active:scale-75 rounded-2xl' onClick={handleDownloadCard}>
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
