import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Loader2, BookOpen, Layers, Star, ArrowLeft } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import { api, type Book } from '../services/api';

const categories = [
    { id: 'all', name: 'Barchasi', icon: Layers },
    { id: 'Qo\'llanma', name: 'Qo\'llanma', icon: BookOpen },
    { id: 'Badiiy adabiyot', name: 'Badiiy', icon: Star },
    { id: 'Darslik', name: 'Darslik', icon: Layers },
    { id: 'Ensiklopediya', name: 'Ensiklopediya', icon: BookOpen },
    { id: 'Huquq', name: 'Huquq', icon: BookOpen },
    { id: 'Falsafa', name: 'Falsafa', icon: BookOpen },
    { id: 'Siyosiy', name: 'Siyosiy', icon: BookOpen },
];

const PublicCatalog = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination and Filters from URL
    const searchQuery = searchParams.get('q') || '';
    const categoryQuery = searchParams.get('category') || 'all';
    const pageQuery = parseInt(searchParams.get('page') || '1');
    const [totalPages, setTotalPages] = useState(1);

    const [searchInput, setSearchInput] = useState(searchQuery);

    const fetchBooks = async () => {
        setIsLoading(true);
        try {
            const params: any = { page: pageQuery, limit: 12 };
            if (searchQuery) params.search = searchQuery;
            if (categoryQuery !== 'all') params.category = categoryQuery;

            const res = await api.getPublicBooks(params);
            if (res.success) {
                setBooks(res.data);
                if (res.pagination) {
                    setTotalPages(res.pagination.total_pages);
                }
            } else {
                toast.error("Kitoblarni yuklashda xatolik yuz berdi");
            }
        } catch (error) {
            console.error(error);
            toast.error("Tarmoq xatosi");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBooks();
        setSearchInput(searchQuery);
    }, [searchQuery, categoryQuery, pageQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchParams({ q: searchInput, category: categoryQuery, page: '1' });
    };

    const handleCategoryClick = (categoryId: string) => {
        setSearchParams({ q: searchQuery, category: categoryId, page: '1' });
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setSearchParams({ q: searchQuery, category: categoryQuery, page: newPage.toString() });
        }
    };

    const handleBookClick = () => {
        toast.info("Kitobni o'qish yoki band qilish uchun tizimga kiring");
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-bg text-text selection:bg-emerald-500/30 font-sans flex flex-col">
            <PublicNavbar />

            {/* Universal Search Bar */}
            <div className="pt-24 pb-6 px-6 border-b border-border bg-bg">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <h1 className="text-2xl font-bold tracking-tight">Katalog</h1>
                    <form onSubmit={handleSearch} className="relative group max-w-3xl">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Kitob nomi, muallif yoki qidiring..."
                            className="w-full bg-surface border border-border/80 text-text rounded-full py-3.5 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-[0.95rem]"
                        />
                        <button type="submit" className="hidden"></button>
                    </form>
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 shrink-0">
                    <div className="sticky top-28 space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 px-2">Kategoriyalar</h3>
                            <div className="space-y-1">
                                {categories.map(cat => {
                                    const Icon = cat.icon;
                                    const isActive = categoryQuery === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : 'text-text-muted hover:bg-surface hover:text-text'
                                                }`}
                                        >
                                            <Icon size={18} className={isActive ? 'text-emerald-500' : 'opacity-70'} />
                                            {cat.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-2xl font-bold">
                            {searchQuery ? `"${searchQuery}" s'oroviga natijalar` : (categoryQuery === 'all' ? 'Barcha kitoblar' : `${categoryQuery} bo'yicha`)}
                        </h1>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchParams({ category: categoryQuery, page: '1' })}
                                className="text-sm text-text-muted hover:text-emerald-500 flex items-center gap-1 transition-colors"
                            >
                                <ArrowLeft size={16} /> Qidiruvni bekor qilish
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-text-muted">
                            <Loader2 size={32} className="animate-spin text-emerald-500 mb-4" />
                            <p>Kitoblar yuklanmoqda...</p>
                        </div>
                    ) : books.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {books.map((book) => (
                                    <div
                                        key={book.id}
                                        onClick={handleBookClick}
                                        className="group bg-surface border border-border/50 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer flex flex-col"
                                    >
                                        <div className="aspect-2/3 bg-slate-800/50 flex items-center justify-center border-b border-border/50 relative overflow-hidden shrink-0">
                                            {book.cover_image_url ? (
                                                <img
                                                    src={book.cover_image_url}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                                                    }}
                                                />
                                            ) : (
                                                <BookOpen size={48} className="text-border group-hover:text-emerald-500/50 transition-colors duration-500" />
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <span className="text-[0.65rem] font-bold tracking-wider text-emerald-500 uppercase mb-1.5 line-clamp-1">
                                                {book.category || 'Kitob'}
                                            </span>
                                            <h3 className="font-semibold text-[0.95rem] leading-tight mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                {book.title}
                                            </h3>
                                            <p className="text-text-muted text-[0.8rem] mb-3 line-clamp-1">{book.author}</p>

                                            <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between text-[0.75rem] font-medium text-text-muted">
                                                <span className="flex items-center gap-1.5">
                                                    <Layers size={14} />
                                                    {(book.available_quantity ?? book.available_copies ?? 0) > 0
                                                        ? <span className="text-emerald-500">{book.available_quantity ?? book.available_copies} ta mavjud</span>
                                                        : <span className="text-rose-500">Mavjud emas</span>}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-10 flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pageQuery - 1)}
                                        disabled={pageQuery <= 1}
                                        className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                    >
                                        Oldingi
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                            let pageNum = pageQuery;
                                            if (totalPages <= 5) pageNum = i + 1;
                                            else if (pageQuery <= 3) pageNum = i + 1;
                                            else if (pageQuery >= totalPages - 2) pageNum = totalPages - 4 + i;
                                            else pageNum = pageQuery - 2 + i;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${pageQuery === pageNum
                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                        : 'border-border bg-surface hover:bg-border/50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(pageQuery + 1)}
                                        disabled={pageQuery >= totalPages}
                                        className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                    >
                                        Keyingi
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center bg-surface/50 rounded-2xl border border-border/50 border-dashed">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-text-muted mb-4">
                                <Search size={28} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Kitob topilmadi</h3>
                            <p className="text-text-muted text-sm max-w-sm">
                                Boshqa so'z bilan qidirib ko'ring yoki kategoriyani o'zgartiring.
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchParams({ category: categoryQuery, page: '1' })}
                                    className="mt-6 border border-border hover:bg-surface px-4 py-2 rounded-xl text-sm transition-colors"
                                >
                                    Qidiruvni tozalash
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PublicCatalog;
