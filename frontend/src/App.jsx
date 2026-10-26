import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Components
import MedicalDisclaimerBanner from './components/MedicalDisclaimerBanner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ChatDrawer from './components/ChatDrawer';

// Pages
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import NearbyDonors from './pages/NearbyDonors';
import BloodBanks from './pages/BloodBanks';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RequesterDashboard from './pages/RequesterDashboard';
import CreateRequest from './pages/CreateRequest';
import DonorDashboard from './pages/DonorDashboard';
import DonorRegistration from './pages/DonorRegistration';
import AdminDashboard from './pages/AdminDashboard';
import AdminRAGManagement from './pages/AdminRAGManagement';
import NotFound from './pages/NotFound';

export default function App() {
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900 selection:bg-rose-500 selection:text-white">
          {/* Clinical Disclaimer Banner across all pages */}
          <MedicalDisclaimerBanner />

          {/* Global Navbar with AI Assistant trigger */}
          <Navbar onOpenAI={() => setAiDrawerOpen(true)} />

          {/* Main Page Content */}
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home onOpenAI={() => setAiDrawerOpen(true)} />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/donors/nearby" element={<NearbyDonors />} />
              <Route path="/blood-banks" element={<BloodBanks />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Requester Protected Routes */}
              <Route
                path="/requester/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['requester', 'admin']}>
                    <RequesterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/create"
                element={
                  <ProtectedRoute allowedRoles={['requester', 'donor', 'admin']}>
                    <CreateRequest />
                  </ProtectedRoute>
                }
              />

              {/* Donor Protected Routes */}
              <Route
                path="/donor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['donor', 'admin']}>
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/registration"
                element={
                  <ProtectedRoute>
                    <DonorRegistration />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rag"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminRAGManagement />
                  </ProtectedRoute>
                }
              />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          {/* Interactive Groq + RAG AI Assistant Drawer */}
          <ChatDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />

          {/* Global Footer */}
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
