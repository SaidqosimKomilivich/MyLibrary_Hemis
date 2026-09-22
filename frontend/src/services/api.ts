// API service layer for backend communication

// API service layer for backend communication
import type {
    LoginPayload,
    LoginResponse,
    MessageResponse,
    MeResponse,
    PaginationParams,
    UserPaginationParams,
    CreateBookRequest,
    UploadResponse,
    PaginatedBooksResponse,
    BookRequest,
    PaginatedRequestsResponse,
    SingleBookResponse,
    ReadingListResponse,
    RentalListResponse,
    ControlListResponse,
    PaginatedUsersResponse,
    AdminDashboardResponse,
    MyDashboardResponse,
    EmployeeDashboardResponse,
    PublicDashboardResponse,
    CreateNewsRequest,
    UpdateNewsRequest,
    NewsListParams,
    PaginatedNewsResponse,
    SingleNewsResponse,
    ReportDashboardResponse,
    Book,
    UserData,
    MessageDataItem,
    UnreadCountResponse,
    SendMessagePayload,
    PaginatedMessageResponse,
    AnnouncementWithStatus,
    AnnouncementReadStatusResponse,
    CheckDuplicateResponse,
    UploadProgress,
    WeeklySyncReportResponse,
    SyncProgressEvent,
    ImportBooksRequest,
    ImportBooksResponse,
    SystemLogsResponse,
    SystemLogQuery,
    LogFileInfo,
} from './api.types'
import { formatBytes, formatSpeed } from '../utils/formatBytes'

export * from './api.types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

class ApiError extends Error {
    status: number
    data?: unknown
    constructor(message: string, status: number, data?: unknown) {
        super(message)
        this.status = status
        this.data = data
        this.name = 'ApiError'
    }
}

// getAuthHeader — faqat Content-Type headerini qaytaradi.
// Autentifikatsiya HttpOnly cookie orqali amalga oshiriladi (credentials: 'include').
// localStorage TOKEN ISHLATILMAYDI — bu XSS hujumlaridan himoya qiladi.
export const getAuthHeader = () => ({
    'Content-Type': 'application/json'
})


/** Yordamchi funksiya: URL uchun query string shakllantirish */
export const buildQueryString = (params: Record<string, string | number | boolean | undefined | null> | object) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.append(key, value.toString())
        }
    })
    const qs = query.toString()
    return qs ? `?${qs}` : ''
}

// Parallel 401 so'rovlar yuz berganda bitta umumiy refresh chaqiruvini ulashish uchun (Promise sharing / mutex)
let refreshPromise: Promise<boolean> | null = null

async function performTokenRefresh(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        return res.ok
    } catch {
        return false
    }
}

async function request<T>(url: string, options?: RequestInit, isRetry = false): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        credentials: 'include',
        cache: 'no-store',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...options?.headers,
        },
    })

    // 401 Unauthorized holatini interceptor orqali ushlab, tokenni yangilash va qayta so'rash
    if (res.status === 401) {
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/captcha') || url.includes('/auth/refresh')

        // Agar bu auth endpoint bo'lmasa va hali qayta urinilmagan bo'lsa (isRetry === false)
        if (!isAuthEndpoint && !isRetry) {
            // Agar boshqa parallel so'rov allaqachon refresh boshlagan bo'lsa, o'shaning natijasini kutamiz
            if (!refreshPromise) {
                refreshPromise = performTokenRefresh().finally(() => {
                    refreshPromise = null
                })
            }

            const refreshSuccess = await refreshPromise

            if (refreshSuccess) {
                // Token muvaffaqiyatli yangilandi! Dastlabki so'rovni takrorlaymiz (isRetry = true)
                return request<T>(url, options, true)
            } else {
                // Refresh token ham eskirgan (7 kun o'tgan) yoki bekor qilingan
                if (!url.includes('/auth/me')) {
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
                    throw new ApiError('Sessiya muddati tugagan. Qayta kiring.', 401)
                } else {
                    throw new ApiError('Avtorizatsiya talab qilinadi', 401)
                }
            }
        }

        // Agar qayta urinilgandan keyin ham 401 kelsa yoki auth endpoint bo'lsa:
        if (!url.includes('/auth/login') && !url.includes('/auth/me')) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'))
            throw new ApiError('Sessiya muddati tugagan. Qayta kiring.', 401)
        }

        if (url.includes('/auth/me')) {
            throw new ApiError('Avtorizatsiya talab qilinadi', 401)
        }
    }

    let data: unknown
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
        // xavfsiz o'qilishi uchun Record formatiga kast qilamiz
        const errData = data as Record<string, unknown>
        const fallbackMsg = 'Serverda xatolik yuz berdi'
        const errorMessage = typeof errData?.message === 'string' ? errData.message
            : (typeof errData?.error === 'string' ? errData.error : fallbackMsg)

        throw new ApiError(errorMessage, res.status, errData)
    }

    return data as T
}

