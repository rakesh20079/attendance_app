import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentScanner from './pages/StudentScanner';
import AttendanceSession from './pages/AttendanceSession';
import ForgotPassword from './pages/ForgotPassword';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' } }} />
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/faculty" element={
              <PrivateRoute allowedRoles={['faculty']}>
                <FacultyDashboard />
              </PrivateRoute>
            } />
            <Route path="/faculty/session/:sessionId" element={
              <PrivateRoute allowedRoles={['faculty']}>
                <AttendanceSession />
              </PrivateRoute>
            } />
            <Route path="/student" element={
              <PrivateRoute allowedRoles={['student']}>
                <StudentDashboard />
              </PrivateRoute>
            } />
            <Route path="/student/scan" element={
              <PrivateRoute allowedRoles={['student']}>
                <StudentScanner />
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
