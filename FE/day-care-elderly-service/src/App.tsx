import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AuthDialog from "./components/AuthDialog";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./layouts/layout";
import Home from "./components/Home";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import FamilyDashboard from "./pages/family/FamilyDashboard";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Home Page */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />

          {/* Role Dashboards */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={<Navigate to="/dashboard/admin" replace />}
          />

          <Route
            path="/dashboard/staff"
            element={
              <ProtectedRoute allowedRoles={["Staff"]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={<Navigate to="/dashboard/staff" replace />}
          />

          <Route
            path="/dashboard/family"
            element={
              <ProtectedRoute allowedRoles={["FamilyMember", "Admin", "Staff"]}>
                <FamilyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={<Navigate to="/dashboard/family" replace />}
          />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Auth Dialog (Modal) */}
        <AuthDialog />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
