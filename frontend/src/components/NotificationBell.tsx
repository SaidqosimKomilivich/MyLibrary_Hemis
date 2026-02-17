import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { api, type Notification } from '../services/api'
import { toast } from 'react-toastify'

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = async () => {
        try {
            const res = await api.getNotifications(20, 0)
            if (res.success) {
                setNotifications(res.data)
                setUnreadCount(res.unread_count)
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        }
    }

    // Polling every 30 seconds
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.markNotificationRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error("Failed to mark as read", error)
        }
    }

    const handleMarkAllAsRead = async () => {
        setIsLoading(true)
        try {
            await api.markAllNotificationsRead()
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
            toast.success("Barcha xabarnomalar o'qilgan deb belgilandi")
        } catch (error) {
            toast.error("Xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    const getIcon = (type: string) => {

        switch (type) {
            case 'warning': return <AlertTriangle size={16} className="text-warning" />
            case 'success': return <CheckCircle size={16} className="text-success" />
            case 'error': return <XCircle size={16} className="text-danger" />
            default: return <Info size={16} className="text-info" />
        }
    }

    return (
        <div className="notification-bell-wrapper" ref={dropdownRef}>
            <button
                className="topbar-icon-btn notification-btn"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Xabarnomalar</h3>
                        {unreadCount > 0 && (
                            <button
                                className="notification-read-all"
                                onClick={handleMarkAllAsRead}
                                disabled={isLoading}
                            >
                                <Check size={14} /> Barchasini o'qish
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <Bell size={32} className="text-muted" style={{ opacity: 0.3 }} />
                                <p>Xabarnomalar yo'q</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'notification-item--unread' : ''}`}
                                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                >
                                    <div className="notification-icon">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-top">
                                            <h4 className="notification-title">{notification.title}</h4>
                                            <span className="notification-time">
                                                {new Date(notification.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="notification-message">{notification.message}</p>
                                        {notification.sender_name && (
                                            <span className="notification-sender">
                                                Yuboruvchi: {notification.sender_name}
                                            </span>
                                        )}
                                    </div>
                                    {!notification.is_read && (
                                        <div className="notification-dot" title="O'qilmagan" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
