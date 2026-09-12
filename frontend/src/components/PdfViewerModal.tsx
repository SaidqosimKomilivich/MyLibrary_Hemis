import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
    X,
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Search,
    AlertTriangle,
    Maximize2,
    Minimize2,
    Bookmark,
    RefreshCw
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { formatBytes } from '../utils/formatBytes'

// Bundled local worker via Vite - offline, fast, avoids external CDN dependency
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

interface PdfViewerModalProps {
    title: string
    fileUrl: string
    bookId?: string
    onClose: () => void
}

export default function PdfViewerModal({ title, fileUrl, bookId, onClose }: PdfViewerModalProps) {
    const { user } = useAuth()
    const [numPages, setNumPages] = useState<number | null>(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [pageInput, setPageInput] = useState('1')

    // Initial scale based on device width to ensure it fits mobile out of the box
    const [scale, setScale] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.6 : 1.5))

    const [loading, setLoading] = useState(true)
    const [downloadProgress, setDownloadProgress] = useState<{ loaded: number; total: number } | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [matchCount, setMatchCount] = useState(0)
    const [currentMatch, setCurrentMatch] = useState(0)
    const [pdfData, setPdfData] = useState<string | null>(null)
    const [fetchError, setFetchError] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [restoredPage, setRestoredPage] = useState<number | null>(null)
    const [showResumeToast, setShowResumeToast] = useState(false)

    // Page dimensions cache for smooth placeholder rendering without layout shift
    const [pageDimensions, setPageDimensions] = useState<{ [key: number]: { width: number; height: number } }>({})
    const [defaultDims, setDefaultDims] = useState<{ width: number; height: number }>({ width: 600, height: 842 })

    const searchMarkRefs = useRef<HTMLElement[]>([])
    const pdfWrapperRef = useRef<HTMLDivElement>(null)
    const modalContainerRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<(HTMLDivElement | null)[]>([])

    // Talabaning to'liq ismi (Ism, Familiya, Otasining ismi) va HEMIS ID si
    const watermarkText = useMemo(() => {
        if (!user) return 'MyLibrary HEMIS'
        const name = user.full_name || ''
        const id = user.user_id ? ` [${user.user_id}]` : ''
        return name ? `${name}${id}` : 'MyLibrary HEMIS'
    }, [user])

    // Oxirgi o'qilgan sahifani saqlash kaliti
    const storageKey = useMemo(() => {
        return `mylibrary_last_page_${bookId || encodeURIComponent(fileUrl)}`
    }, [bookId, fileUrl])

    // PDF faylni to'g'ridan-to'g'ri URL orqali yuklaymiz (Range Request qo'llab-quvvatlanadi)
    useEffect(() => {
        setFetchError(false)
        setErrorMessage(null)
        setLoading(true)
        setDownloadProgress(null)
        setPdfData(fileUrl)
    }, [fileUrl])

    const handleClose = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
        }
        onClose()
    }

    // Fullscreen boshqaruvi
    const toggleFullscreen = () => {
        if (!modalContainerRef.current) return
        if (!document.fullscreenElement) {
            modalContainerRef.current.requestFullscreen().catch(() => {})
        } else {
            document.exitFullscreen().catch(() => {})
        }
    }

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFsChange)
        return () => document.removeEventListener('fullscreenchange', handleFsChange)
    }, [])

    // Smooth scroll to a specific page
    const scrollToPage = useCallback((pageNum: number) => {
        if (pageNum < 1 || !numPages || pageNum > numPages) return

        setPageNumber(pageNum)

        setTimeout(() => {
            const pageElement = pageRefs.current[pageNum - 1]
            if (pageElement && pdfWrapperRef.current) {
                const wrapperTop = pdfWrapperRef.current.getBoundingClientRect().top
                const elementTop = pageElement.getBoundingClientRect().top
                const offset = elementTop - wrapperTop + pdfWrapperRef.current.scrollTop - 20

                pdfWrapperRef.current.scrollTo({
                    top: offset,
                    behavior: 'smooth'
                })
            }
        }, 60)
    }, [numPages])

    const prevPage = useCallback(() => scrollToPage(pageNumber - 1), [pageNumber, scrollToPage])
    const nextPage = useCallback(() => scrollToPage(pageNumber + 1), [pageNumber, scrollToPage])
    const zoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.1, 3.0)), [])
    const zoomOut = useCallback(() => setScale(prev => Math.max(prev - 0.1, 0.5)), [])

    // Klaviatura tugmalari orqali boshqarish
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
                return
            }
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault()
                prevPage()
            } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                e.preventDefault()
                nextPage()
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault()
                zoomIn()
            } else if (e.key === '-') {
                e.preventDefault()
                zoomOut()
            } else if (e.key === 'Escape' && !document.fullscreenElement) {
                e.preventDefault()
                handleClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [prevPage, nextPage, zoomIn, zoomOut])

    // Update input and persist last read page when page changes
    useEffect(() => {
        setPageInput(pageNumber.toString())
        if (numPages && pageNumber >= 1) {
            localStorage.setItem(storageKey, pageNumber.toString())
        }
    }, [pageNumber, numPages, storageKey])

    // Intersection Observer to track which page is currently in view
    useEffect(() => {
        if (!numPages || pageRefs.current.length === 0) return

        const observerOptions = {
            root: pdfWrapperRef.current,
            rootMargin: '0px',
            threshold: 0.1
        }

        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const pageIndex = pageRefs.current.findIndex(ref => ref === entry.target)
                    if (pageIndex !== -1) {
                        setPageNumber(prev => (prev === pageIndex + 1 ? prev : pageIndex + 1))
                    }
                }
            })
        }

        const observer = new IntersectionObserver(observerCallback, observerOptions)

        pageRefs.current.forEach(ref => {
            if (ref) observer.observe(ref)
        })

        return () => observer.disconnect()
    }, [numPages, scale])

    const onDocumentLoadSuccess = useCallback(({ numPages: loadedNumPages }: { numPages: number }) => {
        setNumPages(loadedNumPages)
        setLoading(false)
        pageRefs.current = new Array(loadedNumPages).fill(null)

        // Oxirgi o'qilgan sahifani tiklash
        const saved = localStorage.getItem(storageKey)
        if (saved) {
            const parsed = parseInt(saved, 10)
            if (!isNaN(parsed) && parsed > 1 && parsed <= loadedNumPages) {
                setRestoredPage(parsed)
                setShowResumeToast(true)
                setTimeout(() => {
                    scrollToPage(parsed)
                }, 120)
            }
        }
    }, [storageKey, scrollToPage])

    // 401 Silent Refresh va xatolik boshqaruvi
    const handleDocumentLoadError = useCallback(async (error: any) => {
        console.error("PDF yuklashda xatolik:", error)
        const errorStr = (error?.message || error?.toString() || '').toLowerCase()
        const isAuthError = errorStr.includes('401') || errorStr.includes('unauthorized') || errorStr.includes('forbidden')

        if (isAuthError && retryCount < 2) {
            setRetryCount(prev => prev + 1)
            try {
                // Sessiyani yangilashga urinish
                await api.refreshToken()
                const sep = fileUrl.includes('?') ? '&' : '?'
                setPdfData(`${fileUrl}${sep}_t=${Date.now()}`)
                setFetchError(false)
                setLoading(true)
                return
            } catch (refreshErr) {
                console.error("Silent token refresh failed in PDF viewer:", refreshErr)
            }
        }

        setLoading(false)
        setFetchError(true)
        setErrorMessage(
            isAuthError
                ? "Sessiya muddati tugagan. Iltimos, tizimga qayta kiring."
                : "PDF faylini yuklab yoki ko'rsatib bo'lmadi. Fayl shikastlangan yoki format noto'g'ri bo'lishi mumkin."
        )
    }, [fileUrl, retryCount])

    const handleManualRetry = () => {
        setFetchError(false)
        setErrorMessage(null)
        setLoading(true)
        const sep = fileUrl.includes('?') ? '&' : '?'
        setPdfData(`${fileUrl}${sep}_retry=${Date.now()}`)
    }

    // Auto-hide resume notification
    useEffect(() => {
        if (showResumeToast) {
            const timer = setTimeout(() => setShowResumeToast(false), 6000)
            return () => clearTimeout(timer)
        }
    }, [showResumeToast])

    const onPageLoadSuccess = (pageInfo: any) => {
        setPageDimensions(prev => {
            if (
                prev[pageInfo.pageNumber]?.width === pageInfo.originalWidth &&
                prev[pageInfo.pageNumber]?.height === pageInfo.originalHeight
            ) {
                return prev
            }
            return {
                ...prev,
                [pageInfo.pageNumber]: {
                    width: pageInfo.originalWidth,
                    height: pageInfo.originalHeight
                }
            }
        })
        if (pageInfo.originalWidth && pageInfo.originalHeight) {
            setDefaultDims({ width: pageInfo.originalWidth, height: pageInfo.originalHeight })
        }
    }

    // Collect all <mark> elements after render to enable next/prev navigation
    const collectMarks = useCallback(() => {
        if (!pdfWrapperRef.current) return
        const marks = Array.from(
            pdfWrapperRef.current.querySelectorAll<HTMLElement>('mark.pdf-highlight')
        )
        searchMarkRefs.current = marks
        setMatchCount(marks.length)
        setCurrentMatch(marks.length > 0 ? 1 : 0)
    }, [])

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

    const pagesList = useMemo(() => {
        if (!numPages) return []
        return Array.from(new Array(numPages), (_, index) => index + 1)
    }, [numPages])

    const options = useMemo(() => ({
        withCredentials: true,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/',
        cMapPacked: true,
    }), [])

    return createPortal(
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-9999 flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200"
        >
            <div
                ref={modalContainerRef}
                className={`bg-surface border border-border flex flex-col shadow-2xl transition-all duration-200 ${
                    isFullscreen
                        ? 'fixed inset-0 rounded-none w-screen h-screen max-h-screen border-none'
                        : 'rounded-2xl w-full h-full max-h-[95vh]'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-border bg-slate-50 dark:bg-white/5 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                        <h2 className="m-0 text-base sm:text-lg font-bold text-text truncate">{title}</h2>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button
                            onClick={toggleFullscreen}
                            className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-slate-200 dark:hover:bg-white/10 hover:text-text"
                            title={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
                        >
                            {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
                        </button>
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
                <div className="flex flex-wrap items-center justify-between p-2.5 sm:p-3 border-b border-border bg-surface/70 shrink-0 gap-2 sm:gap-3">
                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 min-w-45 sm:min-w-60">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                placeholder="PDF matnida izlash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && goToNextMatch()}
                                className="w-full pl-8 pr-3 py-1.5 border border-border rounded-md text-xs sm:text-sm text-slate-800 dark:text-text bg-white dark:bg-black/20 focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        {searchQuery.trim() && (
                            <div className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-text-muted font-medium">
                                    {matchCount > 0 ? `${currentMatch} / ${matchCount}` : 'Topilmadi'}
                                </span>
                                <button
                                    onClick={goToPrevMatch}
                                    disabled={matchCount === 0}
                                    className="p-1 rounded hover:bg-slate-300 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-text-muted cursor-pointer"
                                    title="Oldingi topilma"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={goToNextMatch}
                                    disabled={matchCount === 0}
                                    className="p-1 rounded hover:bg-slate-300 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-text-muted cursor-pointer"
                                    title="Keyingi topilma"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                        {/* Zoom */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={zoomOut}
                                disabled={scale <= 0.5}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors cursor-pointer"
                                title="Kichraytirish (-)"
                            >
                                <ZoomOut size={17} />
                            </button>
                            <span className="text-xs sm:text-sm font-medium text-text w-12 sm:w-16 text-center select-none">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={zoomIn}
                                disabled={scale >= 3.0}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors cursor-pointer"
                                title="Kattalashtirish (+)"
                            >
                                <ZoomIn size={17} />
                            </button>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={prevPage}
                                disabled={pageNumber <= 1}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors cursor-pointer"
                                title="Oldingi sahifa (←)"
                            >
                                <ChevronLeft size={17} />
                            </button>

                            <div className="flex items-center justify-center bg-transparent">
                                <input
                                    type="number"
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onKeyDown={handlePageInputKeyDown}
                                    onBlur={handlePageInputBlur}
                                    className="w-11 sm:w-13 border border-border rounded-md px-1.5 py-1 text-center text-xs sm:text-sm font-medium text-text bg-white dark:bg-black/20 focus:outline-none focus:border-primary transition-colors"
                                    min={1}
                                    max={numPages || 1}
                                    title="Sahifa raqamini yozing va Enter bosing"
                                />
                                <span className="text-xs sm:text-sm font-medium text-text-muted ml-1.5 select-none">
                                    / {numPages || '--'}
                                </span>
                            </div>

                            <button
                                onClick={nextPage}
                                disabled={pageNumber >= (numPages || 1)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-text transition-colors cursor-pointer"
                                title="Keyingi sahifa (→)"
                            >
                                <ChevronRight size={17} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main PDF Scroll Viewport */}
                <div
                    ref={pdfWrapperRef}
                    className="relative flex-1 overflow-auto bg-slate-200 dark:bg-[#202428] rounded-b-2xl p-3 sm:p-8 flex flex-col items-center custom-scrollbar"
                    style={{ userSelect: 'text' }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {/* Resume from last page banner */}
                    {showResumeToast && restoredPage && (
                        <div className="sticky top-2 z-30 mb-4 bg-surface/95 backdrop-blur-md border border-primary/40 text-text px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-3 duration-300">
                            <Bookmark size={16} className="text-primary shrink-0" />
                            <span>
                                Oxirgi o'qilgan <strong>{restoredPage}-sahifa</strong>dan davom ettirildi
                            </span>
                            <button
                                onClick={() => {
                                    scrollToPage(1)
                                    setShowResumeToast(false)
                                }}
                                className="text-primary hover:underline font-semibold text-xs ml-1 cursor-pointer"
                            >
                                1-sahifaga o'tish
                            </button>
                            <button
                                onClick={() => setShowResumeToast(false)}
                                className="text-text-muted hover:text-text p-1 rounded-md hover:bg-white/10 transition-colors ml-1 cursor-pointer"
                                title="Yopish"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Xatolik holati */}
                    {fetchError && (
                        <div className="my-auto flex flex-col items-center justify-center p-8 text-center gap-4 bg-surface/90 border border-border rounded-2xl shadow-xl max-w-md">
                            <AlertTriangle size={48} className="text-rose-500 opacity-80" />
                            <div className="flex flex-col gap-1.5">
                                <span className="text-rose-400 text-lg font-bold">Faylni ochib bo'lmadi</span>
                                <span className="text-text-muted text-xs sm:text-sm leading-relaxed">
                                    {errorMessage || "Tizimga kirganingizni tekshiring yoki qaytadan urinib ko'ring."}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    onClick={handleManualRetry}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                                >
                                    <RefreshCw size={14} />
                                    Qayta urinish
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-text hover:bg-slate-200 dark:hover:bg-white/20 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                                >
                                    Yopish
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Dastlabki yuklanish jarayoni va progress indikatori */}
                    {!fetchError && loading && (
                        <div className="my-auto flex flex-col items-center justify-center p-6 bg-surface/90 border border-border rounded-2xl shadow-2xl min-w-70 max-w-sm gap-3">
                            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary"></div>
                            <div className="flex flex-col items-center gap-1.5 w-full text-center">
                                <span className="text-text text-sm font-semibold">PDF oqimi o'rnatilmoqda...</span>
                                {downloadProgress && downloadProgress.total > 0 ? (
                                    <div className="w-full mt-2 flex flex-col gap-1.5">
                                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-primary h-full transition-all duration-300 rounded-full"
                                                style={{
                                                    width: `${Math.min(100, Math.round((downloadProgress.loaded / downloadProgress.total) * 100))}%`
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-text-muted font-medium">
                                            <span>{formatBytes(downloadProgress.loaded)} / {formatBytes(downloadProgress.total)}</span>
                                            <span>{Math.round((downloadProgress.loaded / downloadProgress.total) * 100)}%</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-text-muted text-xs">Sahifalar yuklanmoqda...</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PDF Document Renderer */}
                    {pdfData && (
                        <Document
                            file={pdfData}
                            options={options}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadProgress={({ loaded, total }) => {
                                if (total > 0) {
                                    setDownloadProgress({ loaded, total })
                                }
                            }}
                            onLoadError={handleDocumentLoadError}
                            error={null}
                            loading={null}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="flex flex-col gap-6 pb-12 w-full items-center">
                                {pagesList.map((page) => {
                                    // Virtual Windowing: Faqat joriy sahifa +- 2 ta sahifa render qilinadi (maksimal 5 sahifa xotirada)
                                    const windowSize = 2
                                    const isVisible = Math.abs(page - pageNumber) <= windowSize

                                    const dims = pageDimensions[page] || defaultDims
                                    const baseWidth = dims.width
                                    const baseHeight = dims.height

                                    return (
                                        <div
                                            key={`page_${page}`}
                                            ref={el => { pageRefs.current[page - 1] = el }}
                                            className="bg-white shadow-2xl relative transition-transform flex items-center justify-center overflow-hidden rounded-sm"
                                            style={{
                                                minHeight: `${baseHeight * scale}px`,
                                                width: `${baseWidth * scale}px`,
                                            }}
                                        >
                                            {isVisible ? (
                                                <>
                                                    <Page
                                                        pageNumber={page}
                                                        scale={scale}
                                                        renderTextLayer={true}
                                                        renderAnnotationLayer={true}
                                                        customTextRenderer={customTextRenderer}
                                                        onLoadSuccess={onPageLoadSuccess}
                                                        loading={
                                                            <div
                                                                className="flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-text-muted text-xs sm:text-sm font-medium"
                                                                style={{
                                                                    width: `${baseWidth * scale}px`,
                                                                    height: `${baseHeight * scale}px`
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                                    <span>{page}-sahifa yuklanmoqda...</span>
                                                                </div>
                                                            </div>
                                                        }
                                                    />

                                                    {/* Dinamik Xavfsizlik Suv Belgisi (Talabaning to'liq F.I.Sh va HEMIS ID) */}
                                                    {watermarkText && (
                                                        <div
                                                            className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden flex flex-col justify-between py-10 px-4"
                                                            aria-hidden="true"
                                                        >
                                                            {[...Array(6)].map((_, rIdx) => (
                                                                <div
                                                                    key={rIdx}
                                                                    className="flex justify-around items-center whitespace-nowrap transform -rotate-25 opacity-[0.08] dark:opacity-[0.14] font-semibold text-xs sm:text-sm tracking-wider text-slate-900 dark:text-slate-100 select-none pointer-events-none"
                                                                >
                                                                    <span className="mx-3">{watermarkText}</span>
                                                                    <span className="mx-3 hidden sm:inline">{watermarkText}</span>
                                                                    <span className="mx-3 hidden lg:inline">{watermarkText}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                /* O'chirilgan sahifalar uchun aniq o'lchamli yengil placeholder */
                                                <div
                                                    className="text-text-muted flex flex-col items-center justify-center w-full h-full text-xs font-mono select-none bg-slate-50 dark:bg-white/5"
                                                    style={{ height: `${baseHeight * scale}px` }}
                                                >
                                                    <span className="opacity-40">{page}-sahifa</span>
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
