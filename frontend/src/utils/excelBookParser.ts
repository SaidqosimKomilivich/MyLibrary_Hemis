import * as XLSX from 'xlsx'
import type { CreateBookRequest } from '../services/api.types'

export interface ParsedBookRow {
    rawIndex: number
    title: string
    author: string
    category: string
    originalCategory?: string
    language: string
    originalLanguage?: string
    publicationDate?: number
    genre: string
    originalGenre?: string
    totalQuantity: number
    availableQuantity: number
    priceOrDescription?: string
    coverImageUrl: string
    isValid: boolean
    errors: string[]
    warnings: string[]
}

export interface ParseResult {
    rows: ParsedBookRow[]
    totalCount: number
    validCount: number
    errorCount: number
}

// ==========================================
// 1. AQLLI NORMAYALASHTIRISH (SMART NORMALIZERS)
// ==========================================

export function normalizeLanguage(raw?: string | null): { code: string; label: string } {
    if (!raw) return { code: 'uz', label: 'O‘zbekcha' }
    const val = raw.toLowerCase().trim()

    if (
        val.includes("o'zbek") ||
        val.includes('o‘zbek') ||
        val.includes('ozbek') ||
        val.includes('uzb') ||
        val === 'uz' ||
        val.includes('lotin')
    ) {
        return { code: 'uz', label: 'O‘zbekcha' }
    }
    if (val.includes('kirill') || val.includes('кирилл') || val === 'uz_cyr') {
        return { code: 'uz_cyr', label: 'O‘zbekcha (Kirill)' }
    }
    if (val.includes('rus') || val === 'ru' || val.includes('рус')) {
        return { code: 'ru', label: 'Ruscha' }
    }
    if (val.includes('ingliz') || val.includes('eng') || val === 'en' || val.includes('angl')) {
        return { code: 'en', label: 'Inglizcha' }
    }
    if (val.includes('turk') || val === 'tr') {
        return { code: 'tr', label: 'Turkcha' }
    }
    if (val.includes('arab') || val === 'ar') {
        return { code: 'ar', label: 'Arabcha' }
    }
    return { code: raw.trim(), label: raw.trim() }
}

export function normalizeGenre(raw?: string | null): { code: string; label: string } {
    if (!raw) return { code: 'darslik', label: 'Darslik' }
    const val = raw.toLowerCase().trim()

    if (val.includes('darslik') || val.includes('дарслик') || val.includes('textbook')) {
        return { code: 'darslik', label: 'Darslik' }
    }
    if (
        val.includes('qo‘llanma') ||
        val.includes('qollanma') ||
        val.includes("qo'llanma") ||
        val.includes('қўлланма') ||
        val.includes('qullanma')
    ) {
        return { code: 'oquv_qollanma', label: 'O‘quv qo‘llanma' }
    }
    if (val.includes('metodik') || val.includes('metodika') || val.includes('методик')) {
        return { code: 'metodik_qollanma', label: 'Metodik qo‘llanma' }
    }
    if (val.includes('monografiya') || val.includes('монография')) {
        return { code: 'monografiya', label: 'Ilmiy monografiya' }
    }
    if (
        val.includes('maqola') ||
        val.includes('tezis') ||
        val.includes('to‘plam') ||
        val.includes('maqolalar')
    ) {
        return { code: 'ilmiy_maqola_tezis', label: 'Ilmiy maqola va tezislar' }
    }
    if (
        val.includes('badiiy') ||
        val.includes('roman') ||
        val.includes('qissa') ||
        val.includes('hikoya') ||
        val.includes('she\'r') ||
        val.includes('she’r')
    ) {
        return { code: 'badiiy_adabiyot', label: 'Badiiy adabiyot' }
    }
    if (
        val.includes('lug‘at') ||
        val.includes('lugat') ||
        val.includes('ensiklopediya') ||
        val.includes('qomus')
    ) {
        return { code: 'lugat_qomus', label: 'Lug‘at va ensiklopediya' }
    }
    if (val.includes('ommabop')) {
        return { code: 'ilmiy_ommabop', label: 'Ilmiy-ommabop' }
    }
    return { code: raw.trim(), label: raw.trim() }
}

