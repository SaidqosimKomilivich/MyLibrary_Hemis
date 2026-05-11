import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Search, AlertTriangle } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker setup for guaranteed compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Module-level cache: fileUrl -> blobUrl
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
    
    // Initial scale based on device width to ensure it fits mobile out of the box
    const [scale, setScale] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 0.6 : 1.5)
    
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [matchCount, setMatchCount] = useState(0)
    const [currentMatch, setCurrentMatch] = useState(0)
    const [pdfData, setPdfData] = useState<string | null>(null)
    const [fetchError, setFetchError] = useState(false)
    const [pageDimensions, setPageDimensions] = useState<{ [key: number]: { width: number; height: number } }>({})
    const searchMarkRefs = useRef<HTMLElement[]>([])

    const pdfWrapperRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<(HTMLDivElement | null)[]>([])

    // PDF faylni credentials bilan yuklaymiz (auth cookie kerak)
    useEffect(() => {
        if (pdfCache.has(fileUrl)) {
            setPdfData(pdfCache.get(fileUrl)!)
            return
        }
        setFetchError(false)
        setLoading(true)
        fetch(fileUrl, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
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

    // Close handler: blob URL ni tozalaymiz
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

    const onPageLoadSuccess = (pageInfo: any) => {
        setPageDimensions(prev => ({
            ...prev,
            [pageInfo.pageNumber]: {
                width: pageInfo.originalWidth,
                height: pageInfo.originalHeight
            }
        }))
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
                <div className="flex justify-between items-center p-4 border-b border-border bg-slate-50 dark:bg-white/5 rounded-t-2xl shrink-0">
                    <h2 className="m-0 text-lg font-bold text-text truncate pr-4">{title}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClose}
                            className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-slate-200 dark:hover:bg-white/10 hover:text-rose-400"
                            title="Yopish"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between p-3 border-b border-border bg-surface/50 shrink-0 gap-3">
                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 min-w-50">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                placeholder="PDF matnida izlash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && goToNextMatch()}
                                className="w-full pl-8 pr-3 py-1.5 border border-border rounded-md text-sm text-slate-800 dark:text-text focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        {searchQuery.trim() && (
                            <div className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-text-muted">
                                    {matchCount > 0 ? `${currentMatch} / ${matchCount}` : 'Topilmadi'}
                                </span>
                                <button
                                    onClick={goToPrevMatch}
                                    disabled={matchCount === 0}
                                    className="p-1 rounded hover:bg-slate-300 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-text-muted"
                                    title="Oldingi topilma"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={goToNextMatch}
                                    disabled={matchCount === 0}
                                    className="p-1 rounded hover:bg-slate-300 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-text-muted"
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
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors"
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
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors"
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
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors"
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
                                    className="w-12.5 border border-border rounded-md px-2 py-1 text-center text-sm font-medium text-text focus:outline-none focus:border-primary transition-colors hover:bg-white/5"
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
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors"
                                title="Keyingi sahifa"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    ref={pdfWrapperRef}
                    className="relative flex-1 overflow-auto bg-slate-200 dark:bg-[#2d3135] rounded-b-2xl p-4 sm:p-8 flex flex-col items-center custom-scrollbar"
                    style={{ userSelect: 'none' }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {fetchError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
                            <span className="text-rose-400 text-lg font-semibold">Fayl yuklab bo'lmadi</span>
                            <span className="text-text-muted text-sm">Tizimga kirganingizni tekshiring yoki sahifani yangilang</span>
                            <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-white/10 text-text hover:bg-white/20 transition-colors">Yopish</button>
                        </div>
                    )}
                    {!fetchError && loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <span className="text-text-muted text-sm font-medium animate-pulse">PDF yuklanmoqda...</span>
                        </div>
                    )}
                    {pdfData && (
                        <Document
                            file={pdfData}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(error) => {
                                console.error("PDF yuklashda xatolik:", error);
                                setLoading(false);
                            }}
                            error={
                                <div className="flex flex-col items-center justify-center p-10 text-center gap-4">
                                    <AlertTriangle size={48} className="text-rose-500 opacity-50" />
                                    <div className="flex flex-col gap-1">
                                        <span className="text-rose-400 text-lg font-semibold">PDF faylini ko'rsatib bo'lmadi</span>
                                        <span className="text-text-muted text-sm max-w-80">
                                            Fayl formati noto'g'ri yoki render qilishda xatolik yuz berdi.
                                            Sahifani yangilab qaytadan urinib ko'ring.
                                        </span>
                                    </div>
                                    <button 
                                        onClick={handleClose}
                                        className="mt-2 px-6 py-2 rounded-xl bg-white/5 text-text hover:bg-white/10 transition-all border border-white/10 font-medium"
                                    >
                                        Yopish
                                    </button>
                                </div>
                            }
                            loading={null}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="flex flex-col gap-6 pb-12 w-full items-center">
                                {pagesList.map((page) => {
                                    const isVisible = page === 1 || Math.abs(page - pageNumber) <= 3;
                                    
                                    // Use known aspect ratio if loaded, otherwise fallback to standard A4 ratio roughly
                                    const dims = pageDimensions[page];
                                    const baseWidth = dims ? dims.width : 600;
                                    const baseHeight = dims ? dims.height : 842;
                                    
                                    return (
                                        <div
                                            key={`page_${page}`}
                                            ref={el => { pageRefs.current[page - 1] = el }}
                                            className="bg-white shadow-2xl relative transition-transform flex items-center justify-center overflow-hidden"
                                            style={{
                                                minHeight: `${baseHeight * scale}px`,
                                                width: `${baseWidth * scale}px`,
                                            }}
                                        >
                                            {isVisible ? (
                                                <Page
                                                    pageNumber={page}
                                                    scale={scale}
                                                    renderTextLayer={true}
                                                    renderAnnotationLayer={true}
                                                    customTextRenderer={customTextRenderer}
                                                    onLoadSuccess={onPageLoadSuccess}
                                                    loading={
                                                        <div className="flex items-center justify-center bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-text-muted" style={{ width: baseWidth * scale, height: baseHeight * scale }}>
                                                            Sahifa {page} yuklanmoqda...
                                                        </div>
                                                    }
                                                />
                                            ) : (
                                                <div className="text-text-muted flex items-center justify-center w-full h-full">
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
