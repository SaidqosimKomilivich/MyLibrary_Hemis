import { useState, useRef } from 'react'
import { User, Mail, Phone, Building2, GraduationCap, BookOpen, Calendar, Shield, Lock, Eye, EyeOff, Check, X, Loader2, Download, IdCard, RotateCw, MapPin, Printer } from 'lucide-react'
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
    const [printing, setPrinting] = useState(false)
    const [cardFlipped, setCardFlipped] = useState(false)
    const [imgLoadError, setImgLoadError] = useState(false)
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
            toast.error("Parol kamida 1 ta katta harf, 1 ta kichik harf, 1 ta raqam va 1 ta maxsus belgidan iborat bo'lishi kerak")
            return
        }
        setLoading(true)
        try {
            const res = await api.changePassword(oldPassword, newPassword)
            if (res.success) {
                toast.success("Parol muvaffaqiyatli o'zgartirildi!")
                setOldPassword('')
                setNewPassword('')
                setConfirmPassword('')
            } else {
                toast.error(res.message || "Parolni o'zgartirishda xatolik")
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Eski parol noto'g'ri yoki serverda xatolik")
        } finally {
            setLoading(false)
        }
    }


    const handleDownloadCard = async (side: 'front' | 'back') => {
        if (!frontRef.current || !backRef.current || downloading) return
        setDownloading(true)

        // Capture options - 10.5cm x 7cm kartani 300 DPI sifatda (1260 x 840 px) eksport qilish
        const opts = { cacheBust: true, pixelRatio: 3, backgroundColor: '#ffffff', skipFonts: false }

        try {
            let dataUrl = ''
            let fileNameSuffix = ''

            if (side === 'front') {
                const frontEl = frontRef.current
                const prevBackface = frontEl.style.backfaceVisibility
                frontEl.style.backfaceVisibility = 'visible'
                dataUrl = await toPng(frontEl, opts)
                frontEl.style.backfaceVisibility = prevBackface
                fileNameSuffix = '_old'
            } else {
                // ── Back side: temporarily make it visible (undo 3D flip) ──
                const backEl = backRef.current
                const prevTransform = backEl.style.transform
                const prevBackface = backEl.style.backfaceVisibility
                backEl.style.transform = 'rotateY(0deg)'
                backEl.style.backfaceVisibility = 'visible'

                dataUrl = await toPng(backEl, opts)
                fileNameSuffix = '_orqa'

                // Restore back side transform
                backEl.style.transform = prevTransform
                backEl.style.backfaceVisibility = prevBackface
            }

            // ── Increment download counter ──
            api.incrementIdCardDownload().catch(() => { })

            // ── Save / share ──
            const fileName = `${user.full_name || 'id-card'}_id_karta${fileNameSuffix}`
            if (navigator.canShare && navigator.canShare({ files: [] })) {
                try {
                    const blob = await (await fetch(dataUrl)).blob()
                    const file = new File([blob], `${fileName}.png`, { type: 'image/png' })
                    await navigator.share({ files: [file], title: fileName })
                } catch {
                    downloadImage(dataUrl, fileName)
                }
            } else {
                downloadImage(dataUrl, fileName)
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

    const handlePrintCard = async () => {
        if (!frontRef.current || !backRef.current || printing) return
        setPrinting(true)
        try {
            const opts = { cacheBust: true, pixelRatio: 3, backgroundColor: '#ffffff', skipFonts: false }
            const frontEl = frontRef.current
            const prevFrontBackface = frontEl.style.backfaceVisibility
            frontEl.style.backfaceVisibility = 'visible'
            const frontDataUrl = await toPng(frontEl, opts)
            frontEl.style.backfaceVisibility = prevFrontBackface

            const backEl = backRef.current
            const prevTransform = backEl.style.transform
            const prevBackface = backEl.style.backfaceVisibility
            backEl.style.transform = 'rotateY(0deg)'
            backEl.style.backfaceVisibility = 'visible'

            const backDataUrl = await toPng(backEl, opts)

            backEl.style.transform = prevTransform
            backEl.style.backfaceVisibility = prevBackface

            const printWin = window.open('', '_blank', 'width=900,height=700')
            if (!printWin) {
                toast.warning("Chop etish oynasi ochilmadi. Brauzer sozlamalaridan pop-up ga ruxsat bering.")
                return
            }

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>ID Karta (10.5sm x 7sm) - ${user.full_name || 'ID Karta'}</title>
                    <style>
                        @page {
                            size: 10.5cm 7cm;
                            margin: 0;
                        }
                        @media print {
                            html, body {
                                margin: 0;
                                padding: 0;
                                width: 10.5cm;
                                height: 7cm;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .page-break {
                                page-break-after: always;
                                break-after: page;
                            }
                        }
                        body {
                            margin: 0;
                            padding: 20px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 20px;
                            font-family: 'Inter', sans-serif;
                            background: #f1f5f9;
                        }
                        .header-actions {
                            display: flex;
                            gap: 16px;
                            align-items: center;
                        }
                        .print-btn {
                            padding: 10px 24px;
                            background: #1e2a78;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 15px;
                            font-weight: 600;
                            cursor: pointer;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        }
                        .size-label {
                            font-size: 14px;
                            color: #334155;
                            font-weight: 600;
                        }
                        .card-container {
                            width: 10.5cm;
                            height: 7cm;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
                            background: white;
                        }
                        .card-container img {
                            width: 100%;
                            height: 100%;
                            display: block;
                            object-fit: fill;
                        }
                        @media print {
                            body { background: transparent; padding: 0; gap: 0; }
                            .header-actions { display: none !important; }
                            .card-container { box-shadow: none; border-radius: 0; width: 10.5cm; height: 7cm; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header-actions">
                        <span class="size-label">O'lchami: 10.5 sm × 7.0 sm</span>
                        <button class="print-btn" onclick="window.print()">🖨️ Chop etish (Print)</button>
                    </div>
                    <div class="card-container page-break">
                        <img src="${frontDataUrl}" alt="Old tomoni" />
                    </div>
                    <div class="card-container">
                        <img src="${backDataUrl}" alt="Orqa tomoni" />
                    </div>
                </body>
                </html>
            `)
            printWin.document.close()
        } catch (e) {
            console.error(e)
            toast.error("Chop etishda xatolik yuz berdi")
        } finally {
            setPrinting(false)
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
        <div className="p-5 md:p-8 max-w-350 mx-auto min-h-[calc(100vh-80px)]">
            {/* <div className="mb-8">
                <h1 className="text-[1.8rem] font-bold text-text mb-1 tracking-tight">Profil</h1>
                <p className="text-[0.95rem] text-text-muted m-0">Shaxsiy ma'lumotlar va sozlamalar</p>
            </div> */}

            {/* Profile Header Card */}
            <div className="bg-surface rounded-2xl mb-8 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-border shadow-soft relative overflow-hidden isolate">
                <div className="relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-surface shadow-md shrink-0 bg-background flex items-center justify-center">
                    {user.image_url && !imgLoadError ? (
                        <img
                            src={getProxyImageUrl(user.image_url)}
                            crossOrigin="anonymous"
                            alt={user.full_name}
                            onError={() => setImgLoadError(true)}
                            className="w-full h-full rounded-full object-cover"
                        />
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
                {role !== 'student' && (
                    <button
                        className={`flex-1 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[0.95rem] font-medium transition-all whitespace-nowrap cursor-pointer border-none outline-none ${activeTab === 'password' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-text-muted hover:text-text hover:bg-white/5'}`}
                        onClick={() => setActiveTab('password')}
                    >
                        <Lock size={16} />
                        <span>Parol</span>
                    </button>
                )}
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
                        {/* 10.5 sm x 7 sm o'lcham indikatori */}
                        <div className="flex items-center justify-between mb-3 px-1 text-xs">
                            <span className="font-semibold text-text">ID Karta formati:</span>
                            <span className="bg-primary/10 text-primary-light font-bold px-2.5 py-0.5 rounded-md border border-primary/20">
                                10,5 sm × 7,0 sm
                            </span>
                        </div>

                        <div className='w-105 h-70 cursor-pointer' style={{ perspective: '1000px', width: '420px', height: '280px' }} onClick={() => setCardFlipped(!cardFlipped)}>
                            <div className='relative w-full h-full transition-transform duration-700' style={{ transformStyle: 'preserve-3d', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

                                {/* frontRef shu yerga */}
                                <div ref={frontRef} style={{ width: '420px', height: '280px', position: 'relative', overflow: 'hidden', borderRadius: '16px', backgroundColor: '#ffffff', backfaceVisibility: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
                                    <svg width="420" height="280" viewBox="0 0 420 280" style={{ position: 'absolute', top: 0, left: 0, width: '420px', height: '280px', pointerEvents: 'none' }}>
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
                                                <rect width="420" height="280" rx="16" />
                                            </clipPath>
                                        </defs>

                                        {/* <!-- Karta foni --> */}
                                        <rect width="420" height="280" fill="#ffffff" rx="16" />

                                        <g clipPath="url(#cardClip)">
                                            {/* <!-- Ko‘k qism --> */}
                                            <path d="M 0 0 L 420 0 L 420 90 C 330 80, 260 75, 200 90 C 140 105, 80 115, 0 100 Z" fill="url(#blueGrad)" />

                                            {/* <!-- 1px och oltin separator --> */}
                                            <path d="M 0 100 C 100 115, 180 105, 240 90 C 300 75, 360 80, 420 90 L 420 91 C 360 81, 300 86, 240 101 C 180 116, 100 126, 0 111 Z" fill="url(#lightGold)" />

                                            {/* <!-- Oltin wave (5px) --> */}
                                            <path d="M 0 106 C 100 121, 180 111, 240 96 C 300 81, 360 86, 420 96 L 420 101 C 360 91, 300 96, 240 111 C 180 126, 100 136, 0 121 Z" fill="url(#goldGrad)" />
                                        </g>
                                    </svg>

                                    {/* Universitet logotipi (Oltin hoshiyali doira) */}
                                    <img
                                        src="/icon_arm.png"
                                        alt="ARM Logotipi"
                                        style={{ position: 'absolute', top: '10px', left: '16px', width: '74px', height: '74px', borderRadius: '50%', backgroundColor: '#ffffff', padding: '2px', border: '2px solid #caa23a', boxShadow: '0 2px 6px rgba(0,0,0,0.18)', zIndex: 10 }}
                                    />

                                    {/* Universitet nomi (Har doim oq, aniq 3 qator) */}
                                    <div style={{ position: 'absolute', top: '13px', left: '104px', width: '302px', color: '#ffffff', textTransform: 'uppercase', fontWeight: 700, fontSize: '11px', lineHeight: '1.25', letterSpacing: '0.02em', zIndex: 10 }}>
                                        <div>MIRZO ULUG‘BEK NOMIDAGI</div>
                                        <div>O‘ZBEKISTON MILLIY UNIVERSITETI</div>
                                        <div style={{ color: '#f8fafc' }}>JIZZAX FILIALI</div>
                                    </div>

                                    {/* Foydalanuvchi fotosurati (Chap tomonda) */}
                                    <div style={{ position: 'absolute', top: '108px', left: '22px', width: '98px', height: '144px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1.5px solid #0f172a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', zIndex: 10 }}>
                                        {user.image_url && !imgLoadError ? (
                                            <img
                                                src={getProxyImageUrl(user.image_url)}
                                                crossOrigin="anonymous"
                                                alt={user.full_name}
                                                onError={() => setImgLoadError(true)}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                                                <User size={38} color="#94a3b8" style={{ marginBottom: '4px' }} />
                                                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e2a78' }}>
                                                    {(user.full_name || user.user_id || '?').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Foydalanuvchi ma'lumotlari (O'rtada) */}
                                    <div style={{ position: 'absolute', top: '116px', left: '132px', width: '148px', display: 'flex', flexDirection: 'column', gap: '3px', zIndex: 10 }}>
                                        <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a', lineHeight: '1.2', textTransform: 'capitalize', wordBreak: 'break-word' }}>
                                            {user.full_name || user.user_id}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#1e2a78', lineHeight: '1.2' }}>
                                            {displayRole}
                                        </p>

                                        {(role || user.role) === 'student' && user.group_name && (
                                            <p style={{ margin: 0, fontSize: '10px', lineHeight: '1.2', color: '#334155', fontWeight: 500 }}>
                                                <strong style={{ fontWeight: 700 }}>Guruh:</strong> {user.group_name}
                                            </p>
                                        )}
                                        {user.department_name && (
                                            <p style={{ margin: 0, fontSize: '9.5px', lineHeight: '1.2', color: '#64748b', maxHeight: '34px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                {user.department_name}
                                            </p>
                                        )}
                                        {user.staff_position && (
                                            <p style={{ margin: 0, fontSize: '9.5px', lineHeight: '1.2', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user.staff_position}
                                            </p>
                                        )}
                                    </div>

                                    {/* QR kod (O'ng tomonda) */}
                                    <div style={{ position: 'absolute', top: '114px', right: '18px', width: '112px', height: '112px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', zIndex: 10 }}>
                                        {/* QR kodda HEMIS user_id ishlatiladi, level='M' va includeMargin bilan yirik modullar */}
                                        <QRCodeSVG value={user.user_id || user.id} size={104} level='M' includeMargin={true} />
                                    </div>
                                </div>

                                {/* backRef shu yerga */}
                                <div ref={backRef} style={{ width: '420px', height: '280px', position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '16px', backgroundColor: '#ffffff', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
                                    <svg width="420" height="280" viewBox="0 0 420 280" style={{ position: 'absolute', top: 0, left: 0, width: '420px', height: '280px', pointerEvents: 'none' }}>
                                        <defs>
                                            <linearGradient id="blueGradBack" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#1e2a78" />
                                                <stop offset="100%" stopColor="#1f6aa5" />
                                            </linearGradient>

                                            <linearGradient id="darkBlueBack" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#1b2a60" />
                                                <stop offset="100%" stopColor="#174f7a" />
                                            </linearGradient>

                                            <linearGradient id="goldGradBack" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#caa23a" />
                                                <stop offset="50%" stopColor="#f6e27a" />
                                                <stop offset="100%" stopColor="#b8860b" />
                                            </linearGradient>

                                            <linearGradient id="grad1">
                                                <stop offset="0%" stopColor="blue" />
                                                <stop offset="100%" stopColor="cyan" />
                                            </linearGradient>

                                            <clipPath id="cardClipBack">
                                                <rect width="420" height="280" rx="16" />
                                            </clipPath>
                                        </defs>

                                        {/* <!-- Asosiy karta --> */}
                                        <rect width="420" height="280" fill="#f8fafc" rx="16" />

                                        <line x1="0" y1="220" x2="420" y2="221" stroke="url(#grad1)" strokeWidth="1" />

                                        <g clipPath="url(#cardClipBack)">
                                            {/* <!-- Yuqori ko‘k strip --> */}
                                            <rect x="0" y="25" width="420" height="45" fill="url(#blueGradBack)" />

                                            {/* <!-- Pastki o‘ng ko‘k egri --> */}
                                            <path d="M 220 280 C 300 240, 370 220, 427 157 L 427 280 Z" fill="url(#blueGradBack)" />

                                            {/* <!-- To‘q ko‘k layer --> */}
                                            <path d="M 240 280 C 310 250, 375 225, 427 172 L 427 205 C 370 250, 305 270, 240 280 Z" fill="url(#darkBlueBack)" />

                                            {/* <!-- Oltin wave --> */}
                                            <path d="M 235 280 C 315 245, 380 215, 427 157 L 427 172 C 375 225, 315 255, 255 280 Z" fill="url(#goldGradBack)" />
                                        </g>
                                    </svg>

                                    <img src="/icon_arm.png" alt="ARM" style={{ position: 'absolute', top: '16px', right: '24px', width: '62px', height: '62px', borderRadius: '50%', backgroundColor: '#ffffff', padding: '2px', border: '2px solid #caa23a', zIndex: 10 }} />
                                    <p style={{ position: 'absolute', top: '35px', left: '28px', color: '#ffffff', fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em', zIndex: 10 }}>Axborot Resurs Markazi</p>

                                    <div style={{ position: 'absolute', top: '100px', left: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
                                        <p style={{ margin: 0, display: 'flex', gap: '8px', alignItems: 'center', color: '#0369a1', fontSize: '13px', fontWeight: 600 }}>
                                            <MapPin size={16} /> Jizzax viloyati, Jizzax shahri
                                        </p>
                                        <p style={{ margin: 0, paddingLeft: '24px', color: '#0284c7', fontSize: '12px', fontWeight: 500 }}>
                                            Sh.Rashidov shox ko'chasi, 259 uy
                                        </p>
                                    </div>

                                    <div style={{ position: 'absolute', top: '168px', left: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
                                        <p style={{ margin: 0, display: 'flex', gap: '8px', alignItems: 'center', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>
                                            <Phone size={16} /> +998 (72) 226-12-34
                                        </p>
                                        <p style={{ margin: 0, display: 'flex', gap: '8px', alignItems: 'center', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>
                                            <Mail size={16} /> arm@jbnuu.uz
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex flex-col gap-4 pt-5 w-full'>
                            <button className='flex justify-center items-center gap-3 p-3 bg-surface-hover hover:bg-white/10 text-text-muted hover:text-text rounded-xl border border-border transition-all active:scale-95 font-medium cursor-pointer' onClick={() => setCardFlipped(!cardFlipped)}>
                                <RotateCw size={18} />
                                {cardFlipped ? "Old tomonni ko'rish" : "Orqa tomonni ko'rish"}
                            </button>

                            <div className='grid grid-cols-2 gap-3'>
                                <button className='flex justify-center items-center gap-2 p-3 bg-primary hover:bg-primary-hover text-white transition-all active:scale-95 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-md cursor-pointer' onClick={() => handleDownloadCard('front')} disabled={downloading}>
                                    {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                    Old tomon
                                </button>
                                <button className='flex justify-center items-center gap-2 p-3 bg-primary hover:bg-primary-hover text-white transition-all active:scale-95 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-md cursor-pointer' onClick={() => handleDownloadCard('back')} disabled={downloading}>
                                    {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                    Orqa tomon
                                </button>
                            </div>

                            <button className='flex justify-center items-center gap-2.5 p-3 bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-md cursor-pointer' onClick={handlePrintCard} disabled={printing}>
                                {printing ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                                10,5 sm × 7 sm o'lchamda chop etish
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
