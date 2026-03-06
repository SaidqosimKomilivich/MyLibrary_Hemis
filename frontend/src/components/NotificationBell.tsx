import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '../services/api'
import type { MessageDataItem } from '../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0)
    const location = useLocation()
    const { user } = useAuth()

    // Har bir rol uchun to'g'ri messages yo'li: /admin/messages, /staff/messages va h.k.
    const messagesPath = user?.role ? `/${user.role}/messages` : '/messages'

    useEffect(() => {
        // Fetch existing unread count
        const fetchUnread = async () => {
            try {
                const res = await api.getUnreadMessageCount()
                if (res.success) {
                    setUnreadCount(res.data.unread_count)
                }
            } catch (err) {
                console.error("Xabarlarni yuklashda xatolik:", err)
            }
        }
        fetchUnread()

        // Subscribe to real-time events via SSE
        const sub = api.subscribeToMessages((msg: MessageDataItem) => {
            // Agar foydalanuvchi hozir messages sahifasida bo'lmasa, sonni oshiramiz va toast chiqaramiz
            if (window.location.pathname !== messagesPath) {
                setUnreadCount((prev) => prev + 1)
                toast.success(`Yangi xabar: \n${msg.title}`, {
                    autoClose: 4000
                })
            }
        })

        return () => sub.abort()
    }, [])

    // Agar foydalanuvchi messages sahifasiga kirsa, unreadCount'ni o'chirib turish (messages ichidan ham qo'lda boshqarilishi mumkin)
    useEffect(() => {
        if (location.pathname === messagesPath) {
            setUnreadCount(0)
        }
    }, [location.pathname])

    return (
        <Link
            to={messagesPath}
            className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors"
            title="Xabarlar"
        >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    )
}
