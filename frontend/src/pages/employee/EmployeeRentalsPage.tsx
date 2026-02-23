import { useState, useEffect, useMemo } from 'react'
import { api, type Rental } from '../../services/api'
import { Search, Loader2, BookOpen, Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'

type FilterType = 'all' | 'returned' | 'active' | 'due_soon' | 'overdue'

export default function EmployeeRentalsPage() {
    const [rentals, setRentals] = useState<Rental[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<FilterType>('all')

    const fetchRentals = async () => {
        setIsLoading(true)
        try {
            const res = await api.getRentals() // barchasini olamiz
            if (res.success) {
                setRentals(res.data)
            }
        } catch (err: any) {
            toast.error(err.message || "Ijaralarni yuklashda xatolik yuz berdi")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRentals()
    }, [])

    const isDueSoon = (dueDateStr: string): boolean => {
        const due = new Date(dueDateStr)
        due.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const diffTime = due.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return diffDays >= 0 && diffDays <= 3
    }

    // Front-end filtering since backend filter only supports basic states 
    // and we need "due_soon" logic logic here.
    const filteredRentals = useMemo(() => {
        return rentals.filter(r => {
            // Search logic
            const matchSearch =
                (r.book_title?.toLowerCase().includes(search.toLowerCase())) ||
                (r.user_full_name?.toLowerCase().includes(search.toLowerCase()))

            if (!matchSearch) return false;

            // Filter logic
            if (filter === 'all') return true;
            if (filter === 'returned') return r.status === 'returned';
            if (filter === 'overdue') return r.status === 'overdue';
            if (filter === 'active') return r.status === 'active';
            if (filter === 'due_soon') return r.status === 'active' && isDueSoon(r.due_date);

            return true;
        })
    }, [rentals, search, filter])

    const getStatusStyle = (rental: Rental) => {
        if (rental.status === 'returned') {
            return { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', icon: <CheckCircle size={16} />, label: 'Topshirgan' }
        }
        if (rental.status === 'overdue') {
            return { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', icon: <XCircle size={16} />, label: "Muddati o'tgan" }
        }
        if (rental.status === 'lost') {
            return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <AlertTriangle size={16} />, label: "Yo'qotilgan" }
        }

        // Active handling (check if due soon)
        if (isDueSoon(rental.due_date)) {
            return { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', icon: <Clock size={16} />, label: "Muddati kelgan" }
        }

        return { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', icon: <BookOpen size={16} />, label: "Topshirmagan (Ijarada)" }
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const getInitials = (name?: string) => {
        if (!name) return '?'
        return name.substring(0, 2).toUpperCase()
    }

    return (
        <div className="rentals-page">
            <style>{`
                .rentals-page {
                    padding: 32px 40px;
                    max-width: 1600px;
                    margin: 0 auto;
                    font-family: 'Inter', system-ui, sans-serif;
                    min-height: 100vh;
                }
                .ren-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
                    padding: 32px 40px;
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 40px -20px rgba(0,0,0,0.3);
                }
                .ren-header::after {
                    content: '';
                    position: absolute;
                    top: -50%; left: -50%;
                    width: 200%; height: 200%;
                    background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 50%);
                    pointer-events: none;
                }
                .ren-header h1 {
                    font-size: 2.2rem;
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    background: linear-gradient(to right, #34d399, #60a5fa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -0.5px;
                }
                .ren-header p {
                    color: #9ca3af;
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 500;
                }
                
                .filter-tabs {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 24px;
                    overflow-x: auto;
                    padding-bottom: 12px;
                }
                
                .filter-tab {
                    padding: 12px 24px;
                    border-radius: 12px;
                    background: rgba(31, 41, 55, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    color: #9ca3af;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    white-space: nowrap;
                }
                
                .filter-tab:hover {
                    background: rgba(55, 65, 81, 0.8);
                    color: #e5e7eb;
                }
                
                .filter-tab.active {
                    background: rgba(59, 130, 246, 0.2);
                    border-color: rgba(59, 130, 246, 0.5);
                    color: #60a5fa;
                    box-shadow: 0 4px 12px -4px rgba(59, 130, 246, 0.3);
                }

                .ren-search-wrapper {
                    position: relative;
                    margin-bottom: 32px;
                    max-width: 600px;
                }
                .ren-search-icon {
                    position: absolute;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                }
                .ren-input {
                    width: 100%;
                    background: rgba(31, 41, 55, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 18px 20px 18px 56px;
                    border-radius: 16px;
                    color: #f3f4f6;
                    font-size: 1.05rem;
                    transition: all 0.3s ease;
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.2);
                    backdrop-filter: blur(12px);
                }
                .ren-input:focus {
                    outline: none;
                    border-color: #34d399;
                    box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.15);
                    background: rgba(31, 41, 55, 0.8);
                }
                
                .ren-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                    gap: 24px;
                }
                
                .ren-card {
                    background: linear-gradient(145deg, rgba(31, 41, 55, 0.6), rgba(17, 24, 39, 0.6));
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 24px;
                    padding: 24px;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px -15px rgba(0,0,0,0.5);
                    overflow: hidden;
                }
                
                .ren-card:hover {
                    transform: translateY(-6px) scale(1.01);
                    border-color: rgba(52, 211, 153, 0.3);
                    box-shadow: 0 20px 40px -15px rgba(16, 185, 129, 0.2);
                }
                
                .ren-status-bar {
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 4px;
                }
                
                .ren-user {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 24px;
                    margin-top: 8px;
                }
                
                .ren-avatar {
                    width: 52px; height: 52px;
                    border-radius: 16px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: #fff;
                    font-size: 1.2rem;
                }
                
                .ren-user-info h3 { margin: 0; font-size: 1.2rem; color: #f9fafb; font-weight: 700; letter-spacing: -0.3px; }
                .ren-user-info p { margin: 6px 0 0 0; font-size: 0.9rem; color: #9ca3af; font-family: monospace; }
                
                .ren-book {
                    background: rgba(0, 0, 0, 0.25);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                    flex: 1;
                    border: 1px solid rgba(255,255,255,0.03);
                }
                
                .ren-book-title {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: #fff;
                    margin: 0 0 8px 0;
                    line-height: 1.4;
                }
                
                .ren-book-author {
                    font-size: 0.9rem;
                    color: #9ca3af;
                    margin: 0;
                }
                
                .ren-dates {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 24px;
                }
                
                .date-box {
                    flex: 1;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 12px 16px;
                    border-radius: 12px;
                }
                
                .date-label { font-size: 0.8rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px; }
                .date-value { font-size: 0.95rem; color: #e5e7eb; font-weight: 500; display: flex; align-items: center; gap: 6px;}
                
                .ren-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }
                
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin-icon { animation: spin 1s linear infinite; }
            `}</style>

            {/* <div className="ren-header">
                <div>
                    <h1>Ijara nazorati</h1>
                    <p>Talabalar va xodimlarga berilgan kitoblarni boshqarish</p>
                </div>
                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <ShieldCheck size={28} color="#34d399" />
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>Admin/Xodim Panel</div>
                        <div style={{ color: '#fff', fontWeight: 700 }}>Ijara modduli</div>
                    </div>
                </div>
            </div> */}

            <div className="filter-tabs">
                <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                    Barcha ijara qilinganlar
                </button>
                <button className={`filter-tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
                    Topshirmagan (Ijarada)
                </button>
                <button className={`filter-tab ${filter === 'due_soon' ? 'active' : ''}`} onClick={() => setFilter('due_soon')}>
                    Muddati kelgan (Qaytarish vaqti)
                </button>
                <button className={`filter-tab ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>
                    Muddati o'tgan
                </button>
                <button className={`filter-tab ${filter === 'returned' ? 'active' : ''}`} onClick={() => setFilter('returned')}>
                    Topshirgan (Arxiv)
                </button>
            </div>

            <div className="ren-search-wrapper">
                <Search size={22} className="ren-search-icon" />
                <input
                    type="text"
                    placeholder="Talaba ismi yoki kitob qidirish..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ren-input"
                />
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                    <Loader2 size={48} color="#34d399" className="spin-icon" style={{ opacity: 0.8 }} />
                </div>
            ) : filteredRentals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af', background: 'rgba(31,41,55,0.3)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <BookOpen size={64} style={{ opacity: 0.2, margin: '0 auto 20px' }} />
                    <h2 style={{ color: '#f3f4f6', margin: '0 0 8px' }}>Ma'lumot topilmadi</h2>
                    <p style={{ margin: 0 }}>Belgilangan holat yoki qidiruv so'ziga mos ijaralar yo'q.</p>
                </div>
            ) : (
                <div className="ren-grid">
                    {filteredRentals.map((r) => {
                        const style = getStatusStyle(r);
                        return (
                            <div key={r.id} className="ren-card">
                                <div className="ren-status-bar" style={{ background: style.color }}></div>

                                <div className="ren-user">
                                    <div className="ren-avatar">
                                        {getInitials(r.user_full_name || '')}
                                    </div>
                                    <div className="ren-user-info">
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {r.user_full_name}
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#9ca3af', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                                                {r.role === 'student' ? 'Talaba' : r.role === 'employee' ? 'Xodim' : r.role === 'teacher' ? 'O\'qituvchi' : r.role}
                                            </span>
                                        </h3>
                                        <p>Ijara raqami: #{r.id.split('-')[0]}</p>
                                    </div>
                                </div>

                                <div className="ren-book">
                                    <h4 className="ren-book-title">{r.book_title}</h4>
                                    <p className="ren-book-author">{r.book_author}</p>
                                </div>

                                <div className="ren-dates">
                                    <div className="date-box">
                                        <div className="date-label">Berilgan sana</div>
                                        <div className="date-value"><Calendar size={14} color="#9ca3af" /> {formatDate(r.loan_date)}</div>
                                    </div>
                                    <div className="date-box" style={{ background: isDueSoon(r.due_date) && r.status === 'active' ? 'rgba(251, 191, 36, 0.05)' : r.status === 'overdue' ? 'rgba(248, 113, 113, 0.05)' : '' }}>
                                        <div className="date-label" style={{ color: r.status === 'overdue' ? '#f87171' : '' }}>Qaytarish muddati</div>
                                        <div className="date-value" style={{ color: r.status === 'overdue' ? '#fca5a5' : '' }}><Clock size={14} color={r.status === 'overdue' ? '#f87171' : '#9ca3af'} /> {formatDate(r.due_date)}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="ren-status-pill" style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}30` }}>
                                        {style.icon} {style.label}
                                    </div>

                                    {r.return_date && r.status === 'returned' && (
                                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <CheckCircle size={14} color="#34d399" />
                                            Qaytardi: {formatDate(r.return_date)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
