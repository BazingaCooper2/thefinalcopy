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
import ClientDetailsPage from './components/ClientDetailsPage.js';
import EmployeeDetails from './components/EmployeeDetailsPage.js';
import EmployeeDetailsEach from './components/EmployeeDetailsEach.js';
import InjuryReportPage from './components/InjuryReport.js';
import InjuryReportForm from './components/fillInjuryReport.js';
import GenerateShifts from './components/PrepareMonthlySchedule.js';
import AddShift from './components/manualShiftAddition.js';
import MasterSchedule from './components/MasterSchedule.js';
import DailySchedule from './components/DailySchedule.js';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, createContext, useContext } from 'react';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import ShiftOffers from './components/ShiftOffers';

// BUILT-IN AUTH CONTEXT (NO EXTERNAL FILES NEEDED)
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch (e) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) return null;

  const value = { user, login, logout, isAuthenticated: !!user };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children, supervisorOnly = false }) {
  const { user, isAuthenticated } = useAuth();

  const isSupervisor =
    user?.emp_role === "SUPERVISOR" ||
    user?.emp_role === "MANAGER" ||
    user?.emp_role === "ADMIN";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (supervisorOnly && !isSupervisor) {
    return <Navigate to="/" replace />;
  }

  return children;
}

//const token = localStorage.getItem("token");
//return token ? children : <Navigate to="/" />;

function AppContent() {
  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Router>
        <Navbar />
        <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
          <div
            style={{ width: '250px', flexShrink: 0 }}
            className="sidebar-container">
            <Sidebar />
          </div>

          <div className="flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: '1' }}>
              <Routes>
                <Route path="/login" element={<Login />}></Route>
                <Route path="/register" element={<Register />}></Route>
                <Route path="/logout" element={<Logout />}></Route>
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}></Route>
                <Route path="/schedule" element={<ProtectedRoute supervisorOnly><SchedulePage /></ProtectedRoute>}></Route>
                <Route path="/client" element={<ProtectedRoute ><ClientDetailsPage /></ProtectedRoute>}></Route>
                <Route path="/employee" element={<ProtectedRoute supervisorOnly><EmployeeDetails /></ProtectedRoute>}></Route>
                <Route path="/injuryReport" element={<ProtectedRoute><InjuryReportPage /></ProtectedRoute>}></Route>
                <Route path="/fillInjuryReport" element={<ProtectedRoute><InjuryReportForm /></ProtectedRoute>}></Route>
                <Route path="/monthlySchedule" element={<ProtectedRoute supervisorOnly><GenerateShifts /></ProtectedRoute>}></Route>
                <Route path="/addShift" element={<ProtectedRoute supervisorOnly><AddShift /></ProtectedRoute>}></Route>
                <Route path="/employee/:id" element={<EmployeeDetailsEach />} />
                <Route path="/masterSchedule" element={<ProtectedRoute supervisorOnly><MasterSchedule /></ProtectedRoute>}></Route>
                <Route path="/dailySchedule" element={<ProtectedRoute supervisorOnly><DailySchedule /></ProtectedRoute>}></Route>
                <Route path="/shift-offers" element={<ProtectedRoute supervisorOnly><ShiftOffers /></ProtectedRoute>}></Route>
                <Route path="/clock" element={<ProtectedRoute><ClockIn /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute supervisorOnly><Tasks /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </div>
      </Router>
    </div>
  );
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
