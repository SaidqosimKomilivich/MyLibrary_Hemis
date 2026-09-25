import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
    ScanLine, UserCheck, UserX, BookPlus, RotateCcw, Clock,
    Search, X, Calendar, BookOpen, AlertTriangle, CheckCircle2,
    LogIn, LogOut, User, CreditCard,
    RefreshCw,
    Camera,
    Settings2,
    Loader2,
    Hash,
    Trash2,
    Plus,
    CheckSquare,
    Square
} from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { highlightText } from '../../utils/highlightText'
import { api, type Rental, type Book, type ControlRecord, type UserData } from '../../services/api'
import { toast } from 'react-toastify'
import { CustomSelect } from '../../components/CustomSelect'
import { getFileUrl } from '../../utils/fileUrl'
import { formatDateTime, formatLocalDate, getTodayDateString } from '../../utils/dateUtils'
import { DatePicker } from '../../components/DatePicker'

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

function formatPublicationYear(book: Book): string | null {
    const year = book.publication_date || book.published_year
    if (!year) return null
    const str = String(year).trim()
    return str.endsWith('yil') ? str : `${str}-yil`
}

interface SelectedBookItem {
    book: Book
    invoiceNumber: string
    dueDate?: string
    notes?: string
    showCustomSettings?: boolean
}

const MAX_RENTAL_LIMIT = 10

