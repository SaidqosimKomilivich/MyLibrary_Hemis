export interface LoginPayload {
    user_id: string
    password: string
    captcha_id?: string
    captcha_value?: number
}

export interface CaptchaResponse {
    success: boolean
    captcha_id: string
    image: string  // base64 SVG: "data:image/svg+xml;base64,..." — matematik misol emas, rasm
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
    last_login?: string | null
    is_role_custom?: boolean
}

export interface LoginResponse {
    success: boolean
    message: string
    user: UserData
}

export interface MessageResponse {
    success: boolean
    message: string
}

export interface UnblockPayload {
    user_id?: string
    ip?: string
    clear_all?: boolean
}

export interface BlockedItem {
    target: string
    blocked_until: number
}

export interface BlockedSummaryResponse {
    success: boolean
    users: BlockedItem[]
    ips: BlockedItem[]
}

export interface MeResponse {
    success: boolean
    user: UserData
}

export type PaginationParams = {
    page?: number
    limit?: number
    search?: string
    category?: string
    genre?: string
    target_audience?: string
    format?: string
    language?: string
    published_only?: boolean
}

export type UserPaginationParams = {
    page?: number
    per_page?: number
    search?: string
    status?: string
}

export interface Book {
    id: string
    title: string
    author: string
    category: string
    genre?: string | null
    target_audience?: string | null
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

export interface CheckDuplicateResponse {
    exists: boolean
    match_type: 'isbn' | 'title_author' | null
    book: Book | null
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
    target_audience?: string
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

export interface SkippedBookInfo {
    title: string
    author: string
    reason: string
}

export interface ImportBooksRequest {
    books: CreateBookRequest[]
}

export interface ImportBooksResponse {
    success: boolean
    message: string
    imported_count: number
    skipped_count: number
    skipped_books: SkippedBookInfo[]
}


export interface UploadedFile {
    original_name: string
    filename: string
    url: string
    size: number
    extension: string
}

export interface UploadProgress {
    percent: number
    loaded: number
    total: number
    formattedLoaded: string
    formattedTotal: string
    speed: string
}

export interface UploadResponse {
    success: boolean
    message: string
    files: UploadedFile[]
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

export interface BookRequest {
    id: string
    user_id: string
    book_id: string
    user_name: string
    book_title: string
    request_type: string
    status: string
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

export interface Rental {
    id: string
    user_id: string
    book_id: string
    loan_date: string
    due_date: string
    return_date: string | null
    status: 'active' | 'returned' | 'overdue' | 'lost'
    invoice_number: string | null
    notes: string | null
    book_title: string | null
    book_author: string | null
    book_cover: string | null
    user_full_name: string | null
    email?: string | null
    phone?: string | null
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

export interface CreateRentalBatchItem {
    book_id: string
    invoice_number: string
    due_date?: string
    notes?: string
}

export interface CreateRentalBatchRequest {
    user_id: string
    due_date?: string
    notes?: string
    items: CreateRentalBatchItem[]
}

export interface ReturnRentalBatchItem {
    rental_id: string
    notes?: string
}

export interface ReturnRentalBatchRequest {
    notes?: string
    items: ReturnRentalBatchItem[]
}

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

export interface AdminDashboardResponse {
    success: boolean
    data: {
        total_users: number
        total_books: number
        inactive_books: number
        total_copies: number
        active_rentals: number
        overdue_rentals: number
        pending_requests: number
        chart_data: { date: string; count: number; controls_count: number }[]
        recent_activities: { id: string; user: string; action: string; time: string }[]
        books_by_category: { category: string; count: number; total_copies: number }[]
        books_by_language: { language: string; count: number; total_copies: number }[]
    }
}

export interface StaffBookCount {
    staff_id: string
    full_name: string
    count: number
}

export interface StaffBookCountsResponse {
    success: boolean
    data: StaffBookCount[]
}

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

export interface NewsAttachment {
    id: string
    file_url: string
    file_name: string
    file_size: number
    file_type: string
}

export interface AttachmentInput {
    file_url: string
    file_name: string
    file_size: number
    file_type: string
}

export interface News {
    id: string
    title: string
    slug: string
    summary: string | null
    content: string
    images: string[]
    category: string | null
    tags: string[]
    author_id?: string | null
    is_published: boolean
    published_at: string | null
    views: number
    is_pinned: boolean
    attachments?: NewsAttachment[]
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
    is_pinned?: boolean
    attachments?: AttachmentInput[]
}

export interface UpdateNewsRequest {
    title?: string
    summary?: string
    content?: string
    images?: string[]
    category?: string
    tags?: string[]
    is_published?: boolean
    is_pinned?: boolean
    attachments?: AttachmentInput[]
}

export interface NewsListParams {
    page?: number
    limit?: number
    search?: string
    category?: string
    published_only?: boolean
    date_from?: string
    date_to?: string
    sort_by?: string
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

export interface ReportDashboardResponse {
    recent_rentals: Rental[]
    recent_controls: ControlRecord[]
}

export interface MessageDataItem {
    id: string
    sender_id: string | null
    receiver_id: string | null
    sender_name: string | null
    sender_role: string | null
    receiver_name: string | null
    receiver_role: string | null
    title: string
    message: string
    images?: string[]
    category?: string | null
    is_read: boolean
    created_at: string
}

export interface UnreadCountResponse {
    success: boolean
    data: {
        unread_count: number
    }
}

export interface SendMessagePayload {
    receiver_id: string
    title: string
    message: string
}

export interface Announcement {
    id: string
    sender_id: string | null
    title: string
    message: string
    images?: string[]
    category?: string | null
    created_at: string
}

export interface AnnouncementWithStatus {
    id: string
    sender_id: string | null
    sender_name: string | null
    title: string
    message: string
    images?: string[]
    category?: string | null
    is_read: boolean
    created_at: string
}

export interface AnnouncementReadStatus {
    user_id: string
    full_name: string
    role: string
    read_at: string
}

export interface PaginatedMessageResponse {
    success: boolean
    data: MessageDataItem[]
    pagination: {
        current_page: number
        per_page: number
        total_items: number
        total_pages: number
    }
}

export interface AnnouncementReadStatusResponse {
    success: boolean
    data: AnnouncementReadStatus[]
    pagination: {
        current_page: number
        per_page: number
        total_items: number
        total_pages: number
    }
}

export interface BookDebtInfo {
    title: string
    loan_date: string
    due_date: string
    invoice_number?: string | null
}

export interface UserDebtSummary {
    user_id: string
    full_name: string
    role: string
    department?: string | null
    group_or_position?: string | null
    phone?: string | null
    books: BookDebtInfo[]
}

export interface WeeklySyncReportResponse {
    success: boolean
    message: string
    checked_students: number
    checked_employees: number
    deactivated_count: number
    users_with_debt: UserDebtSummary[]
    alerts_sent_to_staff: number
}

export interface SyncProgressEvent {
    stage: string
    message: string
    processed: number
    total: number
    created: number
    updated: number
    deactivated: number
    current_page: number
    total_pages: number
}

export interface SyncResult {
    created: number
    updated: number
    deactivated?: number
    total: number
}

export interface SystemLogEntry {
    id: string
    timestamp: string
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string
    message: string
    target: string
    module: 'auth' | 'http' | 'scheduler' | 'db' | 'system' | 'other' | string
    http_method?: string
    http_route?: string
    http_status?: number
    client_ip?: string
    user_id?: string
    request_id?: string
    error_details?: string
    fields: Record<string, unknown>
    span?: Record<string, unknown>
    raw_json: string
}

export interface LogStats {
    total: number
    error_count: number
    warn_count: number
    info_count: number
    debug_count: number
}

export interface LogFileInfo {
    filename: string
    date: string
    size_bytes: number
    is_current: boolean
}

export interface SystemLogsResponse {
    files: LogFileInfo[]
    current_file: string
    stats: LogStats
    logs: SystemLogEntry[]
    total_filtered: number
    page: number
    per_page: number
    total_pages: number
}

export interface SystemLogQuery {
    file?: string
    level?: string
    module?: string
    status_code?: number
    search?: string
    page?: number
    per_page?: number
}

