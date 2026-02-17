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
        <div className="delete-modal__backdrop" onClick={onCancel}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                <button className="delete-modal__close" onClick={onCancel}>
                    <X size={18} />
                </button>

                <div className="delete-modal__icon">
                    <AlertTriangle size={40} />
                </div>

                <h3 className="delete-modal__title">{title}</h3>
                <p className="delete-modal__message">{message}</p>

                <div className="delete-modal__actions">
                    <button
                        className="delete-modal__btn delete-modal__btn--cancel"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Bekor qilish
                    </button>
                    <button
                        className="delete-modal__btn delete-modal__btn--confirm"
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
