export interface ClassificationOption {
    value: string
    label: string
    description?: string
}

// ==========================================
// 1. FAN VA SOHALAR (CATEGORIES / SUBJECTS)
// ==========================================
export const BOOK_CATEGORIES: ClassificationOption[] = [
    { value: 'it_texnologiya', label: 'IT va Axborot texnologiyalari' },
    { value: 'aniq_fanlar', label: 'Aniq fanlar (Matematika, Mexanika)' },
    { value: 'tabiiy_fanlar', label: 'Tabiiy fanlar (Fizika, Kimyo, Biologiya, Geografiya)' },
    { value: 'iqtisodiyot_moliya', label: 'Iqtisodiyot, Moliya va Biznes' },
    { value: 'ijtimoiy_gumanitar', label: 'Ijtimoiy-gumanitar fanlar (Tarix, Falsafa)' },
    { value: 'huquqshunoslik', label: 'Huquqshunoslik va Qonunchilik' },
    { value: 'tibbiyot_salomatlik', label: 'Tibbiyot va Farmatsevtika' },
    { value: 'pedagogika_psixologiya', label: 'Pedagogika va Psixologiya' },
    { value: 'filologiya_tillar', label: 'Filologiya va Xorijiy tillar' },
    { value: 'sanat_madaniyat', label: 'San’at, Madaniyat va Sport' },
    { value: 'boshqa', label: 'Boshqa sohalar' },
]

// ===================================================
// 2. NASHR / ADABIYOT TURI (GENRES / PUBLICATION TYPE)
// ===================================================
export const BOOK_GENRES: ClassificationOption[] = [
    { value: 'darslik', label: 'Darslik' },
    { value: 'oquv_qollanma', label: 'O‘quv qo‘llanma' },
    { value: 'metodik_qollanma', label: 'Metodik qo‘llanma va ko‘rsatma' },
    { value: 'monografiya', label: 'Ilmiy monografiya' },
    { value: 'ilmiy_maqola_tezis', label: 'Ilmiy maqola va tezislar to‘plami' },
    { value: 'badiiy_adabiyot', label: 'Badiiy adabiyot' },
    { value: 'ilmiy_ommabop', label: 'Ilmiy-ommabop adabiyot' },
    { value: 'lugat_qomus', label: 'Lug‘at, Ensiklopediya va Ma’lumotnoma' },
    { value: 'boshqa', label: 'Boshqa tur' },
]

// ==============================================
// 3. KITOBXON AUDITORIYASI (TARGET AUDIENCE)
// ==============================================
export const BOOK_AUDIENCES: ClassificationOption[] = [
    { value: 'bakalavriat', label: 'Bakalavriat talabalari' },
    { value: 'magistratura_tadqiqotchi', label: 'Magistrant va ilmiy tadqiqotchilar' },
    { value: 'professor_oqituvchi', label: 'Professor-o‘qituvchilar va mutaxassislar' },
    { value: 'umumiy_kitobxon', label: 'Keng jamoatchilik (Ommabop)' },
]

// ==============================================
// 4. FORMATLAR VA TILLAR
// ==============================================
export const BOOK_FORMATS: ClassificationOption[] = [
    { value: 'bosma', label: 'Bosma kitob (ARM fondida)' },
    { value: 'pdf', label: 'PDF (Elektron nusxa)' },
    { value: 'audio', label: 'Audio kitob' },
]

export const BOOK_LANGUAGES: ClassificationOption[] = [
    { value: 'uz', label: 'O‘zbekcha (Lotin)' },
    { value: 'uz_cyr', label: 'O‘zbekcha (Kirill)' },
    { value: 'ru', label: 'Ruscha' },
    { value: 'en', label: 'Inglizcha' },
    { value: 'tr', label: 'Turkcha' },
    { value: 'ar', label: 'Arabcha' },
]

// ==============================================
// 5. YORDAMCHI TARJIMON (LABEL GETTER) FUNKSIYALARI
// ==============================================

export function getCategoryLabel(val?: string | null): string {
    if (!val) return '—'
    if (val === 'aniq_tabiiy_fanlar') return 'Aniq va tabiiy fanlar'
    const found = BOOK_CATEGORIES.find(c => c.value === val)
    if (found) return found.label
    // Format slug nicely if not in predefined list
    return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function getGenreLabel(val?: string | null): string {
    if (!val) return '—'
    const found = BOOK_GENRES.find(g => g.value === val)
    if (found) return found.label
    return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function getAudienceLabel(val?: string | null): string {
    if (!val) return '—'
    const found = BOOK_AUDIENCES.find(a => a.value === val)
    if (found) return found.label
    return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function getFormatLabel(val?: string | null): string {
    if (!val) return 'Bosma'
    const found = BOOK_FORMATS.find(f => f.value === val)
    return found ? found.label : val.toUpperCase()
}

export function getLanguageLabel(val?: string | null): string {
    if (!val) return 'O‘zbek'
    const found = BOOK_LANGUAGES.find(l => l.value === val)
    return found ? found.label : val.toUpperCase()
}
