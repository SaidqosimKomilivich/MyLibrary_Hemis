// API service layer for backend communication

const API_BASE = '/api'

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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    })

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

    // Book endpoints
    getBooks(params: PaginationParams = {}) {
        const query = new URLSearchParams()
        if (params.page) query.append('page', params.page.toString())
        if (params.search) query.append('search', params.search)
        if (params.category) query.append('category', params.category)

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
    controlArrive() {
        return request<{ success: boolean; message: string }>('/control/arrive', {
            method: 'POST',
        })
    },

    controlDepart() {
        return request<{ success: boolean; message: string }>('/control/depart', {
            method: 'POST',
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
}

// Book types
export interface Book {
    id: string
    title: string
    author: string
    subtitle?: string | null
    translator?: string | null
    isbn_13?: string | null
    isbn_10?: string | null
    publisher?: string | null
    publication_date?: number | null
    edition?: string | null
    language?: string | null
    category?: string | null
    genre?: string | null
    description?: string | null
    page_count?: number | null
    duration_seconds?: number | null
    format?: string | null
    cover_image_url?: string | null
    digital_file_url?: string | null
    shelf_location?: string | null
    total_quantity?: number | null
    available_quantity?: number | null
    rating?: number | null
    is_active?: boolean | null
}

export interface CreateBookRequest {
    title: string
    author: string
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
}

export interface ControlListResponse {
    success: boolean
    data: ControlRecord[]
    total: number
}
