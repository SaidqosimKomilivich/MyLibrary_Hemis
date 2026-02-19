import { useState, useEffect, useMemo, useRef } from 'react'
import {
    ScanLine, UserCheck, UserX, BookPlus, RotateCcw, Clock,
    Search, X, Calendar, BookOpen, AlertTriangle, CheckCircle2,
    LogIn, LogOut, User, CreditCard,
    RefreshCw,
    Camera,
    Settings2,
    Scan,
    Loader2
} from 'lucide-react'
import { api, type Rental, type Book, type ControlRecord } from '../../services/api'
import { toast } from 'react-toastify'
// DeleteConfirmModal o'rniga custom return modal ishlatamiz

/* ────────────────────────────────────────────────
   Muddat ranglari hisoblash
   ko'k  = 3+ kun qolgan
   sariq = ≤3 kun qolgan
   qizil = muddati o'tgan
   ──────────────────────────────────────────────── */
function getDeadlineInfo(dueDateStr: string): { color: 'safe' | 'warning' | 'danger'; label: string; days: number } {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const due = new Date(dueDateStr)
    due.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diff < 0) return { color: 'danger', label: `${Math.abs(diff)} kun o'tgan`, days: diff }
    if (diff <= 3) return { color: 'warning', label: `${diff} kun qoldi`, days: diff }
    return { color: 'safe', label: `${diff} kun qoldi`, days: diff }
}

/* ────────────────────────────────────────────────
   Mock data — foydalanuvchini ID karta bilan qidirish
   (Backend'da hali endpoint yo'q, shuning uchun simulyatsiya)
   ──────────────────────────────────────────────── */
interface MockUser {
    id: string
    user_id: string
    full_name: string
    role: string
    image_url: string | null
    id_card: string
    department_name: string | null
    group_name: string | null
    phone: string | null
}

