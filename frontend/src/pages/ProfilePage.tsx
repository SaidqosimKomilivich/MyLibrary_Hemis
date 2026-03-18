import { useState, useRef } from 'react'
import { User, Mail, Phone, Building2, GraduationCap, BookOpen, Calendar, Shield, Lock, Eye, EyeOff, Check, X, Loader2, Download, IdCard, RotateCw, MapPin } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { toPng } from 'html-to-image'
import { QRCodeSVG } from 'qrcode.react'
import { getProxyImageUrl } from '../utils/fileUrl'

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
    const [downloading, setDownloading] = useState(false)
    const [cardFlipped, setCardFlipped] = useState(false)
    const frontRef = useRef<HTMLDivElement>(null)
    const backRef = useRef<HTMLDivElement>(null)

    if (!user) return null

    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const allCriteriaMet = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial;

    const displayRole = roleLabels[role || user.role] || user.role

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error("Yangi parollar mos kelmaydi")
            return
        }
        // XAVFSIZLIK: minimal 8 belgi, kamida 1 raqam va 1 harf
        if (newPassword.length < 8) {
            toast.error("Parol kamida 8 belgidan iborat bo'lishi kerak")
            return
        }

        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasDigit = /[0-9]/.test(newPassword);
        const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

        if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            toast.error("Parolda kamida bitta katta harf, bitta kichik harf, bitta raqam va bitta maxsus belgi bo'lishi kerak");
            return;
        }
        setLoading(true)
        try {
            await api.changePassword(oldPassword, newPassword)
            toast.success("Parol muvaffaqiyatli o'zgartirildi")
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
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
        if (!frontRef.current || !backRef.current || downloading) return
        setDownloading(true)

        // Capture options
        const opts = { cacheBust: true, pixelRatio: 1, backgroundColor: '#ffffff', skipFonts: true }

        try {
            // ── Front side ──
            const frontDataUrl = await toPng(frontRef.current, opts)

            // ── Back side: temporarily make it visible (undo 3D flip) ──
            const backEl = backRef.current
            const prevTransform = backEl.style.transform
            const prevBackface = backEl.style.backfaceVisibility
            backEl.style.transform = 'rotateY(0deg)'
            backEl.style.backfaceVisibility = 'visible'

            const backDataUrl = await toPng(backEl, opts)

            // Restore back side transform
            backEl.style.transform = prevTransform
            backEl.style.backfaceVisibility = prevBackface

            // ── Stitch front + back vertically on a canvas ──
            const [frontImg, backImg] = await Promise.all([
                new Promise<HTMLImageElement>((resolve) => {
                    const img = new Image(); img.onload = () => resolve(img); img.src = frontDataUrl
                }),
                new Promise<HTMLImageElement>((resolve) => {
                    const img = new Image(); img.onload = () => resolve(img); img.src = backDataUrl
                }),
            ])

            const gap = 20 // px between front and back
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(frontImg.width, backImg.width)
            canvas.height = frontImg.height + gap + backImg.height
            const ctx = canvas.getContext('2d')!
            ctx.fillStyle = '#f0f0f0'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(frontImg, 0, 0)
            ctx.drawImage(backImg, 0, frontImg.height + gap)

            const combinedDataUrl = canvas.toDataURL('image/png')

            // ── Increment download counter once ──
            api.incrementIdCardDownload().catch(() => { })

            // ── Save / share ──
            const fileName = `${user.full_name || 'id-card'}_id_karta`
            if (navigator.canShare && navigator.canShare({ files: [] })) {
                try {
                    const blob = await (await fetch(combinedDataUrl)).blob()
                    const file = new File([blob], `${fileName}.png`, { type: 'image/png' })
                    await navigator.share({ files: [file], title: fileName })
                    URL.revokeObjectURL(combinedDataUrl)
                } catch {
                    downloadImage(combinedDataUrl, fileName)
                }
            } else {
                downloadImage(combinedDataUrl, fileName)
            }

        } catch (e) {
            console.error(e)
            toast.error("Yuklab olishda xatolik")
        } finally {
            setDownloading(false)
        }
    }

    const downloadImage = (dataUrl: string, fileName: string) => {
        const link = document.createElement('a')
        link.download = `${fileName}.png`
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => { URL.revokeObjectURL(dataUrl) }, 100)
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
        <div className="p-5 md:p-8 max-w-350 mx-auto min-h-[calc(100vh-80px)]">
            {/* <div className="mb-8">
                <h1 className="text-[1.8rem] font-bold text-text mb-1 tracking-tight">Profil</h1>
                <p className="text-[0.95rem] text-text-muted m-0">Shaxsiy ma'lumotlar va sozlamalar</p>
            </div> */}

            {/* Profile Header Card */}
            <div className="bg-surface rounded-2xl mb-8 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-border shadow-soft relative overflow-hidden isolate">
                <div className="relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-surface shadow-md shrink-0 bg-background flex items-center justify-center">
                    {user.image_url ? (
                        <img src={getProxyImageUrl(user.image_url)} crossOrigin="anonymous" alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <span className="text-[2.5rem] font-bold text-primary">
                            {(user.full_name || user.user_id || '?').charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-surface" />
                </div>
                <div className="relative z-10 flex-1 text-center md:text-left flex flex-col justify-center min-h-24">
                    <h2 className="text-[1.5rem] font-bold text-text m-0 mb-2">{user.full_name || user.user_id}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[0.8rem] font-bold tracking-wide uppercase border border-primary/20">
                            {displayRole}
                        </span>
                        {user.department_name && (
                            <p className="m-0 text-[0.9rem] text-text-muted font-medium bg-surface-hover border border-border px-3 py-1 rounded-full">
                                {user.department_name}
                            </p>
                        )}
                    </div>
                </div>
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Tabs */}
            <div className="flex w-full gap-2 p-1 bg-surface-hover rounded-xl mb-6 overflow-x-auto no-scrollbar border border-border">
                <button
                    className={`flex-1 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[0.95rem] font-medium transition-all whitespace-nowrap cursor-pointer border-none outline-none ${activeTab === 'info' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-text-muted hover:text-text hover:bg-white/5'}`}
                    onClick={() => setActiveTab('info')}
                >
                    <User size={16} />
                    <span>Ma'lumotlar</span>
                </button>
                <button
                    className={`flex-1 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[0.95rem] font-medium transition-all whitespace-nowrap cursor-pointer border-none outline-none ${activeTab === 'password' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-text-muted hover:text-text hover:bg-white/5'}`}
                    onClick={() => setActiveTab('password')}
                >
                    <Lock size={16} />
                    <span>Parol</span>
                </button>
                <button
                    className={`flex-1 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[0.95rem] font-medium transition-all whitespace-nowrap cursor-pointer border-none outline-none ${activeTab === 'card' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-text-muted hover:text-text hover:bg-white/5'}`}
                    onClick={() => setActiveTab('card')}
                >
                    <IdCard size={16} />
                    <span>ID Karta</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {/* ===== INFO TAB ===== */}
                {activeTab === 'info' && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                        {infoItems.map((item, i) => (
                            <div key={i} className="bg-surface p-5 rounded-xl border border-border flex items-start gap-4 transition-transform hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 group">
                                <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all shrink-0">
                                    {item.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[0.8rem] text-text-muted font-medium mb-1 uppercase tracking-wider">{item.label}</div>
                                    <div className="text-[1rem] font-semibold text-text truncate" title={item.value || undefined}>{item.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ===== PASSWORD TAB ===== */}
                {activeTab === 'password' && (
                    <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border max-w-2xl mx-auto w-full shadow-soft">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h3 className="text-[1.3rem] font-bold text-text m-0 mb-1">Parolni o'zgartirish</h3>
                                <p className="text-[0.9rem] text-text-muted m-0">Xavfsizlik uchun parolingizni muntazam yangilab turing</p>
                            </div>
                        </div>
                        <form className="flex flex-col gap-5" onSubmit={handlePasswordChange}>
                            {/* Old password */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.9rem] font-medium text-text-muted ml-1">Joriy parol</label>
                                <div className="relative flex items-center">
                                    <input
                                        type={showOld ? 'text' : 'password'}
                                        className="w-full bg-surface-hover border border-border text-text py-3 px-4 rounded-xl text-[1rem] outline-none transition-all pr-12 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                                        placeholder="Joriy parolni kiriting"
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-lg transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center"
                                        onClick={() => setShowOld(!showOld)}
                                    >
                                        {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {/* New password */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.9rem] font-medium text-text-muted ml-1">Yangi parol</label>
                                <div className="relative flex items-center">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        className="w-full bg-surface-hover border border-border text-text py-3 px-4 rounded-xl text-[1rem] outline-none transition-all pr-12 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                                        placeholder="Yangi parolni kiriting"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-lg transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center"
                                        onClick={() => setShowNew(!showNew)}
                                    >
                                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {!allCriteriaMet && (
                                    <div className="mt-1 flex flex-col gap-1.5 p-3 rounded-lg bg-surface-hover/50 border border-border">
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
                            {/* Confirm password */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[0.9rem] font-medium text-text-muted ml-1">Parolni tasdiqlash</label>
                                <div className="relative flex items-center">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className="w-full bg-surface-hover border text-text py-3 px-4 rounded-xl text-[1rem] outline-none transition-all pr-12 focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] border-border"
                                        style={{ borderColor: confirmPassword && newPassword !== confirmPassword ? '#ef4444' : undefined, boxShadow: confirmPassword && newPassword !== confirmPassword ? '0 0 0 3px rgba(239,68,68,0.15)' : undefined }}
                                        placeholder="Yangi parolni qayta kiriting"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-lg transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                    >
                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-red-500 text-[0.85rem] m-0 font-medium ml-1">Parollar mos kelmaydi!</p>
                            )}
                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-xl text-[1rem] font-semibold border-none cursor-pointer flex justify-center items-center gap-2 transition-all shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 mt-2 disabled:bg-primary/50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                                disabled={loading || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> O'zgartirilmoqda...</>
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
                        <div className='w-105 h-70 cursor-pointer' style={{ perspective: '1000px' }} onClick={() => setCardFlipped(!cardFlipped)}>
                            <div className='relative w-full h-full transition-transform duration-700' style={{ transformStyle: 'preserve-3d', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

                                {/* frontRef shu yerga */}
                                <div ref={frontRef} className='absolute inset-0 bg-white/40 rounded-2xl flex items-center justify-center' style={{ backfaceVisibility: 'hidden' }}>
                                    <svg width="420" height="280" viewBox="0 0 420 280" className='rounded-2xl'>
                                        <defs>
                                            {/* <!-- Ko‘k gradient --> */}
                                            <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#1e2a78" />
                                                <stop offset="100%" stopColor="#1f6aa5" />
                                            </linearGradient>

                                            {/* <!-- Oltin gradient --> */}
                                            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#caa23a" />
                                                <stop offset="50%" stopColor="#f6e27a" />
                                                <stop offset="100%" stopColor="#b8860b" />
                                            </linearGradient>

                                            {/* <!-- Och oltin (gap uchun) --> */}
                                            <linearGradient id="lightGold" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#f8e9a1" />
                                                <stop offset="100%" stopColor="#e6c65c" />
                                            </linearGradient>

                                            {/* <!-- Shadow --> */}
                                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feDropShadow dx="0" dy="10" stdDeviation="15" floodOpacity="0.2" />
                                            </filter>

                                            {/* <!-- Rounded clip --> */}
                                            <clipPath id="cardClip">
                                                <rect width="420" height="280" />
                                            </clipPath>
                                        </defs>

                                        {/* <!-- Karta --> */}
                                        <rect width="420" height="280" fill="#f4f4f6" filter="url(#shadow)" />

                                        <g clipPath="url(#cardClip)">

                                            {/* <!-- Ko‘k qism --> */}
                                            <path d="M 0 0 L 420 0 L 420 90 C 330 80, 260 75, 200 90 C 140 105, 80 115, 0 100 Z " fill="url(#blueGrad)" />

                                            {/* <!-- 1px och oltin separator --> */}
                                            <path d="M 0 100 C 100 115, 180 105, 240 90 C 300 75, 360 80, 420 90 L 420 91 C 360 81, 300 86, 240 101 C 180 116, 100 126, 0 111 Z " fill="url(#lightGold)" />

                                            {/* <!-- Oltin wave (5px ingichkaroq) --> */}
                                            <path d="M 0 106 C 100 121, 180 111, 240 96 C 300 81, 360 86, 420 96 L 420 101 C 360 91, 300 96, 240 111 C 180 126, 100 136, 0 121 Z" fill="url(#goldGrad)" />
                                        </g>
                                    </svg>
                                    <img src="/icon_arm.png" alt="" className='absolute w-20 h-20 left-3 top-3 bg-white p-1 rounded-full' />

                                    {/* <img src="/logo.png" alt="" className='absolute top-3 left-3 w-20 h-20' /> */}
                                    <p className='absolute top-3 left-28 uppercase font-medium'>MIRZO ULUG‘BEK NOMIDAGI O‘ZBEKISTON MILLIY UNIVERSITETI JIZZAX FILIALI</p>
                                    <div className='absolute top-27 left-6 bg-white border border-black w-25 h-35 rounded-2xl overflow-hidden flex items-center justify-center'>
                                        {user.image_url ? (
                                            <img src={getProxyImageUrl(user.image_url)} crossOrigin="anonymous" alt={user.full_name} className='w-full h-full object-cover' />
                                        ) : (
                                            <div className='w-full h-full flex flex-col items-center justify-center bg-gray-100'>
                                                <User size={40} className="text-gray-400 mb-2" />
                                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e2a78' }}>
                                                    {(user.full_name || user.user_id || '?').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className='absolute top-30 left-33 text-black flex flex-col gap-1' style={{ maxWidth: '140px' }}>
                                        <p className='text-sm font-bold capitalize leading-tight'>{user.full_name || user.user_id}</p>
                                        <p className='text-xs font-semibold' style={{ color: '#1e2a78' }}>{displayRole}</p>

                                        {(role || user.role) === 'student' && user.group_name && (
                                            <p className='text-[10px] leading-tight' style={{ color: '#444' }}><span className="font-semibold">Guruh:</span> {user.group_name}</p>
                                        )}
                                        {(role || user.role) === 'student' && user.department_name && (
                                            <p className='text-[10px] leading-tight' style={{ color: '#666' }}>{user.department_name}</p>
                                        )}

                                        {((role || user.role) === 'teacher' || (role || user.role) === 'staff' || (role || user.role) === 'employee' || (role || user.role) === 'admin') && user.department_name && (
                                            <p className='text-[10px] leading-tight' style={{ color: '#444' }}>{user.department_name}</p>
                                        )}
                                        {((role || user.role) === 'teacher' || (role || user.role) === 'staff' || (role || user.role) === 'employee' || (role || user.role) === 'admin') && user.staff_position && (
                                            <p className='text-[10px] leading-tight' style={{ color: '#666' }}>{user.staff_position}</p>
                                        )}
                                    </div>
                                    <div className='absolute top-30 right-3 bg-white border-2 rounded-xl w-30 h-30 flex justify-center items-center overflow-hidden'>
                                        {/* XAVFSIZLIK: QR kodda ichki UUID ishlatilmaydi — faqat HEMIS user_id */}
                                        <QRCodeSVG value={user.id} size={105} level='H' />
                                    </div>

                                </div>

                                {/* backRef shu yerga */}
                                <div ref={backRef} className='absolute inset-0 bg-white/40 rounded-2xl flex items-center justify-center' style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <svg width="420" height="280" viewBox="0 0 420 280" className='rounded-2xl'>
                                        <defs>
                                            <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#1e2a78" />
                                                <stop offset="100%" stopColor="#1f6aa5" />
                                            </linearGradient>

                                            <linearGradient id="darkBlue" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#1b2a60" />
                                                <stop offset="100%" stopColor="#174f7a" />
                                            </linearGradient>

                                            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#caa23a" />
                                                <stop offset="50%" stopColor="#f6e27a" />
                                                <stop offset="100%" stopColor="#b8860b" />
                                            </linearGradient>

                                            <linearGradient id="grad1">
                                                <stop offset="0%" stopColor="blue" />
                                                <stop offset="100%" stopColor="cyan" />
                                            </linearGradient>

                                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.25" />
                                            </filter>

                                            <clipPath id="cardClip">
                                                <rect width="420" height="280" />
                                            </clipPath>

                                        </defs>

                                        {/* <!-- Asosiy karta --> */}
                                        <rect width="420" height="280" fill="#f5f5f5" filter="url(#shadow)" />

                                        <line x1="0" y1="220" x2="420" y2="221" stroke="url(#grad1)" strokeWidth="1" />

                                        <g clipPath="url(#cardClip)">

                                            {/* <!-- Yuqori ko‘k strip --> */}
                                            <rect x="0" y="25" width="420" height="45" fill="url(#blueGrad)" />

                                            {/* <!-- Pastki o‘ng ko‘k katta egri (7px past + 7px o‘ng) --> */}
                                            <path d="M 220 280 C 300 240, 370 220, 427 157 L 427 280 Z" fill="url(#blueGrad)" />

                                            {/* <!-- To‘q ko‘k layer --> */}
                                            <path d="M 240 280 C 310 250, 375 225, 427 172 L 427 205 C 370 250, 305 270, 240 280 Z" fill="url(#darkBlue)" />

                                            {/* <!-- Oltin wave --> */}
                                            <path d="  M 235 280 C 315 245, 380 215, 427 157 L 427 172 C 375 225, 315 255, 255 280 Z" fill="url(#goldGrad)" />
                                        </g>

                                    </svg>
                                    <img src="/icon_arm.png" alt="" className='absolute w-16 h-16 right-7 top-3.5 bg-white p-1 rounded-full' />
                                    <p className='absolute text-white top-8 left-9 text-xl uppercase '>Axborot Resurs Markazi</p>
                                    <p className='absolute top-62 left-5 flex gap-2 items-center text-blue-500 text-sm'> <Mail size={16} />arm@jbnuu.uz</p>
                                    <p className='absolute top-56 left-5 flex gap-2 items-center text-blue-500 text-sm'> <Phone size={16} />+998 (72) 226-12-34 </p>
                                    <p className='absolute top-40 left-5 flex gap-2 items-center text-blue-400 text-sm'> <MapPin size={17} />Jizzax viloyati, Jizzax shahri</p>
                                    <p className='absolute top-46 left-5 flex gap-5 items-center text-blue-400 text-sm'>Sh.Rashidov shox ko'chasi, 259 uy</p>
                                </div>
                            </div>
                        </div>

                        <div className='grid grid-cols-2 pt-5 gap-5'>
                            <button className='flex justify-center items-center gap-3 p-2.5 bg-gray-400 hover:bg-gray-300 hover:text-black rounded-2xl transition-transform duration-150 active:scale-85' onClick={() => setCardFlipped(!cardFlipped)}>
                                <RotateCw size={18} />
                                {cardFlipped ? "Old tomon" : "Orqa tomon"}
                            </button>

                            <button className='flex justify-center items-center gap-3 p-2.5 bg-green-400 hover:bg-green-300 hover:text-black transition-transform duration-150 active:scale-75 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed' onClick={handleDownloadCard} disabled={downloading}>
                                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                {downloading ? 'Yuklanmoqda...' : 'Yuklab olish'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
