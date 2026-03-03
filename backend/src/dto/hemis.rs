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
    #[serde(rename = "totalCount")]
    pub total_count: i64,
    #[serde(rename = "pageSize")]
    pub page_size: i64,
    #[serde(rename = "pageCount")]
    pub page_count: i64,
    pub page: i64,
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
    pub id: Option<i64>,
    pub name: Option<String>,
    pub code: Option<String>,
}

/// HEMIS API dagi specialty formati
#[derive(Debug, Deserialize, Clone)]
pub struct HemisSpecialty {
    pub id: Option<i64>,
    pub code: Option<String>,
    pub name: Option<String>,
}

/// HEMIS API dagi group formati
#[derive(Debug, Deserialize, Clone)]
pub struct HemisGroup {
    pub id: Option<i64>,
    pub name: Option<String>,
}

/// HEMIS API dan keladigan bitta talaba ma'lumotlari
#[derive(Debug, Deserialize, Clone)]
pub struct HemisStudentItem {
    pub id: i64,
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
    pub total: i64,
}
