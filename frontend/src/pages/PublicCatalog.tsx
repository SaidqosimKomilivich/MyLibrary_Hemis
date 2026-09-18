import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Loader2, BookOpen, Layers, ArrowLeft, Mic, MicOff, Bookmark, FileText } from 'lucide-react';
import { startVoiceSearch } from '../utils/voiceSearch';
import { api, type Book } from '../services/api';
import { highlightText } from '../utils/highlightText';
import { getFileUrl } from '../utils/fileUrl';
import { getCategoryLabel, getGenreLabel, getFormatLabel } from '../constants/bookClassification';

const DEFAULT_CATEGORIES = [
    { id: 'all', name: 'Barchasi', icon: Layers },
];

const DEFAULT_GENRES = [
    { id: 'all', name: 'Barcha turlar' },
];

const PublicCatalog = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<{ id: string, name: string, icon: any }[]>(DEFAULT_CATEGORIES);
    const [genres, setGenres] = useState<{ id: string, name: string }[]>(DEFAULT_GENRES);

    // Pagination and Filters from URL
    const searchQuery = searchParams.get('q') || '';
    const categoryQuery = searchParams.get('category') || 'all';
    const genreQuery = searchParams.get('genre') || 'all';
    const pageQuery = parseInt(searchParams.get('page') || '1');
    const [totalPages, setTotalPages] = useState(1);

    const [searchInput, setSearchInput] = useState(searchQuery);
    const [isListening, setIsListening] = useState(false);

    const fetchBooks = async () => {
        setIsLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const params: any = { page: pageQuery, limit: 12 };
            if (searchQuery) params.search = searchQuery;
            if (categoryQuery !== 'all') params.category = categoryQuery;
            if (genreQuery !== 'all') params.genre = genreQuery;

            const res = await api.getPublicBooks(params);
            if (res.success) {
                setBooks(res.data || []);
                if (res.pagination) {
                    setTotalPages(res.pagination.total_pages || 1);
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

    const fetchCategories = async () => {
        try {
            const res = await api.getPublicBookFilterOptions();
            if (res.success && res.data) {
                if (res.data.categories) {
                    const dynamicCategories = res.data.categories.map((catName: string) => ({
                        id: catName,
                        name: getCategoryLabel(catName),
                        icon: BookOpen
                    }));
                    setCategories([...DEFAULT_CATEGORIES, ...dynamicCategories]);
                }
                if (res.data.genres) {
                    const dynamicGenres = res.data.genres.map((gName: string) => ({
                        id: gName,
                        name: getGenreLabel(gName),
                    }));
                    setGenres([...DEFAULT_GENRES, ...dynamicGenres]);
                }
            }
        } catch (error) {
            console.error("Kategoriyalarni yuklashda xatolik:", error);
        }
    };

    useEffect(() => {
        fetchBooks();
        setSearchInput(searchQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, categoryQuery, genreQuery, pageQuery]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const next: Record<string, string> = { q: searchInput, page: '1' };
        if (categoryQuery !== 'all') next.category = categoryQuery;
        if (genreQuery !== 'all') next.genre = genreQuery;
        setSearchParams(next);
    };

    const handleCategoryClick = (categoryId: string) => {
        const next: Record<string, string> = { page: '1' };
        if (searchQuery) next.q = searchQuery;
        if (categoryId !== 'all') next.category = categoryId;
        if (genreQuery !== 'all') next.genre = genreQuery;
        setSearchParams(next);
    };

    const handleGenreClick = (genreId: string) => {
        const next: Record<string, string> = { page: '1' };
        if (searchQuery) next.q = searchQuery;
        if (categoryQuery !== 'all') next.category = categoryQuery;
        if (genreId !== 'all') next.genre = genreId;
        setSearchParams(next);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            const next: Record<string, string> = { page: newPage.toString() };
            if (searchQuery) next.q = searchQuery;
            if (categoryQuery !== 'all') next.category = categoryQuery;
            if (genreQuery !== 'all') next.genre = genreQuery;
            setSearchParams(next);
        }
    };

    const handleBookClick = (bookId: string) => {
        toast.info("Kitobni o'qish uchun tizimga kiring");
        navigate('/login', { state: { returnToBookId: bookId } });
    };

    const toggleVoiceSearch = () => {
        if (isListening) {
            setIsListening(false);
            return;
        }

        setIsListening(true);
        startVoiceSearch(
            (text) => {
                setSearchInput(text);
                setSearchParams({ q: text, category: categoryQuery, page: '1' });
            },
            () => setIsListening(false),
            (err) => toast.error(err)
        );
    };

    return (
        <div className="w-full flex flex-col">
            {/* Universal Search Bar */}
            <div className="pt-6 pb-6 px-6 border-b border-border bg-bg">
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
                            aria-label="Kitob qidirish"
                            className="w-full bg-surface border border-border/80 text-text rounded-full py-3.5 pl-12 pr-14 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-[0.95rem]"
                        />
                        <button 
                            type="button"
                            onClick={toggleVoiceSearch}
                            aria-label={isListening ? "Ovozli qidiruvni to'xtatish" : "Ovozli qidiruvni boshlash"}
                            className={`absolute inset-y-0 right-2 flex items-center px-3 text-text-muted hover:text-emerald-500 transition-colors ${isListening ? 'text-emerald-500 animate-pulse' : ''}`}
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <button type="submit" className="hidden"></button>
                    </form>
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 shrink-0">
                    <div className="sticky top-28 space-y-6">
                        {/* Nashr / Adabiyot turi */}
                        {genres.length > 1 && (
                            <div>
                                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                    <Bookmark size={14} className="text-indigo-400" />
                                    <span>Nashr turi</span>
                                </h3>
                                <div className="space-y-1">
                                    {genres.map(g => {
                                        const isActive = genreQuery === g.id;
                                        return (
                                            <button
                                                key={g.id}
                                                onClick={() => handleGenreClick(g.id)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${isActive
                                                    ? 'bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/30'
                                                    : 'text-text-muted hover:bg-surface hover:text-text'
                                                    }`}
                                            >
                                                <span>{g.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Fan va soha (Kategoriyalar) */}
                        <div>
                            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                <FileText size={14} className="text-emerald-400" />
                                <span>Fan va sohalar</span>
                            </h3>
                            <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                {categories.map(cat => {
                                    const Icon = cat.icon;
                                    const isActive = categoryQuery === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${isActive
                                                ? 'bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/30'
                                                : 'text-text-muted hover:bg-surface hover:text-text'
                                                }`}
                                        >
                                            <Icon size={15} className={isActive ? 'text-emerald-500' : 'opacity-70'} />
                                            <span className="truncate text-left">{cat.name}</span>
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
                            {searchQuery 
                                ? `"${searchQuery}" so'roviga natijalar` 
                                : (categoryQuery !== 'all' 
                                    ? `${getCategoryLabel(categoryQuery)} kitoblari` 
                                    : (genreQuery !== 'all' ? `${getGenreLabel(genreQuery)} nashrlari` : 'Barcha kitoblar'))}
                        </h1>
                        {(searchQuery || categoryQuery !== 'all' || genreQuery !== 'all') && (
                            <button
                                onClick={() => setSearchParams({ page: '1' })}
                                className="text-sm text-text-muted hover:text-emerald-500 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <ArrowLeft size={16} /> Barcha filtrlarni tozalash
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-text-muted">
                            <Loader2 size={32} className="animate-spin text-emerald-500 mb-4" />
                            <p>Kitoblar yuklanmoqda...</p>
                        </div>
                    ) : (books || []).length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {(books || []).map((book) => (
                                    <div
                                        key={book.id}
                                        onClick={() => handleBookClick(book.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleBookClick(book.id)}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`${book.title}, muallifi: ${book.author}. Batafsil ma'lumot uchun bosing.`}
                                        className="group bg-surface border border-border/50 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer flex flex-col"
                                    >
                                        <div className="aspect-2/3 bg-surface-hover flex items-center justify-center border-b border-border/50 relative overflow-hidden shrink-0">
                                            {book.cover_image_url ? (
                                                <img
                                                    src={getFileUrl(book.cover_image_url)}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                                                     }}
                                                />
                                            ) : (
                                                <BookOpen size={48} className="text-border group-hover:text-emerald-500/50 transition-colors duration-500" />
                                            )}
                                            {/* Format Badge */}
                                            {book.format && book.format !== 'bosma' && (
                                                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs border border-white/10 shadow-sm">
                                                    {book.format}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                                {book.genre && (
                                                    <span className="text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded-md">
                                                        {getGenreLabel(book.genre)}
                                                    </span>
                                                )}
                                                {book.category && (
                                                    <span className="text-[10px] font-semibold text-emerald-500 line-clamp-1">
                                                        {getCategoryLabel(book.category)}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-[0.95rem] leading-tight mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                {highlightText(book.title, searchQuery)}
                                            </h3>
                                            <p className="text-text-muted text-[0.8rem] mb-3 line-clamp-1">{highlightText(book.author, searchQuery)}</p>

                                            <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between text-[0.75rem] font-medium text-text-muted">
                                                <span className="flex items-center gap-1.5">
                                                    <Layers size={14} />
                                                    <span>{book.format ? getFormatLabel(book.format) : 'Mavjud'}</span>
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
                                                        ? 'bg-primary border-primary text-white'
                                                        : 'border-border bg-surface hover:bg-surface-hover hover:text-text'
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
                            <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center text-text-muted mb-4">
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
