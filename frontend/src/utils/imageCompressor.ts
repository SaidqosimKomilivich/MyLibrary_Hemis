/**
 * Client-side rasm siqish (kompressiya) utilitasi.
 * Katta hajmdagi rasmlarni (5-15MB) Canvas yordamida o'lchamini kichraytirib,
 * WebP/JPEG formatiga o'tkazadi (~100-300KB), bu esa yuklash tezligini bir necha barobar oshiradi.
 */

export interface CompressOptions {
    maxWidth?: number
    maxHeight?: number
    quality?: number
}

export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    // Agar fayl rasm bo'lmasa yoki SVG/GIF bo'lsa (animatsiyani buzmaslik uchun), asl faylni qaytaramiz
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file
    }

    const {
        maxWidth = 1200,
        maxHeight = 1600,
        quality = 0.82,
    } = options

    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file)
        const img = new Image()

        img.onload = () => {
            URL.revokeObjectURL(objectUrl)

            try {
                let width = img.naturalWidth || img.width
                let height = img.naturalHeight || img.height

                // Asl hajm kichik bo'lsa va fayl hajmi ham kichik bo'lsa (< 250KB), o'zgartirish shart emas
                if (file.size <= 250 * 1024 && width <= maxWidth && height <= maxHeight) {
                    resolve(file)
                    return
                }

                // Aspect rationi saqlagan holda o'lchamlarni hisoblash
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve(file)
                    return
                }

                // Yumshoq tasvir chizish
                ctx.imageSmoothingEnabled = true
                ctx.imageSmoothingQuality = 'high'
                ctx.drawImage(img, 0, 0, width, height)

                // WebP formatga o'tkazish
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file)
                            return
                        }

                        // Agar siqilgan fayl asl fayldan kattaroq bo'lib qolsa, asl faylni ishlatamiz
                        if (blob.size >= file.size) {
                            resolve(file)
                            return
                        }

                        // Yangi fayl nomini hosil qilish (.webp)
                        const originalName = file.name
                        const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName
                        const newFileName = `${baseName}.webp`

                        const compressedFile = new File([blob], newFileName, {
                            type: 'image/webp',
                            lastModified: Date.now(),
                        })

                        resolve(compressedFile)
                    },
                    'image/webp',
                    quality
                )
            } catch (err) {
                console.warn('Rasm siqishda xatolik yuz berdi, asl fayl ishlatiladi:', err)
                resolve(file)
            }
        }

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl)
            console.warn('Rasm yuklashda xatolik yuz berdi, asl fayl ishlatiladi:', err)
            resolve(file)
        }

        img.src = objectUrl
    })
}
