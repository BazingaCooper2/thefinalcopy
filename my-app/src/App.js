import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import SchedulePage from './components/SchedulePage copy';
import Login from './components/Login';
import Register from './components/Register2';
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
          </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;
