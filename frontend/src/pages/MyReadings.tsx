import { useState, useEffect } from 'react'
import { BookOpen, BookMarked, X } from 'lucide-react'
import { api, type Reading, type Book } from '../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import BookCard from '../components/BookCard'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

/** Reading ma'lumotlaridan BookCard uchun Book obyektini yaratish */
function readingToBook(reading: Reading): Book {
    return {
        id: reading.book_id,
        title: reading.book_title || "Noma'lum kitob",
        author: reading.book_author || "Muallif noma'lum",
        cover_image_url: reading.book_cover,
        category: reading.book_category,
        page_count: reading.book_page_count,
        format: reading.book_format,
        digital_file_url: reading.book_digital_file_url,
    }
}

export default function MyReadings() {
    const { role } = useAuth()
    const [readings, setReadings] = useState<Reading[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // PDF viewer state
    const [pdfBook, setPdfBook] = useState<Book | null>(null)

    // Audio player state
    const [audioBook, setAudioBook] = useState<Book | null>(null)

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deletingReading, setDeletingReading] = useState<Reading | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchReadings = async () => {
        setIsLoading(true)
        try {
            const res = await api.getMyReadings()
            setReadings(res.data)
        } catch {
            toast.error("O'qiyotgan kitoblarni yuklashda xatolik")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchReadings()
    }, [])

    // PDF viewer
    const handleViewPdf = (book: Book) => {
        setPdfBook(book)
    }

    // Audio player
    const handleListenAudio = (book: Book) => {
        setAudioBook(book)
    }

    // O'chirish
    const handleDeleteClick = (bookId: string) => {
        const reading = readings.find(r => r.book_id === bookId)
        if (reading) {
            setDeletingReading(reading)
            setDeleteModalOpen(true)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deletingReading) return
        setIsDeleting(true)
        try {
            await api.removeReading(deletingReading.id)
            toast.success("Kitob ro'yxatdan olib tashlandi")
            setReadings(prev => prev.filter(r => r.id !== deletingReading.id))
            setDeleteModalOpen(false)
            setDeletingReading(null)
        } catch {
            toast.error("O'chirishda xatolik")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="p-5 md:p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-[1.8rem] font-bold text-text mb-1 tracking-tight flex items-center">
                        <BookMarked size={28} className="mr-2" />
                        O'qiyotgan kitoblar
                    </h1>
                    <p className="text-[0.95rem] text-text-muted m-0">
                        Siz hozirda o'qiyotgan kitoblar ro'yxati
                    </p>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20 min-h-[300px]">
                    <div className="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : readings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-text-muted bg-surface/50 border border-dashed border-border rounded-2xl">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <BookOpen size={28} className="opacity-50" />
                    </div>
                    <p className="text-[1.1rem]">Hali kitob qo'shilmagan</p>
                    <p className="text-[0.9rem] opacity-70 mt-1">Kutubxonadan kitob tanlang va "+" tugmasini bosing</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
                    {readings.map((reading) => {
                        const book = readingToBook(reading)
                        return (
                            <BookCard
                                key={reading.id}
                                book={book}
                                role={role}
                                onRemoveReading={(b) => handleDeleteClick(b.id)}
                                onViewPdf={handleViewPdf}
                                onListenAudio={handleListenAudio}
                            />
                        )
                    })}
                </div>
            )}

            {/* PDF Viewer Modal */}
            {pdfBook && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-300 flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setPdfBook(null)}>
                    <div className="w-full h-full max-w-6xl max-h-[90vh] bg-surface/95 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-border" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-slate-900/40">
                            <h3 className="m-0 text-[1.15rem] font-bold text-text truncate pr-4">{pdfBook.title}</h3>
                            <button onClick={() => setPdfBook(null)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-border text-text-muted cursor-pointer transition-colors hover:bg-red-500/20 hover:text-red-400 shrink-0 hover:border-red-500/30">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 w-full bg-white relative">
                            <iframe
                                src={pdfBook.digital_file_url || ''}
                                className="absolute inset-0 w-full h-full border-none bg-white"
                                title={pdfBook.title}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Audio Player Modal */}
            {audioBook && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setAudioBook(null)}>
                    <div className="w-full max-w-md bg-surface rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start p-5 border-b border-white/10 bg-black/20">
                            <div className="flex items-center gap-4">
                                {audioBook.cover_image_url ? (
                                    <img src={audioBook.cover_image_url} alt={audioBook.title} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10 shadow-sm" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0 border border-white/10 shadow-sm">🎧</div>
                                )}
                                <div className="min-w-0 pr-4">
                                    <h3 className="m-0 text-[1.1rem] font-bold text-text mb-1 truncate">{audioBook.title}</h3>
                                    <p className="m-0 text-[0.85rem] text-text-muted truncate">{audioBook.author}</p>
                                </div>
                            </div>
                            <button onClick={() => setAudioBook(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border-none text-text-muted cursor-pointer transition-colors hover:bg-white/10 hover:text-white shrink-0">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 bg-black/10">
                            <audio controls autoPlay src={audioBook.digital_file_url || ''} className="w-full h-10 outline-none rounded-lg custom-audio">
                                Brauzeringiz audio elementini qo'llab-quvvatlamaydi.
                            </audio>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            <DeleteConfirmModal
                isOpen={deleteModalOpen}
                title="Kitobni ro'yxatdan olib tashlash"
                message={`"${deletingReading?.book_title || ''}" kitobini o'qiyotganlar ro'yxatidan olib tashlamoqchimisiz?`}
                onConfirm={handleDeleteConfirm}
                onCancel={() => { setDeleteModalOpen(false); setDeletingReading(null) }}
                isLoading={isDeleting}
            />
        </div>
    )
}
