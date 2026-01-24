import React, { useEffect, useState, createContext, useContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Dashboard from './components/Dashboard';
import ClockIn from './components/ClockIn';
import Tasks from './components/Tasks';
import SchedulePage from './components/SchedulePage';
import Login from './components/Login';
import Logout from './components/Logout';
import Register from './components/Register2';
import ClientDetailsPage from './components/ClientDetailsPage';
import EmployeeDetails from './components/EmployeeDetailsPage';
import EmployeeDetailsEach from './components/EmployeeDetailsEach';
import InjuryReportPage from './components/InjuryReport';
import InjuryReportForm from './components/fillInjuryReport';
import GenerateShifts from './components/PrepareMonthlySchedule';
import AddShift from './components/manualShiftAddition';
import MasterSchedule from './components/MasterSchedule';
import DailySchedule from './components/DailySchedule';
import ShiftOffers from './components/ShiftOffers';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';

/* ===================== AUTH CONTEXT ===================== */

const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/* ===================== PROTECTED ROUTE ===================== */

function ProtectedRoute({ children, supervisorOnly = false, adminOnly = false }) {
  const { user, isAuthenticated } = useAuth();

  const isSupervisor =
    user?.emp_role === 'SUPERVISOR' ||
    user?.emp_role === 'MANAGER' ||
    user?.emp_role === 'ADMIN';

  const isAdmin = user?.emp_role === 'ADMIN';

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (supervisorOnly && !isSupervisor) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
}

/* ===================== APP CONTENT ===================== */

function AppContent() {
  const location = useLocation();

  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
        <div style={{ width: 250, flexShrink: 0 }}>
          <Sidebar />
        </div>

        <div className="flex-grow-1 d-flex flex-column" style={{ overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Routes location={location}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/logout" element={<Logout />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/client"
                element={
                  <ProtectedRoute>
                    <ClientDetailsPage key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employee"
                element={
                  <ProtectedRoute supervisorOnly>
                    <EmployeeDetails key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route path="/employee/:id" element={<EmployeeDetailsEach />} />

              <Route
                path="/schedule"
                element={
                  <ProtectedRoute supervisorOnly>
                    <SchedulePage key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dailySchedule"
                element={
                  <ProtectedRoute supervisorOnly>
                    <DailySchedule key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/monthlySchedule"
                element={
                  <ProtectedRoute supervisorOnly>
                    <GenerateShifts key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/masterSchedule"
                element={
                  <ProtectedRoute supervisorOnly>
                    <MasterSchedule key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/addShift"
                element={
                  <ProtectedRoute supervisorOnly>
                    <AddShift key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/injuryReport"
                element={
                  <ProtectedRoute>
                    <InjuryReportPage key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/fillInjuryReport"
                element={
                  <ProtectedRoute>
                    <InjuryReportForm key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shift-offers"
                element={
                  <ProtectedRoute>
                    <ShiftOffers key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/clock"
                element={
                  <ProtectedRoute>
                    <ClockIn key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tasks"
                element={
                  <ProtectedRoute supervisorOnly>
                    <Tasks key={location.key} />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>

          <Footer />
        </div>
      </div>
    </div>
  );
}

/* ===================== ROOT ===================== */

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
