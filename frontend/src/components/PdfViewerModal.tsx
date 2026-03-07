import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker setup for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString()

interface PdfViewerModalProps {
    title: string
    fileUrl: string
    onClose: () => void
}

export default function PdfViewerModal({ title, fileUrl, onClose }: PdfViewerModalProps) {
    const [numPages, setNumPages] = useState<number | null>(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [pageInput, setPageInput] = useState('1')
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)

    const pdfWrapperRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<(HTMLDivElement | null)[]>([])

    // Update input when page changes externally (e.g. scrolling, Next/Prev buttons)
    useEffect(() => {
        setPageInput(pageNumber.toString())
    }, [pageNumber])

    // Intersection Observer to track which page is currently in view
    useEffect(() => {
        if (!numPages || pageRefs.current.length === 0) return

        const observerOptions = {
            root: pdfWrapperRef.current,
            rootMargin: '0px',
            threshold: 0.3 // Trigger when at least 30% of the page is visible
        }

        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const pageIndex = pageRefs.current.findIndex(ref => ref === entry.target)
                    if (pageIndex !== -1) {
                        setPageNumber(pageIndex + 1)
                    }
                }
            })
        }

        const observer = new IntersectionObserver(observerCallback, observerOptions)

        pageRefs.current.forEach(ref => {
            if (ref) observer.observe(ref)
        })

        return () => observer.disconnect()
    }, [numPages, scale]) // Re-run when scale changes

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setLoading(false)
        pageRefs.current = new Array(numPages).fill(null)
    }

    const zoomIn = () => setScale(prev => Math.min(prev + 0.5, 3.0))
    const zoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5))

    // Smooth scroll to a specific page
    const scrollToPage = (pageNum: number) => {
        if (pageNum < 1 || !numPages || pageNum > numPages) return

        const pageElement = pageRefs.current[pageNum - 1]

        if (pageElement && pdfWrapperRef.current) {
            // Calculate exact position to scroll to based on wrapper's internal coords
            const wrapperTop = pdfWrapperRef.current.getBoundingClientRect().top
            const elementTop = pageElement.getBoundingClientRect().top
            // The scroll target is the current scroll position + the distance from the top of the viewport
            const offset = (elementTop - wrapperTop) + pdfWrapperRef.current.scrollTop - 20

            pdfWrapperRef.current.scrollTo({
                top: offset,
                behavior: 'smooth'
            })
        }
    }

    const prevPage = () => scrollToPage(pageNumber - 1)
    const nextPage = () => scrollToPage(pageNumber + 1)

    const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const num = parseInt(pageInput)
            if (!isNaN(num) && num >= 1 && num <= (numPages || 1)) {
                scrollToPage(num)
            } else {
                setPageInput(pageNumber.toString())
            }
        }
    }

    const handlePageInputBlur = () => {
        const num = parseInt(pageInput)
        if (!isNaN(num) && num >= 1 && num <= (numPages || 1)) {
            if (num !== pageNumber) {
                scrollToPage(num)
            }
        } else {
            setPageInput(pageNumber.toString())
        }
    }

    // List of pages to render
    const pagesList = useMemo(() => {
        if (!numPages) return []
        return Array.from(new Array(numPages), (_, index) => index + 1)
    }, [numPages])

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-9999 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-surface border border-border rounded-2xl w-full max-w-5xl h-full max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-border bg-white/5 rounded-t-2xl shrink-0">
                    <h2 className="m-0 text-lg font-bold text-text truncate pr-4">{title}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400"
                            title="Yopish"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-end p-3 border-b border-border bg-surface/50 shrink-0 gap-4">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={zoomOut}
                            disabled={scale <= 0.5}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-text transition-colors"
                            title="Kichraytirish"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-sm font-medium text-text w-16 text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            disabled={scale >= 3.0}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-text transition-colors"
                            title="Kattalashtirish"
                        >
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={prevPage}
                            disabled={pageNumber <= 1}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-text transition-colors"
                            title="Oldingi sahifa"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center justify-center bg-transparent">
                            <input
                                type="number"
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                onKeyDown={handlePageInputKeyDown}
                                onBlur={handlePageInputBlur}
                                className="w-[50px] bg-[#1a1c1e] border border-border rounded-md px-2 py-1 text-center text-sm font-medium text-text focus:outline-none focus:border-primary transition-colors hover:bg-white/5"
                                min={1}
                                max={numPages || 1}
                                title="Sahifa raqamini yozing va Enter bosing"
                            />
                            <span className="text-sm font-medium text-text-muted ml-2">
                                / {numPages || '--'}
                            </span>
                        </div>

                        <button
                            onClick={nextPage}
                            disabled={pageNumber >= (numPages || 1)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-text transition-colors"
                            title="Keyingi sahifa"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* PDF Content */}
                <div
                    ref={pdfWrapperRef}
                    className="relative flex-1 overflow-auto bg-[#2d3135] rounded-b-2xl p-4 sm:p-8 flex flex-col items-center custom-scrollbar"
                >
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                    )}
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={null}
                        className="flex flex-col items-center w-full"
                    >
                        <div className="flex flex-col gap-6 pb-12 w-full items-center">
                            {pagesList.map((page) => (
                                <div
                                    key={`page_${page}`}
                                    ref={el => { pageRefs.current[page - 1] = el }}
                                    className="bg-white shadow-2xl relative transition-transform"
                                >
                                    <Page
                                        pageNumber={page}
                                        scale={scale}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        loading={
                                            <div className="flex items-center justify-center bg-white/5 text-text-muted" style={{ width: 600 * scale, height: 800 * scale }}>
                                                Sahifa {page} yuklanmoqda...
                                            </div>
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </Document>
                </div>
            </div>
        </div>,
        document.body
    )
}