const MOCK_USERS: MockUser[] = [
    { id: '1', user_id: 'u001', full_name: 'Aliyev Sherzod Bahodirovich', role: 'student', image_url: null, id_card: '0cedde08-bb23-4cc0-ac56-2f4432b8dc7a', department_name: 'Axborot texnologiyalari', group_name: 'AT-21', phone: '+998901234567' },
    { id: '2', user_id: 'u002', full_name: 'Yusupova Madina Rustamovna', role: 'student', image_url: null, id_card: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', department_name: 'Iqtisodiyot', group_name: 'IQ-31', phone: '+998907654321' },
    { id: '3', user_id: 'u003', full_name: 'Qodirov Anvar Karimovich', role: 'teacher', image_url: null, id_card: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', department_name: 'Matematika', group_name: null, phone: '+998911112233' },
    { id: '4', user_id: 'u004', full_name: 'Juraeva Sevara Akmalovna', role: 'student', image_url: null, id_card: 'c3d4e5f6-a7b8-9012-cdef-123456789012', department_name: 'Filologiya', group_name: 'FL-22', phone: '+998933334455' },
    { id: '5', user_id: 'u005', full_name: 'Mirzaev Oybek Tulkinovich', role: 'student', image_url: null, id_card: 'd4e5f6a7-b8c9-0123-defa-234567890123', department_name: 'Axborot texnologiyalari', group_name: 'AT-11', phone: '+998944445566' },
]

const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    employee: 'Xodim',
    teacher: "O'qituvchi",
    student: 'Talaba',
}

export default function AccessControl() {
    // ──── Scanner state ────
    const [scanInput, setScanInput] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [scannedUser, setScannedUser] = useState<MockUser | null>(null)
    const [userIsInside, setUserIsInside] = useState(false)

    // ──── Rentals ────
    const [activeRentals, setActiveRentals] = useState<Rental[]>([])
    const [rentalsLoading, setRentalsLoading] = useState(false)

    // ──── Book assignment ────
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [bookSearch, setBookSearch] = useState('')
    const [searchResults, setSearchResults] = useState<Book[]>([])
    const [selectedBook, setSelectedBook] = useState<Book | null>(null)
    const [dueDate, setDueDate] = useState('')
    const [assignNotes, setAssignNotes] = useState('')
    const [assignLoading, setAssignLoading] = useState(false)

    // ──── Return ────
    const [returnModalOpen, setReturnModalOpen] = useState(false)
    const [returningRental, setReturningRental] = useState<Rental | null>(null)
    const [returnNotes, setReturnNotes] = useState('')
    const [returnLoading, setReturnLoading] = useState(false)

    // ──── Today's visitors ────
    const [todayRecords, setTodayRecords] = useState<ControlRecord[]>([])
    const [todayLoading, setTodayLoading] = useState(false)
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [permissionGranted, setPermissionGranted] = useState(false);
    // const [isScanning, setIsScanning] = useState(false);
    


    // Load today's visitors on mount
    useEffect(() => {
        loadTodayRecords()
    }, [])

    const loadTodayRecords = async () => {
        setTodayLoading(true)
        try {
            const res = await api.getControlToday()
            setTodayRecords(res.data)
        } catch {
            // Silently fail, data may not be available
        } finally {
            setTodayLoading(false)
        }
    }

    // ──── Scanner logic ────
    const handleScan = async () => {
        if (!scanInput.trim()) {
            toast.warning('ID karta raqamini kiriting')
            return
        }

        setIsScanning(true)
        setScannedUser(null)
        setActiveRentals([])

        // Simulate scan delay
        await new Promise(r => setTimeout(r, 1200))

        const cardValue = scanInput.trim().toLowerCase()
        const found = MOCK_USERS.find(u => u.id_card.toLowerCase() === cardValue)

        if (!found) {
            toast.error("Foydalanuvchi topilmadi. ID karta raqamini tekshiring.")
            setIsScanning(false)
            return
        }

        setScannedUser(found)
        setIsScanning(false)
        setUserIsInside(false) // Default — tashqarida deb hisoblaymiz

        // Load active rentals for this user
        loadUserRentals(found.user_id)
    }

    const loadUserRentals = async (userId: string) => {
        setRentalsLoading(true)
        try {
            const res = await api.getRentals('active', userId)
            setActiveRentals(res.data)
        } catch {
            toast.error("Ijaralarni yuklashda xatolik")
        } finally {
            setRentalsLoading(false)
        }
    }

    // ──── Arrive / Depart ────
    const handleArrive = async () => {
        setUserIsInside(true)
        toast.success(`${scannedUser?.full_name} — kirish qayd etildi ✅`)
        try {
            await api.controlArrive()
            loadTodayRecords()
        } catch {
            // API muvaffaqiyatsiz bo'lsa ham, UI holatini o'zgartirmaymiz
        }
    }

    const handleDepart = async () => {
        setUserIsInside(false)
        toast.success(`${scannedUser?.full_name} — chiqish qayd etildi ✅`)
        try {
            await api.controlDepart()
            loadTodayRecords()
        } catch {
            // API muvaffaqiyatsiz bo'lsa ham, UI holatini o'zgartirmaymiz
        }
    }

    // ──── Book assignment ────
    const handleSearchBooks = async () => {
        if (!bookSearch.trim()) return
        try {
            const res = await api.getBooks({ search: bookSearch })
            setSearchResults(res.data)
        } catch {
            toast.error("Kitoblarni qidirshda xatolik")
        }
    }

    const handleAssignBook = async () => {
        if (!scannedUser || !selectedBook || !dueDate) {
            toast.warning("Barcha maydonlarni to'ldiring")
            return
        }
        setAssignLoading(true)
        try {
            await api.createRental(scannedUser.user_id, selectedBook.id, dueDate || defaultDue, assignNotes || undefined)
            toast.success(`"${selectedBook.title}" kitobi ${scannedUser.full_name}ga berildi`)
            setAssignModalOpen(false)
            setSelectedBook(null)
            setBookSearch('')
            setSearchResults([])
            setDueDate('')
            setAssignNotes('')
            loadUserRentals(scannedUser.user_id)
        } catch {
            toast.error("Kitob berishda xatolik")
        } finally {
            setAssignLoading(false)
        }
    }

    // ──── Book return ────
    const handleReturnConfirm = async () => {
        if (!returningRental) return
        setReturnLoading(true)
        try {
            await api.returnRental(returningRental.id, returnNotes || undefined)
            toast.success(`"${returningRental.book_title}" qaytarildi ✅`)
            setReturnModalOpen(false)
            setReturningRental(null)
            setReturnNotes('')
            if (scannedUser) loadUserRentals(scannedUser.user_id)
        } catch {
            toast.error("Qaytarishda xatolik")
        } finally {
            setReturnLoading(false)
        }
    }

    // ──── Sana hisoblash ────
    const today = new Date().toISOString().split('T')[0]
    const defaultDue = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // ──── Sort rentals: overdue first, then by deadline ────
    const sortedRentals = useMemo(() => {
        return [...activeRentals].sort((a, b) => {
            const dA = new Date(a.due_date).getTime()
            const dB = new Date(b.due_date).getTime()
            return dA - dB
        })
    }, [activeRentals])


    // 1. Video elementini boshqarish uchun Ref
    const videoRef = useRef<HTMLVideoElement>(null);
    // Streamni saqlash (keyinchalik to'xtatish uchun)
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Kameralar ro'yxatini olish
    const getDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            setPermissionGranted(true);
            
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
            
            setDevices(videoDevices);

            if (videoDevices.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(videoDevices[0].deviceId);
            }
        } catch (error) {
            console.error("Kamera ruxsati berilmadi:", error);
        }
    };

    // 2. Tanlangan kamerani ishga tushirish funksiyasi
    const startCamera = async (deviceId: string) => {
        if (!deviceId) return;

        // Eski streamni to'xtatish (agar bo'lsa)
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId } // Aniq shu kamerani tanlash
                }
            });

            setStream(newStream);

            // Video elementiga streamni ulash
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (error) {
            console.error("Kamerani yoqishda xatolik:", error);
        }
    };

    // Dastlabki yuklanish
    useEffect(() => {
        getDevices();
        
        // Komponent yopilganda kamerani o'chirish (Cleanup)
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 3. Kamera o'zgarganda uni qayta yoqish
    useEffect(() => {
        if (selectedDeviceId) {
            startCamera(selectedDeviceId);
        }
    }, [selectedDeviceId]);

    // const handleScan = async () => {
    //     if (isScanning) return;
    //     setIsScanning(true);
    //     setTimeout(() => {
    //         setIsScanning(false);
    //         alert("Skanerlandi!");
    //     }, 3000); 
    // };

    return (
        <div className="ac-page">

            {/* ═══════════════════════════════════════
               HEADER
               ═══════════════════════════════════════ */}
            <div className="ac-header">
                <div>
                    <h1 className="ac-header__title">
                        <ScanLine size={28} />
                        Kirish-Chiqish Nazorati
                    </h1>
                    <p className="ac-header__subtitle">
                        ID karta skanerlash, foydalanuvchini tasdiqlash, kitob berish va qaytarish
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════
               SCANNER + USER CARD
               ═══════════════════════════════════════ */}
            <div className="ac-top-grid">
                {/* Scanner */}
                <div className="ac-scanner-card">
                    {/* <div className="ac-scanner-card__header">
                        <CreditCard size={20} />
                        <h2>ID Karta Skanerlash</h2>
                    </div>

                    <div className={`ac-scanner ${isScanning ? 'ac-scanner--active' : ''}`}>
                        <div className="ac-scanner__visual">
                            <div className="ac-scanner__icon">
                                <ScanLine size={64} strokeWidth={1} />
                            </div>
                            {isScanning && <div className="ac-scanner__line" />}
                        </div>
                        <p className="ac-scanner__hint">
                            {isScanning ? 'Skanerlash...' : 'ID karta raqamini kiriting'}
                        </p>
                    </div>

                    <div className="ac-scanner__input-row">
                        <input
                            type="text"
                            className="ac-scanner__input"
                            placeholder="ID karta UUID kiriting..."
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleScan()}
                        />
                        <button
                            className="ac-scanner__btn"
                            onClick={handleScan}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <div className="ac-spinner ac-spinner--sm" />
                            ) : (
                                <><Search size={18} /> Qidirish</>
                            )}
                        </button>
                    </div>

                    <div className="ac-scanner__demo-cards">
                        <span className="ac-scanner__demo-label">Demo:</span>
                        {MOCK_USERS.slice(0, 3).map(u => (
                            <button
                                key={u.id}
                                className="ac-scanner__demo-btn"
                                onClick={() => { setScanInput(u.id_card); }}
                            >
                                {u.id_card.substring(0, 8)}...
                            </button>
                        ))}
                    </div> */}

                    {/* Header */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Camera className="w-5 h-5 text-white" strokeWidth={2.5} />
                                <h2 className="text-lg font-bold text-white">ID Karta Skaneri</h2>
                            </div>
                            <button 
                                onClick={getDevices}
                                className="p-1.5 rounded-full hover:bg-gray-300 text-gray-400 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm">ID kartani kameraga tutib turing</p>
                    </div>

                    {/* Kamera tanlash (agar 1 tadan ko'p bo'lsa) */}
                    {devices.length > 1 && (
                        <div className="mb-4 bg-slate-800/70 p-3 rounded-lg border border-gray-100">
                            <label className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                                <Settings2 className="w-3.5 h-3.5" />
                                Kamerani tanlash
                            </label>
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                disabled={isScanning}
                                className="w-full bg-slate-800/70 border border-gray-300 text-sm rounded-md p-2.5 outline-none"
                            >
                                {devices.map((device, index) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Kamera ${index + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* --- KAMERA MAYDONI (VIDEO QO'SHILDI) --- */}
                    <div className="w-full aspect-4/3 bg-black rounded-lg border-2 border-gray-200 flex flex-col items-center justify-center mb-6 relative overflow-hidden">
                        
                        {permissionGranted ? (
                            // VIDEO TEGI: Asosiy o'zgarish shu yerda
                            <video 
                                ref={videoRef}
                                autoPlay 
                                playsInline 
                                muted
                                className="absolute inset-0 w-full h-full object-cover" // object-cover tasvirni to'liq qoplaydi
                            />
                        ) : (
                            // Ruxsat yo'q bo'lsa chiqadigan yozuv
                            <div className="flex flex-col items-center gap-3 text-gray-400 z-10">
                                <Camera className="w-12 h-12 text-gray-500" strokeWidth={2} />
                                <span className="text-sm font-medium">Kameraga ruxsat bering</span>
                            </div>
                        )}

                        {/* Animatsiya (Skaner chizig'i) */}
                        {isScanning && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
                                <div className="absolute left-0 right-0 h-0.5 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-[scan_2s_linear_infinite]"></div>
                            </div>
                        )}
                    </div>
                    {/* Tugma */}
                    <button
                        onClick={handleScan}
                        disabled={isScanning || !permissionGranted}
                        className={`w-full py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all 
                            ${isScanning || !permissionGranted 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-[#1A1A1A] hover:bg-black text-white active:scale-[0.98]'
                            }`}
                    >
                        {isScanning ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Skanerlanmoqda...</span>
                            </>
                        ) : (
                            <>
                                <Scan className="w-5 h-5" />
                                <span>Skanerlash</span>
                            </>
                        )}
                    </button>
                </div>
                <style>{`
                    @keyframes scan {
                        0% { top: 0%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                    }
                `}</style>

                {/* User Verification Card */}
                <div className="ac-user-card">
                    {!scannedUser ? (
                        <div className="ac-user-card__empty">
                            <User size={56} strokeWidth={1} />
                            <p>Foydalanuvchini topish uchun ID kartani skanerlang</p>
                        </div>
                    ) : (
                        <>
                            <div className="ac-user-card__header">
                                <UserCheck size={20} />
                                <h2>Foydalanuvchi topildi</h2>
                                <span className={`ac-user-card__status ${userIsInside ? 'ac-user-card__status--inside' : 'ac-user-card__status--outside'}`}>
                                    {userIsInside ? '🟢 Ichkarida' : '🔴 Tashqarida'}
                                </span>
                            </div>

                            <div className="ac-user-card__body">
                                <div className="ac-user-card__avatar">
                                    {scannedUser.image_url ? (
                                        <img src={scannedUser.image_url} alt={scannedUser.full_name} />
                                    ) : (
                                        <div className="ac-user-card__avatar-placeholder">
                                            <User size={40} />
                                        </div>
                                    )}
                                </div>

                                <div className="ac-user-card__info">
                                    <h3 className="ac-user-card__name">{scannedUser.full_name}</h3>
                                    <span className="ac-user-card__role-badge">
                                        {roleLabels[scannedUser.role] || scannedUser.role}
                                    </span>

                                    <div className="ac-user-card__details">
                                        <div className="ac-user-card__detail">
                                            <CreditCard size={14} />
                                            <span>ID: {scannedUser.id_card}</span>
                                        </div>
                                        {scannedUser.department_name && (
                                            <div className="ac-user-card__detail">
                                                <BookOpen size={14} />
                                                <span>{scannedUser.department_name}</span>
                                            </div>
                                        )}
                                        {scannedUser.group_name && (
                                            <div className="ac-user-card__detail">
                                                <User size={14} />
                                                <span>{scannedUser.group_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="ac-user-card__actions">
                                <button className="ac-btn ac-btn--arrive" onClick={handleArrive} disabled={userIsInside}>
                                    <LogIn size={18} /> Kirish
                                </button>
                                <button className="ac-btn ac-btn--depart" onClick={handleDepart} disabled={!userIsInside}>
                                    <LogOut size={18} /> Chiqish
                                </button>
                                <button className="ac-btn ac-btn--assign" onClick={() => setAssignModalOpen(true)}>
                                    <BookPlus size={18} /> Kitob berish
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════
               BORROWED BOOKS LIST
               ═══════════════════════════════════════ */}
            {scannedUser && (
                <div className="ac-section">
                    <div className="ac-section__header">
                        <h2>
                            <BookOpen size={20} />
                            Olingan kitoblar
                            {activeRentals.length > 0 && (
                                <span className="ac-section__count">{activeRentals.length}</span>
                            )}
                        </h2>
                    </div>

                    {rentalsLoading ? (
                        <div className="ac-loading">
                            <div className="ac-spinner" />
                        </div>
                    ) : sortedRentals.length === 0 ? (
                        <div className="ac-empty">
                            <CheckCircle2 size={48} strokeWidth={1} />
                            <p>Hech qanday aktiv ijara yo'q</p>
                        </div>
                    ) : (
                        <div className="ac-rentals-table-wrap">
                            <table className="ac-rentals-table">
                                <thead>
                                    <tr>
                                        <th>Kitob</th>
                                        <th>Muallif</th>
                                        <th>Olingan sana</th>
                                        <th>Muddat</th>
                                        <th>Holat</th>
                                        <th style={{ width: '120px' }}>Amal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRentals.map(rental => {
                                        const deadline = getDeadlineInfo(rental.due_date)
                                        return (
                                            <tr key={rental.id}>
                                                <td>
                                                    <div className="ac-rentals-table__book">
                                                        {rental.book_cover ? (
                                                            <img src={rental.book_cover} alt="" className="ac-rentals-table__cover" />
                                                        ) : (
                                                            <div className="ac-rentals-table__cover-placeholder">
                                                                <BookOpen size={16} />
                                                            </div>
                                                        )}
                                                        <span>{rental.book_title || 'Noma\'lum'}</span>
                                                    </div>
                                                </td>
                                                <td>{rental.book_author || '—'}</td>
                                                <td>{rental.loan_date}</td>
                                                <td>{rental.due_date}</td>
                                                <td>
                                                    <span className={`ac-deadline ac-deadline--${deadline.color}`}>
                                                        {deadline.color === 'danger' && <AlertTriangle size={14} />}
                                                        {deadline.color === 'warning' && <Clock size={14} />}
                                                        {deadline.color === 'safe' && <CheckCircle2 size={14} />}
                                                        {deadline.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="ac-btn ac-btn--return-sm"
                                                        onClick={() => { setReturningRental(rental); setReturnModalOpen(true) }}
                                                    >
                                                        <RotateCcw size={14} /> Qaytarish
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════
               TODAY'S VISITORS
               ═══════════════════════════════════════ */}
            <div className="ac-section">
                <div className="ac-section__header">
                    <h2>
                        <Clock size={20} />
                        Bugungi tashrif buyurganlar
                        {todayRecords.length > 0 && (
                            <span className="ac-section__count">{todayRecords.length}</span>
                        )}
                    </h2>
                    <button className="ac-btn ac-btn--outline-sm" onClick={loadTodayRecords} disabled={todayLoading}>
                        <RotateCcw size={14} /> Yangilash
                    </button>
                </div>

                {todayLoading ? (
                    <div className="ac-loading"><div className="ac-spinner" /></div>
                ) : todayRecords.length === 0 ? (
                    <div className="ac-empty">
                        <UserX size={48} strokeWidth={1} />
                        <p>Bugun hali hech kim kelmagan</p>
                    </div>
                ) : (
                    <div className="ac-rentals-table-wrap">
                        <table className="ac-rentals-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Foydalanuvchi ID</th>
                                    <th>Kelgan vaqt</th>
                                    <th>Ketgan vaqt</th>
                                    <th>Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayRecords.map((rec, i) => {
                                    const isStillInside = rec.arrival === rec.departure
                                    return (
                                        <tr key={rec.id}>
                                            <td>{i + 1}</td>
                                            <td>{rec.user_id}</td>
                                            <td>{rec.arrival || '—'}</td>
                                            <td>{isStillInside ? '—' : rec.departure}</td>
                                            <td>
                                                <span className={`ac-deadline ${isStillInside ? 'ac-deadline--safe' : 'ac-deadline--neutral'}`}>
                                                    {isStillInside ? '🟢 Ichkarida' : '⚪ Ketgan'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════
               BOOK ASSIGNMENT MODAL
               ═══════════════════════════════════════ */}
            {assignModalOpen && (
                <div className="ac-modal__backdrop" onClick={() => setAssignModalOpen(false)}>
                    <div className="ac-modal" onClick={e => e.stopPropagation()}>
                        <div className="ac-modal__header">
                            <h3><BookPlus size={20} /> Kitob biriktirish</h3>
                            <button className="ac-modal__close" onClick={() => setAssignModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="ac-modal__body">
                            {/* User info */}
                            <div className="ac-modal__user-info">
                                <User size={16} />
                                <strong>{scannedUser?.full_name}</strong>
                                <span className="ac-user-card__role-badge" style={{ fontSize: '0.7rem' }}>
                                    {roleLabels[scannedUser?.role || ''] || scannedUser?.role}
                                </span>
                            </div>

                            {/* Book search */}
                            <label className="ac-modal__label">Kitob qidirish</label>
                            <div className="ac-modal__search-row">
                                <input
                                    className="ac-modal__input"
                                    placeholder="Kitob nomi..."
                                    value={bookSearch}
                                    onChange={e => setBookSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearchBooks()}
                                />
                                <button className="ac-btn ac-btn--primary-sm" onClick={handleSearchBooks}>
                                    <Search size={16} />
                                </button>
                            </div>

                            {/* Search results */}
                            {searchResults.length > 0 && (
                                <div className="ac-modal__results">
                                    {searchResults.map(book => (
                                        <div
                                            key={book.id}
                                            className={`ac-modal__result-item ${selectedBook?.id === book.id ? 'ac-modal__result-item--selected' : ''}`}
                                            onClick={() => setSelectedBook(book)}
                                        >
                                            <div className="ac-modal__result-info">
                                                <strong>{book.title}</strong>
                                                <span>{book.author}</span>
                                            </div>
                                            <span className={`ac-modal__result-stock ${(book.available_quantity || 0) > 0 ? '' : 'ac-modal__result-stock--empty'}`}>
                                                {(book.available_quantity || 0) > 0 ? `${book.available_quantity} ta` : 'Yo\'q'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedBook && (
                                <div className="ac-modal__selected">
                                    <CheckCircle2 size={16} />
                                    <span>Tanlangan: <strong>{selectedBook.title}</strong></span>
                                </div>
                            )}

                            {/* Due date */}
                            <label className="ac-modal__label">
                                <Calendar size={14} /> Qaytarish muddati (default: 15 kun)
                            </label>
                            <input
                                type="date"
                                className="ac-modal__input"
                                value={dueDate || defaultDue}
                                min={today}
                                onChange={e => setDueDate(e.target.value)}
                            />

                            {/* Notes */}
                            <label className="ac-modal__label">
                                📝 Izoh (ixtiyoriy)
                            </label>
                            <textarea
                                className="ac-modal__input ac-modal__textarea"
                                placeholder="Izoh yozing..."
                                value={assignNotes}
                                onChange={e => setAssignNotes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="ac-modal__footer">
                            <button className="ac-btn ac-btn--cancel" onClick={() => setAssignModalOpen(false)}>
                                Bekor qilish
                            </button>
                            <button
                                className="ac-btn ac-btn--primary"
                                onClick={handleAssignBook}
                                disabled={!selectedBook || (!(dueDate || defaultDue)) || assignLoading}
                            >
                                {assignLoading ? <div className="ac-spinner ac-spinner--sm" /> : <><BookPlus size={16} /> Berish</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════
               BOOK RETURN MODAL (IZOH BILAN)
               ═══════════════════════════════════════ */}
            {returnModalOpen && (
                <div className="ac-modal__backdrop" onClick={() => { setReturnModalOpen(false); setReturningRental(null); setReturnNotes('') }}>
                    <div className="ac-modal" onClick={e => e.stopPropagation()}>
                        <div className="ac-modal__header">
                            <h3><RotateCcw size={20} /> Kitobni qaytarish</h3>
                            <button className="ac-modal__close" onClick={() => { setReturnModalOpen(false); setReturningRental(null); setReturnNotes('') }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="ac-modal__body">
                            <div className="ac-modal__selected" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                                <AlertTriangle size={16} />
                                <span>"{returningRental?.book_title}" kitobini qaytarildi deb belgilamoqchimisiz?</span>
                            </div>

                            <label className="ac-modal__label">
                                📝 Izoh (ixtiyoriy)
                            </label>
                            <textarea
                                className="ac-modal__input ac-modal__textarea"
                                placeholder="Kitob holati, qayd, izoh..."
                                value={returnNotes}
                                onChange={e => setReturnNotes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="ac-modal__footer">
                            <button className="ac-btn ac-btn--cancel" onClick={() => { setReturnModalOpen(false); setReturningRental(null); setReturnNotes('') }}>
                                Bekor qilish
                            </button>
                            <button
                                className="ac-btn ac-btn--primary"
                                onClick={handleReturnConfirm}
                                disabled={returnLoading}
                            >
                                {returnLoading ? <div className="ac-spinner ac-spinner--sm" /> : <><RotateCcw size={16} /> Qaytarish</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
