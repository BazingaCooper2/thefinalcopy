import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../node_modules/bootstrap-icons/font/bootstrap-icons.css';

export default function Navbar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="modern-navbar">
      <div className="container-fluid d-flex align-items-center justify-content-between position-relative" style={{ zIndex: 2 }}>
        {/* Brand Logo */}
        <div className="navbar-brand-modern d-flex align-items-center gap-2">
          <i className="bi bi-heart-pulse-fill"></i>
          Geri-Assist
        </div>

        {/* Right Section */}
        <div className="d-flex align-items-center gap-3">
          {/* Auth Links */}
          <div className="d-none d-lg-flex gap-2">
            <Link to="/login" className="navbar-link-modern">
              <i className="bi bi-box-arrow-in-right me-1"></i>
              Login
            </Link>
            <Link to="/register" className="navbar-link-modern">
              <i className="bi bi-person-plus me-1"></i>
              Register
            </Link>
          </div>

          {/* Mobile Auth Icons */}
          <div className="d-lg-none d-flex gap-2">
            <Link to="/login" className="navbar-link-modern p-2">
              <i className="bi bi-box-arrow-in-right fs-5"></i>
            </Link>
            <Link to="/register" className="navbar-link-modern p-2">
              <i className="bi bi-person-plus fs-5"></i>
            </Link>
          </div>

          {/* Time and Organization */}
          <div className="navbar-time-display d-none d-sm-flex flex-column align-items-end" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
            <div className="fw-bold">{formatTime(currentDate)}</div>
            <div style={{ opacity: 0.9, fontSize: '0.7rem' }}>{formatDate(currentDate)}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
