import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker setup for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString()

// Module-level in-memory cache: URL -> Blob Object URL (string)
// Blob URLs don't get detached unlike ArrayBuffers, so they're safe to re-pass to pdfjs.
const pdfCache = new Map<string, string>()

interface PdfViewerModalProps {
    title: string
    fileUrl: string
    onClose: () => void
}

export default function PdfViewerModal({ title, fileUrl, onClose }: PdfViewerModalProps) {
    const [numPages, setNumPages] = useState<number | null>(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [pageInput, setPageInput] = useState('1')
    const [scale, setScale] = useState(1.5)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [matchCount, setMatchCount] = useState(0)
    const [currentMatch, setCurrentMatch] = useState(0)
    const [pdfData, setPdfData] = useState<string | null>(null)
    const [fetchError, setFetchError] = useState(false)
    const searchMarkRefs = useRef<HTMLElement[]>([])

    const pdfWrapperRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<(HTMLDivElement | null)[]>([])

    // Fetch PDF once, create a Blob URL and store in RAM cache.
    // Blob URLs are stable strings — unlike ArrayBuffer they don't get
    // transferred/detached when passed to pdfjs Web Worker.
    useEffect(() => {
        if (pdfCache.has(fileUrl)) {
            setPdfData(pdfCache.get(fileUrl)!)
            return
        }
        fetch(fileUrl)
            .then(res => {
                if (!res.ok) throw new Error('Fayl yuklanmadi')
                return res.blob()
            })
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob)
                pdfCache.set(fileUrl, objectUrl)
                setPdfData(objectUrl)
            })
            .catch(() => {
                setFetchError(true)
                setLoading(false)
            })
    }, [fileUrl])

    // Close handler: revoke Blob URL and clear cache entry to free RAM
    const handleClose = () => {
        const objectUrl = pdfCache.get(fileUrl)
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl)
            pdfCache.delete(fileUrl)
        }
        onClose()
    }

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
            threshold: 0.1 // Trigger when at least 10% of the page is visible to be quick
        }

        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const pageIndex = pageRefs.current.findIndex(ref => ref === entry.target)
                    if (pageIndex !== -1) {
                        setPageNumber(prev => {
                            // Only update if it's changing, avoids unnecessary rapid re-renders
                            return prev === pageIndex + 1 ? prev : pageIndex + 1
                        })
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

    const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0))
    const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5))

    // Collect all <mark> elements after render to enable next/prev navigation
    const collectMarks = useCallback(() => {
        if (!pdfWrapperRef.current) return
        const marks = Array.from(
            pdfWrapperRef.current.querySelectorAll<HTMLElement>('mark.pdf-highlight')
        )
        searchMarkRefs.current = marks
        setMatchCount(marks.length)
        setCurrentMatch(marks.length > 0 ? 1 : 0)
        // Do NOT auto-scroll — user navigates manually with prev/next buttons
    }, []) // eslint-disable-line

    const goToNextMatch = () => {
        const marks = searchMarkRefs.current
        if (marks.length === 0) return
        const next = currentMatch % marks.length
        marks.forEach(m => m.classList.remove('pdf-highlight-active'))
        marks[next].scrollIntoView({ behavior: 'smooth', block: 'center' })
        marks[next].classList.add('pdf-highlight-active')
        setCurrentMatch(next + 1)
    }

    const goToPrevMatch = () => {
        const marks = searchMarkRefs.current
        if (marks.length === 0) return
        const prev = (currentMatch - 2 + marks.length) % marks.length
        marks.forEach(m => m.classList.remove('pdf-highlight-active'))
        marks[prev].scrollIntoView({ behavior: 'smooth', block: 'center' })
        marks[prev].classList.add('pdf-highlight-active')
        setCurrentMatch(prev + 1)
    }

    // Re-collect marks when search query or page changes (text layers re-render)
    useEffect(() => {
        if (!searchQuery.trim()) {
            searchMarkRefs.current = []
            setMatchCount(0)
            setCurrentMatch(0)
            return
        }
        // Give the text layer a moment to render before collecting marks
        const timer = setTimeout(collectMarks, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, pageNumber, scale, collectMarks])

    // customTextRenderer: wrap matching substrings with <mark>
    const customTextRenderer = useCallback(
        ({ str }: { str: string; itemIndex: number }) => {
            if (!searchQuery.trim()) return str
            const query = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`(${query})`, 'gi')
            return str.replace(
                regex,
                '<mark class="pdf-highlight" style="background:rgba(255,220,0,0.75);color:#000;border-radius:2px;padding:0 1px;">$1</mark>'
            )
        },
        [searchQuery]
    )

    // Smooth scroll to a specific page
    const scrollToPage = (pageNum: number) => {
        if (pageNum < 1 || !numPages || pageNum > numPages) return

        // Set the page immediately so it renders in the virtual list
        setPageNumber(pageNum)

        // Wait a tiny bit (allow React to render the newly un-suspended <Page /> and get its height)
        setTimeout(() => {
            const pageElement = pageRefs.current[pageNum - 1]

            if (pageElement && pdfWrapperRef.current) {
                // Calculate position relative to the scroll wrapper container
                const wrapperTop = pdfWrapperRef.current.getBoundingClientRect().top
                const elementTop = pageElement.getBoundingClientRect().top
                const offset = elementTop - wrapperTop + pdfWrapperRef.current.scrollTop - 20

                pdfWrapperRef.current.scrollTo({
                    top: offset,
                    behavior: 'smooth'
                })
            }
        }, 50)
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
        >
            <div
                className="bg-surface border border-border rounded-2xl w-full h-full max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-border bg-white/5 rounded-t-2xl shrink-0">
                    <h2 className="m-0 text-lg font-bold text-text truncate pr-4">{title}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClose}
                            className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400"
                            title="Yopish"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between p-3 border-b border-border bg-surface/50 shrink-0 gap-3">
                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                placeholder="PDF matnida izlash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && goToNextMatch()}
                                className="w-full pl-8 pr-3 py-1.5 bg-[#1a1c1e] border border-border rounded-md text-sm text-text focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        {searchQuery.trim() && (
                            <div className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                                <span className="px-2 py-1 rounded bg-white/5">
                                    {matchCount > 0 ? `${currentMatch} / ${matchCount}` : 'Topilmadi'}
                                </span>
                                <button
                                    onClick={goToPrevMatch}
                                    disabled={matchCount === 0}
                                    className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Oldingi topilma"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={goToNextMatch}
                                    disabled={matchCount === 0}
                                    className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Keyingi topilma"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Zoom */}
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

                        {/* Pagination */}
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
                </div>

                {/* PDF Content */}
                <div
                    ref={pdfWrapperRef}
                    className="relative flex-1 overflow-auto bg-[#2d3135] rounded-b-2xl p-4 sm:p-8 flex flex-col items-center custom-scrollbar"
                    style={{ userSelect: 'none' }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {fetchError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
                            <span className="text-rose-400 text-lg font-semibold">Fayl yuklab bo'lmadi</span>
                            <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-white/10 text-text hover:bg-white/20 transition-colors">Yopish</button>
                        </div>
                    )}
                    {!fetchError && loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                    )}
                    {pdfData && (
                        <Document
                            file={pdfData}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={null}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="flex flex-col gap-6 pb-12 w-full items-center">
                                {pagesList.map((page) => {
                                    // VIRTUALIZATION: Only render the heavy <Page /> component for pages
                                    // near the current viewport. +/- 3 pages means 7 pages max loaded at once.
                                    const isVisible = Math.abs(page - pageNumber) <= 3;

                                    return (
                                        <div
                                            key={`page_${page}`}
                                            ref={el => { pageRefs.current[page - 1] = el }}
                                            className="bg-white shadow-2xl relative transition-transform flex items-center justify-center"
                                            style={{
                                                // Provide estimated dimensions when unloaded to keep scroll height stable
                                                minHeight: isVisible ? 'auto' : `${800 * scale}px`,
                                                width: isVisible ? 'auto' : `${600 * scale}px`,
                                            }}
                                        >
                                            {isVisible ? (
                                                <Page
                                                    pageNumber={page}
                                                    scale={scale}
                                                    renderTextLayer={true}
                                                    renderAnnotationLayer={true}
                                                    customTextRenderer={customTextRenderer}
                                                    loading={
                                                        <div className="flex items-center justify-center bg-white/5 text-text-muted" style={{ width: 600 * scale, height: 800 * scale }}>
                                                            Sahifa {page} yuklanmoqda...
                                                        </div>
                                                    }
                                                />
                                            ) : (
                                                <div className="text-text-muted">
                                                    Sahifa {page}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </Document>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