export default function AccessControl() {
    // ──── Scanner state ────
    const [scanInput, setScanInput] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [scannedUser, setScannedUser] = useState<UserData | null>(null)
    const [userIsInside, setUserIsInside] = useState(false)

    // ──── Rentals ────
    const [activeRentals, setActiveRentals] = useState<Rental[]>([])
    const [rentalsLoading, setRentalsLoading] = useState(false)

    // ──── Book assignment (ko'p kitob topshirish) ────
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [bookSearch, setBookSearch] = useState('')
    const [searchResults, setSearchResults] = useState<Book[]>([])
    const [isSearchingBooks, setIsSearchingBooks] = useState(false)

    // Qidiruv maydoni bo'shatilganda natijalarni ham tozalash
    useEffect(() => {
        if (!bookSearch.trim()) {
            setSearchResults([])
        }
    }, [bookSearch])
    const [selectedBooks, setSelectedBooks] = useState<SelectedBookItem[]>([])
    const [dueDate, setDueDate] = useState('')
    const [assignNotes, setAssignNotes] = useState('')
    const [assignLoading, setAssignLoading] = useState(false)

    // ──── Return (bir yoki bir nechta kitobni qabul qilish) ────
    const [returnModalOpen, setReturnModalOpen] = useState(false)
    const [selectedRentalIds, setSelectedRentalIds] = useState<string[]>([])
    const [returnNotes, setReturnNotes] = useState('')
    const [returnLoading, setReturnLoading] = useState(false)

    const [todayRecords, setTodayRecords] = useState<ControlRecord[]>([])
    const [todayLoading, setTodayLoading] = useState(false)
    const [historyDate, setHistoryDate] = useState(getTodayDateString())
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [permissionGranted, setPermissionGranted] = useState(false);


    // Load visitors when historyDate changes
    useEffect(() => {
        loadHistoryRecords()
    }, [historyDate])

    const loadHistoryRecords = async () => {
        setTodayLoading(true)
        try {
            // Bugungi bo'lsa getControlToday, bo'lmasa getReportPreview ishlatamiz
            const todayStr = getTodayDateString()
            if (historyDate === todayStr) {
                const res = await api.getControlToday()
                setTodayRecords(res.data || [])
            } else {
                const res = await api.getReportPreview('gate_control', historyDate, historyDate)
                if (res.success) {
                    setTodayRecords(res.data || [])
                }
            }
        } catch {
            // Silently fail
        } finally {
            setTodayLoading(false)
        }
    }

// QR skanerlangan matndan ID ni ajratib olish (URL yoki JSON bo'lsa ham)
function extractIdFromScannedText(rawText: string): string {
    const text = rawText.trim()
    if (!text) return ''

    // URL bo'lsa (masalan https://.../student?code=395211... yoki .../student/395211...)
    if (text.startsWith('http://') || text.startsWith('https://')) {
        try {
            const url = new URL(text)
            const codeParam = url.searchParams.get('code') || url.searchParams.get('id') || url.searchParams.get('user_id')
            if (codeParam) return codeParam.trim()
            const segments = url.pathname.split('/').filter(Boolean)
            if (segments.length > 0) {
                return segments[segments.length - 1].trim()
            }
        } catch {
            // oddiy satr sifatida davom etamiz
        }
    }

    // JSON formatda bo'lsa
    if (text.startsWith('{') && text.endsWith('}')) {
        try {
            const parsed = JSON.parse(text)
            const idVal = parsed.user_id || parsed.id || parsed.code || text
            return String(idVal).trim()
        } catch {
            // oddiy satr
        }
    }

    return text
}

    // 1. Scanner instance ref va xavfsiz boshqaruv
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scannerActive, setScannerActive] = useState(false);
    const isScanningRef = useRef(false);
    const isStoppingRef = useRef(false);
    const isStartingRef = useRef(false);

    // Kamerani to'xtatish (pauza / to'liq resurslarni bo'shatish)
    const stopScanner = useCallback(async () => {
        if (isStoppingRef.current) return;
        isStoppingRef.current = true;
        try {
            const scanner = scannerRef.current;
            scannerRef.current = null;
            setScannerActive(false);
            if (scanner) {
                try {
                    if (scanner.isScanning) {
                        await scanner.stop();
                    }
                    scanner.clear();
                } catch (e) {
                    console.warn("Skanerni to'xtatishda ogohlantirish:", e);
                }
            }
        } finally {
            isStoppingRef.current = false;
        }
    }, []);

    // Kamerani ishga tushirish (xavfsiz va to'qnashuvlarsiz)
    const startScanner = useCallback(async () => {
        if (!selectedDeviceId || !permissionGranted) return;
        if (isStartingRef.current) return;

        // Agar hozir to'xtatish jarayoni ketayotgan bo'lsa, u to'liq yakunlanishini kutamiz
        if (isStoppingRef.current) {
            let waitAttempts = 0;
            while (isStoppingRef.current && waitAttempts < 15) {
                await new Promise(res => setTimeout(res, 50));
                waitAttempts++;
            }
        }

        if (scannerRef.current?.isScanning) {
            setScannerActive(true);
            return;
        }

        isStartingRef.current = true;
        try {
            // Oldingi eski instansiya qolgan bo'lsa tozalash
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear();
                } catch {
                    // ignore
                }
                scannerRef.current = null;
            }

            const container = document.getElementById("qr-reader");
            if (!container) return;
            container.innerHTML = "";

            const formatsToSupport = [
                Html5QrcodeSupportedFormats.QR_CODE,
            ];

            const scanner = new Html5Qrcode("qr-reader", { formatsToSupport, verbose: false });
            scannerRef.current = scanner;

            await scanner.start(
                selectedDeviceId,
                {
                    fps: 15,
                    videoConstraints: {
                        deviceId: { exact: selectedDeviceId },
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 },
                    },
                    // Responsiv qrbox: konteyner hajmiga qarab moslashadi
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const size = Math.min(viewfinderWidth, viewfinderHeight);
                        const qrboxSize = Math.floor(size * 0.75);
                        return { width: Math.max(qrboxSize, 180), height: Math.max(qrboxSize, 180) };
                    },
                    aspectRatio: 1.333334,
                },
                (decodedText) => {
                    handleScan(decodedText);
                },
                () => { /* scan error — ignore */ }
            );

            setScannerActive(true);
        } catch (err: any) {
            console.error("Kamerani yoqishda xatolik:", err);
            setScannerActive(false);
            scannerRef.current = null;
        } finally {
            isStartingRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDeviceId, permissionGranted]);

    // 2. Kamera tanlanganda avtomatik ishga tushirish
    useEffect(() => {
        if (selectedDeviceId && permissionGranted) {
            startScanner();
        }
        return () => {
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDeviceId, permissionGranted]);

    // ──── Foydalanuvchi ma'lumotlarini tozalash va kamerani qayta yoqish ────
    const clearUser = useCallback(() => {
        setScannedUser(null)
        setActiveRentals([])
        setSelectedRentalIds([])
        setSelectedBooks([])
        setUserIsInside(false)
        setScanInput('')
        isScanningRef.current = false
        // Kamerani qayta ishga tushirish
        startScanner();
    }, [startScanner]);

    // ──── Modallarni yopish va kamerani xavfsiz qayta faollashtirish ────
    const closeAssignModal = useCallback(() => {
        setAssignModalOpen(false)
        setBookSearch('')
        setSearchResults([])
        setSelectedBooks([])
        setDueDate('')
        setAssignNotes('')
        startScanner()
    }, [startScanner]);

    const closeReturnModal = useCallback(() => {
        setReturnModalOpen(false)
        setSelectedRentalIds([])
        setReturnNotes('')
        startScanner()
    }, [startScanner]);

    // ──── Scanner logic ────
    const handleScan = async (scannedId?: string) => {
        const rawText = typeof scannedId === 'string' ? scannedId : scanInput
        const queryId = extractIdFromScannedText(rawText)

        if (!queryId) {
            if (typeof scannedId !== 'string') {
                toast.warning('ID karta raqamini kiriting')
            }
            return
        }

        // Agar hozir skanerlanayotgan bo'lsa kutamiz
        if (isScanningRef.current) return;

        isScanningRef.current = true;
        setIsScanning(true)
        setScannedUser(null)
        setActiveRentals([])

        try {
            // 1. Avval users jadvalidan to'liq ma'lumotni olamiz (UUID yoki HEMIS user_id bo'yicha)
            const res = await api.getUserById(queryId)
            const found = res.data
            setScannedUser(found)

            // 2. Bugungi yozuvlarni olamiz va found.user_id (talaba raqami) bilan filtramiz
            const freshTodayRes = await api.getControlToday()
            const freshTodayRecords = freshTodayRes.data
            setTodayRecords(freshTodayRecords)

            // control.user_id = users.user_id (talaba raqami), queryId esa UUID bo'lishi mumkin
            const userRecords = freshTodayRecords.filter(rec => rec.user_id === found.user_id || (found.id && rec.user_id === found.id))

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
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Foydalanuvchi topilmadi. ID karta raqamini tekshiring.")
            // Qayta skanerlash uchun 2 soniya kutish (cooldown) orqali takroriy bildirishnomalarni oldini olamiz
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            setIsScanning(false)
            isScanningRef.current = false;
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
            await loadHistoryRecords()
            // Tozalash + kamerani qayta yoqish
            clearUser()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Kirishni qayd etishda xatolik yuz berdi")
        }
    }

    const handleDepart = async () => {
        const userName = scannedUser?.full_name
        try {
            await api.controlDepart(scannedUser?.user_id)
            toast.success(`${userName} — chiqish qayd etildi ✅`)
            await loadHistoryRecords()
            // Tozalash + kamerani qayta yoqish
            clearUser()
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        catch (err: any) {
            toast.error(err.message || "Chiqishni qayd etishda xatolik yuz berdi")
        }
    }

    // ──── Rental qoidalari va hisoblashlar ────
    const availableSlots = useMemo(() => {
        return Math.max(0, MAX_RENTAL_LIMIT - activeRentals.length)
    }, [activeRentals])

    const hasOverdueRentals = useMemo(() => {
        return activeRentals.some(r => getDeadlineInfo(r.due_date).color === 'danger')
    }, [activeRentals])

    const duplicateInvoices = useMemo(() => {
        const counts: Record<string, number> = {}
        selectedBooks.forEach(b => {
            const inv = b.invoiceNumber.trim().toLowerCase()
            if (inv) counts[inv] = (counts[inv] || 0) + 1
        })
        return new Set(Object.keys(counts).filter(k => counts[k] > 1))
    }, [selectedBooks])

    // ──── Book assignment (ko'p kitob topshirish) ────
    const handleSearchBooks = async () => {
        const query = bookSearch.trim()
        if (!query || isSearchingBooks) return
        setIsSearchingBooks(true)
        try {
            const res = await api.getBooks({ search: query, limit: 30 })
            setSearchResults(res.data || [])
            if (!res.data || res.data.length === 0) {
                toast.info("Kitob topilmadi")
            }
        } catch (err: any) {
            toast.error(err?.message || "Kitoblarni qidirishda xatolik")
        } finally {
            setIsSearchingBooks(false)
        }
    }

    const handleAddBookToAssign = (book: Book) => {
        if (hasOverdueRentals) {
            toast.error("Foydalanuvchida muddati o'tgan kitob(lar) mavjud! Avval ularni topshirish kerak.")
            return
        }
        if (selectedBooks.length >= availableSlots) {
            toast.warning(`Kitob olish limiti cheklangan (maksimum ${MAX_RENTAL_LIMIT} ta). Qo'shimcha kitob qo'shib bo'lmaydi!`)
            return
        }
        if (selectedBooks.some(item => item.book.id === book.id)) {
            toast.info(`"${book.title}" allaqachon ro'yxatga qo'shilgan`)
            return
        }
        // Foydalanuvchida bu kitob allaqachon aktiv ijarada bormi?
        if (activeRentals.some(r => r.book_id === book.id)) {
            toast.warning(`"${book.title}" kitobini foydalanuvchi allaqachon olgan va hali qaytarmagan!`)
            return
        }
        if ((book.available_quantity || 0) <= 0) {
            toast.warning(`"${book.title}" omborda qolmagan`)
            return
        }
        setSelectedBooks(prev => [...prev, { book, invoiceNumber: '', dueDate: '', notes: '', showCustomSettings: false }])
        toast.success(`"${book.title}" ro'yxatga qo'shildi`)
    }

    const handleRemoveBookFromAssign = (bookId: string) => {
        setSelectedBooks(prev => prev.filter(item => item.book.id !== bookId))
    }

    const handleUpdateBookInvoice = (bookId: string, invoice: string) => {
        setSelectedBooks(prev => prev.map(item => item.book.id === bookId ? { ...item, invoiceNumber: invoice } : item))
    }

    const handleUpdateBookDueDate = (bookId: string, customDueDate: string) => {
        setSelectedBooks(prev => prev.map(item => item.book.id === bookId ? { ...item, dueDate: customDueDate } : item))
    }

    const handleUpdateBookNotes = (bookId: string, customNotes: string) => {
        setSelectedBooks(prev => prev.map(item => item.book.id === bookId ? { ...item, notes: customNotes } : item))
    }

    const handleToggleBookCustomSettings = (bookId: string) => {
        setSelectedBooks(prev => prev.map(item => item.book.id === bookId ? { ...item, showCustomSettings: !item.showCustomSettings } : item))
    }

    const handleAssignBooks = async () => {
        if (!scannedUser) {
            toast.warning("Foydalanuvchi aniqlanmagan")
            return
        }
        if (hasOverdueRentals) {
            toast.error("Foydalanuvchida muddati o'tgan kitob(lar) mavjud! Avval qarzdorlikni bartaraf etish kerak.")
            return
        }
        if (selectedBooks.length === 0) {
            toast.warning("Kamida bitta kitob tanlang")
            return
        }
        if (selectedBooks.length > availableSlots) {
            toast.warning(`Kitob olish limiti cheklangan (maksimum ${MAX_RENTAL_LIMIT} ta). Siz ko'pi bilan ${availableSlots} ta kitob berishingiz mumkin.`)
            return
        }

        const missingInvoice = selectedBooks.find(b => !b.invoiceNumber.trim())
        if (missingInvoice) {
            toast.warning(`"${missingInvoice.book.title}" kitobi uchun invois raqamini kiriting`)
            return
        }

        if (duplicateInvoices.size > 0) {
            toast.warning("Tanlangan kitoblar ro'yxatida bir xil invois raqami takrorlangan! Har bir kitob invois raqami unikal bo'lishi shart.")
            return
        }

        const finalDue = dueDate || (typeof defaultDue === 'string' ? defaultDue : '')
        if (!finalDue) {
            toast.warning("Qaytarish muddatini tanlang")
            return
        }

        setAssignLoading(true)
        try {
            await api.createRentalBatch({
                user_id: scannedUser.user_id,
                due_date: finalDue,
                notes: assignNotes.trim() || undefined,
                items: selectedBooks.map(item => ({
                    book_id: item.book.id,
                    invoice_number: item.invoiceNumber.trim(),
                    due_date: item.dueDate || undefined,
                    notes: item.notes?.trim() || undefined,
                })),
            })
            toast.success(`${selectedBooks.length} ta kitob ${scannedUser.full_name}ga muvaffaqiyatli berildi 🎉`)
            closeAssignModal()
            await loadUserRentals(scannedUser.user_id)
        } catch (error: any) {
            toast.error(error.message || "Kitoblarni topshirishda xatolik yuz berdi")
        } finally {
            setAssignLoading(false)
        }
    }

    // ──── Book return (bir yoki bir nechta kitobni qabul qilish) ────
    const handleToggleSelectAllRentals = () => {
        if (sortedRentals.length === 0) return
        if (selectedRentalIds.length === sortedRentals.length) {
            setSelectedRentalIds([])
        } else {
            setSelectedRentalIds(sortedRentals.map(r => r.id))
        }
    }

    const handleToggleSelectRental = (id: string) => {
        setSelectedRentalIds(prev =>
            prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
        )
    }

    const handleReturnConfirm = async () => {
        if (selectedRentalIds.length === 0) return
        setReturnLoading(true)
        try {
            if (selectedRentalIds.length === 1) {
                await api.returnRental(selectedRentalIds[0], returnNotes.trim() || undefined)
            } else {
                await api.returnRentalBatch({
                    notes: returnNotes.trim() || undefined,
                    items: selectedRentalIds.map(id => ({ rental_id: id })),
                })
            }
            toast.success(`${selectedRentalIds.length} ta kitob muvaffaqiyatli qabul qilindi ✅`)
            closeReturnModal()
            if (scannedUser) await loadUserRentals(scannedUser.user_id)
            startScanner()
        } catch (err: any) {
            toast.error(err.message || "Kitoblarni qaytarishda xatolik yuz berdi")
        } finally {
            setReturnLoading(false)
        }
    }

    // ──── Sana hisoblash (15 kunlik standart muddat) ────
    const getDefaultDueDate = (days = 15): string => {
        const d = new Date()
        d.setDate(d.getDate() + days)
        return formatLocalDate(d)
    }
    const defaultDue = getDefaultDueDate(15)
    const todayDate = useMemo(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
    }, [])

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
        if (!navigator || !navigator.mediaDevices) {
            toast.error("Brauzer kamerani qo'llab-quvvatlamaydi. Tizimga localhost yoki HTTPS (xavfsiz protokol) orqali kiring!");
            return;
        }
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            setPermissionGranted(true);

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(device => device.kind === 'videoinput');

            setDevices(videoDevices);

            if (videoDevices.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(videoDevices[0].deviceId);
            } else if (videoDevices.length === 0) {
                toast.warning("Tizimga ulangan kameralar topilmadi!");
            }
        } catch (error: any) {
            console.error("Kamera ruxsati berilmadi:", error);
            if (error.name === 'NotAllowedError') {
                toast.error("Kameraga kirishga ruxsat berilmadi! Iltimos, brauzer sozlamalaridan ruxsat bering.");
            } else if (error.name === 'NotFoundError') {
                toast.error("Ulangan kamera qurilmasi topilmadi.");
            } else {
                toast.error("Kamerani ulashda xatolik: " + (error.message || error));
            }
        }
    };

    // Dastlabki yuklanish
    useEffect(() => {
        getDevices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col gap-6 w-full max-w-300 mx-auto">

            {/* ═══════════════════════════════════════
               HEADER
               ═══════════════════════════════════════ */}
            <div className="flex flex-col gap-1">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-text">
                        <ScanLine size={28} className="text-primary-light" />
                        Kirish-chiqish nazorati
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
                                <h2 className="text-lg font-bold text-text">ID karta skaneri</h2>
                            </div>
                            <button
                                onClick={getDevices}
                                className="p-1.5 rounded-full hover:bg-surface-hover text-text-muted transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        {/* <p className="text-text-muted text-sm">ID kartani kameraga tutib turing</p> */}
                    </div>

                    {/* Kamera tanlash (agar 1 tadan ko'p bo'lsa) */}
                    {devices.length > 1 && (
                        <div className="mb-4 bg-surface-hover/30 p-3 rounded-xl border border-border w-full">
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

                        {/* Kamera to'xtatilgan yoki faol bo'lmagan holat overlay'i */}
                        {permissionGranted && !scannerActive && !isScanning && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs text-white p-5 text-center select-none">
                                <Camera className="w-12 h-12 text-slate-400 mb-2 opacity-80" strokeWidth={1.5} />
                                <p className="text-sm font-semibold text-slate-200 mb-1">
                                    {scannedUser ? "Kamera to'xtatilgan (Foydalanuvchi tanlangan)" : "Kamera faol emas"}
                                </p>
                                <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
                                    {scannedUser
                                        ? "Yangi o'quvchini skanerlash uchun tozalang yoki kamerani yoqing"
                                        : "ID kartani skanerlashni boshlash uchun tugmani bosing"}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (scannedUser) {
                                            clearUser()
                                        } else {
                                            startScanner()
                                        }
                                    }}
                                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <RefreshCw size={14} />
                                    {scannedUser ? "Keyingi o'quvchini skanerlash" : "Kamerani ishga tushirish"}
                                </button>
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
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col min-h-100">
                    {!scannedUser ? (
                        <div className="flex flex-col items-center justify-center text-center text-text-muted h-full opacity-60 m-auto gap-4">
                            <User size={56} strokeWidth={1} />
                            <p className="max-w-50 text-sm">Foydalanuvchini topish uchun ID kartani skanerlang</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border w-full">
                                <UserCheck size={20} className="text-primary-light" />
                                <h2 className="text-lg font-bold text-text">Foydalanuvchi topildi</h2>
                                <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${userIsInside ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    {userIsInside ? '🟢 Ichkarida' : '🔴 Tashqarida'}
                                </span>
                                <button
                                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-border rounded-lg text-text-muted text-xs font-medium hover:bg-surface-hover hover:text-text transition-colors"
                                    onClick={clearUser}
                                    title="Tozalash"
                                >
                                    <X size={14} /> Tozalash
                                </button>
                            </div>

                            <div className="flex items-start gap-5 mb-8">
                                <div className="w-21 h-21 shrink-0">
                                    {scannedUser.image_url ? (
                                        <img src={getFileUrl(scannedUser.image_url)} alt={scannedUser.full_name} className="w-full h-full object-cover rounded-xl shadow-sm border border-border" />
                                    ) : (
                                        <div className="w-full h-full bg-linear-to-br from-primary to-accent rounded-xl text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                                            <User size={40} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <h3 className="text-xl font-bold text-text mb-1 truncate">{scannedUser.full_name}</h3>
                                    <span className="inline-block px-2.5 py-1 rounded-md bg-surface-hover/50 border border-border text-xs text-text-muted font-medium w-fit mb-3">
                                        {roleLabels[scannedUser.role] || scannedUser.role}
                                    </span>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2 text-sm text-text-muted">
                                            <CreditCard size={14} />
                                            <span className="truncate">ID karta yuklab olingan: {scannedUser.id_card} marta</span>
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

                            <div className="mt-auto flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleArrive} disabled={userIsInside}>
                                        <LogIn size={18} /> Kirish
                                    </button>
                                    <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleDepart} disabled={!userIsInside}>
                                        <LogOut size={18} /> Chiqish
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white border border-transparent rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors shadow-xs"
                                        onClick={() => {
                                            stopScanner()
                                            setDueDate(getDefaultDueDate(15))
                                            setAssignModalOpen(true)
                                        }}
                                    >
                                        <BookPlus size={18} /> Kitob berish
                                    </button>
                                    <button
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-hover text-text border border-border rounded-lg text-sm font-semibold transition-colors"
                                        onClick={clearUser}
                                        title="Keyingi o'quvchini qabul qilish uchun ma'lumotlarni tozalash"
                                    >
                                        <RotateCcw size={16} className="text-primary-light" /> Keyingi o'quvchi
                                    </button>
                                </div>
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
                        <div className="flex items-center justify-between p-5 border-b border-border bg-surface-hover/40">
                            <h2 className="flex items-center gap-2.5 text-lg font-bold text-text m-0">
                                <BookOpen size={20} className="text-primary-light" />
                                Olingan kitoblar
                                {activeRentals.length > 0 && (
                                    <span className="bg-indigo-500/15 text-primary-light px-2.5 py-0.5 rounded-full text-xs font-bold">{activeRentals.length}</span>
                                )}
                            </h2>
                        </div>

                        {/* Tanlangan kitoblarni ommaviy qaytarish paneli */}
                        {selectedRentalIds.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-primary/10 border-b border-primary/20 text-sm animate-in fade-in duration-150">
                                <div className="flex items-center gap-2">
                                    <CheckSquare size={16} className="text-primary-light" />
                                    <span className="font-semibold text-text">
                                        Tanlangan: <span className="text-primary-light font-bold">{selectedRentalIds.length} ta kitob</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-sm transition-all"
                                        onClick={() => setReturnModalOpen(true)}
                                    >
                                        <RotateCcw size={14} /> Tanlanganlarni qabul qilish ({selectedRentalIds.length})
                                    </button>
                                    <button
                                        className="px-3 py-2 text-text-muted hover:text-text text-xs rounded-xl hover:bg-surface-hover transition-colors font-medium"
                                        onClick={() => setSelectedRentalIds([])}
                                    >
                                        Bekor qilish
                                    </button>
                                </div>
                            </div>
                        )}

                        {rentalsLoading ? (
                            <div className="p-12 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
                            </div>
                        ) : sortedRentals.length === 0 ? (
                            <div className="p-16 flex flex-col items-center justify-center text-text-muted opacity-60 gap-4 text-center">
                                <CheckCircle2 size={48} strokeWidth={1} />
                                <p className="text-sm">Hech qanday aktiv ijara yo'q</p>
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full border-collapse min-w-150">
                                    <thead>
                                        <tr>
                                            <th className="p-4 w-12 text-center border-b border-border">
                                                <button
                                                    type="button"
                                                    className="cursor-pointer text-text-muted hover:text-text transition-colors flex items-center justify-center"
                                                    onClick={handleToggleSelectAllRentals}
                                                    title={sortedRentals.length > 0 && selectedRentalIds.length === sortedRentals.length ? "Barchasini bekor qilish" : "Barchasini tanlash"}
                                                >
                                                    {sortedRentals.length > 0 && selectedRentalIds.length === sortedRentals.length ? (
                                                        <CheckSquare size={18} className="text-primary-light" />
                                                    ) : (
                                                        <Square size={18} />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Kitob</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Invois</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Olingan sana</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Muddat</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Holat</th>
                                            <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border" style={{ width: '120px' }}>Amal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedRentals.map(rental => {
                                            const deadline = getDeadlineInfo(rental.due_date)
                                            const isSelected = selectedRentalIds.includes(rental.id)
                                            return (
                                                <tr key={rental.id} className={`hover:bg-surface-hover/50 transition-colors group ${isSelected ? 'bg-primary/5' : ''}`}>
                                                    <td className="p-4 border-b border-border text-center">
                                                        <button
                                                            type="button"
                                                            className="cursor-pointer text-text-muted hover:text-text transition-colors flex items-center justify-center"
                                                            onClick={() => handleToggleSelectRental(rental.id)}
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare size={18} className="text-primary-light" />
                                                            ) : (
                                                                <Square size={18} />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 border-b border-border">
                                                        <div className="flex items-center gap-3">
                                                            {rental.book_cover ? (
                                                                <img src={getFileUrl(rental.book_cover)} alt="" className="w-10 h-10 object-cover rounded-lg shadow-sm border border-border" />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-surface-hover/30 border border-border rounded-lg text-text-muted flex items-center justify-center">
                                                                    <BookOpen size={16} />
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm text-text">{rental.book_title || 'Noma\'lum'}</span>
                                                                <span className="text-xs text-text-muted">{rental.book_author || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-b border-border text-sm">
                                                        {rental.invoice_number ? (
                                                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-hover border border-border text-text font-semibold">
                                                                {rental.invoice_number}
                                                            </span>
                                                        ) : (
                                                            <span className="text-text-muted text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 border-b border-border text-sm text-text-muted">{formatDateTime(rental.loan_date)}</td>
                                                    <td className="p-4 border-b border-border text-sm text-text-muted font-medium">{formatDateTime(rental.due_date)}</td>
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
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-border rounded-lg text-text font-medium text-xs hover:bg-surface-hover transition-colors"
                                                            onClick={() => { setSelectedRentalIds([rental.id]); setReturnModalOpen(true) }}
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
                <div className="flex items-center justify-between p-5 border-b border-border bg-surface-hover/40">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-text m-0">
                        <Clock size={20} className="text-primary-light" />
                        {historyDate === getTodayDateString() ? "Bugungi" : `${historyDate} sanasidagi`} tashrif buyurganlar
                        {todayRecords.length > 0 && (
                            <span className="bg-indigo-500/15 text-primary-light px-2.5 py-0.5 rounded-full text-xs font-bold">{todayRecords.length}</span>
                        )}
                    </h2>
                    <div className="flex items-center gap-3 ml-auto">
                        <DatePicker
                            value={historyDate}
                            onChange={(d) => setHistoryDate(d ? formatLocalDate(d) : getTodayDateString())}
                            className="w-52"
                        />
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-border rounded-lg text-text-muted text-xs font-medium hover:bg-surface-hover hover:text-text transition-colors" onClick={loadHistoryRecords} disabled={todayLoading}>
                            <RotateCcw size={14} /> Yangilash
                        </button>
                    </div>
                </div>

                {todayLoading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
                    </div>
                ) : todayRecords.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-text-muted opacity-60 gap-4 text-center">
                        <UserX size={48} strokeWidth={1} />
                        <p className="text-sm">Bugun hali hech kim kelmagan</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse min-w-175">
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
                                {(todayRecords || []).map((rec, i) => {
                                    const isStillInside = rec.arrival === rec.departure
                                    const roleStr = rec.role || ''
                                    const displayRoleInfo = roleStr === 'student'
                                        ? `${rec.department_name || ''} ${rec.group_name || ''}`.trim()
                                        : (rec.staff_position || roleLabels[roleStr] || roleStr)

                                    return (
                                        <tr key={rec.id} className="hover:bg-surface-hover/50 transition-colors">
                                            <td className="p-4 border-b border-border text-sm text-text-muted">{i + 1}</td>
                                            <td className="p-4 border-b border-border font-medium text-sm text-text">{rec.full_name || 'Noma\'lum'}</td>
                                            <td className="p-4 border-b border-border text-sm text-text-muted">{displayRoleInfo || '—'}</td>
                                            <td className="p-4 border-b border-border text-sm text-text-muted font-medium">{formatDateTime(rec.arrival)}</td>
                                            <td className="p-4 border-b border-border text-sm text-text-muted font-medium">{isStillInside ? '—' : formatDateTime(rec.departure)}</td>
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
               BOOK ASSIGNMENT MODAL (KO'P KITOB TOPSHIRISH)
               ═══════════════════════════════════════ */}
            {
                assignModalOpen && createPortal(
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={closeAssignModal}>
                        <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-border bg-surface-hover/40">
                                <div className="flex items-center gap-2">
                                    <BookPlus size={22} className="text-primary-light" />
                                    <div>
                                        <h3 className="text-lg font-bold text-text m-0">Kitob topshirish (biriktirish)</h3>
                                        <p className="text-xs text-text-muted m-0">Bir nechta kitobni bir vaqtning o'zida topshirish</p>
                                    </div>
                                </div>
                                <button className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-rose-400 transition-colors" onClick={closeAssignModal}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                                {/* Foydalanuvchi ma'lumotlari & Limit indikatori */}
                                <div className="flex flex-col gap-2.5 bg-surface-hover/50 p-4 rounded-xl border border-border">
                                    <div className="flex items-center justify-between gap-3 text-sm text-text">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-bold text-sm uppercase">
                                                {scannedUser?.full_name ? scannedUser.full_name.charAt(0) : '?'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-text">{scannedUser?.full_name}</span>
                                                <span className="text-[11px] text-text-muted">
                                                    ID: <span className="font-mono font-medium text-text">{scannedUser?.user_id}</span> • {roleLabels[scannedUser?.role || ''] || scannedUser?.role}
                                                </span>
                                            </div>
                                        </div>
                                        {scannedUser?.group_name && (
                                            <span className="text-xs bg-surface border border-border px-2.5 py-1 rounded-lg text-text-muted font-medium">
                                                {scannedUser.group_name}
                                            </span>
                                        )}
                                    </div>

                                    {/* 5-QOIDA: Limit statusi */}
                                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-text-muted">Kitob olish limiti:</span>
                                            <span className="font-bold text-text">Maksimum {MAX_RENTAL_LIMIT} ta</span>
                                            <span className="text-text-muted">• Hozirda ijarada: <strong className={activeRentals.length >= MAX_RENTAL_LIMIT ? 'text-rose-400' : 'text-primary-light'}>{activeRentals.length} ta</strong></span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md font-semibold ${availableSlots > 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'}`}>
                                            {availableSlots > 0 ? `Yana ${availableSlots} ta olish mumkin` : 'Limit to\'lgan (0 ta)'}
                                        </span>
                                    </div>
                                </div>

                                {/* 4-QOIDA: Qarzdorlik (Muddati o'tgan kitoblar) ogohlantirishi */}
                                {hasOverdueRentals && (
                                    <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-medium animate-pulse">
                                        <AlertTriangle size={22} className="shrink-0 text-rose-400" />
                                        <div>
                                            <strong>Diqqat: Qarzdorlik mavjud!</strong> Ushbu foydalanuvchida qaytarish muddati o'tib ketgan kitob(lar) bor. Tizim qoidalariga ko'ra yangi kitob berishdan avval muddati o'tgan kitoblarni qaytarish shart!
                                        </div>
                                    </div>
                                )}

                                {/* Umumiy sozlamalar (Sana + Izoh) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-hover/20 p-4 rounded-xl border border-border">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-text-muted uppercase tracking-wider">
                                                <Calendar size={14} /> Umumiy qaytarish muddati <span className="text-rose-400">*</span>
                                            </label>
                                            <span className="text-[11px] text-primary font-medium">Standart: 15 kun</span>
                                        </div>
                                        <DatePicker
                                            label="Muddati"
                                            placeholder="Tanlang (standart 15 kun)"
                                            value={dueDate || defaultDue}
                                            minDate={todayDate}
                                            onChange={(d) => setDueDate(d ? formatLocalDate(d) : '')}
                                            presets={[
                                                { label: 'Bugun', daysFromToday: 0 },
                                                { label: '+10 kun', daysFromToday: 10 },
                                                { label: '+15 kun (standart)', daysFromToday: 15 },
                                                { label: '+30 kun (1 oy)', daysFromToday: 30 },
                                            ]}
                                            className="w-full"
                                        />
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="text-[11px] text-text-muted mr-0.5">Tezkor:</span>
                                            {[
                                                { label: '10 kun', days: 10 },
                                                { label: '15 kun (standart)', days: 15 },
                                                { label: '30 kun (1 oy)', days: 30 },
                                            ].map((item, idx) => {
                                                const targetDate = getDefaultDueDate(item.days)
                                                const isActive = (dueDate || defaultDue) === targetDate
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setDueDate(targetDate)}
                                                        className={`px-2 py-0.5 text-xs rounded-md border transition-all ${
                                                            isActive
                                                                ? 'bg-primary text-white border-primary font-semibold shadow-xs'
                                                                : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text border-border'
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[0.8rem] font-semibold text-text-muted uppercase tracking-wider">
                                            Umumiy izoh (ixtiyoriy)
                                        </label>
                                        <input
                                            type="text"
                                            className="bg-surface border border-border px-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary transition-all placeholder:text-text-muted/60"
                                            placeholder="Masalan: Semestr darsliklari..."
                                            value={assignNotes}
                                            onChange={e => setAssignNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Kitob qidirish */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[0.8rem] font-semibold text-text-muted uppercase tracking-wider">
                                            Kitob qidirish va ro'yxatga qo'shish
                                        </label>
                                        <span className="text-xs text-text-muted">
                                            Tanlandi: <strong className={selectedBooks.length > availableSlots ? 'text-rose-400 font-bold' : 'text-text'}>{selectedBooks.length} / {availableSlots} ta</strong>
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                            <input
                                                className="w-full bg-surface-hover/30 border border-border pl-9 pr-3 py-2.5 rounded-xl text-sm text-text outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
                                                placeholder="Kitob nomi, muallifi..."
                                                value={bookSearch}
                                                onChange={e => setBookSearch(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSearchBooks()}
                                                disabled={hasOverdueRentals || availableSlots <= 0 || isSearchingBooks}
                                            />
                                            {bookSearch && !isSearchingBooks && (
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                                                    onClick={() => { setBookSearch(''); setSearchResults([]); }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="flex items-center justify-center gap-1.5 px-4 rounded-xl bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/20 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleSearchBooks}
                                            disabled={hasOverdueRentals || availableSlots <= 0 || isSearchingBooks}
                                        >
                                            {isSearchingBooks ? <Loader2 size={16} className="animate-spin" /> : null}
                                            {isSearchingBooks ? "Qidirilmoqda..." : "Qidirish"}
                                        </button>
                                    </div>

                                    {/* Qidiruv natijalari */}
                                    {searchResults.length > 0 && (
                                        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto border border-border rounded-xl p-1.5 bg-surface-hover/30 custom-scrollbar">
                                            {searchResults.map(book => {
                                                const isAlreadyAdded = selectedBooks.some(item => item.book.id === book.id)
                                                const isAlreadyBorrowed = activeRentals.some(r => r.book_id === book.id)
                                                const isAvailable = (book.available_quantity || 0) > 0 && !isAlreadyBorrowed
                                                const pubYear = formatPublicationYear(book)

                                                return (
                                                    <div
                                                        key={book.id}
                                                        className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${
                                                            isAlreadyAdded
                                                                ? 'bg-primary/10 border-l-4 border-l-primary cursor-default'
                                                                : isAlreadyBorrowed
                                                                ? 'bg-amber-500/10 border-l-4 border-l-amber-500 cursor-not-allowed opacity-80'
                                                                : isAvailable
                                                                ? 'hover:bg-surface-hover cursor-pointer border-l-4 border-l-transparent'
                                                                : 'opacity-50 cursor-not-allowed border-l-4 border-l-transparent'
                                                        }`}
                                                        onClick={() => {
                                                            if (isAvailable && !isAlreadyAdded && !isAlreadyBorrowed) {
                                                                handleAddBookToAssign(book)
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 pr-3">
                                                            {book.cover_image_url ? (
                                                                <img src={getFileUrl(book.cover_image_url)} alt="" className="w-8 h-10 object-cover rounded shadow-xs shrink-0" />
                                                            ) : (
                                                                <div className="w-8 h-10 bg-surface-hover rounded flex items-center justify-center text-text-muted shrink-0">
                                                                    <BookOpen size={14} />
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col min-w-0">
                                                                <strong className="text-sm truncate text-text">{highlightText(book.title, bookSearch)}</strong>
                                                                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                                                                    <span className="truncate">{highlightText(book.author, bookSearch)}</span>
                                                                    {pubYear && (
                                                                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-text-muted bg-surface/90 border border-border px-1.5 py-0.5 rounded-md">
                                                                            <Calendar size={11} className="text-primary-light" />
                                                                            {highlightText(pubYear, bookSearch)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAvailable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                                {isAlreadyBorrowed ? 'Ijarada' : isAvailable ? `${book.available_quantity} ta` : 'Yo\'q'}
                                                            </span>

                                                            {isAlreadyAdded ? (
                                                                <span className="inline-flex items-center gap-1 text-xs text-primary-light font-semibold bg-primary/20 px-2 py-1 rounded-md">
                                                                    <CheckCircle2 size={12} /> Qo'shilgan
                                                                </span>
                                                            ) : isAlreadyBorrowed ? (
                                                                <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-semibold bg-amber-500/15 border border-amber-500/20 px-2 py-1 rounded-md" title="Talabada ushbu kitob mavjud (hali qaytarilmagan)">
                                                                    <Clock size={12} /> Ijarada bor
                                                                </span>
                                                            ) : isAvailable ? (
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex items-center gap-1 text-xs bg-primary text-white hover:bg-primary-hover px-2.5 py-1 rounded-md font-semibold transition-colors disabled:opacity-50"
                                                                    disabled={selectedBooks.length >= availableSlots || hasOverdueRentals}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleAddBookToAssign(book)
                                                                    }}
                                                                >
                                                                    <Plus size={12} /> Qo'shish
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Tanlangan kitoblar ro'yxati */}
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[0.8rem] font-bold text-text uppercase tracking-wider">
                                                Biriktirilayotgan kitoblar ro'yxati
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${selectedBooks.length > availableSlots ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-primary/20 text-primary-light border-primary/30'}`}>
                                                {selectedBooks.length} ta {selectedBooks.length > availableSlots ? `(limitdan ${selectedBooks.length - availableSlots} ta ko'p!)` : ''}
                                            </span>
                                        </div>
                                        {selectedBooks.length > 0 && (
                                            <button
                                                type="button"
                                                className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium"
                                                onClick={() => setSelectedBooks([])}
                                            >
                                                Barchasini tozalash
                                            </button>
                                        )}
                                    </div>

                                    {selectedBooks.length === 0 ? (
                                        <div className="p-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center text-text-muted gap-2 bg-surface-hover/10">
                                            <BookOpen size={36} className="opacity-30 text-primary-light mb-1" />
                                            <p className="text-sm font-semibold text-text m-0">Hali kitob tanlanmadi</p>
                                            <p className="text-xs text-text-muted m-0 max-w-md">
                                                Yuqoridagi qidiruv maydonidan kerakli kitoblarni topib, "Qo'shish" tugmasini bosing va har bir kitobning unikal invois raqamini kiriting.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {selectedBooks.map((item, index) => {
                                                const pubYear = formatPublicationYear(item.book)
                                                const isDuplicateInvoice = item.invoiceNumber.trim() && duplicateInvoices.has(item.invoiceNumber.trim().toLowerCase())

                                                return (
                                                    <div
                                                        key={item.book.id}
                                                        className={`flex flex-col p-3.5 bg-surface border rounded-xl shadow-xs transition-all ${isDuplicateInvoice ? 'border-rose-500 bg-rose-500/5' : 'border-border hover:border-border/80'}`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <span className="w-6 h-6 rounded-full bg-surface-hover text-text-muted font-bold text-xs flex items-center justify-center shrink-0">
                                                                    {index + 1}
                                                                </span>
                                                                {item.book.cover_image_url ? (
                                                                    <img src={getFileUrl(item.book.cover_image_url)} alt="" className="w-9 h-12 object-cover rounded shadow-xs shrink-0" />
                                                                ) : (
                                                                    <div className="w-9 h-12 bg-surface-hover rounded flex items-center justify-center text-text-muted shrink-0">
                                                                        <BookOpen size={16} />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-sm font-bold text-text truncate">{item.book.title}</span>
                                                                    <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                                                                        <span className="truncate">{item.book.author}</span>
                                                                        {pubYear && (
                                                                            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-text-muted bg-surface-hover/80 border border-border px-1.5 py-0.5 rounded-md">
                                                                                <Calendar size={11} className="text-primary-light" />
                                                                                {pubYear}
                                                                            </span>
                                                                        )}
                                                                        {item.dueDate && (
                                                                            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                                                                                Alohida muddat: {item.dueDate}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                <div className="flex flex-col flex-1 sm:w-48">
                                                                    <div className="relative">
                                                                        <Hash size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                                                        <input
                                                                            type="text"
                                                                            className={`w-full bg-surface-hover/50 border pl-7 pr-2.5 py-1.5 rounded-lg text-xs font-mono text-text outline-none focus:bg-surface transition-all placeholder:font-sans placeholder:text-text-muted/60 ${isDuplicateInvoice ? 'border-rose-500 focus:border-rose-500' : 'border-border focus:border-primary'}`}
                                                                            placeholder="Invois raqami *"
                                                                            value={item.invoiceNumber}
                                                                            onChange={e => handleUpdateBookInvoice(item.book.id, e.target.value)}
                                                                        />
                                                                    </div>
                                                                    {isDuplicateInvoice && (
                                                                        <span className="text-[10px] text-rose-400 mt-1 font-medium">Invois takrorlangan!</span>
                                                                    )}
                                                                </div>

                                                                {/* 8-QOIDA: Alohida sozlamalar (muddat/izoh) tugmasi */}
                                                                <button
                                                                    type="button"
                                                                    className={`px-2 py-1.5 text-xs rounded-lg border transition-colors shrink-0 flex items-center gap-1 ${item.showCustomSettings || item.dueDate || item.notes ? 'bg-primary/20 text-primary-light border-primary/30 font-semibold' : 'bg-surface hover:bg-surface-hover text-text-muted border-border'}`}
                                                                    onClick={() => handleToggleBookCustomSettings(item.book.id)}
                                                                    title="Alohida muddat va izoh belgilash"
                                                                >
                                                                    <Settings2 size={13} />
                                                                    <span className="hidden md:inline">Alohida</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="p-2 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                                                                    onClick={() => handleRemoveBookFromAssign(item.book.id)}
                                                                    title="Ro'yxatdan o'chirish"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* 8-QOIDA: Har bir kitob uchun kengaytirilgan alohida muddat va izoh paneli */}
                                                        {item.showCustomSettings && (
                                                            <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-hover/20 p-2.5 rounded-lg">
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[11px] font-semibold text-text-muted flex items-center justify-between">
                                                                        <span>Ushbu kitob uchun alohida muddat:</span>
                                                                        {item.dueDate && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateBookDueDate(item.book.id, '')}
                                                                                className="text-[10px] text-rose-400 hover:underline"
                                                                            >
                                                                                Umumiysini qo'llash
                                                                            </button>
                                                                        )}
                                                                    </label>
                                                                    <DatePicker
                                                                        label=""
                                                                        placeholder={dueDate || defaultDue ? `Umumiy: ${dueDate || defaultDue}` : "Alohida muddat tanlang"}
                                                                        value={item.dueDate || ''}
                                                                        minDate={todayDate}
                                                                        onChange={(d) => handleUpdateBookDueDate(item.book.id, d ? formatLocalDate(d) : '')}
                                                                        presets={[
                                                                            { label: 'Bugun', daysFromToday: 0 },
                                                                            { label: '+10 kun', daysFromToday: 10 },
                                                                            { label: '+15 kun', daysFromToday: 15 },
                                                                            { label: '+30 kun', daysFromToday: 30 },
                                                                            { label: '+90 kun (semestr)', daysFromToday: 90 },
                                                                        ]}
                                                                        className="w-full text-xs"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[11px] font-semibold text-text-muted">
                                                                        Ushbu kitob uchun alohida izoh:
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        className="bg-surface border border-border px-2.5 py-1.5 rounded-lg text-xs text-text outline-none focus:border-primary transition-all placeholder:text-text-muted/60"
                                                                        placeholder="Masalan: Holati yaxshi, 1-tom..."
                                                                        value={item.notes || ''}
                                                                        onChange={e => handleUpdateBookNotes(item.book.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-5 border-t border-border bg-surface-hover/40 shrink-0">
                                <div className="flex flex-col">
                                    <span className="text-sm text-text-muted font-medium">
                                        Jami: <strong className={selectedBooks.length > availableSlots ? 'text-rose-400 font-bold' : 'text-text'}>{selectedBooks.length} ta kitob</strong>
                                    </span>
                                    {selectedBooks.length > availableSlots && (
                                        <span className="text-xs text-rose-400 font-medium">
                                            Limitdan {selectedBooks.length - availableSlots} ta ortiqcha tanlandi!
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text bg-transparent hover:bg-surface-hover transition-colors"
                                        onClick={closeAssignModal}
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="button"
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white border-none rounded-xl text-sm font-bold hover:bg-primary-hover shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                        onClick={handleAssignBooks}
                                        disabled={
                                            selectedBooks.length === 0 ||
                                            selectedBooks.length > availableSlots ||
                                            hasOverdueRentals ||
                                            duplicateInvoices.size > 0 ||
                                            selectedBooks.some(b => !b.invoiceNumber.trim()) ||
                                            assignLoading
                                        }
                                    >
                                        {assignLoading ? <Loader2 size={18} className="animate-spin" /> : (
                                            <>
                                                <BookPlus size={18} />
                                                {selectedBooks.length > 1 ? `${selectedBooks.length} ta kitobni topshirish` : 'Kitobni topshirish'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* ═══════════════════════════════════════
               BOOK RETURN MODAL (BIR YOKI BIR NECHTA KITOBNI QABUL QILISH)
               ═══════════════════════════════════════ */}
            {
                returnModalOpen && createPortal(
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-1000 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={closeReturnModal}>
                        <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-border bg-surface-hover/40">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-text m-0">
                                    <RotateCcw size={20} className="text-primary-light" />
                                    Kitoblarni qabul qilish (qaytarish)
                                </h3>
                                <button className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-rose-400 transition-colors" onClick={closeReturnModal}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                                    <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-bold m-0">Diqqat!</p>
                                        <p className="text-xs leading-relaxed font-medium opacity-90 m-0">
                                            {selectedRentalIds.length === 1 ? (
                                                `1 ta kitobni kutubxonaga qaytarildi deb belgilamoqchimisiz?`
                                            ) : (
                                                `Tanlangan ${selectedRentalIds.length} ta kitobni kutubxonaga qaytarildi deb qabul qilmoqchimisiz?`
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Qaytarilayotgan kitoblar ro'yxati */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-[0.8rem] font-bold text-text-muted uppercase tracking-wider">
                                        Qabul qilinayotgan kitoblar ({selectedRentalIds.length} ta):
                                    </span>
                                    <div className="flex flex-col gap-2 max-h-52 overflow-y-auto border border-border rounded-xl p-2 bg-surface-hover/30 custom-scrollbar">
                                        {sortedRentals.filter(r => selectedRentalIds.includes(r.id)).map(r => {
                                            const deadline = getDeadlineInfo(r.due_date)
                                            return (
                                                <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 bg-surface rounded-lg border border-border/60">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {r.book_cover ? (
                                                            <img src={getFileUrl(r.book_cover)} alt="" className="w-8 h-10 object-cover rounded shadow-xs shrink-0" />
                                                        ) : (
                                                            <div className="w-8 h-10 bg-surface-hover rounded flex items-center justify-center text-text-muted shrink-0">
                                                                <BookOpen size={14} />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs font-bold text-text truncate">{r.book_title || 'Noma\'lum'}</span>
                                                            <span className="text-[11px] text-text-muted truncate">{r.book_author || '—'}</span>
                                                            {r.invoice_number && (
                                                                <span className="font-mono text-[10px] text-text-muted">Invois: #{r.invoice_number}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${deadline.color === 'danger' ? 'bg-red-500/15 text-red-400 border-red-500/20' : deadline.color === 'warning' ? 'bg-amber-500/15 text-amber-500 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'}`}>
                                                        {deadline.label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[0.8rem] font-semibold text-text-muted uppercase tracking-wider">
                                        Izoh (ixtiyoriy)
                                    </label>
                                    <textarea
                                        className="bg-surface-hover/30 border border-border px-4 py-3 rounded-xl text-sm text-text outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all resize-none min-h-20"
                                        placeholder="Kitoblar holati haqida qisqacha ma'lumot (masalan: kitoblar toza, sahifalari butun holatda qabul qilindi)..."
                                        value={returnNotes}
                                        onChange={e => setReturnNotes(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-surface-hover/40 shrink-0">
                                <button
                                    type="button"
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text bg-transparent hover:bg-surface-hover transition-colors"
                                    onClick={closeReturnModal}
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white border-none rounded-xl text-sm font-bold hover:bg-primary-hover shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-32.5"
                                    onClick={handleReturnConfirm}
                                    disabled={returnLoading || selectedRentalIds.length === 0}
                                >
                                    {returnLoading ? <Loader2 size={18} className="animate-spin" /> : (
                                        <>
                                            <RotateCcw size={18} />
                                            {selectedRentalIds.length > 1 ? `${selectedRentalIds.length} ta kitobni qabul qilish` : 'Qabul qilish'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div >
    )
}