export function normalizeCategory(raw?: string | null): { code: string; label: string } {
    if (!raw) return { code: 'boshqa', label: 'Boshqa sohalar' }
    const val = raw.toLowerCase().trim()

    if (
        val.includes('it') ||
        val.includes('axborot') ||
        val.includes('dastur') ||
        val.includes('kompyuter') ||
        val.includes('algoritm') ||
        val.includes('texnolog') ||
        val.includes('kiber')
    ) {
        return { code: 'it_texnologiya', label: 'IT va Axborot texnologiyalari' }
    }
    if (val.includes('matematika') || val.includes('mexanika') || val.includes('aniq')) {
        return { code: 'aniq_fanlar', label: 'Aniq fanlar' }
    }
    if (
        val.includes('fizika') ||
        val.includes('kimyo') ||
        val.includes('biologiya') ||
        val.includes('geograf') ||
        val.includes('tabiiy')
    ) {
        return { code: 'tabiiy_fanlar', label: 'Tabiiy fanlar' }
    }
    if (
        val.includes('iqtisod') ||
        val.includes('moliya') ||
        val.includes('biznes') ||
        val.includes('bank') ||
        val.includes('buxgalter') ||
        val.includes('menejment') ||
        val.includes('marketing')
    ) {
        return { code: 'iqtisodiyot_moliya', label: 'Iqtisodiyot va Moliya' }
    }
    if (
        val.includes('tarix') ||
        val.includes('falsafa') ||
        val.includes('madaniyatshunoslik') ||
        val.includes('ijtimoiy') ||
        val.includes('sotsiolog')
    ) {
        return { code: 'ijtimoiy_gumanitar', label: 'Ijtimoiy-gumanitar fanlar' }
    }
    if (val.includes('huquq') || val.includes('qonun') || val.includes('yuridik')) {
        return { code: 'huquqshunoslik', label: 'Huquqshunoslik' }
    }
    if (
        val.includes('tibbiyot') ||
        val.includes('anatomiya') ||
        val.includes('farmatsevtika') ||
        val.includes('salomatlik') ||
        val.includes('klinik')
    ) {
        return { code: 'tibbiyot_salomatlik', label: 'Tibbiyot va Farmatsevtika' }
    }
    if (
        val.includes('pedagogika') ||
        val.includes('psixologiya') ||
        val.includes('ta\'lim') ||
        val.includes('ta’lim') ||
        val.includes('metodika')
    ) {
        return { code: 'pedagogika_psixologiya', label: 'Pedagogika va Psixologiya' }
    }
    if (
        val.includes('til') ||
        val.includes('filologiya') ||
        val.includes('adabiyot') ||
        val.includes('tarjima')
    ) {
        return { code: 'filologiya_tillar', label: 'Filologiya va tillar' }
    }
    if (
        val.includes('san\'at') ||
        val.includes('san’at') ||
        val.includes('musiqa') ||
        val.includes('sport') ||
        val.includes('jismoniy') ||
        val.includes('madaniyat')
    ) {
        return { code: 'sanat_madaniyat', label: 'San’at, Madaniyat va Sport' }
    }

    // Yangi fan nomlari bazada saqlanadi
    return { code: raw.trim(), label: raw.trim() }
}

// ==========================================
// 2. SHABLON YARATISH (TEMPLATE GENERATOR)
// ==========================================

