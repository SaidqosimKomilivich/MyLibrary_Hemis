interface PlaceholderProps {
    title: string
}

export default function ComingSoon({ title }: PlaceholderProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: '1rem',
            color: 'var(--color-text-secondary, #94a3b8)',
        }}>
            <div style={{
                fontSize: '3rem',
                lineHeight: 1,
            }}>🚧</div>
            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--color-text, #e2e8f0)',
            }}>{title}</h2>
            <p>Bu sahifa tez orada tayyor bo'ladi</p>
        </div>
    )
}
