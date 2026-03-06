import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface PdfViewerModalProps {
    title: string
    fileUrl: string
    onClose: () => void
}

export default function PdfViewerModal({ title, fileUrl, onClose }: PdfViewerModalProps) {
    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200"
            
        >
            <div
                className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header — identical to BookModal */}
                <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl">
                    <h2 className="m-0 text-lg font-bold text-text truncate pr-4">{title}</h2>
                    <button
                        onClick={onClose}
                        className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* PDF iframe — fixed height so it fills the modal */}
                <div className="relative overflow-hidden rounded-b-2xl" style={{ height: 'calc(90vh - 74px)' }}>
                    <iframe
                        src={fileUrl}
                        className="absolute inset-0 w-full h-full border-none"
                        title={title}
                    />
                </div>
            </div>
        </div>,
        document.body
    )
}
