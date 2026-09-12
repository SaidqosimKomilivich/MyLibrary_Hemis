import { useState, useEffect } from 'react'

/**
 * useDebounce hook
 * Qiymat har safar o'zgarganda belgilangan kechikish (delay ms) kutadi.
 * Tez-tez yoziladigan qidiruv maydonlarida API yuklamasini kamaytirish uchun xizmat qiladi.
 */
export function useDebounce<T>(value: T, delay = 350): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}
