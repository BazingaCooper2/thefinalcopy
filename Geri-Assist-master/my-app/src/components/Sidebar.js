import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import "../../node_modules/bootstrap-icons/font/bootstrap-icons.css";

export default function Sidebar() {
    const location = useLocation();
    const [activeDropdown, setActiveDropdown] = useState(null);

    const isActive = (path) => location.pathname === path;

    const menuItems = [
        {
            icon: 'bi-speedometer2',
            label: 'Dashboard',
            path: '/',
        },
        {
            icon: 'bi-person-circle',
            label: 'Client',
            path: '/client',
        },
        {
            icon: 'bi-people-fill',
            label: 'Employee',
            hasDropdown: true,
            dropdown: [
                { label: 'Employee List', path: '/employee' },
                { label: 'Register Employee', path: '/register' },
                { label: 'Add Shift', path: '/addShift' },
            ],
        },
        {
            icon: 'bi-calendar-check',
            label: 'Schedule',
            hasDropdown: true,
            dropdown: [
                { label: 'Daily Schedule', path: '/schedule' },
                { label: 'All Schedules', path: '/schedule' },
                { label: 'Monthly Schedule', path: '/monthlySchedule' },
                { label: 'Master Schedule', path: '/masterSchedule' },
            ],
        },
        {
            icon: 'bi-bandaid-fill',
            label: 'Injury Reports',
            hasDropdown: true,
            dropdown: [
                { label: 'View Reports', path: '/injuryReport' },
                { label: 'Fill Report', path: '/fillInjuryReport' },
            ],
        },
        {
            icon: 'bi-gear-fill',
            label: 'Settings',
            path: '/settings',
        },
    ];

    return (
        <div className="modern-sidebar">
            <nav className="px-2">
                {menuItems.map((item, index) => (
                    <div key={index}>
                        {item.hasDropdown ? (
                            <div className="mb-1">
                                <div
                                    className={`sidebar-item ${activeDropdown === item.label ? 'active' : ''}`}
                                    onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className={`bi ${item.icon}`}></i>
                                    <span className="d-none d-sm-inline">{item.label}</span>
                                    <i className={`bi bi-chevron-${activeDropdown === item.label ? 'up' : 'down'} ms-auto d-none d-sm-inline`} style={{ fontSize: '0.75rem' }}></i>
                                </div>

                                {activeDropdown === item.label && (
                                    <div className="ms-3 animate-fadeIn">
                                        {item.dropdown.map((subItem, subIndex) => (
                                            <Link
                                                key={subIndex}
                                                to={subItem.path}
                                                className={`sidebar-dropdown-item ${isActive(subItem.path) ? 'active' : ''}`}
                                            >
                                                <span className="d-none d-sm-inline">{subItem.label}</span>
                                                <i className="bi bi-dot d-sm-none"></i>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to={item.path}
                                className={`sidebar-item mb-1 ${isActive(item.path) ? 'active' : ''}`}
                            >
                                <i className={`bi ${item.icon}`}></i>
                                <span className="d-none d-sm-inline">{item.label}</span>
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            {/* Footer Info */}
            <div className="mt-auto p-3 d-none d-sm-block" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="mb-1">Guelph Independent Living</div>
                <div>Healthcare Management</div>
            </div>
        </div>
    );
}
