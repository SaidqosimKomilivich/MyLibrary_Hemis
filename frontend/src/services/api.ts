// API service layer for backend communication

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

interface LoginPayload {
    user_id: string
    password: string
}

export interface UserData {
    id: string
    user_id: string
    role: string
    full_name: string
    short_name: string | null
    birth_date: string | null
    image_url: string | null
    email: string | null
    phone: string | null
    id_card: number
    department_name: string | null
    specialty_name: string | null
    group_name: string | null
    education_form: string | null
    staff_position: string | null
    active: boolean
    is_password_update: boolean
    is_super_admin?: boolean
}

interface LoginResponse {
    success: boolean
    message: string
    user: UserData
}

interface MessageResponse {
    success: boolean
    message: string
}

interface MeResponse {
    success: boolean
    user: UserData
}

class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
        this.name = 'ApiError'
    }
}

export const getAuthHeader = () => {
    const token = localStorage.getItem('token')
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    })

    // Token muddati tugagan — avtomatik logout
    if (res.status === 401 && !url.includes('/auth/login')) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        throw new ApiError('Sessiya muddati tugagan. Qayta kiring.', 401)
    }

    let data: any
    try {
        data = await res.json()
    } catch {
        // Response is not valid JSON (e.g. HTML 404 page)
        if (!res.ok) {
            throw new ApiError(`Server xatosi (${res.status})`, res.status)
        }
        throw new ApiError('Javobni o\'qishda xatolik', res.status)
    }

    if (!res.ok) {
        throw new ApiError(
            data.message || data.error || 'Serverda xatolik yuz berdi',
            res.status
        )
    }

    return data as T
}



