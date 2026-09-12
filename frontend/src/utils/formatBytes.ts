/**
 * Baytlarni inson tushunadigan formatga o'girish (masalan: 1048576 -> "1.0 MB")
 */
export function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))
    return `${formatted} ${sizes[i]}`
}

/**
 * Yuklash tezligini formatlash (masalan: 2097152 -> "2.0 MB/s")
 */
export function formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec <= 0) return '0 B/s'
    return `${formatBytes(bytesPerSec)}/s`
}
