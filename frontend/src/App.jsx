import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout & Route Guards
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Page Components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExaminationList from './pages/ExaminationList';
import ExaminationDetail from './pages/ExaminationDetail';
import ExaminationAddEdit from './pages/ExaminationAddEdit';
import Reporting from './pages/Reporting';
import UserManagement from './pages/UserManagement';
import AuditTrail from './pages/AuditTrail';
import Profile from './pages/Profile';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Operational Routes */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Examinations CRUD */}
        <Route 
          path="/examinations" 
          element={
            <PrivateRoute>
              <Layout>
                <ExaminationList />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/examinations/add" 
          element={
            <PrivateRoute>
              <Layout>
                <ExaminationAddEdit />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/examinations/edit/:id" 
          element={
            <PrivateRoute>
              <Layout>
                <ExaminationAddEdit />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/examinations/detail/:id" 
          element={
            <PrivateRoute>
              <Layout>
                <ExaminationDetail />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Reports (Rekap Pelaporan) */}
        <Route 
          path="/reports" 
          element={
            <PrivateRoute allowedRoles={['admin', 'institution']}>
              <Layout>
                <Reporting />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Profile (Medioker) */}
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Settings (Admin / Profile) */}
        <Route 
          path="/settings" 
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <SettingsPage />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Admin-only: User Management */}
        <Route 
          path="/users" 
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <UserManagement />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Admin-only: Audit Logs */}
        <Route 
          path="/audit-logs" 
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AuditTrail />
              </Layout>
            </PrivateRoute>
          } 
        />

        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
