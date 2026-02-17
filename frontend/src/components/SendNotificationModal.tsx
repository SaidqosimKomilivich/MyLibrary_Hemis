import { useState, type FormEvent } from 'react'
import { X, Send, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-toastify'

interface SendNotificationModalProps {
    userId: string
    userName: string
    onClose: () => void
}

type NotificationType = 'info' | 'warning' | 'success' | 'error'

export default function SendNotificationModal({ userId, userName, onClose }: SendNotificationModalProps) {
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [type, setType] = useState<NotificationType>('info')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !message.trim()) return

        setIsLoading(true)
        try {
            const res = await api.sendNotification(userId, title, message, type)
            if (res.success) {
                toast.success("Xabarnoma yuborildi")
                onClose()
            }
        } catch (error) {
            toast.error("Yuborishda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content notification-modal">
                <div className="modal-header">
                    <h2>Xabarnoma yuborish</h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-subheader">
                    Qabul qiluvchi: <strong>{userName}</strong>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Sarlavha</label>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Xabarnoma mavzusi"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Xabar turi</label>
                        <div className="notification-type-selector">
                            {(['info', 'warning', 'success', 'error'] as NotificationType[]).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`type-btn type-btn--${t} ${type === t ? 'active' : ''}`}
                                    onClick={() => setType(t)}
                                >
                                    {t === 'info' && <Info size={16} />}
                                    {t === 'warning' && <AlertTriangle size={16} />}
                                    {t === 'success' && <CheckCircle size={16} />}
                                    {t === 'error' && <XCircle size={16} />}
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Xabar matni</label>
                        <textarea
                            className="form-textarea"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Xabar mazmuni..."
                            rows={4}
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Bekor qilish
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? <span className="spinner-small" /> : <Send size={16} />}
                            Yuborish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
