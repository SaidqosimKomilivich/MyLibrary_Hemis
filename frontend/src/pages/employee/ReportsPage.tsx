import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { CustomSelect, type SelectOption } from '../../components/CustomSelect'
import { Loader2, ArrowRightLeft, BookOpen, Clock, AlertCircle, Users, Download } from 'lucide-react'
import { toast } from 'react-toastify'
import { DatePicker } from '../../components/DatePicker'
import { formatDateTime } from '../../utils/dateUtils'

type ReportType = 'rentals' | 'controls' | 'submissions' | 'users_statistics' | 'book_inventory' | 'overdue_rentals' | 'gate_control' | 'book_requests' | 'books_added' | 'staff_book_counts'

interface ReportConfig {
    type: ReportType
    title: string
    icon: React.ReactNode
    colorClass: string
    buttonClass: string
    filterMode: 'date' | 'users' | 'books' | 'teacher' | 'staff' | 'staffBookCounts'
    columns: string[]
    renderRow: (item: any, idx: number) => React.ReactNode
}

const REPORT_CONFIGS: ReportConfig[] = [
    {
        type: 'users_statistics',
        title: "Foydalanuvchilar",
        icon: <Users size={20} />,
        colorClass: "text-indigo-400",
        buttonClass: "bg-linear-to-br from-indigo-500 to-indigo-600",
        filterMode: 'users',
        columns: ["F.I.SH", "Fakultet / Bo'lim", "Mutaxassislik", "Guruh", "Lavozim", "Ro'yxatdan o'tgan"],
        renderRow: (item) => (
            <>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.full_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.department_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.specialty_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.group_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.staff_position || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.created_at ? formatDateTime(item.created_at) : '-'}</td>
            </>
        )
    },
    {
        type: 'book_inventory',
        title: "Kitob fondi holati",
        icon: <BookOpen size={20} />,
        colorClass: "text-slate-400",
        buttonClass: "bg-linear-to-br from-slate-500 to-slate-600",
        filterMode: 'books',
        columns: ["Kitob nomi", "Muallif", "Soni", "Ijara", "Javon"],
        renderRow: (item) => (
            <>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.title || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.author || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-emerald-400 font-medium">{item.total_quantity || 0}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-orange-400 font-medium">{item.rented_count || 0}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.shelf_location || '-'}</td>
            </>
        )
    },
    {
        type: 'overdue_rentals',
        title: "Qarzdorlar (Muddati o'tgan)",
        icon: <AlertCircle size={20} />,
        colorClass: "text-red-400",
        buttonClass: "bg-linear-to-br from-red-500 to-red-600",
        filterMode: 'date',
        columns: ["Foydalanuvchi", "Kitob", "Berilgan", "Muddati", "Kechikish (kun)"],
        renderRow: (item) => (
            <>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.user_full_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.book_title || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.loan_date ? formatDateTime(item.loan_date) : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.due_date ? formatDateTime(item.due_date) : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-red-400 font-bold">{item.overdue_days || 0} kun</td>
            </>
        )
    },
    {
        type: 'rentals',
        title: "Ijaralar",
        icon: <BookOpen size={20} />,
        colorClass: "text-blue-400",
        buttonClass: "bg-linear-to-br from-blue-500 to-blue-600",
        filterMode: 'date',
        columns: ["Kitob", "Foydalanuvchi", "Holat", "Berildi", "Qaytardi"],
        renderRow: (item) => (
            <>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.book_title || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.user_full_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium">
                    <span className={`px-2.5 py-1 rounded-full text-[0.75rem] ${item.status === 'returned' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {item.status}
                    </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.loan_date ? formatDateTime(item.loan_date) : '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.return_date ? formatDateTime(item.return_date) : '-'}</td>
            </>
        )
    },
    {
        type: 'gate_control',
        title: "Kirish-chiqish nazorati",
        icon: <ArrowRightLeft size={20} />,
        colorClass: "text-teal-400",
        buttonClass: "bg-linear-to-br from-teal-500 to-teal-600",
        filterMode: 'date',
        columns: ["To'liq ism", "Lavozim/Guruh", "Kelgan", "Ketgan"],
        renderRow: (item) => {
            const pos = item.role === 'student'
                ? `${item.department_name || ''} ${item.group_name || ''}`.trim()
                : item.staff_position || '-'
            return (
                <>
                    <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.full_name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{pos || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-emerald-400">{item.arrival ? formatDateTime(item.arrival) : '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-red-400">{item.departure ? formatDateTime(item.departure) : '-'}</td>
                </>
            )
        }
    },
    {
        type: 'book_requests',
        title: "Kitob so'rovlari",
        icon: <Clock size={20} />,
        colorClass: "text-orange-400",
        buttonClass: "bg-linear-to-br from-orange-500 to-orange-600",
        filterMode: 'date',
        columns: ["So'rovchi", "Kitob", "Turi", "Holati", "Sana"],
        renderRow: (item) => (
            <>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.user_full_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.book_title || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.request_type === 'physical' ? "Kitob/qog'oz" : 'Elektron/Audio'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem]">
                    <span className={`px-2.5 py-1 rounded-full text-[0.75rem] font-medium border ${item.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        item.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            item.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {item.status === 'pending' ? 'Kutilmoqda' : item.status === 'processing' ? "Ko'rilmoqda" : item.status === 'ready' ? 'Tayyor' : 'Rad etildi'}
                    </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.created_at ? formatDateTime(item.created_at) : '-'}</td>
            </>
        )
    },
    {
        type: 'submissions',
        title: "O'qituvchilar taqdim etgan",
        icon: <BookOpen size={20} />,
        colorClass: "text-purple-400",
        buttonClass: "bg-linear-to-br from-purple-500 to-purple-600",
        filterMode: 'teacher',
        columns: ["Kitob", "Muallif", "Holat", "Sana"],
        renderRow: (item) => (
            <>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.title || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.author || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.status || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.submitted_at ? formatDateTime(item.submitted_at) : '-'}</td>
            </>
        )
    },
    {
        type: 'books_added' as const,
        title: "Xodimlar qo'shgan kitoblar",
        icon: <BookOpen size={20} />,
        colorClass: "text-cyan-400",
        buttonClass: "bg-linear-to-br from-cyan-500 to-cyan-600",
        filterMode: 'staff' as const,
        columns: ["Kitob nomi", "Muallif", "Kategoriya", "Til", "Format", "Nusxa", "Xodim", "Qo'shilgan"],
        renderRow: (item: any) => (
            <>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] font-medium text-text">{item.title || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.author || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.category || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.language || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.format || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-emerald-400 font-medium">{item.total_quantity ?? 0}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-indigo-300 font-medium">{item.added_by_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[0.9rem] text-text-muted">{item.created_at ? formatDateTime(item.created_at) : '-'}</td>
            </>
        )
    }
]

