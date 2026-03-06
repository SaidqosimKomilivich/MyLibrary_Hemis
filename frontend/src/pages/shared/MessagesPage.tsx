import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { MessageDataItem } from '../../services/api'
import { api } from '../../services/api'
import { Send, Plus, Search, X, MessageSquare, Check, CheckCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'

// --- Types ---
interface Conversation {
    contactId: string
    contactName: string
    contactRole: string
    lastMessage: string
    lastTime: string
    unreadCount: number
    messages: MessageDataItem[]
}

// --- Helpers ---
function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const diff = today.getDate() - d.getDate()
    if (diff === 0 && today.getMonth() === d.getMonth()) return 'Bugun'
    if (diff === 1 && today.getMonth() === d.getMonth()) return 'Kecha'
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long' })
}

const AVATAR_COLORS = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-500',
    'from-cyan-500 to-blue-600',
    'from-rose-500 to-pink-600',
]
function avatarColor(name: string) {
    let hash = 0
    for (const c of name) hash = (hash + c.charCodeAt(0)) % AVATAR_COLORS.length
    return AVATAR_COLORS[hash]
}

// --- Main Component ---
export default function MessagesPage() {
    const { user: me } = useAuth()
    const canSendMessage = me?.role === 'admin' || me?.role === 'staff'
    const [allMessages, setAllMessages] = useState<MessageDataItem[]>([])
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showNewChat, setShowNewChat] = useState(false)
    const [selectedMessage, setSelectedMessage] = useState<MessageDataItem | null>(null)

    // Send
    const [inputText, setInputText] = useState('')
    const [sending, setSending] = useState(false)

    // New chat
    const [allUsers, setAllUsers] = useState<{ value: string; label: string; role: string }[]>([])
    const [userSearch, setUserSearch] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Build conversations from messages
    const buildConversations = useCallback((msgs: MessageDataItem[]) => {
        if (!me) return
        const map = new Map<string, Conversation>()

        msgs.forEach(msg => {
            const isSentByMe = msg.sender_id === me.id;
            const isReceivedByMe = msg.receiver_id === me.id;

            let contactId = '';
            let contactName = '';
            let contactRole = '';

            if (isSentByMe) {
                contactId = msg.receiver_id || '';
                contactName = msg.receiver_name || 'Foydalanuvchi';
                contactRole = msg.receiver_role || '';
            } else if (isReceivedByMe) {
                contactId = msg.sender_id || '';
                contactName = msg.sender_name || 'Tizim';
                contactRole = msg.sender_role || '';
            } else {
                // If admin/staff viewing another's message:
                if (!msg.sender_id || msg.sender_role === 'admin' || msg.sender_role === 'staff') {
                    // Sent by system or admin/staff -> contact is receiver
                    contactId = msg.receiver_id || '';
                    contactName = msg.receiver_name || 'Foydalanuvchi';
                    contactRole = msg.receiver_role || '';
                } else {
                    // Sent by student/employee -> contact is sender
                    contactId = msg.sender_id || '';
                    contactName = msg.sender_name || 'Foydalanuvchi';
                    contactRole = msg.sender_role || '';
                }
            }

            if (!contactId) return

            if (!map.has(contactId)) {
                map.set(contactId, {
                    contactId,
                    contactName,
                    contactRole,
                    lastMessage: msg.message,
                    lastTime: msg.created_at,
                    unreadCount: (!isSentByMe && !msg.is_read) ? 1 : 0,
                    messages: [msg],
                })
            } else {
                const conv = map.get(contactId)!
                conv.messages.push(msg)
                if (new Date(msg.created_at) > new Date(conv.lastTime)) {
                    conv.lastMessage = msg.message
                    conv.lastTime = msg.created_at
                }
                if (!isSentByMe && !msg.is_read) conv.unreadCount++
            }
        })

        // Sort conversations by last message time
        const list = Array.from(map.values()).sort(
            (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
        )
        setConversations(list)
    }, [me])

    const fetchMessages = useCallback(async () => {
        try {
            setLoading(true)
            const res = await api.getMyMessages()
            if (res.success) {
                setAllMessages(res.data)
                buildConversations(res.data)
            }
        } catch (err: any) {
            toast.error(err.message || 'Xabarlarni yuklashda xatolik')
        } finally {
            setLoading(false)
        }
    }, [buildConversations])

    useEffect(() => {
        fetchMessages()

        const sub = api.subscribeToMessages((msg) => {
            setAllMessages(prev => {
                const updated = [...prev, msg]
                buildConversations(updated)
                return updated
            })
            // Auto-mark as read if this conversation is open
            setSelectedId(sel => {
                if (sel === msg.sender_id) {
                    api.markMessageAsRead(msg.id).catch(() => { })
                }
                return sel
            })
        })

        return () => sub.abort()
    }, [fetchMessages, buildConversations])

    // Scroll to bottom on chat open or new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [selectedId, allMessages])

    // Search users dynamically from backend
    useEffect(() => {
        if (!showNewChat) return

        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await api.searchUsers(userSearch)
                if (res.success && res.data) {
                    const mapped = res.data
                        .filter(u => u.id !== me?.id)
                        .map(u => ({ value: u.id, label: u.full_name, role: u.role }))
                    setAllUsers(mapped)
                }
            } catch (err) {
                console.error("Foydalanuvchilarni qidirishda xatolik:", err)
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [userSearch, showNewChat, me?.id])

    const openNewChat = () => {
        if (!canSendMessage) return
        setShowNewChat(true)
        setUserSearch('')
    }

    const selectUser = (userId: string, userName: string, userRole: string) => {
        setShowNewChat(false)
        // Check if conversation already exists
        const exists = conversations.find(c => c.contactId === userId)
        if (!exists) {
            // Create a placeholder conversation
            setConversations(prev => [{
                contactId: userId,
                contactName: userName,
                contactRole: userRole,
                lastMessage: '',
                lastTime: new Date().toISOString(),
                unreadCount: 0,
                messages: [],
            }, ...prev])
        }
        setSelectedId(userId)
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputText.trim() || !selectedId || sending) return

        const conv = conversations.find(c => c.contactId === selectedId)
        if (!conv) return

        try {
            setSending(true)
            const res = await api.sendMessage({
                receiver_id: selectedId,
                title: '',
                message: inputText.trim(),
            })
            if (res.success) {
                const newMsg = res.data
                setAllMessages(prev => {
                    const updated = [...prev, newMsg]
                    buildConversations(updated)
                    return updated
                })
                setInputText('')
            }
        } catch (err: any) {
            toast.error(err.message || 'Xabar yuborishda xatolik')
        } finally {
            setSending(false)
        }
    }

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedId(conv.contactId)
        // Mark unread as read
        conv.messages.forEach(m => {
            if (!m.is_read && m.sender_id !== me?.id) {
                api.markMessageAsRead(m.id).catch(() => { })
            }
        })
        setConversations(prev => prev.map(c =>
            c.contactId === conv.contactId ? { ...c, unreadCount: 0 } : c
        ))
        setAllMessages(prev => prev.map(m =>
            !m.is_read && m.sender_id === conv.contactId ? { ...m, is_read: true } : m
        ))
    }

    const selectedConv = conversations.find(c => c.contactId === selectedId)
    // Chat messages for the selected conversation (from allMessages)
    const chatMessages = allMessages.filter(m =>
        m.sender_id === selectedId || m.receiver_id === selectedId
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const filteredConversations = conversations.filter(c =>
        c.contactName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // Filtered users array is already managed by the backend search effect
    const filteredUsers = allUsers

    // For non-admin/staff users, show a simplified list + modal
    if (!canSendMessage) {
        return (
            <div className="-m-6 max-md:-m-4 p-4 md:p-6 h-[calc(100dvh-64px)] bg-surface shadow-xl flex flex-col">
                <h2 className="text-2xl font-bold text-text mb-6 px-2">Bildirishnomalar</h2>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
                    {loading ? (
                        <div className="flex flex-col gap-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-20 bg-surface rounded-xl border border-border animate-pulse" />
                            ))}
                        </div>
                    ) : allMessages.length === 0 ? (
                        <div className="text-center py-16 text-text-muted bg-surface rounded-2xl border border-border shadow-sm">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">Hozircha tizimdan yoki adminlardan xabarlar yo'q.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {allMessages.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(msg => (
                                <button
                                    key={msg.id}
                                    onClick={() => {
                                        setSelectedMessage(msg)
                                        if (!msg.is_read && msg.receiver_id === me?.id) {
                                            api.markMessageAsRead(msg.id).catch(() => { })
                                            setAllMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
                                        }
                                    }}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left shadow-sm ${msg.is_read ? 'bg-surface border-border hover:border-primary/30' : 'bg-primary/5 border-primary/20 hover:bg-primary/10'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${msg.is_read ? 'bg-surface-hover text-text-muted' : 'bg-primary text-white shadow-sm'}`}>
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`font-semibold text-sm truncate pr-2 ${msg.is_read ? 'text-text' : 'text-primary'}`}>
                                                {msg.title || (msg.sender_name ? `${msg.sender_name} dan xabar` : 'Tizim bildirishnomasi')}
                                            </h3>
                                            <span className="text-[11px] text-text-muted shrink-0">
                                                {formatDate(msg.created_at)} {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${msg.is_read ? 'text-text-muted' : 'text-text font-medium'}`}>
                                            {msg.message}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal View for the Message */}
                {selectedMessage && createPortal(
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-999 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedMessage(null)}>
                        <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center p-5 border-b border-border bg-white/5 rounded-t-2xl">
                                <h2 className="m-0 text-lg font-bold text-text truncate pr-4">
                                    {selectedMessage.title || 'Bildirishnoma'}
                                </h2>
                                <button onClick={() => setSelectedMessage(null)} className="flex p-1.5 rounded-lg border-none bg-transparent cursor-pointer text-text-muted transition-colors hover:bg-white/10 hover:text-rose-400">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-surface-hover/50 border border-border/50">
                                    <div className={`w-12 h-12 rounded-full bg-linear-to-br ${avatarColor(selectedMessage.sender_name || 'Tizim')} flex items-center justify-center text-white font-bold shrink-0 shadow-sm text-lg`}>
                                        {getInitials(selectedMessage.sender_name || 'Tizim')}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-text text-base">{selectedMessage.sender_name || 'Tizim'}</span>
                                        <span className="text-sm text-text-muted mt-0.5">{formatDate(selectedMessage.created_at)} {formatTime(selectedMessage.created_at)}</span>
                                    </div>
                                </div>
                                <div className="text-base text-text leading-relaxed whitespace-pre-wrap bg-surface/30 p-4 rounded-xl">
                                    {selectedMessage.message}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 p-5 border-t border-border bg-surface-hover rounded-b-2xl mt-auto shrink-0">
                                <button onClick={() => setSelectedMessage(null)} className="px-5 py-2.5 rounded-xl border border-white/10 bg-transparent text-text font-semibold cursor-pointer transition-colors hover:bg-white/5">
                                    Yopish
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        )
    }

    return (
        <div className="-m-6 max-md:-m-4 flex h-[calc(100dvh-64px)] overflow-hidden border-t border-border bg-surface shadow-xl">

            {/* ─── LEFT PANEL: Conversations ─────────────────── */}
            <div className={`flex flex-col w-full md:w-[320px] shrink-0 border-r border-border bg-surface ${selectedId ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground shrink-0 shadow-md z-10 relative">
                    <h2 className="text-xl font-bold tracking-tight">Xabarlar</h2>
                    {canSendMessage && (
                        <button
                            onClick={openNewChat}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                            title="Yangi xabar yozish"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="px-3 py-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Qidirish..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-hover text-text placeholder:text-text-muted text-sm border-none outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                </div>

                {/* New Chat User Picker */}
                {showNewChat && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 px-3 pb-2 border-b border-border">
                            <button onClick={() => setShowNewChat(false)} className="text-text-muted hover:text-text">
                                <X className="w-5 h-5" />
                            </button>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Foydalanuvchi qidirish..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredUsers.length === 0 ? (
                                <p className="p-4 text-center text-sm text-text-muted">Foydalanuvchi topilmadi</p>
                            ) : (
                                filteredUsers.map(u => (
                                    <button
                                        key={u.value}
                                        onClick={() => selectUser(u.value, u.label, u.role)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left"
                                    >
                                        <div className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarColor(u.label)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                            {getInitials(u.label)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-text text-sm">{u.label}</p>
                                            <p className="text-xs text-text-muted capitalize">{u.role}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Conversation List */}
                {!showNewChat && (
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col gap-3 p-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                        <div className="w-12 h-12 rounded-full bg-surface-hover shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-surface-hover rounded w-3/4" />
                                            <div className="h-2 bg-surface-hover rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted p-6">
                                <MessageSquare className="w-12 h-12 opacity-30" />
                                <p className="text-sm text-center">Hozircha suhbatlar yo'q. Yangi xabar yozing!</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => (
                                <button
                                    key={conv.contactId}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-border/40 ${conv.contactId === selectedId ? 'bg-primary/10' : 'hover:bg-surface-hover'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full bg-linear-to-br ${avatarColor(conv.contactName)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                                        {getInitials(conv.contactName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold text-text text-sm truncate">{conv.contactName}</p>
                                            <span className="text-[10px] text-text-muted shrink-0">{formatTime(conv.lastTime)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                            <p className="text-xs text-text-muted truncate">{conv.lastMessage || '...'}</p>
                                            {conv.unreadCount > 0 && (
                                                <span className="shrink-0 w-5 h-5 bg-primary rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                                                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* ─── RIGHT PANEL: Chat ─────────────────────────── */}
            {selectedConv ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
                        <button
                            className="md:hidden text-text-muted hover:text-text mr-1"
                            onClick={() => setSelectedId(null)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarColor(selectedConv.contactName)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                            {getInitials(selectedConv.contactName)}
                        </div>
                        <div>
                            <p className="font-semibold text-text text-sm">{selectedConv.contactName}</p>
                            <p className="text-xs text-text-muted capitalize">{selectedConv.contactRole}</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                        {chatMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
                                <MessageSquare className="w-12 h-12 opacity-20" />
                                <p className="text-sm">Xabarlar yo'q. Birinchi xabarni yuboring!</p>
                            </div>
                        ) : (
                            (() => {
                                let lastDate = ''
                                return chatMessages.map(msg => {
                                    const isIncoming = msg.sender_id === selectedConv.contactId
                                    const isMine = msg.sender_id === me?.id
                                    const msgDate = formatDate(msg.created_at)
                                    const showDate = msgDate !== lastDate
                                    lastDate = msgDate

                                    // If it's not incoming, it means it's outgoing to the client.
                                    // But it could be sent by ME, by SYSTEM, or by ANOTHER ADMIN.
                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <div className="flex justify-center my-3">
                                                    <span className="px-3 py-1 rounded-full bg-surface/80 backdrop-blur-sm text-xs text-text-muted shadow-sm border border-border">
                                                        {msgDate}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${!isIncoming ? 'justify-end' : 'justify-start'} mb-1`}>
                                                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${!isIncoming
                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : 'bg-surface border border-border text-text rounded-bl-sm'
                                                    }`}>

                                                    {/* Sender info for outgoing messages NOT sent by me, or system messages */}
                                                    {!isIncoming && !isMine && (
                                                        <div className="text-[10px] font-medium opacity-70 mb-1 border-b border-primary-foreground/20 pb-0.5">
                                                            Shtrix: {msg.sender_name || 'Tizim'}
                                                        </div>
                                                    )}

                                                    <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.message}</p>

                                                    <div className={`flex items-center gap-1 mt-1 ${!isIncoming ? 'justify-end text-primary-foreground/70' : 'justify-end text-text-muted'}`}>
                                                        <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                                                        {!isIncoming && (
                                                            msg.is_read
                                                                ? <CheckCheck className="w-3 h-3" />
                                                                : <Check className="w-3 h-3" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            })()
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="flex items-end gap-2 px-4 py-3 border-t border-border bg-surface">
                        <textarea
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend(e as any)
                                }
                            }}
                            placeholder="Xabar yozing..."
                            rows={1}
                            className="flex-1 resize-none bg-surface-hover rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/30 max-h-32 overflow-y-auto"
                            style={{ lineHeight: '1.5' }}
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || sending}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            ) : (
                /* Empty state */
                <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4 text-text-muted">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-12 h-12 text-primary/50" />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-text">Suhbatni tanlang</p>
                        <p className="text-sm mt-1">Yoki <button onClick={openNewChat} className="text-primary hover:underline">yangi xabar</button> yozing</p>
                    </div>
                </div>
            )}
        </div>
    )
}
