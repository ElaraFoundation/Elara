import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Sidebar from './components/layout/Sidebar';
import Loading from './components/common/Loading';

// Page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudiesPage from './pages/StudiesPage';
import StudyDetailsPage from './pages/StudyDetailsPage';
import CreateStudyPage from './pages/CreateStudyPage';
import ParticipantDashboardPage from './pages/ParticipantDashboardPage';
import ResearcherDashboardPage from './pages/ResearcherDashboardPage';
import ProfilePage from './pages/ProfilePage';
import ConsentDetailsPage from './pages/ConsentDetailsPage';
import NotFoundPage from './pages/NotFoundPage';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Web3Provider as Web3ContextProvider } from './contexts/Web3Context';

// CSS
import './assets/css/main.css';

function App() {
  return (
    <AuthProvider>
      <Web3ContextProvider>
        <Router>
          <AppContent />
        </Router>
      </Web3ContextProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, loading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Protect routes that require authentication
  const ProtectedRoute = ({ children }) => {
    if (loading) return <Loading />;
    if (!isAuthenticated) return <Navigate to="/login" />;
    return children;
  };

  // Routes that require researcher role
  const ResearcherRoute = ({ children }) => {
    if (loading) return <Loading />;
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (!user.isResearcher) return <Navigate to="/dashboard" />;
    return children;
  };

  return (
    <div className="app-container bg-gray-50 min-h-screen">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {isAuthenticated && (
        <>
          <Navbar setSidebarOpen={setSidebarOpen} />
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        </>
      )}
      
      <main className={`main-content ${isAuthenticated ? 'with-sidebar' : ''}`}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
          } />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {user?.isResearcher ? <ResearcherDashboardPage /> : <ParticipantDashboardPage />}
            </ProtectedRoute>
          } />
          
          <Route path="/studies" element={
            <ProtectedRoute>
              <StudiesPage />
            </ProtectedRoute>
          } />
          
          <Route path="/studies/:id" element={
            <ProtectedRoute>
              <StudyDetailsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/create-study" element={
            <ResearcherRoute>
              <CreateStudyPage />
            </ResearcherRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/consents/:id" element={
            <ProtectedRoute>
              <ConsentDetailsPage />
            </ProtectedRoute>
          } />
          
          {/* Not found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;