import React, { useState } from 'react';
import './CalendarSchedule.css';

export default function CalendarSchedule() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Sample schedule data - you can replace this with API data
    const scheduleData = {
        '2026-01-12': [
            { id: 1, title: 'Morning Staff Meeting', time: '08:00', duration: '1h', color: '#5ED4C8' },
            { id: 2, title: 'Patient Consultation - General Medicine', time: '09:00', duration: '2h', color: '#5ED4C8' },
            { id: 3, title: 'Lunch Break', time: '12:00', duration: '1h', color: '#B8E6E1' },
            { id: 4, title: 'Surgery - Orthopedics', time: '14:00', duration: '3h', color: '#5ED4C8' },
            { id: 5, title: 'Training Session', time: '18:00', duration: '2h', color: '#5ED4C8' },
        ],
        // Add more dates as needed
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(newDate);
    };

    const formatDateKey = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const formatSelectedDate = (date) => {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        return date.toLocaleDateString('en-US', options);
    };

    const getTodaySchedule = () => {
        const dateKey = formatDateKey(selectedDate);
        return scheduleData[dateKey] || [];
    };

    const isToday = (day) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (day) => {
        return (
            day === selectedDate.getDate() &&
            currentDate.getMonth() === selectedDate.getMonth() &&
            currentDate.getFullYear() === selectedDate.getFullYear()
        );
    };

    return (
        <div className="calendar-schedule-container">
            {/* Calendar Section */}
            <div className="calendar-widget">
                <div className="calendar-header">
                    <button className="nav-btn" onClick={handlePrevMonth}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <h3 className="calendar-title">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                    <button className="nav-btn" onClick={handleNextMonth}>
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </div>

                <div className="calendar-grid">
                    {/* Day names */}
                    {dayNames.map((day) => (
                        <div key={day} className="calendar-day-name">
                            {day}
                        </div>
                    ))}

                    {/* Empty cells for days before month starts */}
                    {[...Array(startingDayOfWeek)].map((_, index) => (
                        <div key={`empty-${index}`} className="calendar-day empty"></div>
                    ))}

                    {/* Days of the month */}
                    {[...Array(daysInMonth)].map((_, index) => {
                        const day = index + 1;
                        return (
                            <div
                                key={day}
                                className={`calendar-day ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''
                                    }`}
                                onClick={() => handleDateClick(day)}
                            >
                                {day}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Schedule Section */}
            <div className="schedule-widget">
                <div className="schedule-header">
                    <h4 className="schedule-date">{formatSelectedDate(selectedDate)}</h4>
                    <button className="view-all-btn">
                        <i className="bi bi-calendar3"></i>
                    </button>
                </div>

                <div className="schedule-list">
                    {getTodaySchedule().length > 0 ? (
                        getTodaySchedule().map((event) => (
                            <div
                                key={event.id}
                                className="schedule-item"
                                style={{ backgroundColor: event.color }}
                            >
                                <div className="schedule-time">{event.time}</div>
                                <div className="schedule-details">
                                    <h5 className="schedule-title">{event.title}</h5>
                                    <p className="schedule-duration">{event.time} - {event.duration}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-events">
                            <i className="bi bi-calendar-x" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                            <p>No events scheduled</p>
                        </div>
                    )}
                </div>

                <button className="view-all-link">View All</button>
            </div>
        </div>
    );
}
