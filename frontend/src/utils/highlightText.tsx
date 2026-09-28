import React from 'react'

/**
 * Matn ichidagi qidiruv so'zini sariq fon bilan belgilab beradi.
 * @param text - Ko'rsatiladigan to'liq matn
 * @param query - Qidiruv so'zi
 * @returns Highlighted React element(s) yoki oddiy string
 */
export function highlightText(text: any, query: string): React.ReactNode {
    if (text === null || text === undefined) return ''
    const textStr = String(text)
    const q = (query || '').trim()
    if (!q) return textStr

    try {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escaped})`, 'gi')
        const parts = textStr.split(regex)

        if (parts.length <= 1) return textStr

        const qLower = q.toLowerCase()

        return (
            <>
                {parts.map((part, i) => {
                    const isMatch = part.toLowerCase() === qLower
                    return isMatch ? (
                        <mark
                            key={i}
                            style={{
                                background: 'rgba(255, 220, 0, 0.75)',
                                color: '#000',
                                borderRadius: '2px',
                                padding: '0 2px',
                            }}
                        >
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                })}
            </>
        )
    } catch {
        return textStr
    }
}