export function generateArmExcelTemplate(): void {
    // 10 ta namunaviy ustun (Foydalanuvchi taqdim etgan rasm bo'yicha)
    const headers = [
        '№',
        'Fan nomi',
        'Kitob nomi',
        'Muallifi',
        'Tili',
        'Nashr yili',
        'Adabiyot turi',
        'Inventarda',
        'Tekshirganda',
        'Summa',
    ]

    const sampleRows = [
        [
            1,
            'Axborot texnologiyalari',
            'Sun’iy intellekt va mashinali o‘rganish asoslari',
            'A. Karimov, B. Toshmatov',
            'O‘zbek',
            2023,
            'Darslik',
            25,
            25,
            '65 000 so‘m',
        ],
        [
            2,
            'Aniq fanlar',
            'Oliy matematika kursi',
            'N. Sodiqov, M. Valiyev',
            'Rus',
            2022,
            'O‘quv qo‘llanma',
            30,
            30,
            '50 000 so‘m',
        ],
        [
            3,
            'Ijtimoiy-gumanitar',
            'O‘zbekiston tarixi',
            'Q. Usmonov, M. Sodiqov',
            'O‘zbek',
            2021,
            'Darslik',
            40,
            40,
            '45 000 so‘m',
        ],
        [
            4,
            'Filologiya va tillar',
            'English for Specific Purposes',
            'J. Miller, R. Evans',
            'Ingliz',
            2024,
            'O‘quv qo‘llanma',
            15,
            15,
            '75 000 so‘m',
        ],
    ]

    const data = [headers, ...sampleRows]
    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Ustun kengliklarini moslash
    worksheet['!cols'] = [
        { wch: 6 },  // №
        { wch: 26 }, // Fan nomi
        { wch: 42 }, // Kitob nomi
        { wch: 28 }, // Muallifi
        { wch: 14 }, // Tili
        { wch: 12 }, // Nashr yili
        { wch: 20 }, // Adabiyot turi
        { wch: 14 }, // Inventarda
        { wch: 14 }, // Tekshirganda
        { wch: 18 }, // Summa
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ARM Fondi')

    XLSX.writeFile(workbook, 'Axborot_resurs_markazi_fondi_shablon.xlsx')
}

// ==========================================
// 3. EXCELNI O'QISH VA TAHLIL QILISH (PARSER)
// ==========================================

export async function parseBooksFromExcel(file: File): Promise<ParseResult> {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
        throw new Error("Excel faylida varaqlar topilmadi")
    }

    const worksheet = workbook.Sheets[firstSheetName]
    // Raw JSON massivini olamiz: har bir qator massiv sifatida
    const rawData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { header: 1, defval: '' })

    if (rawData.length === 0) {
        throw new Error("Excel fayli bo'sh")
    }

    // Sarlavha qatorini topish (odatda 1-qator, lekin agar yuqorida 'ARM fondi' kabi sarlavha bo'lsa 2 yoki 3 bo'lishi mumkin)
    let headerRowIndex = -1
    let colMap: Record<string, number> = {}

    for (let r = 0; r < Math.min(rawData.length, 10); r++) {
        const row = rawData[r]
        if (!row || !Array.isArray(row)) continue

        const map: Record<string, number> = {}
        row.forEach((cell, c) => {
            const val = String(cell || '').trim().toLowerCase()
            if (val === '№' || val === 'no' || val === 'tr' || val === 't/r') map['index'] = c
            else if (val.includes('fan') || val.includes('soha') || val.includes('yo\'nalish')) map['category'] = c
            else if (val.includes('kitob') || val.includes('nomi') || val.includes('sarlavha') || val === 'title') map['title'] = c
            else if (val.includes('muallif') || val.includes('author')) map['author'] = c
            else if (val.includes('til') || val === 'language') map['language'] = c
            else if (val.includes('yil') || val.includes('nashr') || val === 'year') map['year'] = c
            else if (val.includes('tur') || val.includes('adabiyot') || val === 'genre') map['genre'] = c
            else if (val.includes('inventar') || val.includes('jami') || val.includes('soni') || val === 'total') map['total'] = c
            else if (val.includes('tekshir') || val.includes('mavjud') || val === 'available') map['available'] = c
            else if (val.includes('summa') || val.includes('narx') || val.includes('qiymat') || val === 'price') map['price'] = c
        })

        // Agar hech bo'lmaganda 'title' yoki 'muallif' topilsa, bu sarlavha qatori hisoblanadi
        if (map['title'] !== undefined || (map['author'] !== undefined && map['category'] !== undefined)) {
            headerRowIndex = r
            colMap = map
            break
        }
    }

    // Agar nomlangan sarlavhalar topilmasa, standart 0-indeksdan ketma-ket qabul qilamiz:
    // [№, Fan nomi, Kitob nomi, Muallifi, Tili, Nashr yili, Adabiyot turi, Inventarda, Tekshirganda, Summa]
    if (headerRowIndex === -1) {
        headerRowIndex = 0
        colMap = {
            index: 0,
            category: 1,
            title: 2,
            author: 3,
            language: 4,
            year: 5,
            genre: 6,
            total: 7,
            available: 8,
            price: 9,
        }
    }

    const parsedRows: ParsedBookRow[] = []

    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
        const row = rawData[r]
        if (!row || !Array.isArray(row)) continue

        // Butun qator bo'sh bo'lsa o'tkazib yuboramiz
        const isCompletelyEmpty = row.every(cell => String(cell || '').trim() === '')
        if (isCompletelyEmpty) continue

        const getCol = (key: string): string => {
            const idx = colMap[key]
            if (idx === undefined || idx < 0 || idx >= row.length) return ''
            return String(row[idx] ?? '').trim()
        }

        const titleRaw = getCol('title')
        const authorRaw = getCol('author')
        const categoryRaw = getCol('category')
        const languageRaw = getCol('language')
        const yearRaw = getCol('year')
        const genreRaw = getCol('genre')
        const totalRaw = getCol('total')
        const availableRaw = getCol('available')
        const priceRaw = getCol('price')

        const errors: string[] = []
        const warnings: string[] = []

        // Nomi tekshiruvi
        if (!titleRaw) {
            errors.push("Kitob nomi ko'rsatilmagan")
        }

        // Muallif tekshiruvi
        const author = authorRaw || "Noma'lum muallif"
        if (!authorRaw) {
            warnings.push("Muallif ko'rsatilmagan, standart 'Noma'lum muallif' qilib olindi")
        }

        // Normallashtirishlar
        const normLang = normalizeLanguage(languageRaw)
        const normGenre = normalizeGenre(genreRaw)
        const normCat = normalizeCategory(categoryRaw)

        // Yil
        let pubDate: number | undefined = undefined
        if (yearRaw) {
            const match = yearRaw.match(/\d{4}/)
            if (match) {
                pubDate = parseInt(match[0], 10)
            } else {
                warnings.push(`Nashr yili aniqlanmadi (${yearRaw})`)
            }
        }

        // Soni
        const parsedTotal = parseInt(totalRaw.replace(/[^\d]/g, ''), 10)
        const totalQuantity = isNaN(parsedTotal) || parsedTotal <= 0 ? 1 : parsedTotal

        const parsedAvailable = parseInt(availableRaw.replace(/[^\d]/g, ''), 10)
        const availableQuantity = isNaN(parsedAvailable) || parsedAvailable < 0
            ? totalQuantity
            : Math.min(parsedAvailable, totalQuantity)

        // Narx yoki qo'shimcha tavsif
        let description = ''
        if (priceRaw) {
            description = `Narxi / Qiymati: ${priceRaw}`
        }

        parsedRows.push({
            rawIndex: r + 1,
            title: titleRaw,
            author,
            category: normCat.code,
            originalCategory: categoryRaw,
            language: normLang.code,
            originalLanguage: languageRaw,
            publicationDate: pubDate,
            genre: normGenre.code,
            originalGenre: genreRaw,
            totalQuantity,
            availableQuantity,
            priceOrDescription: description,
            // Foydalanuvchi talabi bo'yicha: standart icon_arm.png
            coverImageUrl: '/icon_arm.png',
            isValid: errors.length === 0,
            errors,
            warnings,
        })
    }

    const validCount = parsedRows.filter(r => r.isValid).length
    const errorCount = parsedRows.filter(r => !r.isValid).length

    return {
        rows: parsedRows,
        totalCount: parsedRows.length,
        validCount,
        errorCount,
    }
}

// ==========================================
// 4. API UCHUN DTO GA AYLANTIRISH
// ==========================================

export function convertParsedRowsToCreateRequests(rows: ParsedBookRow[]): CreateBookRequest[] {
    return rows
        .filter(r => r.isValid)
        .map(r => ({
            title: r.title,
            author: r.author,
            category: r.category,
            language: r.language,
            genre: r.genre,
            publication_date: r.publicationDate,
            total_quantity: r.totalQuantity,
            available_quantity: r.availableQuantity,
            description: r.priceOrDescription || undefined,
            cover_image_url: '/icon_arm.png', // Foydalanuvchi talabi
            format: 'bosma', // ARM umumiy fondi uchun odatda bosma kitob
        }))
}
