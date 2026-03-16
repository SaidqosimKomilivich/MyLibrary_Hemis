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

    // Har bir rol uchun to'g'ri messages yo'li
    const messagesPath = user?.role ? `/${user.role}/messages` : '/messages'

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

    useEffect(() => {
        // Sahifa ochilganda dastlabki unread count
        fetchUnread()

        // Real-time SSE orqali yangi xabarlarni qabul qilish
        const sub = api.subscribeToMessages((msg: MessageDataItem) => {
            const isOnMessagesPage = window.location.pathname === messagesPath

            // Foydalanuvchi messages sahifasida emas bo'lsa
            if (!isOnMessagesPage) {
                // Serverdan aniq sonni qayta olamiz (optimistik ortiqcha hisob-kitobning oldini olish uchun)
                fetchUnread()

                // Toast ma'lumoti
                const isAnnouncement = !msg.receiver_id
                const title = isAnnouncement
                    ? (msg.title || 'Yangi e\'lon')
                    : `${msg.sender_name || 'Yangi xabar'}: ${msg.message?.slice(0, 40) || ''}`
                toast.info(title, { autoClose: 5000 })
            }
        })

        return () => sub.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messagesPath])

    // Messages sahifasiga kirilganda serverdan aniq sonni qayta yuklash
    useEffect(() => {
        if (location.pathname === messagesPath) {
            // Sahifaga kirilganda sonni hozircha 0 (sahifaning o'zi boshqaradi),
            // lekin chiqilganda yana serverdan yuklash uchun flagni qoldirmiz.
            setUnreadCount(0)
        } else {
            // Boshqa sahifaga o'tilganda, serverdan qayta yuklash (masalan, tab almashuvi)
            fetchUnread()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