export const api = {
    getCaptcha() {
        return request<import('./api.types').CaptchaResponse>('/auth/captcha')
    },

    login(user_id: string, password: string, captcha_id?: string, captcha_value?: number) {
        return request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ user_id, password, captcha_id, captcha_value } satisfies LoginPayload),
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

    changePassword(old_password: string, new_password: string, email?: string, phone?: string) {
        return request<MessageResponse>('/v1/pref/ps', {
            method: 'POST',
            body: JSON.stringify({ old_password, new_password, email, phone }),
        })
    },

    updateContacts(email?: string, phone?: string) {
        return request<MessageResponse>('/v1/pref/ct', {
            method: 'POST',
            body: JSON.stringify({ email, phone }),
        })
    },

    resetPassword(userId: string) {
        return request<MessageResponse>(`/v1/pref/rx/${userId}`, {
            method: 'POST',
        })
    },

    unblock(payload: import('./api.types').UnblockPayload) {
        return request<MessageResponse>('/auth/unblock', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    getBlockedList() {
        return request<import('./api.types').BlockedSummaryResponse>('/auth/blocked-list')
    },

    // Book endpoints
    getPublicBooks(params: PaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedBooksResponse>(`/public/books${qs}`)
    },

    getBooks(params: PaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedBooksResponse>(`/books${qs}`)
    },

    getBookById(id: string) {
        return request<SingleBookResponse>(`/books/${id}`)
    },

    checkBookDuplicate(params: { title?: string; author?: string; isbn?: string; publication_date?: number }) {
        const qs = buildQueryString(params)
        return request<{ success: boolean; data: CheckDuplicateResponse }>(`/books/check-duplicate${qs}`)
    },

    createBook(data: CreateBookRequest) {
        return request<SingleBookResponse>('/books', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    importBooks(data: ImportBooksRequest) {
        return request<ImportBooksResponse>('/books/import', {
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
        return request<{ success: boolean; data: Book[] }>('/v1/lib/q')
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
        return request<{ success: boolean; data: Book[] }>('/v1/lib/ts')
    },

    setAllBooksActive(active: boolean) {
        return request<{ success: boolean; affected: number; message: string }>('/v1/lib/ba', {
            method: 'PUT',
            body: JSON.stringify({ active }),
        })
    },

    uploadFile(file: File, onProgress?: (progress: UploadProgress) => void): { promise: Promise<UploadResponse>, xhr: XMLHttpRequest } {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)

        let lastTime = Date.now()
        let lastLoaded = 0
        let currentSpeed = 0

        const promise = new Promise<UploadResponse>((resolve, reject) => {
            // Upload progress
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    const now = Date.now()
                    const timeDiff = (now - lastTime) / 1000
                    if (timeDiff >= 0.2 || e.loaded === e.total) {
                        const bytesDiff = e.loaded - lastLoaded
                        currentSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0
                        lastTime = now
                        lastLoaded = e.loaded
                    }

                    const percent = Math.min(100, Math.round((e.loaded / e.total) * 100))
                    onProgress({
                        percent,
                        loaded: e.loaded,
                        total: e.total,
                        formattedLoaded: formatBytes(e.loaded),
                        formattedTotal: formatBytes(e.total),
                        speed: formatSpeed(currentSpeed),
                    })
                }
            }

            xhr.onload = async () => {
                try {
                    const data = JSON.parse(xhr.responseText)
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(data as UploadResponse)
                    } else if (xhr.status === 401) {
                        const refreshed = await performTokenRefresh()
                        if (refreshed) {
                            reject(new ApiError('Sessiya yangilandi. Iltimos, faylni qayta yuklang.', 401))
                        } else {
                            window.dispatchEvent(new CustomEvent('auth:unauthorized'))
                            reject(new ApiError('Sessiya muddati tugagan. Qayta kiring.', 401))
                        }
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
        return request<{ success: boolean; data: UserData }>(`/users/${encodeURIComponent(id.trim())}`)
    },

    updateUserRole(id: string, role: string) {
        return request<MessageResponse>(`/v1/usr/${id}/lv`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        })
    },

    updateUserStatus(id: string, active: boolean) {
        return request<MessageResponse>(`/v1/usr/${id}/sf`, {
            method: 'PUT',
            body: JSON.stringify({ active }),
        })
    },

    getControlToday() {
        return request<ControlListResponse>('/control/today')
    },

    // Rental endpoints (kitob berish/qaytarish)
    getRentals(status?: string, user_id?: string) {
        const qs = buildQueryString({ status, user_id })
        return request<RentalListResponse>(`/rentals${qs}`)
    },

    getMyRentals() {
        return request<RentalListResponse>('/rentals/my')
    },

    createRental(user_id: string, book_id: string, due_date: string, invoice_number: string, notes?: string) {
        return request<{ success: boolean; message: string; id: string }>('/rentals', {
            method: 'POST',
            body: JSON.stringify({ user_id, book_id, due_date, invoice_number, notes }),
        })
    },

    createRentalBatch(data: { user_id: string; due_date?: string; notes?: string; items: { book_id: string; invoice_number: string; due_date?: string; notes?: string }[] }) {
        return request<{ success: boolean; message: string; count: number; ids: string[] }>('/rentals/batch', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    returnRental(id: string, notes?: string) {
        return request<{ success: boolean; message: string }>(`/rentals/${id}/return`, {
            method: 'PUT',
            body: JSON.stringify({ notes }),
        })
    },

    returnRentalBatch(data: { notes?: string; items: { rental_id: string; notes?: string }[] }) {
        return request<{ success: boolean; message: string; count: number; returned_ids: string[] }>('/rentals/return-batch', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    // HEMIS sync endpoints — Talabalar (SSE Streaming)
    syncHemisStudentsStream(
        onEvent: (event: SyncProgressEvent) => void
    ): { promise: Promise<void>; abort: () => void } {
        const controller = new AbortController()
        // XAVFSIZLIK: localStorage token ishlatilmaydi — faqat cookie (credentials: 'include')

        const promise = (async () => {
            const res = await fetch(`${API_BASE}/sync/students`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'text/event-stream',
                },
                signal: controller.signal,
            })

            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('auth:unauthorized'))
                throw new Error('Sessiya muddati tugagan. Qayta kiring.')
            }

            if (!res.ok) {
                let msg = 'Sinxronlashda xatolik'
                try {
                    const err = await res.json()
                    msg = err.message || msg
                } catch { /* ignore */ }
                throw new Error(msg)
            }

            const reader = res.body?.getReader()
            if (!reader) throw new Error('Stream mavjud emas')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // SSE formatini parse qilish: "event: ...\ndata: ...\n\n"
                const parts = buffer.split('\n\n')
                buffer = parts.pop() || '' // oxirgi to'liq bo'lmagan qismni saqlab qo'yamiz

                for (const part of parts) {
                    if (!part.trim()) continue
                    const lines = part.split('\n')
                    let data = ''
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            data = line.slice(6)
                        }
                    }
                    if (data) {
                        try {
                            onEvent(JSON.parse(data))
                        } catch { /* ignore parse errors */ }
                    }
                }
            }
        })()

        return { promise, abort: () => controller.abort() }
    },


    getStudents(params: UserPaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedUsersResponse>(`/sync/students${qs}`)
    },

    // Teacher sync endpoints — O'qituvchilar (SSE Streaming)
    syncHemisTeachersStream(
        onEvent: (event: SyncProgressEvent) => void
    ): { promise: Promise<void>; abort: () => void } {
        const controller = new AbortController()
        // XAVFSIZLIK: localStorage token ishlatilmaydi — faqat cookie

        const promise = (async () => {
            const res = await fetch(`${API_BASE}/sync/teachers`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'text/event-stream',
                },
                signal: controller.signal,
            })

            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('auth:unauthorized'))
                throw new Error('Sessiya muddati tugagan. Qayta kiring.')
            }

            if (!res.ok) {
                let msg = 'Sinxronlashda xatolik'
                try {
                    const err = await res.json()
                    msg = err.message || msg
                } catch { /* ignore */ }
                throw new Error(msg)
            }

            const reader = res.body?.getReader()
            if (!reader) throw new Error('Stream mavjud emas')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                const parts = buffer.split('\n\n')
                buffer = parts.pop() || ''

                for (const part of parts) {
                    if (!part.trim()) continue
                    const lines = part.split('\n')
                    let data = ''
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            data = line.slice(6)
                        }
                    }
                    if (data) {
                        try {
                            onEvent(JSON.parse(data))
                        } catch { /* ignore parse errors */ }
                    }
                }
            }
        })()

        return { promise, abort: () => controller.abort() }
    },


    getTeachers(params: UserPaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedUsersResponse>(`/sync/teachers${qs}`)
    },

    syncHemisEmployees() {
        return request<{ success: boolean; message: string; created: number; updated: number; total: number }>('/sync/employees', { method: 'POST' })
    },

    // Employee sync endpoints — Xodimlar (SSE Streaming)
    syncHemisEmployeesStream(
        onEvent: (event: SyncProgressEvent) => void
    ): { promise: Promise<void>; abort: () => void } {
        const controller = new AbortController()
        // XAVFSIZLIK: localStorage token ishlatilmaydi — faqat cookie

        const promise = (async () => {
            const res = await fetch(`${API_BASE}/sync/employees`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'text/event-stream',
                },
                signal: controller.signal,
            })

            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('auth:unauthorized'))
                throw new Error('Sessiya muddati tugagan. Qayta kiring.')
            }

            if (!res.ok) {
                let msg = 'Sinxronlashda xatolik'
                try {
                    const err = await res.json()
                    msg = err.message || msg
                } catch { /* ignore */ }
                throw new Error(msg)
            }

            const reader = res.body?.getReader()
            if (!reader) throw new Error('Stream mavjud emas')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                const parts = buffer.split('\n\n')
                buffer = parts.pop() || ''

                for (const part of parts) {
                    if (!part.trim()) continue
                    const lines = part.split('\n')
                    let data = ''
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            data = line.slice(6)
                        }
                    }
                    if (data) {
                        try {
                            onEvent(JSON.parse(data))
                        } catch { /* ignore parse errors */ }
                    }
                }
            }
        })()

        return { promise, abort: () => controller.abort() }
    },

    // HEMIS haftalik status tekshiruvi (o'qishdan/ishdan ketganlarni nofaol qilish va qarzdorlikni xabar berish)
    triggerWeeklyStatusCheck() {
        return request<WeeklySyncReportResponse>('/sync/weekly-status-check', {
            method: 'POST'
        })
    },

    getEmployees(params: UserPaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedUsersResponse>(`/sync/employees${qs}`)
    },

    // Staff endpoints (Admin faqat stafflarni olishi uchun)
    getStaff(params: UserPaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedUsersResponse>(`/sync/staff${qs}`)
    },

    // Admin endpoints (Faqat super admin olishi uchun)
    getAdmins(params: UserPaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedUsersResponse>(`/v1/dir/sa${qs}`)
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
        const qs = buildQueryString({
            ...params,
            status: params.status === 'all' ? undefined : params.status
        })
        return request<PaginatedRequestsResponse>(`/requests${qs}`)
    },

    updateRequestStatus(id: string, status: string, employee_comment: string | null) {
        return request<MessageResponse>(`/requests/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, employee_comment })
        })
    },

    // Reports endpoints
    getStaffBookCounts() {
        return request<import('./api.types').StaffBookCountsResponse>('/reports/staff-book-counts')
    },

    getReportDashboard() {
        return request<{ success: boolean; data: ReportDashboardResponse }>('/reports/dashboard')
    },

    getAdminDashboard(year: number, month: number) {
        return request<AdminDashboardResponse>(`/v1/rpt/ad?year=${year}&month=${month}`)
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

    getReportFilterOptions() {
        return request<{ success: boolean, data: { departments: string[], specialties: string[], groups: string[] } }>('/reports/user-filter-options')
    },

    getBookFilterOptions() {
        return request<{ success: boolean, data: { categories: string[], genres?: string[], target_audiences?: string[], languages: string[], formats: string[], teachers: { id: string, full_name: string }[] } }>('/reports/book-filter-options')
    },

    getPublicBookFilterOptions() {
        return request<{ success: boolean, data: { categories: string[], genres?: string[], target_audiences?: string[], formats?: string[] } }>('/public/book-filter-options')
    },

    getReportPreview(type: 'rentals' | 'controls' | 'submissions' | 'users_statistics' | 'book_inventory' | 'overdue_rentals' | 'book_requests' | 'gate_control' | 'books_added' | 'staff_book_counts', startDate?: string, endDate?: string, userFilters?: { status?: string, department?: string, group_name?: string, role?: string }, bookFilters?: { category?: string, language?: string, format?: string, teacher_id?: string, staff_id?: string }) {
        const qs = buildQueryString({
            report_type: type,
            start_date: startDate,
            end_date: endDate,
            ...(userFilters || {}),
            ...(bookFilters || {})
        })
        return request<{ success: boolean, data: any[] }>(`/reports/preview${qs}`)
    },

    exportReportExcel(type: 'rentals' | 'controls' | 'submissions' | 'users_statistics' | 'book_inventory' | 'overdue_rentals' | 'book_requests' | 'gate_control' | 'books_added' | 'staff_book_counts', startDate?: string, endDate?: string, userFilters?: { status?: string, department?: string, group_name?: string, role?: string }, bookFilters?: { category?: string, language?: string, format?: string, teacher_id?: string, staff_id?: string }) {
        const qs = buildQueryString({
            report_type: type,
            start_date: startDate,
            end_date: endDate,
            ...(userFilters || {}),
            ...(bookFilters || {})
        })
        // XAVFSIZLIK: localStorage token ishlatilmaydi — faqat cookie (credentials: 'include')
        return fetch(`${API_BASE}/reports/export${qs}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(async (res) => {
            if (!res.ok) {
                let msg = 'Yuklashda xatolik yuz berdi'
                try {
                    const err = await res.json()
                    msg = err.message || msg
                } catch { /* ignored */ }
                throw new Error(msg)
            }
            return res.blob()
        })
    },


    // News endpoints (Admin CRUD)
    getNewsList(params: NewsListParams = {}) {
        const qs = buildQueryString(params as unknown as Record<string, unknown>)
        return request<PaginatedNewsResponse>(`/news${qs}`)
    },

    getPublicNewsList(params: NewsListParams = {}) {
        const qs = buildQueryString(params as unknown as Record<string, unknown>)
        return request<PaginatedNewsResponse>(`/public/news${qs}`)
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

    updateNews(id: string, data: UpdateNewsRequest) {
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
    },

    toggleNewsPin(id: string) {
        return request<SingleNewsResponse>(`/news/${id}/pin`, {
            method: 'PUT',
        })
    },

    // ID karta yuklab olish sonini oshirish
    incrementIdCardDownload() {
        return request<{ success: boolean; message: string }>('/users/increment-id-card', {
            method: 'POST',
        })
    },

    // User qidirish: xabar yuborish uchun 
    searchUsers(query: string, page: number = 1, limit: number = 30) {
        return request<{ success: boolean; data: { id: string; full_name: string; role: string }[]; pagination?: { current_page: number; total_pages: number; total_items: number; per_page: number } }>(
            `/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
        )
    },

    // Message endpoints
    getMyMessages(params: PaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedMessageResponse>(`/messages${qs}`)
    },

    getChatHistory(contactId: string) {
        return request<{ success: boolean; data: MessageDataItem[] }>(`/messages/history/${contactId}`)
    },

    createAnnouncement(data: { title: string, message: string, category?: string, images?: string[] }) {
        return request<{ success: boolean; message: string; data: any }>('/announcements', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    getUnreadMessageCount() {
        return request<UnreadCountResponse>('/messages/unread')
    },

    sendMessage(payload: SendMessagePayload) {
        return request<{ success: boolean; data: MessageDataItem; message: string }>('/messages', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    markMessageAsRead(id: string) {
        return request<MessageResponse>(`/messages/${id}/read`, {
            method: 'PATCH',
        })
    },

    // Announcement endpoints
    getAnnouncements() {
        return request<{ success: boolean; data: AnnouncementWithStatus[] }>('/announcements')
    },

    markAnnouncementAsRead(id: string) {
        return request<MessageResponse>(`/announcements/${id}/read`, {
            method: 'PATCH',
        })
    },

    getAnnouncementReadStatus(id: string, page: number = 1) {
        return request<AnnouncementReadStatusResponse>(`/announcements/${id}/read-status?page=${page}`)
    },

    // Server-Sent Events for Messages
    subscribeToMessages(
        onMessage: (msg: MessageDataItem) => void
    ): { abort: () => void } {
        const controller = new AbortController()
            // XAVFSIZLIK: localStorage token ishlatilmaydi — faqat cookie (credentials: 'include')

            ; (async () => {
                try {
                    const res = await fetch(`${API_BASE}/messages/stream`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'text/event-stream',
                        },
                        signal: controller.signal,
                    })

                    if (res.status === 401) {
                        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
                        return
                    }

                    if (!res.ok) return

                    const reader = res.body?.getReader()
                    if (!reader) return

                    const decoder = new TextDecoder()
                    let buffer = ''

                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        buffer += decoder.decode(value, { stream: true })
                        const parts = buffer.split('\n\n')
                        buffer = parts.pop() || ''

                        for (const part of parts) {
                            if (!part.trim()) continue
                            const lines = part.split('\n')
                            let data = ''
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    data = line.slice(6)
                                }
                            }
                            if (data) {
                                try {
                                    const parsed = JSON.parse(data)
                                    onMessage(parsed as MessageDataItem)
                                } catch { /* ignore parsing errors */ }
                            }
                        }
                    }
                } catch (err) {
                    // Ignore AbortError on unmount
                    if ((err as Error).name !== 'AbortError') {
                        console.error('SSE Message stream error:', err)
                    }
                }
            })()

        return { abort: () => controller.abort() }
    },

    // ==========================================
    // System Logs (Super Admin only)
    // ==========================================
    getSystemLogs(params: SystemLogQuery = {}) {
        const qs = buildQueryString(params as unknown as Record<string, unknown>)
        return request<SystemLogsResponse>(`/admin/logs${qs}`)
    },

    getSystemLogFiles() {
        return request<LogFileInfo[]>('/admin/logs/files')
    },

    downloadSystemLogFile(filename: string) {
        return fetch(`${API_BASE}/admin/logs/download?file=${encodeURIComponent(filename)}`, {
            credentials: 'include',
        }).then(async (res) => {
            if (!res.ok) {
                let msg = 'Log faylini yuklab olishda xatolik yuz berdi'
                try {
                    const err = await res.json()
                    msg = err.message || msg
                } catch { /* ignored */ }
                throw new Error(msg)
            }
            return res.blob()
        })
    },
}