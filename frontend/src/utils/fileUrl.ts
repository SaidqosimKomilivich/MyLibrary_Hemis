/**
 * getFileUrl — fayl URL ni normalizatsiya qiladi.
 *
 * Dev muhitda Vite proxy orqali `/uploads/...` backendga yo'naltiriladi.
 * Prod muhitda nginx reverse proxy bir xil ishni bajaradi.
 *
 * Qo'llash:
 *   <img src={getFileUrl(book.cover_image_url)} />
 *   <a href={getFileUrl(book.digital_file_url)}>PDF</a>
 */
export function getFileUrl(url: string | null | undefined, fallback = ''): string {
    if (!url) return fallback

    // Allaqachon to'liq URL bo'lsa (http/https) — o'zgartirilmaydi
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
    }

    // `/uploads/...` yoki boshqa nisbiy yo'l — proxy orqali to'g'ri ishlaydi
    return url.startsWith('/') ? url : `/${url}`
}

/**
 * getProxyImageUrl — tashqi rasmlarni backend proxy orqali yuklab CORS xatolarini oldini oladi.
 */
export function getProxyImageUrl(url: string | null | undefined, fallback = ''): string {
    if (!url) return fallback;
    if (url.startsWith('http') && !url.includes(window.location.hostname)) {
        return `/api/proxy/image?url=${encodeURIComponent(url)}`;
    }
    return getFileUrl(url, fallback);
}

/**
 * isImageUrl — URL rasm faylga tegishli ekanligini tekshiradi
 */
export function isImageUrl(url: string | null | undefined): boolean {
    if (!url) return false
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    const ext = url.split('.').pop()?.toLowerCase() || ''
    return IMAGE_EXTS.includes(ext)
}

/**
 * isPdfUrl — URL PDF faylga tegishli ekanligini tekshiradi
 */
export function isPdfUrl(url: string | null | undefined): boolean {
    if (!url) return false
    return url.split('.').pop()?.toLowerCase() === 'pdf'
}
