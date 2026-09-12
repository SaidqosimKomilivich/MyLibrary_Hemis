import { useState } from 'react'

interface NewsCoverImageProps {
    images?: string[] | null
    alt?: string
    className?: string
    fallbackClassName?: string
}

export default function NewsCoverImage({
    images,
    alt = "Yangilik rasmi",
    className = "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500",
    fallbackClassName = "w-20 h-20 object-contain opacity-35 filter grayscale group-hover:grayscale-0 group-hover:opacity-75 group-hover:scale-110 transition-all duration-500",
}: NewsCoverImageProps) {
    const [imgError, setImgError] = useState(false)
    const coverUrl = images && images.length > 0 ? images[0] : null

    if (coverUrl && !imgError) {
        return (
            <img
                src={coverUrl}
                alt={alt}
                className={className}
                onError={() => setImgError(true)}
                loading="lazy"
            />
        )
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-hover/50 p-6 select-none">
            <img
                src="/icon_arm.png"
                alt="ARM Kutubxona"
                className={fallbackClassName}
                loading="lazy"
            />
        </div>
    )
}