export const api = {
    // ... existing endpoints ...
    login(user_id: string, password: string) {
        return request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ user_id, password } satisfies LoginPayload),
        })
    },

    logout() {
        return request<MessageResponse>('/auth/logout', {
            method: 'POST',
        })
    },

    getMe() {
        return request<MeResponse>('/auth/me')
    },

    refreshToken() {
        return request<MessageResponse>('/auth/refresh', {
            method: 'POST',
        })
    },

    changePassword(old_password: string, new_password: string) {
        return request<MessageResponse>('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ old_password, new_password }),
        })
    },

    resetPassword(userId: string) {
        return request<MessageResponse>(`/auth/reset-password/${userId}`, {
            method: 'POST',
        })
    },


    // Book endpoints
    getPublicBooks(params: PaginationParams = {}) {
        const urlParams = new URLSearchParams()
        if (params.page !== undefined) urlParams.append('page', params.page.toString())
        if (params.limit !== undefined) urlParams.append('limit', params.limit.toString())
        if (params.search !== undefined) urlParams.append('search', params.search)
        if (params.category !== undefined) urlParams.append('category', params.category)

        const qs = urlParams.toString()
        return request<PaginatedBooksResponse>(`/public/books${qs ? '?' + qs : ''}`)
    },

    getBooks(params: PaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.search) query.append('search', params.search)
        if (params.category) query.append('category', params.category)
        if (params.limit) query.append('limit', params.limit.toString()) // Added limit 

        return request<PaginatedBooksResponse>(`/books?${query.toString()}`)
    },

    createBook(data: CreateBookRequest) {
        return request<SingleBookResponse>('/books', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    updateBook(id: string, data: Partial<CreateBookRequest>) {
        return request<SingleBookResponse>(`/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    },

    deleteBook(id: string) {
        return request<MessageResponse>(`/books/${id}`, {
            method: 'DELETE',
        })
    },

    submitBook(data: CreateBookRequest) {
        return request<SingleBookResponse>('/books/submit', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    getPendingBooks() {
        return request<{ success: boolean; data: Book[] }>('/books/pending')
    },

    toggleBookActive(id: string, admin_comment?: string) {
        return request<{ success: boolean; data: Book }>(`/books/${id}/toggle-active`, {
            method: 'PUT',
            body: admin_comment ? JSON.stringify({ admin_comment }) : undefined
        })
    },

    updateBookTotalCopies(id: string, total_copies: number) {
        return request<{ success: boolean; message: string; data: Book }>(`/books/${id}/total-copies`, {
            method: 'PUT',
            body: JSON.stringify({ total_copies })
        })
    },

    getMySubmissions() {
        return request<{ success: boolean; data: Book[] }>('/books/my-submissions')
    },

    // Admin/Staff fetching all submitted books
    getTeacherSubmissions() {
        return request<{ success: boolean; data: Book[] }>('/books/teacher-submissions')
    },

    setAllBooksActive(active: boolean) {
        return request<{ success: boolean; affected: number; message: string }>('/books/set-all-active', {
            method: 'PUT',
            body: JSON.stringify({ active }),
        })
    },

    uploadFile(file: File, onProgress?: (percent: number) => void): { promise: Promise<UploadResponse>, xhr: XMLHttpRequest } {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)

        const promise = new Promise<UploadResponse>((resolve, reject) => {
            // Upload progress
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    const percent = Math.round((e.loaded / e.total) * 100)
                    onProgress(percent)
                }
            }

            xhr.onload = () => {
                try {
                    const data = JSON.parse(xhr.responseText)
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(data as UploadResponse)
                    } else {
                        reject(new ApiError(data.message || 'Fayl yuklashda xatolik', xhr.status))
                    }
                } catch {
                    reject(new ApiError('Javobni o\'qishda xatolik', xhr.status))
                }
            }

            xhr.onerror = () => {
                reject(new ApiError('Tarmoq xatosi', 0))
            }

            xhr.onabort = () => {
                reject(new ApiError('Yuklash bekor qilindi', 0))
            }

            xhr.open('POST', `${API_BASE}/upload`)
            xhr.withCredentials = true
            xhr.send(formData)
        })

        return { promise, xhr }
    },

    deleteFile(url: string): Promise<MessageResponse> {
        return request<MessageResponse>('/upload', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        })
    },

    // Reading endpoints
    startReading(book_id: string) {
        return request<{ success: boolean; message: string; id: string }>('/readings', {
            method: 'POST',
            body: JSON.stringify({ book_id }),
        })
    },

    getMyReadings() {
        return request<ReadingListResponse>('/readings')
    },

    removeReading(id: string) {
        return request<MessageResponse>(`/readings/${id}`, {
            method: 'DELETE',
        })
    },

    // Control endpoints (kirish-chiqish nazorati)
    controlArrive(user_id?: string) {
        return request<{ success: boolean; message: string }>('/control/arrive', {
            method: 'POST',
            body: user_id ? JSON.stringify({ user_id }) : undefined,
        })
    },

    controlDepart(user_id?: string) {
        return request<{ success: boolean; message: string }>('/control/depart', {
            method: 'POST',
            body: user_id ? JSON.stringify({ user_id }) : undefined,
        })
    },

    getUserById(id: string) {
        return request<{ success: boolean; data: UserData }>(`/users/${id}`)
    },

    updateUserRole(id: string, role: string) {
        return request<MessageResponse>(`/users/${id}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        })
    },

    updateUserStatus(id: string, active: boolean) {
        return request<MessageResponse>(`/users/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ active }),
        })
    },

    getControlToday() {
        return request<ControlListResponse>('/control/today')
    },

    // Rental endpoints (kitob berish/qaytarish)
    getRentals(status?: string, user_id?: string) {
        const params = new URLSearchParams()
        if (status) params.set('status', status)
        if (user_id) params.set('user_id', user_id)
        const qs = params.toString()
        return request<RentalListResponse>(`/rentals${qs ? '?' + qs : ''}`)
    },

    getMyRentals() {
        return request<RentalListResponse>('/rentals/my')
    },

    createRental(user_id: string, book_id: string, due_date: string, notes?: string) {
        return request<{ success: boolean; message: string; id: string }>('/rentals', {
            method: 'POST',
            body: JSON.stringify({ user_id, book_id, due_date, notes }),
        })
    },

    returnRental(id: string, notes?: string) {
        return request<{ success: boolean; message: string }>(`/rentals/${id}/return`, {
            method: 'PUT',
            body: JSON.stringify({ notes }),
        })
    },

    // HEMIS sync endpoints
    syncHemisStudents() {
        return request<{
            success: boolean;
            message: string;
            created: number;
            updated: number;
            total: number;
        }>('/sync/students', { method: 'POST' })
    },

    getStudents(params: UserPaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.per_page) query.append('per_page', params.per_page.toString())
        if (params.search) query.append('search', params.search)
        if (params.status) query.append('status', params.status)
        return request<PaginatedUsersResponse>(`/sync/students?${query.toString()}`)
    },

    // Teacher sync endpoints
    syncHemisTeachers() {
        return request<{
            success: boolean;
            message: string;
            created: number;
            updated: number;
            total: number;
        }>('/sync/teachers', { method: 'POST' })
    },

    getTeachers(params: UserPaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.per_page) query.append('per_page', params.per_page.toString())
        if (params.search) query.append('search', params.search)
        if (params.status) query.append('status', params.status)
        return request<PaginatedUsersResponse>(`/sync/teachers?${query.toString()}`)
    },

    // Employee sync endpoints
    syncHemisEmployees() {
        return request<{
            success: boolean;
            message: string;
            created: number;
            updated: number;
            total: number;
        }>('/sync/employees', { method: 'POST' })
    },

    getEmployees(params: UserPaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.per_page) query.append('per_page', params.per_page.toString())
        if (params.search) query.append('search', params.search)
        if (params.status) query.append('status', params.status)
        return request<PaginatedUsersResponse>(`/sync/employees?${query.toString()}`)
    },

    // Staff endpoints (Admin faqat stafflarni olishi uchun)
    getStaff(params: UserPaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.per_page) query.append('per_page', params.per_page.toString())
        if (params.search) query.append('search', params.search)
        if (params.status) query.append('status', params.status)
        return request<PaginatedUsersResponse>(`/sync/staff?${query.toString()}`)
    },

    // Admin endpoints (Faqat super admin olishi uchun)
    getAdmins(params: UserPaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.per_page) query.append('per_page', params.per_page.toString())
        if (params.search) query.append('search', params.search)
        if (params.status) query.append('status', params.status)
        return request<PaginatedUsersResponse>(`/sync/admins?${query.toString()}`)
    },

    // Book Requests endpoints
    createBookRequest(book_id: string, request_type: string) {
        return request<MessageResponse>('/requests', {
            method: 'POST',
            body: JSON.stringify({ book_id, request_type })
        })
    },

    getMyRequests() {
        return request<{ success: boolean; data: BookRequest[] }>('/requests/my')
    },

    getAllRequests(params: UserPaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.per_page) query.append('per_page', params.per_page.toString())
        if (params.search) query.append('search', params.search)
        if (params.status && params.status !== 'all') query.append('status', params.status)

        return request<PaginatedRequestsResponse>(`/requests?${query.toString()}`)
    },

    updateRequestStatus(id: string, status: string, employee_comment: string | null) {
        return request<MessageResponse>(`/requests/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, employee_comment })
        })
    },

    // Reports endpoints
    getReportDashboard() {
        return request<{ success: boolean; data: ReportDashboardResponse }>('/reports/dashboard')
    },

    getAdminDashboard(year: number, month: number) {
        return request<AdminDashboardResponse>(`/reports/admin-dashboard?year=${year}&month=${month}`)
    },

    getPublicStats() {
        return request<{ success: boolean; data: PublicDashboardResponse }>('/public/stats')
    },

    getEmployeeDashboard() {
        return request<{ success: boolean; data: EmployeeDashboardResponse }>('/reports/employee-dashboard')
    },

    getMyDashboard() {
        return request<MyDashboardResponse>('/reports/my-dashboard')
    },

    exportReportExcel(type: 'rentals' | 'controls' | 'submissions', startDate?: string, endDate?: string) {
        const query = new URLSearchParams()
        query.append('report_type', type)
        if (startDate) query.append('start_date', startDate)
        if (endDate) query.append('end_date', endDate)

        return fetch(`${API_BASE}/reports/export?${query.toString()}`, {
            headers: getAuthHeader()
        }).then(async (res) => {
            if (!res.ok) {
                let msg = 'Yuklashda xatolik yuz berdi'
                try {
                    const err = await res.json()
                    msg = err.message || msg
                } catch (e) { }
                throw new Error(msg)
            }
            return res.blob()
        })
    },

    // News endpoints (Admin CRUD)
    getNewsList(params: PaginationParams & { published_only?: boolean } = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.search) query.append('search', params.search)
        if (params.category) query.append('category', params.category)
        if (params.limit) query.append('limit', params.limit.toString())
        if (params.published_only) query.append('published_only', params.published_only.toString())

        return request<PaginatedNewsResponse>(`/news?${query.toString()}`)
    },

    getPublicNewsList(params: PaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.search) query.append('search', params.search)
        if (params.category) query.append('category', params.category)
        if (params.limit) query.append('limit', params.limit.toString())

        return request<PaginatedNewsResponse>(`/public/news?${query.toString()}`)
    },

    getNewsDetail(idOrSlug: string, isPublic = false) {
        const path = isPublic ? `/public/news/${idOrSlug}` : `/news/${idOrSlug}`;
        return request<SingleNewsResponse>(path)
    },

    createNews(data: CreateNewsRequest) {
        return request<SingleNewsResponse>('/news', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    updateNews(id: string, data: Partial<CreateNewsRequest>) {
        return request<SingleNewsResponse>(`/news/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    },

    deleteNews(id: string) {
        return request<MessageResponse>(`/news/${id}`, {
            method: 'DELETE',
        })
    },

    toggleNewsPublish(id: string) {
        return request<SingleNewsResponse>(`/news/${id}/publish`, {
            method: 'PUT',
        })
    }
}

// Reports types
export interface ReportDashboardResponse {
    recent_rentals: Rental[]
    recent_controls: ControlRecord[]
}

// Detailed Book Type
export interface Book {
    id: string
    title: string
    author: string
    category: string
    isbn: string | null
    published_year: number | null
    total_pages: number | null
    total_copies: number
    available_copies: number
    shelf_location: string | null
    cover_image: string | null
    description: string | null
    added_by: string
    created_at: string
    updated_at: string
    page_count?: number | null
    duration_seconds?: number | null
    format?: string | null
    cover_image_url?: string | null
    digital_file_url?: string | null
    total_quantity?: number | null
    available_quantity?: number | null
    is_active?: boolean | null
    admin_comment?: string | null
    subtitle?: string | null
    translator?: string | null
    publisher?: string | null
    publication_date?: number | null
    language?: string | null
    isbn_13?: string | null
}

export interface PopularBook {
    title: string;
    author: string;
    count: number;
    cover_image?: string;
}

export interface CreateBookRequest {
    title: string
    author: string
    subtitle?: string
    translator?: string
    edition?: string
    genre?: string
    isbn_10?: string
    category?: string
    isbn_13?: string
    total_quantity?: number
    available_quantity?: number
    publisher?: string
    publication_date?: number
    language?: string
    description?: string
    page_count?: number
    shelf_location?: string
    format?: string
    cover_image_url?: string
    digital_file_url?: string
    duration_seconds?: number
}

export interface UploadedFile {
    original_name: string
    filename: string
    url: string
    size: number
    extension: string
}

export interface UploadResponse {
    success: boolean
    message: string
    files: UploadedFile[]
}

export interface PaginationParams {
    page?: number
    search?: string
    category?: string
    limit?: number
}

export interface PaginatedBooksResponse {
    success: boolean
    data: Book[]
    pagination: {
        current_page: number
        per_page: number
        total_items: number
        total_pages: number
    }
}

// Book Request types
export interface BookRequest {
    id: string
    user_id: string
    book_id: string
    user_name: string
    book_title: string
    request_type: string // 'physical', 'electronic'
    status: string // 'pending', 'processing', 'ready', 'rejected'
    employee_comment: string | null
    created_at: string
    updated_at: string
}

export interface PaginatedRequestsResponse {
    success: boolean
    data: BookRequest[]
    pagination: {
        current_page: number
        per_page: number
        total_items: number
        total_pages: number
    }
}

export interface SingleBookResponse {
    success: boolean
    message?: string
    data: Book
}

// Reading types
export interface Reading {
    id: string
    user_id: string
    book_id: string
    start: string | null
    finish: string | null
    book_type: string | null
    audio: number | null
    page: number | null
    state: boolean | null
    book_title: string | null
    book_author: string | null
    book_cover: string | null
    book_category: string | null
    book_page_count: number | null
    book_format: string | null
    book_digital_file_url: string | null
}

export interface ReadingListResponse {
    success: boolean
    data: Reading[]
}

// Rental types (kitob berish/qaytarish)
export interface Rental {
    id: string
    user_id: string
    book_id: string
    loan_date: string
    due_date: string
    return_date: string | null
    status: 'active' | 'returned' | 'overdue' | 'lost'
    notes: string | null
    book_title: string | null
    book_author: string | null
    book_cover: string | null
    user_full_name: string | null
    role?: string
    department_name: string | null
    group_name: string | null
    staff_position?: string
}

export interface RentalListResponse {
    success: boolean
    data: Rental[]
    total: number
}

// Control types (kirish-chiqish nazorati)
export interface ControlRecord {
    id: string
    user_id: string
    arrival: string | null
    departure: string | null
    full_name: string | null
    role: string | null
    department_name: string | null
    group_name: string | null
    staff_position: string | null
}

export interface ControlListResponse {
    success: boolean
    data: ControlRecord[]
    total: number
}

// User pagination types
export interface UserPaginationParams {
    page?: number
    per_page?: number
    search?: string
    status?: string
}

export interface PaginatedUsersResponse {
    success: boolean
    data: UserData[]
    pagination: {
        current_page: number
        per_page: number
        total_items: number
        total_pages: number
    }
}

// Admin Dashboard Types
export interface AdminDashboardResponse {
    success: boolean
    data: {
        total_users: number
        total_books: number
        active_rentals: number
        overdue_rentals: number
        pending_requests: number
        chart_data: { date: string; count: number; controls_count: number }[]
        recent_activities: { id: string; user: string; action: string; time: string }[]
    }
}

// User Personal Dashboard Types
export interface MyDashboardResponse {
    success: boolean
    data: {
        active_rentals: number
        overdue_rentals: number
        total_read: number
        pending_requests: number
        recent_activities: { id: string; user: string; action: string; time: string }[]
    }
}

// Employee Dashboard Types
export interface EmployeeDashboardResponse {
    today_rented: number
    today_returned: number
    pending_requests: number
    today_visitors: number
    pending_returns: {
        student: string
        book: string
        due_date: string
        status: string
    }[]
    popular_books: {
        title: string
        author: string
        count: number
        cover_image?: string
    }[]
}

// Public Dashboard Types
export interface PublicDashboardResponse {
    total_books: number
    total_users: number
    total_rentals: number
    popular_books: {
        title: string
        author: string
        count: number
        cover_image?: string
    }[]
}

// News Types
export interface News {
    id: string
    title: string
    slug: string
    summary: string | null
    content: string
    images: string[]
    category: string | null
    tags: string[]
    author_id: string | null
    is_published: boolean
    published_at: string | null
    created_at: string
    updated_at: string
}

export interface CreateNewsRequest {
    title: string
    summary?: string
    content: string
    images?: string[]
    category?: string
    tags?: string[]
    is_published?: boolean
}

export interface PaginatedNewsResponse {
    success: boolean
    data: News[]
    pagination: {
        current_page: number
        per_page: number
        total_items: number
        total_pages: number
    }
}

export interface SingleNewsResponse {
    success: boolean
    message?: string
    data: News
}