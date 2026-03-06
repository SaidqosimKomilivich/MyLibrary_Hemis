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
    PaginatedNewsResponse,
    SingleNewsResponse,
    ReportDashboardResponse,
    Book,
    UserData,
    MessageDataItem,
    UnreadCountResponse,
    SendMessagePayload
} from './api.types'

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

export const getAuthHeader = () => {
    const token = localStorage.getItem('token')
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    }
}

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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    })

    // Token muddati tugagan — avtomatik logout
    // /auth/me va /auth/login uchun toast chiqmasin — faqat konsolga yozilsin
    if (res.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/me')) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        throw new ApiError('Sessiya muddati tugagan. Qayta kiring.', 401)
    }

    if (res.status === 401 && url.includes('/auth/me')) {
        console.warn('[Auth] Foydalanuvchi tizimga kirmagan (401 /auth/me)')
        throw new ApiError('Avtorizatsiya talab qilinadi', 401)
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
        return request<MessageResponse>('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ old_password, new_password, email, phone }),
        })
    },

    resetPassword(userId: string) {
        return request<MessageResponse>(`/auth/reset-password/${userId}`, {
            method: 'POST',
        })
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
        const qs = buildQueryString({ status, user_id })
        return request<RentalListResponse>(`/rentals${qs}`)
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

    // HEMIS sync endpoints — Talabalar (SSE Streaming)
    syncHemisStudentsStream(
        onEvent: (event: { stage: string; message: string; processed: number; total: number; created: number; updated: number; current_page: number; total_pages: number }) => void
    ): { promise: Promise<void>; abort: () => void } {
        const controller = new AbortController()
        const token = localStorage.getItem('token')

        const promise = (async () => {
            const res = await fetch(`${API_BASE}/sync/students`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
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
        onEvent: (event: { stage: string; message: string; processed: number; total: number; created: number; updated: number; current_page: number; total_pages: number }) => void
    ): { promise: Promise<void>; abort: () => void } {
        const controller = new AbortController()
        const token = localStorage.getItem('token')

        const promise = (async () => {
            const res = await fetch(`${API_BASE}/sync/teachers`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
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
        onEvent: (event: { stage: string; message: string; processed: number; total: number; created: number; updated: number; current_page: number; total_pages: number }) => void
    ): { promise: Promise<void>; abort: () => void } {
        const controller = new AbortController()
        const token = localStorage.getItem('token')

        const promise = (async () => {
            const res = await fetch(`${API_BASE}/sync/employees`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
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
        return request<PaginatedUsersResponse>(`/sync/admins${qs}`)
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

    getReportFilterOptions() {
        return request<{ success: boolean, data: { departments: string[], specialties: string[], groups: string[] } }>('/reports/user-filter-options')
    },

    getBookFilterOptions() {
        return request<{ success: boolean, data: { categories: string[], languages: string[], formats: string[], teachers: { id: string, full_name: string }[] } }>('/reports/book-filter-options')
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

        return fetch(`${API_BASE}/reports/export${qs}`, {

            headers: getAuthHeader()
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
    getNewsList(params: PaginationParams = {}) {
        const qs = buildQueryString(params)
        return request<PaginatedNewsResponse>(`/news${qs}`)
    },

    getPublicNewsList(params: PaginationParams = {}) {
        const qs = buildQueryString({
            page: params.page,
            search: params.search,
            category: params.category,
            limit: params.limit
        })
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
    },

    // ID karta yuklab olish sonini oshirish
    incrementIdCardDownload() {
        return request<{ success: boolean; message: string }>('/users/increment-id-card', {
            method: 'POST',
        })
    },

    // User qidirish: xabar yuborish uchun 
    searchUsers(query: string) {
        return request<{ success: boolean; data: { id: string; full_name: string; role: string }[] }>(
            `/users/search?q=${encodeURIComponent(query)}&limit=30`
        )
    },

    // Message endpoints
    getMyMessages() {
        return request<{ success: boolean; data: MessageDataItem[] }>('/messages')
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

    // Server-Sent Events for Messages
    subscribeToMessages(
        onMessage: (msg: MessageDataItem) => void
    ): { abort: () => void } {
        const controller = new AbortController()
        const token = localStorage.getItem('token')

            ; (async () => {
                try {
                    const res = await fetch(`${API_BASE}/messages/stream`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Authorization': token ? `Bearer ${token}` : '',
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
    }
}