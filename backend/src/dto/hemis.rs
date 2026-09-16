use serde::{Deserialize, Serialize};

// ========================
// HEMIS API dan keladigan ma'lumotlar
// ========================

/// HEMIS Student API dan kelgan javob wrapper
#[derive(Debug, Deserialize)]
pub struct HemisApiResponse {
    pub success: bool,
    pub data: HemisData,
}

#[derive(Debug, Deserialize)]
pub struct HemisData {
    pub items: Vec<HemisStudentItem>,
    pub pagination: HemisPagination,
}

#[derive(Debug, Deserialize)]
pub struct HemisPagination {
    #[serde(rename = "pageCount")]
    pub page_count: i64,
}

/// HEMIS API dagi {code, name} formatidagi maydonlar
#[derive(Debug, Deserialize, Clone)]
pub struct HemisCodeName {
    pub code: Option<String>,
    pub name: Option<String>,
}

/// HEMIS API dagi department (kafedra/fakultet) formati
#[derive(Debug, Deserialize, Clone)]
pub struct HemisDepartment {
    pub name: Option<String>,
}

/// HEMIS API dagi specialty formati
#[derive(Debug, Deserialize, Clone)]
pub struct HemisSpecialty {
    pub name: Option<String>,
}

/// HEMIS API dagi group formati
#[derive(Debug, Deserialize, Clone)]
pub struct HemisGroup {
    pub name: Option<String>,
}

/// HEMIS API dan keladigan bitta talaba ma'lumotlari
#[derive(Debug, Deserialize, Clone)]
pub struct HemisStudentItem {
    pub full_name: Option<String>,
    pub short_name: Option<String>,
    pub student_id_number: Option<String>,
    pub birth_date: Option<i64>,
    pub image: Option<String>,
    pub email: Option<String>,
    pub department: Option<HemisDepartment>,
    pub specialty: Option<HemisSpecialty>,
    pub group: Option<HemisGroup>,
    #[serde(rename = "educationForm")]
    pub education_form: Option<HemisCodeName>,
    #[serde(rename = "studentStatus")]
    pub student_status: Option<HemisCodeName>,
}

// ========================
// HEMIS Employee (O'qituvchi/Xodim) API
// ========================

/// HEMIS Employee API dan kelgan javob wrapper
/// Formati talabalar bilan bir xil: {success, data: {items: [...], pagination: {...}}}
#[derive(Debug, Deserialize)]
pub struct HemisEmployeeApiResponse {
    pub success: bool,
    pub data: HemisEmployeeData,
}

#[derive(Debug, Deserialize)]
pub struct HemisEmployeeData {
    pub items: Vec<HemisEmployeeItem>,
    pub pagination: HemisPagination,
}

/// HEMIS API dan keladigan bitta xodim/o'qituvchi ma'lumotlari
#[derive(Debug, Deserialize, Clone)]
pub struct HemisEmployeeItem {
    pub id: i64,
    pub full_name: Option<String>,
    pub short_name: Option<String>,
    pub employee_id_number: Option<String>,
    pub birth_date: Option<i64>,
    pub image: Option<String>,
    pub department: Option<HemisDepartment>,
    #[serde(rename = "staffPosition")]
    pub staff_position: Option<HemisCodeName>,
    /// Xodim holati: code "11" = Ishlamoqda, "14" = Bo'shagan
    #[serde(rename = "employeeStatus")]
    pub employee_status: Option<HemisCodeName>,
}

// ========================
// Backend javob formatlari
// ========================

/// Sinxronlash natijasi
#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub success: bool,
    pub message: String,
    pub created: i64,
    pub updated: i64,
    pub deactivated: i64,
    pub total: i64,
}

// ========================
// HEMIS Student Auth API
// ========================

#[derive(Debug, Deserialize)]
pub struct HemisStudentAuthResponse {
    pub success: bool,
    pub data: Option<HemisStudentAuthData>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HemisStudentAuthData {
    pub token: String,
}

// ========================
// Haftalik Status Sinxronlash DTO lari
// ========================

#[derive(Debug, Serialize, Clone)]
pub struct BookDebtInfo {
    pub title: String,
    pub loan_date: String,
    pub due_date: String,
    pub invoice_number: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct UserDebtSummary {
    pub user_id: String,
    pub full_name: String,
    pub role: String,
    pub department: Option<String>,
    pub group_or_position: Option<String>,
    pub phone: Option<String>,
    pub books: Vec<BookDebtInfo>,
}

#[derive(Debug, Serialize, Clone)]
pub struct WeeklySyncReportResponse {
    pub success: bool,
    pub message: String,
    pub checked_students: i64,
    pub checked_employees: i64,
    pub deactivated_count: i64,
    pub users_with_debt: Vec<UserDebtSummary>,
    pub alerts_sent_to_staff: usize,
}