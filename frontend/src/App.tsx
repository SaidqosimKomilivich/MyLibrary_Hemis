import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import { AudioProvider } from './context/AudioContext'
import AudioPlayerModal from './components/AudioPlayerModal'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import PublicNewsPage from './pages/PublicNewsPage'
import PublicCatalog from './pages/PublicCatalog'
import DashboardLayout from './components/DashboardLayout'
import ComingSoon from './components/ComingSoon'
import AdminDashboard from './pages/admin/AdminDashboard'
import NewsPage from './pages/admin/NewsPage'
import NewsDetailPage from './pages/NewsDetailPage'
import Library from './pages/student/Library'
import UsersPage from './pages/admin/UsersPage'
import AdminEmployeesPage from './pages/admin/AdminEmployeesPage'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import AccessControl from './pages/employee/AccessControl'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherBookSubmit from './pages/teacher/TeacherBookSubmit'
import StudentDashboard from './pages/student/StudentDashboard'
import ProfilePage from './pages/ProfilePage'
import MyReadings from './pages/MyReadings'
import ChangePassword from './pages/ChangePassword'
import MyRequestsPage from './pages/student/MyRequestsPage'
import EmployeeRequestsPage from './pages/employee/EmployeeRequestsPage'
import EmployeeRentalsPage from './pages/employee/EmployeeRentalsPage'
import ReportsPage from './pages/employee/ReportsPage'
import PendingBooksPage from './pages/admin/PendingBooksPage'
import MyRentals from './pages/student/MyRentals'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AudioProvider>
          <ToastContainer
            position="top-center"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="dark"
          />
          <Routes>
            {/* Ochiq Bosh sahifa (Landing) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/search" element={<PublicCatalog />} />
            <Route path="/news" element={<PublicNewsPage />} />
            <Route path="/news/:slug" element={<NewsDetailPage />} />

            {/* Login */}
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />


            {/* Admin */}
            <Route path="/admin" element={<DashboardLayout role="admin" />}>
              <Route index element={<AdminDashboard />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="books" element={<Library />} />
              <Route path="pending-books" element={<PendingBooksPage />} />
              <Route path="rentals" element={<EmployeeRentalsPage />} />
              <Route path="requests" element={<EmployeeRequestsPage />} />
              <Route path="employees" element={<AdminEmployeesPage />} />
              <Route path="stats" element={<ReportsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Kutubxonachi (backend: staff) */}
            <Route path="/staff" element={<DashboardLayout role="staff" />}>
              <Route index element={<EmployeeDashboard />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="catalog" element={<Library />} />
              <Route path="pending-books" element={<PendingBooksPage />} />
              <Route path="rentals" element={<EmployeeRentalsPage />} />
              <Route path="requests" element={<EmployeeRequestsPage />} />
              <Route path="access-control" element={<AccessControl />} />
              <Route path="lend" element={<AccessControl />} />
              <Route path="returns" element={<AccessControl />} />
              <Route path="readers" element={<ComingSoon title="O'quvchilar" />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Oddiy Xodim (backend: employee) -> student kabi interfeys */}
            <Route path="/employee" element={<DashboardLayout role="employee" />}>
              <Route index element={<StudentDashboard />} />
              <Route path="library" element={<Library />} />
              <Route path="my-books" element={<MyReadings />} />
              <Route path="rentals" element={<MyRentals />} />
              <Route path="requests" element={<MyRequestsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Teacher */}
            <Route path="/teacher" element={<DashboardLayout role="teacher" />}>
              <Route index element={<TeacherDashboard />} />
              <Route path="available" element={<Library />} />
              <Route path="my-books" element={<MyReadings />} />
              <Route path="rentals" element={<MyRentals />} />
              <Route path="requests" element={<MyRequestsPage />} />
              <Route path="submit-book" element={<TeacherBookSubmit />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Student */}
            <Route path="/student" element={<DashboardLayout role="student" />}>
              <Route index element={<StudentDashboard />} />
              <Route path="library" element={<Library />} />
              <Route path="my-books" element={<MyReadings />} />
              <Route path="rentals" element={<MyRentals />} />
              <Route path="requests" element={<MyRequestsPage />} />

              <Route path="profile" element={<ProfilePage />} />

            </Route>

            {/* Default redirect (agar biron notanish manzil kiritilsa asosiysiga yuboradi) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AudioPlayerModal />
        </AudioProvider>
      </AuthProvider>
    </BrowserRouter >
  )
}

export default App
