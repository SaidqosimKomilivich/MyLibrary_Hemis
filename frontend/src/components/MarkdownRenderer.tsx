import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
    content: string
    className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-body prose dark:prose-invert max-w-none text-text leading-relaxed ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="text-2xl md:text-3xl font-bold text-text mt-6 mb-3 pb-2 border-b border-border/40">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl md:text-2xl font-semibold text-text mt-5 mb-2.5">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg md:text-xl font-medium text-text mt-4 mb-2">
                            {children}
                        </h3>
                    ),
                    p: ({ children }) => (
                        <p className="mb-4 text-text/90 leading-relaxed text-[15px]">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-4 space-y-1.5 text-text/90 pl-2">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-1.5 text-text/90 pl-2">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-[15px] leading-relaxed">
                            {children}
                        </li>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500/70 pl-4 py-1.5 my-4 bg-blue-500/5 rounded-r-lg italic text-text/80">
                            {children}
                        </blockquote>
                    ),
                    code: ({ className, children, ...props }) => {
                        const isInline = !className
                        if (isInline) {
                            return (
                                <code className="px-1.5 py-0.5 rounded bg-surface border border-border/50 text-blue-400 font-mono text-xs" {...props}>
                                    {children}
                                </code>
                            )
                        }
                        return (
                            <div className="my-4 rounded-xl overflow-hidden border border-border/50 bg-surface/80 p-4 font-mono text-xs overflow-x-auto text-text">
                                <code {...props}>{children}</code>
                            </div>
                        )
                    },
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors font-medium"
                        >
                            {children}
                        </a>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-xl border border-border/50">
                            <table className="w-full text-left text-sm border-collapse">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border-b border-border/50 bg-surface px-4 py-2.5 font-semibold text-text">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border-b border-border/30 px-4 py-2.5 text-text/80">
                            {children}
                        </td>
                    ),
                    img: ({ src, alt }) => (
                        <span className="block my-4 rounded-xl overflow-hidden border border-border/40 shadow-md">
                            <img
                                src={src}
                                alt={alt || 'Rasm'}
                                className="w-full max-h-125 object-cover"
                                loading="lazy"
                            />
                            {alt && (
                                <span className="block text-center text-xs text-text-muted py-1.5 bg-surface/40">
                                    {alt}
                                </span>
                            )}
                        </span>
                    ),
                    hr: () => <hr className="my-6 border-border/40" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
