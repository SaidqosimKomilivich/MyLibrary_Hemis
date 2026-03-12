import { useState, useEffect, useRef, useCallback } from 'react'
import type { MessageDataItem, AnnouncementWithStatus, AnnouncementReadStatus } from '../../services/api.types'
import { api } from '../../services/api'
import { Send, Search, X, MessageSquare, Check, CheckCheck, Users, Megaphone, Loader2, ArrowLeft } from 'lucide-react'
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
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatTime(iso: string) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
    if (!iso) return ''
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
    if (!name) return AVATAR_COLORS[0]
    let hash = 0
    for (const c of name) hash = (hash + c.charCodeAt(0)) % AVATAR_COLORS.length
    return AVATAR_COLORS[hash]
}

// --- Main Component ---
export default function MessagesPage() {
    const { user: me } = useAuth()
    const canSendMessage = me?.role === 'admin' || me?.role === 'staff' || me?.role === 'teacher'
    const [allMessages, setAllMessages] = useState<MessageDataItem[]>([])
    const [announcements, setAnnouncements] = useState<AnnouncementWithStatus[]>([])
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [isChannelSelected, setIsChannelSelected] = useState(false)
    
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const pageRef = useRef(1)
    const [hasMore, setHasMore] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Who Read Status Panel (Inline)
    const [showReadStatusId, setShowReadStatusId] = useState<string | null>(null)
    const [readStatusList, setReadStatusList] = useState<AnnouncementReadStatus[]>([])
    const [readStatusPage, setReadStatusPage] = useState(1)
    const [readStatusHasMore, setReadStatusHasMore] = useState(false)
    const [loadingReadStatus, setLoadingReadStatus] = useState(false)

    // Send
    const [inputText, setInputText] = useState('')
    const [sending, setSending] = useState(false)

    // New chat search
    const [allUsers, setAllUsers] = useState<{ value: string; label: string; role: string }[]>([])
    const [userSearchPage, setUserSearchPage] = useState(1)
    const [userSearchHasMore, setUserSearchHasMore] = useState(true)
    const [loadingUserSearch, setLoadingUserSearch] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const readStatusListRef = useRef<HTMLDivElement>(null)

    const buildConversations = useCallback((msgs: MessageDataItem[], clear = false) => {
        if (!me) return
        
        setConversations(prev => {
            const map = new Map<string, Conversation>()
            if (!clear) {
                prev.forEach(c => map.set(c.contactId, c))
            } else {
                // If clearing (e.g. initial fetch), we still want to preserve 
                // the full message history of the currently selected chat if it exists.
                prev.forEach(c => {
                    if (c.messages.length > 1) {
                         map.set(c.contactId, c)
                    }
                })
            }

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
                    contactId = msg.sender_id || 'system';
                    contactName = msg.sender_name || (msg.sender_id ? 'Foydalanuvchi' : 'Tizim');
                    contactRole = msg.sender_role || (msg.sender_id ? '' : 'System');
                } else {
                    const sid = msg.sender_id;
                    if (!sid || sid === 'system') {
                        contactId = 'system';
                        contactName = 'Tizim';
                        contactRole = 'System';
                    } else {
                        contactId = sid;
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
                    
                    // Only update lastMessage if this message is newer
                    if (new Date(msg.created_at) >= new Date(conv.lastTime)) {
                        conv.lastMessage = msg.message
                        conv.lastTime = msg.created_at
                        conv.contactName = contactName // update name if changed
                        conv.contactRole = contactRole // update role if changed
                    }
                    if (!isSentByMe && !msg.is_read) conv.unreadCount++

                    // Add to messages array if not already present
                    if (!conv.messages.some(m => m.id === msg.id)) {
                        conv.messages.push(msg);
                        // Sort messages to ensure correct order
                        conv.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    }
                }
            })

            return Array.from(map.values()).sort((a, b) => {
                const bTime = new Date(b.lastTime).getTime();
                const aTime = new Date(a.lastTime).getTime();
                if (bTime !== aTime) {
                    return bTime - aTime;
                }
                return a.contactName.localeCompare(b.contactName);
            });
        })
    }, [me])

    const fetchMessages = useCallback(async (isInitial = true) => {
        try {
            if (isInitial) {
                setLoading(true)
                pageRef.current = 1
            } else {
                setLoadingMore(true)
            }

            const currentPage = isInitial ? 1 : pageRef.current + 1
            const res = await api.getMyMessages({ page: currentPage })
            
            if (res.success) {
                if (isInitial) {
                    setAllMessages(res.data)
                    buildConversations(res.data, true)
                } else {
                    setAllMessages(prev => [...prev, ...res.data])
                    buildConversations(res.data, false)
                    pageRef.current = currentPage
                }
                setHasMore(res.pagination.current_page < res.pagination.total_pages)
            }
        } catch (err: any) {
            toast.error(err.message || 'Xabarlarni yuklashda xatolik')
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [buildConversations])

    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await api.getAnnouncements()
            if (res.success) {
                setAnnouncements(res.data)
            }
        } catch (err: any) {
            console.error("E'lonlarni yuklashda xatolik:", err)
        }
    }, [])

    const fetchChatHistory = useCallback(async (contactId: string) => {
        try {
            const res = await api.getChatHistory(contactId)
            if (res.success) {
                setConversations(prev => prev.map(c => {
                    if (c.contactId === contactId) {
                        return { ...c, messages: res.data }
                    }
                    return c
                }))
            }
        } catch (err: any) {
            console.error("Chat tarixini yuklashda xatolik:", err)
        }
    }, [])

    // Keep a ref to selectedId so the WS callback can access the latest value
    // without adding selectedId to the mount effect's dependency array.
    const selectedIdRef = useRef<string | null>(null)
    useEffect(() => {
        selectedIdRef.current = selectedId
    }, [selectedId])

    // Mount-only: initial fetch + WS subscription
    useEffect(() => {
        fetchMessages(true)
        fetchAnnouncements()

        const sub = api.subscribeToMessages((msg: any) => {
            const isAnnouncement = !msg.receiver_id;
            
            if (isAnnouncement) {
                fetchAnnouncements()
                toast.info(`${msg.title || 'Yangilik'}`, { theme: 'colored' })
            } else {
                // Update only the specific conversation in the sidebar, not full reset
                const otherPartyId = msg.sender_id === me?.id ? msg.receiver_id : msg.sender_id;
                
                // If it's for the current chat, update history
                if (selectedIdRef.current === otherPartyId) {
                    fetchChatHistory(otherPartyId)
                }

                // Update just this conversation's preview without resetting page
                buildConversations([msg], false)

                const isSystemMessage = !msg.sender_id || msg.sender_role === 'system';
                const senderName = msg.sender_name || (isSystemMessage ? 'Tizim' : 'Foydalanuvchi');
                const titleText = msg.title ? `: ${msg.title}` : ''
                if (msg.sender_id !== me?.id) {
                    toast.info(`${senderName}${titleText}`, { theme: 'colored' })
                }
            }
        })

        return () => sub.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // intentionally mount-only

    useEffect(() => {
        if (selectedId && selectedId !== 'channel') {
            fetchChatHistory(selectedId)
        }
    }, [selectedId, fetchChatHistory])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [selectedId, isChannelSelected, announcements, allMessages])

    useEffect(() => {
        if (!searchQuery.trim()) {
            setAllUsers([])
            return
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                setLoadingUserSearch(true)
                const res = await api.searchUsers(searchQuery, 1, 50)
                if (res.success && res.data) {
                    const mapped = res.data
                        .filter(u => u.id !== me?.id)
                        .map(u => ({ value: u.id, label: u.full_name, role: u.role }))
                    setAllUsers(mapped)
                    setUserSearchPage(1)
                    if (res.pagination) {
                        setUserSearchHasMore(res.pagination.current_page < res.pagination.total_pages)
                    } else {
                        setUserSearchHasMore(false)
                    }
                }
            } catch (err) {
                console.error("Foydalanuvchilarni qidirishda xatolik:", err)
            } finally {
                setLoadingUserSearch(false)
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [searchQuery, me?.id])

    const fetchMoreUsers = async () => {
        if (loadingUserSearch || !userSearchHasMore) return;
        
        try {
            setLoadingUserSearch(true)
            const nextPage = userSearchPage + 1
            const res = await api.searchUsers(searchQuery, nextPage, 50)
            if (res.success && res.data) {
                const mapped = res.data
                    .filter(u => u.id !== me?.id)
                    .map(u => ({ value: u.id, label: u.full_name, role: u.role }))
                
                setAllUsers(prev => {
                    const existingIds = new Set(prev.map(u => u.value))
                    const newUsers = mapped.filter(u => !existingIds.has(u.value))
                    return [...prev, ...newUsers]
                })
                
                setUserSearchPage(nextPage)
                if (res.pagination) {
                    setUserSearchHasMore(res.pagination.current_page < res.pagination.total_pages)
                } else {
                    setUserSearchHasMore(false)
                }
            }
        } catch (err) {
            console.error("Yana foydalanuvchilarni yuklashda xatolik:", err)
        } finally {
            setLoadingUserSearch(false)
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showReadStatusId && readStatusListRef.current && !readStatusListRef.current.contains(event.target as Node)) {
                // If clicking a toggle button, let toggleReadStatus handled it
                const target = event.target as HTMLElement;
                if (target.closest('.read-status-toggle')) return;
                
                setShowReadStatusId(null);
            }
        };

        if (showReadStatusId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showReadStatusId]);

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedId(conv.contactId)
        setIsChannelSelected(false)
        setShowReadStatusId(null)
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

    const handleSelectChannel = () => {
        setIsChannelSelected(true)
        setSelectedId(null)
        setShowReadStatusId(null)
        // Mark all announcements as read when opening channel
        announcements.forEach(ann => {
            if (!ann.is_read) {
                api.markAnnouncementAsRead(ann.id).catch(() => { })
            }
        })
        setAnnouncements(prev => prev.map(a => ({ ...a, is_read: true })))
    }

    const toggleReadStatus = async (announcementId: string) => {
        if (showReadStatusId === announcementId) {
            setShowReadStatusId(null)
            return
        }
        
        setShowReadStatusId(announcementId)
        setReadStatusList([])
        setReadStatusPage(1)
        setReadStatusHasMore(false)
        fetchReadStatus(announcementId, 1)
    }

    const fetchReadStatus = async (announcementId: string, pageNum: number) => {
        try {
            setLoadingReadStatus(true)
            const res = await api.getAnnouncementReadStatus(announcementId, pageNum)
            if (res.success) {
                setReadStatusList(prev => pageNum === 1 ? res.data : [...prev, ...res.data])
                setReadStatusHasMore(res.pagination.current_page < res.pagination.total_pages)
                setReadStatusPage(res.pagination.current_page)
            }
        } catch (err: any) {
            toast.error(err.message || "O'qilganlar holatini yuklashda xatolik")
        } finally {
            setLoadingReadStatus(false)
        }
    }

    const handleReadStatusScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        if (scrollHeight - scrollTop <= clientHeight + 50 && readStatusHasMore && !loadingReadStatus && showReadStatusId) {
            fetchReadStatus(showReadStatusId, readStatusPage + 1)
        }
    }

    const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        const isNearBottom = Math.ceil(scrollTop) + clientHeight >= scrollHeight - 50

        if (searchQuery.trim().length > 0) {
            if (isNearBottom && userSearchHasMore && !loadingUserSearch) {
                fetchMoreUsers()
            }
            return
        }
        
        if (isNearBottom && hasMore && !loadingMore && !loading) {
            fetchMessages(false)
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputText.trim() || !selectedId || sending) return

        try {
            setSending(true)
            const res = await api.sendMessage({
                receiver_id: selectedId,
                title: '',
                message: inputText.trim(),
            })
            if (res.success) {
                setInputText('')
                // Update local chat history immediately
                if (selectedId) fetchChatHistory(selectedId)
                // Refresh sidebar to show latest message preview
                fetchMessages(true)
            }
        } catch (err: any) {
            toast.error(err.message || 'Xabar yuborishda xatolik')
        } finally {
            setSending(false)
        }
    }

    const handleSendAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputText.trim() || sending) return

        try {
            setSending(true)
            // Title is required by backend, we'll use a portion of the message or a default
            const lines = inputText.trim().split('\n')
            const title = lines[0].length > 50 ? lines[0].substring(0, 50) + '...' : lines[0]
            
            const res = await api.createAnnouncement({
                title: title,
                message: inputText.trim(),
                category: 'Umumiy',
            })
            if (res.success) {
                setInputText('')
                fetchAnnouncements()
            }
        } catch (err: any) {
            toast.error(err.message || 'E\'lon yuborishda xatolik')
        } finally {
            setSending(false)
        }
    }

    const selectUser = (userId: string, userName: string, userRole: string) => {
        setSearchQuery('')
        // Clear search users results
        setAllUsers([])
        const exists = conversations.find(c => c.contactId === userId)
        if (!exists) {
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
        setIsChannelSelected(false)
    }

    const selectedConv = conversations.find(c => c.contactId === selectedId)
    const chatMessages = selectedConv?.messages || []

    const unreadAnnouncementsCount = announcements.filter(a => !a.is_read).length

    return (
        <div className="-m-6 max-md:-m-4 flex h-[calc(100dvh-64px)] overflow-hidden border-t border-border bg-surface shadow-xl relative">
            
            {/* ─── LEFT SIDEBAR ─────────────────── */}
            <div className={`flex flex-col w-full md:w-[320px] shrink-0 border-r border-border bg-surface ${ (selectedId || isChannelSelected) ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex items-center justify-between p-4 bg-primary text-white shrink-0 shadow-sm">
                    <h2 className="text-xl font-bold">Xabarlar</h2>
                </div>

                <div className="p-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input type="text" placeholder="Qidirish..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-hover text-sm border-none focus:ring-1 focus:ring-primary/30 outline-none" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar" onScroll={handleSidebarScroll}>
                    {searchQuery.trim().length > 0 ? (
                        <div className="flex flex-col">
                            {allUsers.length > 0 ? (
                                allUsers.map(u => (
                                    <button key={u.value} onClick={() => selectUser(u.value, u.label, u.role)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left border-b border-border/40">
                                        <div className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarColor(u.label)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{getInitials(u.label)}</div>
                                        <div><p className="font-medium text-text text-sm">{u.label}</p><p className="text-[10px] text-text-muted capitalize">{u.role}</p></div>
                                    </button>
                                ))
                            ) : !loadingUserSearch && (
                                <div className="p-4 text-center text-text-muted text-sm">
                                    Foydalanuvchilar topilmadi
                                </div>
                            )}
                            {loadingUserSearch && (
                                <div className="p-4 flex justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary opacity-50" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* UNITY ANNOUNCEMENT CHANNEL ENTRY */}
                            <button 
                                onClick={handleSelectChannel}
                                className={`w-full flex items-center gap-3 px-4 py-4 border-b border-border/40 transition-colors text-left ${isChannelSelected ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shrink-0 shadow-lg">
                                    <Megaphone className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <p className="font-bold text-text text-sm">Yangiliklar</p>
                                        {announcements.length > 0 && <span className="text-[9px] text-text-muted">{formatTime(announcements[0].created_at)}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-text-muted truncate">Kanal foydalanuvchilari uchun</p>
                                        {unreadAnnouncementsCount > 0 && (
                                            <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-canvas">
                                                {unreadAnnouncementsCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>

                            <div className="px-4 py-2 bg-surface-hover/50 text-[10px] font-bold text-text-muted uppercase tracking-wider">Shaxsiy suhbatlar</div>
                            {conversations
                                .filter(c => {
                                    // Faqat haqiqiy xabarlashuvlar ko'rinsin (dummy/bo'sh emas)
                                    const hasMsgs = new Date(c.lastTime).getFullYear() > 1970 || c.lastMessage !== ''
                                    return hasMsgs && c.contactName.toLowerCase().includes(searchQuery.toLowerCase())
                                })
                                .map(conv => {
                                const isDummy = conv.lastMessage === "" && new Date(conv.lastTime).getFullYear() === 1970;
                                return (
                                <button key={conv.contactId} onClick={() => handleSelectConversation(conv)} className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/40 transition-colors text-left ${conv.contactId === selectedId ? 'bg-primary/10' : 'hover:bg-surface-hover'}`}>
                                    <div className={`w-11 h-11 rounded-full bg-linear-to-br ${avatarColor(conv.contactName)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>{getInitials(conv.contactName)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline"><p className="font-semibold text-text text-sm truncate">{conv.contactName}</p>
                                        {!isDummy && <span className="text-[10px] text-text-muted">{formatTime(conv.lastTime)}</span>}
                                        </div>
                                        <div className="flex justify-between items-center"><p className="text-xs text-text-muted truncate">{conv.lastMessage || '...'}</p>{conv.unreadCount > 0 && <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{conv.unreadCount}</span>}</div>
                                    </div>
                                </button>
                                )
                            })}
                            
                            {loadingMore && (
                                <div className="p-4 flex justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary opacity-50" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ─── RIGHT PANEL ─────────────────── */}
            <div className={`flex-1 flex flex-col min-w-0 bg-surface relative overflow-hidden ${ !(selectedId || isChannelSelected) ? 'hidden md:flex' : 'flex'}`}>
                
                {selectedConv ? (
                    /* CHAT VIEW */
                    <>
                        <div className="flex items-center gap-3 px-4 py-2 bg-surface-hover border-b border-border shadow-xs">
                            <button className="md:hidden text-text-muted" onClick={() => setSelectedId(null)}><ArrowLeft className="w-5 h-5" /></button>
                            <div className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarColor(selectedConv.contactName)} flex items-center justify-center text-white font-bold text-sm`}>{getInitials(selectedConv.contactName)}</div>
                            <div><p className="font-semibold text-text text-sm leading-tight">{selectedConv.contactName}</p><p className="text-[10px] text-text-muted capitalize">{selectedConv.contactRole}</p></div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-surface-hover/20">
                            {chatMessages.filter(m => m.id !== '00000000-0000-0000-0000-000000000000').map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender_id === me?.id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-xs ${msg.sender_id === me?.id ? 'bg-primary text-white rounded-br-none' : 'bg-canvas border border-border text-text rounded-bl-none'}`}>
                                        {canSendMessage && msg.sender_id !== me?.id && (
                                            <p className={`text-[10px] font-bold mb-1 opacity-70 ${msg.sender_id === 'system' || !msg.sender_id ? 'text-rose-500' : 'text-primary'}`}>
                                                {msg.sender_name || (msg.sender_id === 'system' || !msg.sender_id ? 'Tizim' : 'Foydalanuvchi')}
                                            </p>
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                        <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${msg.sender_id === me?.id ? 'text-white/70' : 'text-text-muted'}`}>
                                            <span>{formatTime(msg.created_at)}</span>
                                            {msg.sender_id === me?.id && (msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSend} className="p-4 border-t border-border flex items-end gap-2 bg-surface">
                            {selectedId === 'system' ? (
                                <div className="flex-1 bg-surface-hover/50 rounded-xl px-4 py-3 text-sm text-text-muted text-center italic">
                                    Tizim xabarlariga javob berish imkoniyati yo'q
                                </div>
                            ) : !canSendMessage ? (
                                <div className="flex-1 bg-surface-hover/50 rounded-xl px-4 py-3 text-sm text-text-muted text-center italic">
                                    Sizda xabar yuborish huquqi yo'q
                                </div>
                            ) : (
                                <>
                                    <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Xabar yozing..." rows={1} className="flex-1 resize-none bg-surface-hover rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 outline-none max-h-32" />
                                    <button type="submit" disabled={!inputText.trim() || sending} className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"><Send className="w-5 h-5" /></button>
                                </>
                            )}
                        </form>
                    </>
                ) : isChannelSelected ? (
                    /* TELEGRAM-STYLE CHANNEL FEED */
                    <div className="flex-1 flex flex-col overflow-hidden bg-surface-hover/10">
                        <div className="bg-primary text-white p-3 flex items-center justify-between border-b border-white/10 shrink-0 z-20">
                            <div className="flex items-center gap-2">
                                <button className="md:hidden text-white/60" onClick={() => setIsChannelSelected(false)}><ArrowLeft size={18} /></button>
                                <span className="text-sm font-bold tracking-wide">Yangiliklar</span>
                            </div>
                            <span className="text-[10px] text-white/40 uppercase tracking-tighter">Kanal</span>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 custom-scrollbar space-y-12">
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-xs font-medium">Yuklanmoqda...</p>
                                </div>
                            )}
                            {!loading && announcements.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20"><Megaphone className="w-24 h-24 mb-4" /><p className="text-xl font-bold">E'lonlar yo'q</p></div>
                            )}
                            {!loading && announcements.length > 0 && (
                                [...announcements].reverse().map((ann) => (
                                    <div key={ann.id} className="max-w-2xl mx-auto bg-canvas rounded-3xl overflow-hidden shadow-card border border-border relative group animate-in slide-in-from-bottom-4 duration-500">
                                         {/* Visual Decoration */}
                                        <div className="h-48 bg-linear-to-br from-primary to-indigo-800 flex items-center justify-center relative overflow-hidden">
                                              {ann.images && ann.images.length > 0 ? (
                                                  <img src={ann.images[0]} alt={ann.title} className="w-full h-full object-cover" />
                                              ) : (
                                                  <>
                                                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-size-[15px_15px]"></div>
                                                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                                                          <Megaphone className="w-6 h-6" />
                                                      </div>
                                                  </>
                                              )}
                                         </div>

                                        {/* Content */}
                                        <div className="p-6 md:p-8 space-y-4">
                                            <div className="flex items-center justify-between">
                                                {ann.category && (
                                                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                                        {ann.category}
                                                    </span>
                                                )}
                                                <p className="text-[9px] text-text-muted uppercase font-bold ml-auto">{formatDate(ann.created_at)} {formatTime(ann.created_at)}</p>
                                            </div>

                                            <h2 className="text-xl font-black text-text tracking-tight">{ann.title}</h2>
                                            <div className="text-text-muted leading-relaxed text-sm md:text-base whitespace-pre-wrap font-medium pb-4">{ann.message}</div>
                                            
                                            {/* Action Bar for Admins */}
                                            {canSendMessage && (
                                                <div className="pt-4 border-t border-border flex justify-end">
                                                    <button 
                                                        onClick={() => toggleReadStatus(ann.id)}
                                                        className={`read-status-toggle flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${showReadStatusId === ann.id ? 'bg-rose-500 text-white' : 'bg-surface-hover text-text-muted hover:bg-primary/10 hover:text-primary'}`}
                                                    >
                                                        <Users size={14} /> 
                                                        {showReadStatusId === ann.id ? 'Yopish' : 'Kim o\'qidi?'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* CHANNEL COMPOSE AREA (Admin/Staff only) */}
                        {(me?.role === 'admin' || me?.role === 'staff') && (
                            <form onSubmit={handleSendAnnouncement} className="p-4 border-t border-border flex items-end gap-2 bg-surface">
                                <textarea 
                                    value={inputText} 
                                    onChange={e => setInputText(e.target.value)} 
                                    placeholder="Kanalga xabar yozing..." 
                                    rows={1} 
                                    className="flex-1 resize-none bg-primary/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 outline-none max-h-32 border border-primary/10" 
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputText.trim() || sending} 
                                    className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-50 shadow-lg shadow-primary/20 transition-transform active:scale-95"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        )}

                        {/* INLINE READ STATUS SLIDE-OVER (Global within the feed view) */}
                        <div ref={readStatusListRef} className={`absolute top-0 right-0 h-full w-full md:w-80 bg-canvas border-l border-border shadow-card transition-transform duration-300 z-30 ${showReadStatusId ? 'translate-x-0' : 'translate-x-full'}`} >
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
                                    <h3 className="font-bold text-text flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> O'qiganlar</h3>
                                    <button onClick={() => setShowReadStatusId(null)} className="p-1 hover:bg-surface-hover rounded-lg text-text-muted"><X size={20} /></button>
                                </div>
                                
                                <div onScroll={handleReadStatusScroll} className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                                    {readStatusList.length === 0 && !loadingReadStatus ? (
                                        <div className="py-20 text-center text-text-muted opacity-50 px-4"><p className="text-sm">Hali hech kim o'qimagan</p></div>
                                    ) : (
                                        <>
                                            {readStatusList.map((item, idx) => (
                                                <div key={`${item.user_id}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover border border-transparent hover:border-border transition-all">
                                                    <div className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarColor(item.full_name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>{getInitials(item.full_name)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-text text-sm truncate leading-tight">{item.full_name}</p>
                                                        <p className="text-[10px] text-text-muted capitalize">{item.role}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[9px] text-text-muted">{formatTime(item.read_at)}</p>
                                                        <p className="text-[10px] text-primary font-bold">{formatDate(item.read_at)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {loadingReadStatus && <div className="py-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
                                            {readStatusHasMore && !loadingReadStatus && <p className="text-center text-[10px] text-text-muted py-2">Yana yuklash uchun pastga suring...</p>}
                                        </>
                                    )}
                                </div>
                                <div className="p-4 border-t border-border bg-surface-hover/30 text-center"><p className="text-xs font-bold text-primary">Jami o'qiganlar: {readStatusList.length}</p></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* EMPTY STATE */
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-muted opacity-30 bg-canvas">
                        <MessageSquare className="w-20 h-24" />
                        <p className="text-lg font-bold tracking-tight">Xabar yoki kanalni tanlang</p>
                    </div>
                )}
            </div>
        </div>
    )
}
