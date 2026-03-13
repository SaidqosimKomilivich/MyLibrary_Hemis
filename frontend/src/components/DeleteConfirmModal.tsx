import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteConfirmModalProps {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    isLoading?: boolean
}

export default function DeleteConfirmModal({
    isOpen, title, message, onConfirm, onCancel, isLoading
}: DeleteConfirmModalProps) {
    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onCancel}>
            <div className="w-full max-w-100 bg-surface backdrop-blur-2xl border border-border rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-[0_30px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 isolate relative" onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-4 right-4 flex items-center justify-center w-8.5 h-8.5 border-none rounded-lg bg-transparent text-text-muted cursor-pointer transition-colors hover:bg-surface-hover hover:text-text z-10" onClick={onCancel}>
                    <X size={18} />
                </button>

                <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mb-5 animate-pulse">
                    <AlertTriangle size={32} />
                </div>

                <h3 className="text-[1.25rem] font-bold text-text m-0 mb-2">{title}</h3>
                <p className="text-[0.95rem] text-text-muted m-0 mb-8 leading-relaxed">{message}</p>

                <div className="flex w-full gap-3 mt-auto">
                    <button
                        className="flex-1 py-3 px-4 rounded-xl font-semibold text-[0.95rem] cursor-pointer transition-all border border-border bg-transparent text-text hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Bekor qilish
                    </button>
                    <button
                        className="flex-1 py-3 px-4 rounded-xl font-semibold text-[0.95rem] cursor-pointer transition-all border-none bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? "O'chirilmoqda..." : "Ha, o'chirish"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
