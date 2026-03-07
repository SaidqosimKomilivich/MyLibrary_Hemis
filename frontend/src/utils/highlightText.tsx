import React from 'react'

/**
 * Matn ichidagi qidiruv so'zini sariq fon bilan belgilab beradi.
 * @param text - Ko'rsatiladigan to'liq matn
 * @param query - Qidiruv so'zi
 * @returns Highlighted React element(s) yoki oddiy string
 */
export function highlightText(text: string | undefined | null, query: string): React.ReactNode {
    if (!text) return text ?? ''
    if (!query.trim()) return text

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = text.split(regex)

    if (parts.length <= 1) return text

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
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
            )}
        </>
    )
}
