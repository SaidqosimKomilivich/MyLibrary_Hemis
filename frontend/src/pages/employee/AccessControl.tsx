import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
    ScanLine, UserCheck, UserX, BookPlus, RotateCcw, Clock,
    Search, X, Calendar, BookOpen, AlertTriangle, CheckCircle2,
    LogIn, LogOut, User, CreditCard,
    RefreshCw,
    Camera,
    Settings2
} from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { api, type Rental, type Book, type ControlRecord, type UserData } from '../../services/api'
import { toast } from 'react-toastify'
import { CustomSelect } from '../../components/CustomSelect'

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
    const [scannedUser, setScannedUser] = useState<UserData | null>(null)
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

    // 1. Scanner instance ref
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [, setScannerActive] = useState(false);

    // Kamerani ishga tushirish
    const startScanner = useCallback(() => {
        if (!selectedDeviceId || !permissionGranted) return;
        if (scannerRef.current?.isScanning) return; // allaqachon ishlayapti

        setTimeout(() => {
            // QR + Shtrix kod formatlari
            const formatsToSupport = [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
            ];

            const scanner = new Html5Qrcode("qr-reader", { formatsToSupport, verbose: false });
            scannerRef.current = scanner;

            scanner.start(
                selectedDeviceId,
                {
                    fps: 10,
                    // Responsiv qrbox: konteyner hajmiga qarab moslashadi
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const size = Math.min(viewfinderWidth, viewfinderHeight);
                        const qrboxSize = Math.floor(size * 0.7); // 70% hajmda
                        return { width: Math.max(qrboxSize, 150), height: Math.max(qrboxSize, 150) };
                    },
                    aspectRatio: 1.333334,
                },
                (decodedText) => {
                    handleScan(decodedText);
                },
                () => { /* scan error — ignore */ }
            ).then(() => {
                setScannerActive(true);
            }).catch(err => {
                console.error("Kamerani yoqishda xatolik:", err);
            });
        }, 200);
    }, [selectedDeviceId, permissionGranted]);

    // Kamerani to'xtatish (pauza)
    const stopScanner = useCallback(async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                console.error("Skanerni to'xtatishda xatolik:", e);
            }
        }
        scannerRef.current = null;
        setScannerActive(false);
    }, []);

    // 2. Kamera tanlanganda avtomatik ishga tushirish
    useEffect(() => {
        if (selectedDeviceId && permissionGranted) {
            startScanner();
        }
        return () => {
            stopScanner();
        };
    }, [selectedDeviceId, permissionGranted]);

    // ──── Foydalanuvchi ma'lumotlarini tozalash va kamerani qayta yoqish ────
    const clearUser = useCallback(() => {
        setScannedUser(null)
        setActiveRentals([])
        setUserIsInside(false)
        setScanInput('')
        // Kamerani qayta ishga tushirish
        startScanner();
    }, [startScanner]);

    // ──── Scanner logic ────
    const handleScan = async (scannedId?: string) => {
        const queryId = typeof scannedId === 'string' ? scannedId.trim() : scanInput.trim()

        if (!queryId) {
            if (typeof scannedId !== 'string') {
                toast.warning('ID karta raqamini kiriting')
            }
            return
        }

        // Agar hozir skanerlanayotgan bo'lsa kutamiz
        if (isScanning) return;

        setIsScanning(true)
        setScannedUser(null)
        setActiveRentals([])

        try {
            // 1. Avval users jadvalidan to'liq ma'lumotni olamiz
            const res = await api.getUserById(queryId)
            const found = res.data
            setScannedUser(found)

            // 2. Bugungi yozuvlarni olamiz va found.user_id (talaba raqami) bilan filtramiz
            const freshTodayRes = await api.getControlToday()
            const freshTodayRecords = freshTodayRes.data
            setTodayRecords(freshTodayRecords)

            // control.user_id = users.user_id (talaba raqami), queryId esa UUID bo'lishi mumkin
            const userRecords = freshTodayRecords.filter(rec => rec.user_id === found.user_id)

            // Eng YANGI yozuvni olish — backend arrival DESC tartibda qaytaradi
            const latestRecord = userRecords.length > 0 ? userRecords[0] : null

            // Holatni aniqlash:
            // - arrival === departure → ICHKARIDA (INSERT da ikkala vaqt bir xil, trigger hali ishlamagan)
            // - departure !== arrival → TASHQARIDA (trigger departure ni yangilagan)
            const isCurrentlyInside = latestRecord
                ? latestRecord.arrival === latestRecord.departure
                : false

            const hasPreviousVisit = userRecords.length > 0

            // Hozirgi holat
            setUserIsInside(isCurrentlyInside)

            if (found.user_id) {
                loadUserRentals(found.user_id)
            }

            setScanInput('');
            if (isCurrentlyInside) {
                toast.success("Foydalanuvchi aniqlandi! (Hozir ichkarida)")
            } else if (hasPreviousVisit) {
                toast.info(`Foydalanuvchi bugun ${userRecords.length} marta tashrif buyurgan. Qayta kiritish mumkin.`)
            } else {
                toast.success("Foydalanuvchi aniqlandi!")
            }
            // QR aniqlandi — kamerani to'xtatamiz
            await stopScanner();
        } catch (err: any) {
            toast.error(err.message || "Foydalanuvchi topilmadi. ID karta raqamini tekshiring.")
        } finally {
            setIsScanning(false)
        }
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
        const userName = scannedUser?.full_name
        try {
            await api.controlArrive(scannedUser?.user_id)
            toast.success(`${userName} — kirish qayd etildi ✅`)
            loadTodayRecords()
            // Tozalash + kamerani qayta yoqish
            clearUser()
        } catch (err: any) {
            toast.error(err.message || "Kirishni qayd etishda xatolik yuz berdi")
        }
    }

    const handleDepart = async () => {
        const userName = scannedUser?.full_name
        try {
            await api.controlDepart(scannedUser?.user_id)
            toast.success(`${userName} — chiqish qayd etildi ✅`)
            loadTodayRecords()
            // Tozalash + kamerani qayta yoqish
            clearUser()
        } catch (err: any) {
            toast.error(err.message || "Chiqishni qayd etishda xatolik yuz berdi")
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

    // Dastlabki yuklanish
    useEffect(() => {
        getDevices();
    }, []);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">

            {/* ═══════════════════════════════════════
               HEADER
               ═══════════════════════════════════════ */}
            <div className="flex flex-col gap-1">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-text">
                        <ScanLine size={28} className="text-primary-light" />
                        Kirish-Chiqish Nazorati
                    </h1>
                    <p className="text-sm text-text-muted mt-2">
                        ID karta skanerlash, foydalanuvchini tasdiqlash, kitob berish va qaytarish
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════
               SCANNER + USER CARD
               ═══════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Scanner */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
                    {/* Header */}
                    <div className="mb-5 w-full">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Camera className="w-5 h-5 text-text" strokeWidth={2.5} />
                                <h2 className="text-lg font-bold text-text">ID Karta Skaneri</h2>
                            </div>
                            <button
                                onClick={getDevices}
                                className="p-1.5 rounded-full hover:bg-white/10 text-text-muted transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        {/* <p className="text-text-muted text-sm">ID kartani kameraga tutib turing</p> */}
                    </div>

                    {/* Kamera tanlash (agar 1 tadan ko'p bo'lsa) */}
                    {devices.length > 1 && (
                        <div className="mb-4 bg-white/5 p-3 rounded-xl border border-border w-full">
                            <label className="flex items-center gap-2 text-xs font-semibold text-text mb-2">
                                <Settings2 className="w-3.5 h-3.5" />
                                Kamerani tanlash
                            </label>
                            <CustomSelect
                                value={selectedDeviceId}
                                onChange={(device) => setSelectedDeviceId(device)}
                                disabled={isScanning}
                                buttonClassName="w-full bg-surface border border-border text-sm rounded-lg p-2.5 outline-none text-text focus:border-primary transition-colors flex items-center justify-between"
                                options={devices.map((device, index) => ({
                                    value: device.deviceId,
                                    label: device.label || `Kamera ${index + 1}`
                                }))}
                            />
                        </div>
                    )}

                    {/* --- QR SKANER MAYDONI (html5-qrcode) --- */}
                    <div className="w-full aspect-4/3 bg-black rounded-lg border-2 border-gray-200 flex flex-col items-center justify-center mb-6 relative overflow-hidden">
                        {permissionGranted ? (
                            <div id="qr-reader" className="absolute inset-0 w-full h-full" />
                        ) : (
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
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
                    {!scannedUser ? (
                        <div className="flex flex-col items-center justify-center text-center text-text-muted h-full opacity-60 m-auto gap-4">
                            <User size={56} strokeWidth={1} />
                            <p className="max-w-[200px] text-sm">Foydalanuvchini topish uchun ID kartani skanerlang</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border w-full">
                                <UserCheck size={20} className="text-primary-light" />
                                <h2 className="text-lg font-bold text-text">Foydalanuvchi topildi</h2>
                                <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${userIsInside ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}`}>
                                    {userIsInside ? '🟢 Ichkarida' : '🔴 Tashqarida'}
                                </span>
                                <button
                                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-border rounded-lg text-text-muted text-xs font-medium hover:bg-white/5 hover:text-text transition-colors"
                                    onClick={clearUser}
                                    title="Tozalash"
                                >
                                    <X size={14} /> Tozalash
                                </button>
                            </div>

                            <div className="flex items-start gap-5 mb-8">
                                <div className="w-[84px] h-[84px] shrink-0">
                                    {scannedUser.image_url ? (
                                        <img src={scannedUser.image_url} alt={scannedUser.full_name} className="w-full h-full object-cover rounded-xl shadow-sm border border-border" />
                                    ) : (
                                        <div className="w-full h-full bg-linear-to-br from-primary to-accent rounded-xl text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                                            <User size={40} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <h3 className="text-xl font-bold text-text mb-1 truncate">{scannedUser.full_name}</h3>
                                    <span className="inline-block px-2.5 py-1 rounded-md bg-white/5 border border-border text-xs text-text-muted font-medium w-fit mb-3">
                                        {roleLabels[scannedUser.role] || scannedUser.role}
                                    </span>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2 text-sm text-text-muted">
                                            <CreditCard size={14} />
                                            <span className="truncate">ID: {scannedUser.id_card}</span>
                                        </div>
                                        {scannedUser.department_name && (
                                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                                <BookOpen size={14} />
                                                <span className="truncate">{scannedUser.department_name}</span>
                                            </div>
                                        )}
                                        {scannedUser.group_name && (
                                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                                <User size={14} />
                                                <span className="truncate">{scannedUser.group_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-3">
                                <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleArrive} disabled={userIsInside}>
                                    <LogIn size={18} /> Kirish
                                </button>
                                <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleDepart} disabled={!userIsInside}>
                                    <LogOut size={18} /> Chiqish
                                </button>
                                <button className="col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white border border-transparent rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors" onClick={() => setAssignModalOpen(true)}>
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
            {
                scannedUser && (
                    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between p-5 border-b border-border bg-white/5">
                            <h2 className="flex items-center gap-2.5 text-lg font-bold text-text m-0">
                                <BookOpen size={20} className="text-primary-light" />
                                Olingan kitoblar
                                {activeRentals.length > 0 && (
                                    <span className="bg-indigo-500/15 text-primary-light px-2.5 py-0.5 rounded-full text-xs font-bold">{activeRentals.length}</span>
                                )}
                            </h2>
                        </div>

                        {rentalsLoading ? (
                            <div className="p-12 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
                            </div>
                        ) : sortedRentals.length === 0 ? (
                            <div className="p-16 flex flex-col items-center justify-center text-text-muted opacity-70 gap-4 text-center">
                                <CheckCircle2 size={48} strokeWidth={1} />
                                <p className="text-sm">Hech qanday aktiv ijara yo'q</p>
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full border-collapse min-w-[600px]">
                                    <thead>
                                        <tr>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Kitob</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Muallif</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Olingan sana</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Muddat</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Holat</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border" style={{ width: '120px' }}>Amal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedRentals.map(rental => {
                                            const deadline = getDeadlineInfo(rental.due_date)
                                            return (
                                                <tr key={rental.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-4 border-b border-border">
                                                        <div className="flex items-center gap-3">
                                                            {rental.book_cover ? (
                                                                <img src={rental.book_cover} alt="" className="w-10 h-10 object-cover rounded-lg shadow-sm border border-border" />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-white/5 border border-border rounded-lg text-text-muted flex items-center justify-center">
                                                                    <BookOpen size={16} />
                                                                </div>
                                                            )}
                                                            <span className="font-semibold text-sm text-text">{rental.book_title || 'Noma\'lum'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-b border-border text-sm text-text-muted">{rental.book_author || '—'}</td>
                                                    <td className="p-4 border-b border-border text-sm text-text-muted">{rental.loan_date}</td>
                                                    <td className="p-4 border-b border-border text-sm text-text-muted font-medium">{rental.due_date}</td>
                                                    <td className="p-4 border-b border-border">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${deadline.color === 'danger' ? 'bg-red-500/15 text-red-400 border-red-500/20' : deadline.color === 'warning' ? 'bg-amber-500/15 text-amber-500 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'}`}>
                                                            {deadline.color === 'danger' && <AlertTriangle size={14} />}
                                                            {deadline.color === 'warning' && <Clock size={14} />}
                                                            {deadline.color === 'safe' && <CheckCircle2 size={14} />}
                                                            {deadline.label}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 border-b border-border">
                                                        <button
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-border rounded-lg text-text font-medium text-xs hover:bg-white/10 transition-colors"
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
                )
            }

            {/* ═══════════════════════════════════════
               TODAY'S VISITORS
               ═══════════════════════════════════════ */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-5 border-b border-border bg-white/5">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-text m-0">
                        <Clock size={20} className="text-primary-light" />
                        Bugungi tashrif buyurganlar
                        {todayRecords.length > 0 && (
                            <span className="bg-indigo-500/15 text-primary-light px-2.5 py-0.5 rounded-full text-xs font-bold">{todayRecords.length}</span>
                        )}
                    </h2>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-border rounded-lg text-text-muted text-xs font-medium hover:bg-white/5 hover:text-text transition-colors" onClick={loadTodayRecords} disabled={todayLoading}>
                        <RotateCcw size={14} /> Yangilash
                    </button>
                </div>

                {todayLoading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
                    </div>
                ) : todayRecords.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-text-muted opacity-70 gap-4 text-center">
                        <UserX size={48} strokeWidth={1} />
                        <p className="text-sm">Bugun hali hech kim kelmagan</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse min-w-[700px]">
                            <thead>
                                <tr>
                                    <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Tr</th>
                                    <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">To'liq Ism</th>
                                    <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Lavozim/Guruh</th>
                                    <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Kelgan vaqt</th>
                                    <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Ketgan vaqt</th>
                                    <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayRecords.map((rec, i) => {
                                    const isStillInside = rec.arrival === rec.departure
                                    const roleStr = rec.role || ''
                                    const displayRoleInfo = roleStr === 'student'
                                        ? `${rec.department_name || ''} ${rec.group_name || ''}`.trim()
                                        : (rec.staff_position || roleLabels[roleStr] || roleStr)

                                    return (
                                        <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 border-b border-border text-sm text-text-muted">{i + 1}</td>
                                            <td className="p-4 border-b border-border font-medium text-sm text-text">{rec.full_name || 'Noma\'lum'}</td>
                                            <td className="p-4 border-b border-border text-sm text-text-muted">{displayRoleInfo || '—'}</td>
                                            <td className="p-4 border-b border-border text-sm text-text-muted font-medium">{rec.arrival || '—'}</td>
                                            <td className="p-4 border-b border-border text-sm text-text-muted font-medium">{isStillInside ? '—' : rec.departure}</td>
                                            <td className="p-4 border-b border-border">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${isStillInside ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
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
            {
                assignModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setAssignModalOpen(false)}>
                        <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-border">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-text m-0"><BookPlus size={20} className="text-primary-light" /> Kitob biriktirish</h3>
                                <button className="p-1.5 rounded-lg text-text-muted hover:bg-white/5 transition-colors" onClick={() => setAssignModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-5 flex flex-col gap-4">
                                {/* User info */}
                                <div className="flex items-center gap-2 text-sm text-text bg-white/5 p-3 rounded-lg border border-border">
                                    <User size={16} className="text-primary-light" />
                                    <strong>{scannedUser?.full_name}</strong>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-medium ml-auto">
                                        {roleLabels[scannedUser?.role || ''] || scannedUser?.role}
                                    </span>
                                </div>

                                {/* Book search */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Kitob qidirish</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-white/5 border border-border px-3 py-2 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors"
                                            placeholder="Kitob nomi..."
                                            value={bookSearch}
                                            onChange={e => setBookSearch(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearchBooks()}
                                        />
                                        <button className="flex items-center justify-center p-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors" onClick={handleSearchBooks}>
                                            <Search size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Search results */}
                                {searchResults.length > 0 && (
                                    <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto border border-border rounded-lg p-1">
                                        {searchResults.map(book => (
                                            <div
                                                key={book.id}
                                                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedBook?.id === book.id ? 'bg-indigo-500/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                                                onClick={() => setSelectedBook(book)}
                                            >
                                                <div className="flex flex-col min-w-0 pr-3">
                                                    <strong className="text-sm text-text truncate">{book.title}</strong>
                                                    <span className="text-xs text-text-muted truncate">{book.author}</span>
                                                </div>
                                                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${(book.available_quantity || 0) > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-500'}`}>
                                                    {(book.available_quantity || 0) > 0 ? `${book.available_quantity} ta` : 'Yo\'q'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedBook && (
                                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm mt-1">
                                        <CheckCircle2 size={16} className="shrink-0" />
                                        <span className="truncate">Tanlangan: <strong>{selectedBook.title}</strong></span>
                                    </div>
                                )}

                                {/* Due date */}
                                <div className="flex flex-col gap-1.5 mt-2">
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        <Calendar size={14} /> Qaytarish muddati (default: 15 kun)
                                    </label>
                                    <input
                                        type="date"
                                        className="bg-white/5 border border-border px-3 py-2 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors appearance-none"
                                        style={{ colorScheme: 'dark' }}
                                        value={dueDate || defaultDue}
                                        min={today}
                                        onChange={e => setDueDate(e.target.value)}
                                    />
                                </div>

                                {/* Notes */}
                                <div className="flex flex-col gap-1.5 mt-2">
                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        📝 Izoh (ixtiyoriy)
                                    </label>
                                    <textarea
                                        className="bg-white/5 border border-border px-3 py-2 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors resize-none"
                                        placeholder="Izoh yozing..."
                                        value={assignNotes}
                                        onChange={e => setAssignNotes(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-white/5 mt-2">
                                <button className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text bg-transparent hover:bg-white/5 transition-colors" onClick={() => setAssignModalOpen(false)}>
                                    Bekor qilish
                                </button>
                                <button
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary border border-transparent rounded-lg text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                                    onClick={handleAssignBook}
                                    disabled={!selectedBook || (!(dueDate || defaultDue)) || assignLoading}
                                >
                                    {assignLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><BookPlus size={16} /> Berish</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══════════════════════════════════════
               BOOK RETURN MODAL (IZOH BILAN)
               ═══════════════════════════════════════ */}
            {
                returnModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setReturnModalOpen(false); setReturningRental(null); setReturnNotes('') }}>
                        <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-border">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-text m-0"><RotateCcw size={20} className="text-primary-light" /> Kitobni qaytarish</h3>
                                <button className="p-1.5 rounded-lg text-text-muted hover:bg-white/5 transition-colors" onClick={() => { setReturnModalOpen(false); setReturningRental(null); setReturnNotes('') }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-sm font-medium">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <span>"{returningRental?.book_title}" kitobini qaytarildi deb belgilamoqchimisiz?</span>
                                </div>

                                <div className="flex flex-col gap-1.5 mt-2">
                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                                        📝 Izoh (ixtiyoriy)
                                    </label>
                                    <textarea
                                        className="bg-white/5 border border-border px-3 py-2 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors resize-none"
                                        placeholder="Kitob holati, qayd, izoh..."
                                        value={returnNotes}
                                        onChange={e => setReturnNotes(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-white/5 mt-2">
                                <button className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text bg-transparent hover:bg-white/5 transition-colors" onClick={() => { setReturnModalOpen(false); setReturningRental(null); setReturnNotes('') }}>
                                    Bekor qilish
                                </button>
                                <button
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary border border-transparent rounded-lg text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                                    onClick={handleReturnConfirm}
                                    disabled={returnLoading}
                                >
                                    {returnLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><RotateCcw size={16} /> Qaytarish</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
