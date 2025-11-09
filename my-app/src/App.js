import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import SchedulePage from './components/SchedulePage copy';
import Login from './components/Login';
import Register from './components/Register2';
import ClientDetailsPage from './components/ClientDetailsPage.js';
import EmployeeDetails from './components/EmployeeDetailsPage.js';
import InjuryReportPage from './components/InjuryReport.js';
import InjuryReportForm from './components/fillInjuryReport.js';
import GenerateShifts from './components/PrepareMonthlySchedule.js';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import React from 'react';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <div className="App h-screen flex flex-col">
      <Router>
      <Navbar />
        <div className="row">
          <div className="col-md-2 col-sm-3"><Sidebar /></div>
          <div className="col-md-10 col-sm-9">
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
          </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