function ReportSection({ config }: { config: ReportConfig }) {
    const today = new Date().toISOString().split('T')[0]

    // Date filters (for non-users reports)
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)

    // User-specific filters
    const [userStatus, setUserStatus] = useState('')
    const [userDepartment, setUserDepartment] = useState('')
    const [userGroup, setUserGroup] = useState('')

    // Book-specific filters
    const [bookCategory, setBookCategory] = useState('')
    const [bookLanguage, setBookLanguage] = useState('')
    const [bookFormat, setBookFormat] = useState('')
    const [bookTeacher, setBookTeacher] = useState('')
    // Staff filter (books_added)
    const [staffId, setStaffId] = useState('')
    const [staffOptions, setStaffOptions] = useState<SelectOption[]>([])

    // Fetched options for users filter
    const [deptOptions, setDeptOptions] = useState<SelectOption[]>([])
    const [groupOptions, setGroupOptions] = useState<SelectOption[]>([])

    // Fetched options for books filter
    const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([])
    const [languageOptions, setLanguageOptions] = useState<SelectOption[]>([])
    const [formatOptions, setFormatOptions] = useState<SelectOption[]>([])
    const [teacherOptions, setTeacherOptions] = useState<SelectOption[]>([])

    const [previewData, setPreviewData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)

    const getUserFilters = () =>
        config.filterMode === 'users' ? {
            status: userStatus || undefined,
            department: userDepartment || undefined,
            group_name: userGroup || undefined,
        } : undefined

    const getBookFilters = () => {
        if (config.filterMode === 'books') {
            return {
                category: bookCategory || undefined,
                language: bookLanguage || undefined,
                format: bookFormat || undefined,
                teacher_id: bookTeacher || undefined,
            }
        }
        if (config.filterMode === 'teacher') {
            return {
                teacher_id: bookTeacher || undefined,
            }
        }
        if (config.filterMode === 'staff') {
            return {
                staff_id: staffId || undefined,
            }
        }
        return undefined
    }

    // Re-fetch on filter changes
    const deps = config.filterMode === 'users'
        ? [config.type, userStatus, userDepartment, userGroup]
        : config.filterMode === 'books'
            ? [config.type, bookCategory, bookLanguage, bookFormat, bookTeacher]
            : config.filterMode === 'teacher'
                ? [config.type, bookTeacher]
                : config.filterMode === 'staff'
                    ? [config.type, staffId]
                    : [config.type, startDate, endDate]

    // Fetch dynamic filter options once on mount if this is the users report
    useEffect(() => {
        if (config.filterMode === 'users') {
            api.getReportFilterOptions()
                .then(res => {
                    if (res.success && res.data) {
                        const depts: SelectOption[] = [
                            { label: "Fakultet / Bo'lim (barchasi)", value: '' },
                            ...[...new Set([...res.data.departments, ...res.data.specialties])].map(d => ({ label: d, value: d }))
                        ]
                        const groups: SelectOption[] = [
                            { label: "Guruh (barchasi)", value: '' },
                            ...res.data.groups.map(g => ({ label: g, value: g }))
                        ]
                        setDeptOptions(depts)
                        setGroupOptions(groups)
                    }
                })
                .catch(() => { /* skip */ })
        } else if (config.filterMode === 'books' || config.filterMode === 'teacher') {
            api.getBookFilterOptions()
                .then(res => {
                    if (res.success && res.data) {
                        const cats: SelectOption[] = [
                            { label: "Kategoriya (barchasi)", value: '' },
                            ...res.data.categories.map(c => ({ label: c, value: c }))
                        ]
                        const langs: SelectOption[] = [
                            { label: "Til (barchasi)", value: '' },
                            ...res.data.languages.map(l => ({ label: l, value: l }))
                        ]
                        const forms: SelectOption[] = [
                            { label: "Format (barchasi)", value: '' },
                            ...res.data.formats.map(f => ({ label: f, value: f }))
                        ]
                        const teachs: SelectOption[] = [
                            { label: "O'qituvchi (barchasi)", value: '' },
                            ...res.data.teachers.map(t => ({ label: t.full_name, value: t.id }))
                        ]
                        setCategoryOptions(cats)
                        setLanguageOptions(langs)
                        setFormatOptions(forms)
                        setTeacherOptions(teachs)
                    }
                })
                .catch(() => { /* skip */ })
        } else if (config.filterMode === 'staff') {
            // Load staff (kutubxona xodimlari)
            api.getStaff({ per_page: 200 })
                .then(res => {
                    if (res.success && res.data) {
                        const opts: SelectOption[] = [
                            { label: "Xodim (barchasi)", value: '' },
                            ...res.data.map((u: any) => ({ label: u.full_name || u.user_id, value: u.id }))
                        ]
                        setStaffOptions(opts)
                    }
                })
                .catch(() => { /* skip */ })
        }
    }, [config.filterMode])

    useEffect(() => {
        const fetchPreview = async () => {
            setLoading(true)
            try {
                const res = await api.getReportPreview(
                    config.type,
                    config.filterMode === 'date' ? startDate : undefined,
                    config.filterMode === 'date' ? endDate : undefined,
                    getUserFilters(),
                    getBookFilters()
                )
                setPreviewData(res.success && res.data ? res.data : [])
            } catch {
                setPreviewData([])
            } finally {
                setLoading(false)
            }
        }
        fetchPreview()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    const handleExport = async () => {
        if (config.filterMode === 'staffBookCounts') {
            toast.info("Bu hisobot uchun hali Excel eksport qilinmagan.")
            return
        }
        setExporting(true)
        try {
            const blob = await api.exportReportExcel(
                config.type,
                config.filterMode === 'date' ? startDate : undefined,
                config.filterMode === 'date' ? endDate : undefined,
                getUserFilters(),
                getBookFilters()
            )
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `report_${config.type}_${today}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success("Excel fayl muvaffaqiyatli yuklandi!")
        } catch (err: any) {
            toast.warning(err.message || "Xatolik yuz berdi", {
                icon: <AlertCircle size={24} color="#f59e0b" />
            })
        } finally {
            setExporting(false)
        }
    }
    // Export note: book filters also passed via getBookFilters():

    return (
        <div className="bg-surface border border-border rounded-[20px] overflow-hidden flex flex-col mb-8">
            {/* Header row */}
            <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-hover/30">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center shrink-0 ${config.colorClass}`}>
                        {config.icon}
                    </div>
                    <h3 className="m-0 text-text text-[1.15rem] font-semibold">{config.title}</h3>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {config.filterMode === 'date' ? (
                        <>
                            <DatePicker
                                label="dan"
                                value={startDate}
                                onChange={(d) => setStartDate(d ? d.toISOString().split('T')[0] : '')}
                                className="h-10"
                            />
                            <DatePicker
                                label="gacha"
                                value={endDate}
                                onChange={(d) => setEndDate(d ? d.toISOString().split('T')[0] : '')}
                                className="h-10"
                            />
                        </>
                    ) : config.filterMode === 'staff' ? (
                        <>
                            <div className="flex-1 min-w-50 max-w-70">
                                <CustomSelect
                                    value={staffId}
                                    onChange={setStaffId}
                                    options={staffOptions}
                                    placeholder="Xodim..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>
                        </>
                    ) : config.filterMode === 'teacher' ? (
                        <>
                            {/* O'qituvchilar */}
                            <div className="flex-1 min-w-45 max-w-60">
                                <CustomSelect
                                    value={bookTeacher}
                                    onChange={setBookTeacher}
                                    options={teacherOptions}
                                    placeholder="O'qituvchi..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>
                        </>
                    ) : config.filterMode === 'books' ? (
                        <>
                            {/* Kitob Kategoriyasi */}
                            <div className="flex-1 min-w-35 max-w-50">
                                <CustomSelect
                                    value={bookCategory}
                                    onChange={setBookCategory}
                                    options={categoryOptions}
                                    placeholder="Kategoriya..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>

                            {/* Kitob Tili */}
                            <div className="w-35">
                                <CustomSelect
                                    value={bookLanguage}
                                    onChange={setBookLanguage}
                                    options={languageOptions}
                                    placeholder="Til..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>

                            {/* Kitob Formati */}
                            <div className="w-35">
                                <CustomSelect
                                    value={bookFormat}
                                    onChange={setBookFormat}
                                    options={formatOptions}
                                    placeholder="Format..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>

                            {/* O'qituvchilar */}
                            <div className="flex-1 min-w-45 max-w-60">
                                <CustomSelect
                                    value={bookTeacher}
                                    onChange={setBookTeacher}
                                    options={teacherOptions}
                                    placeholder="O'qituvchi..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Faol / Nofaol */}
                            <div className="w-40">
                                <CustomSelect
                                    value={userStatus}
                                    onChange={setUserStatus}
                                    options={[
                                        { label: "Holat (barchasi)", value: "" },
                                        { label: "Faol", value: "active" },
                                        { label: "Nofaol", value: "inactive" },
                                    ]}
                                    placeholder="Holat (barchasi)"
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>

                            {/* Fakultet / Bo'lim / Kafedra */}
                            <div className="flex-1 min-w-45 max-w-70">
                                <CustomSelect
                                    value={userDepartment}
                                    onChange={setUserDepartment}
                                    options={deptOptions}
                                    placeholder="Fakultet / Bo'lim yozish..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>

                            {/* Guruh */}
                            <div className="w-40">
                                <CustomSelect
                                    value={userGroup}
                                    onChange={setUserGroup}
                                    options={groupOptions}
                                    placeholder="Guruh..."
                                    buttonClassName="h-10 text-[0.85rem] px-3 bg-background border border-border rounded-lg"
                                    fitContent={false}
                                />
                            </div>
                        </>
                    )}

                    <button
                        className={`flex items-center justify-center gap-2 px-4 h-10 rounded-lg border-none font-semibold text-[0.9rem] cursor-pointer transition-all text-white ${config.buttonClass} hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none`}
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Yuklab olish
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto relative min-h-25">
                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <Loader2 size={32} className={`${config.colorClass} animate-spin`} />
                    </div>
                )}
                <table className="w-full min-w-200 border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-surface-hover/20">
                            <th className="px-4 py-3 text-left text-[0.8rem] font-semibold text-text-muted uppercase tracking-wider w-12">#</th>
                            {config.columns.map((col, i) => (
                                <th key={i} className="px-4 py-3 text-left text-[0.8rem] font-semibold text-text-muted uppercase tracking-wider">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewData.length === 0 ? (
                            <tr>
                                <td colSpan={config.columns.length + 1} className="px-4 py-12 text-center text-text-muted text-[0.95rem]">
                                    Filtrlarga mos ma'lumot topilmadi
                                </td>
                            </tr>
                        ) : (
                            previewData.map((item, idx) => (
                                <tr key={idx} className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors last:border-b-0">
                                    <td className="px-4 py-3 whitespace-nowrap text-[0.85rem] text-text-muted font-mono">{idx + 1}</td>
                                    {config.renderRow(item, idx)}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {/* {previewData.length > 0 && (
                    <div className="px-4 py-2 text-center text-[0.85rem] text-text-muted border-t border-border bg-surface-hover/10 font-medium">
                        Namuna sifatida dastlabki 15 ta ma'lumot ko'rsatilmoqda
                    </div>
                )} */}
            </div>
        </div>
    )
}

export default function ReportsPage() {
    return (
        <div className="p-8 md:p-10 max-w-400 mx-auto min-h-screen">
            <div className="flex flex-col">
                {REPORT_CONFIGS.map(config => (
                    <ReportSection key={config.type} config={config} />
                ))}
            </div>
        </div>
    )
}
