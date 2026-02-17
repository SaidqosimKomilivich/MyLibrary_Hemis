import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import DashboardLayout from './components/DashboardLayout'
import ComingSoon from './components/ComingSoon'
import AdminDashboard from './pages/admin/AdminDashboard'
import Library from './pages/student/Library'
import UsersPage from './pages/admin/UsersPage'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import AccessControl from './pages/employee/AccessControl'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import StudentDashboard from './pages/student/StudentDashboard'
import ProfilePage from './pages/ProfilePage'
import MyReadings from './pages/MyReadings'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="dark"
        />
        <Routes>
          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<DashboardLayout role="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="books" element={<Library />} />
            <Route path="employees" element={<ComingSoon title="Xodimlar" />} />
            <Route path="stats" element={<ComingSoon title="Statistika" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Employee (backend: staff) */}
          <Route path="/employee" element={<DashboardLayout role="employee" />}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="catalog" element={<Library />} />
            <Route path="access-control" element={<AccessControl />} />
            <Route path="lend" element={<AccessControl />} />
            <Route path="returns" element={<AccessControl />} />
            <Route path="readers" element={<ComingSoon title="O'quvchilar" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Teacher */}
          <Route path="/teacher" element={<DashboardLayout role="teacher" />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="available" element={<Library />} />
            <Route path="my-books" element={<MyReadings />} />
            <Route path="requests" element={<ComingSoon title="So'rovlar" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Student */}
          <Route path="/student" element={<DashboardLayout role="student" />}>
            <Route index element={<StudentDashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="my-books" element={<MyReadings />} />
            <Route path="requests" element={<ComingSoon title="So'rovlar" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
