import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import SchedulePage from './components/SchedulePage';
import Login from './components/Login';
import Register from './components/Register2';
import ClientDetailsPage from './components/ClientDetailsPage.js';
import EmployeeDetails from './components/EmployeeDetailsPage.js';
import EmployeeDetailsEach from './components/EmployeeDetailsEach.js';
import InjuryReportPage from './components/InjuryReport.js';
import InjuryReportForm from './components/fillInjuryReport.js';
import GenerateShifts from './components/PrepareMonthlySchedule.js';
import AddShift from './components/manualShiftAddition.js';
import MasterSchedule from './components/MasterSchedule.js';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Router>
        <Navbar />
        <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
          <div style={{ width: '250px', flexShrink: 0 }} className="d-none d-md-block">
            <Sidebar />
          </div>
          <div className="flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Dashboard />}></Route>
              <Route path="/schedule" element={<SchedulePage />}></Route>
              <Route path="/login" element={<Login />}></Route>
              <Route path="/register" element={<Register />}></Route>
              <Route path="/client" element={<ClientDetailsPage />}></Route>
              <Route path="/employee" element={<EmployeeDetails />}></Route>
              <Route path="/injuryReport" element={<InjuryReportPage />}></Route>
              <Route path="/fillInjuryReport" element={<InjuryReportForm />}></Route>
              <Route path="/monthlySchedule" element={<GenerateShifts />}></Route>
              <Route path="/addShift" element={<AddShift />}></Route>
              <Route path="/employee/:id" element={<EmployeeDetailsEach />} />
              <Route path="/masterSchedule" element={<MasterSchedule />}></Route>
            </Routes>
          </div>
        </div>
        {/* Mobile Bottom Navigation */}
        <div className="d-md-none" style={{ height: '60px', background: 'var(--dark-bg)', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}>
          <Sidebar />
        </div>
      </Router>
    </div>
  );
}

export default App;
