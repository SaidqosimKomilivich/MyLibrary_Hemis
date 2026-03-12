/**
 * Ma'lumotlar bazasidan kelgan UTC vaqtni mahalliy vaqtga o'girish va formatlash.
 * @param dateStr ISO 8601 formatidagi string (masalan: "2026-03-12T18:08:01Z")
 * @returns Mahalliy vaqtda formatlangan string (masalan: "12.03.2026 23:08")
 */
export function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';

    try {
        // Agar stringda 'Z' bo'lmasa, uni UTC deb hisoblash uchun qo'shib qo'yamiz
        const isoStr = dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+')
            ? dateStr + 'Z'
            : dateStr;

        const date = new Date(isoStr);
        
        // Noto'g'ri sana bo'lsa
        if (isNaN(date.getTime())) return dateStr;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
        console.error('Display date error:', e);
        return dateStr;
    }
}

/**
 * Faqat sanani formatlash (YYYY-MM-DD ko'rinishida)
 */
export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        return new Intl.DateTimeFormat('uz-UZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date).replace(/\//g, '.');
    } catch {
        return dateStr;
    }
}
