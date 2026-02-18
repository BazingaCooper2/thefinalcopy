import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

export default function FLWSchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0);

  useEffect(() => {
    fetchMySchedule();
  }, [selectedWeek]); // Re-fetch when week changes

  const fetchMySchedule = async () => {
    try {
      const response = await fetch(`http://localhost:5000/employee/${user?.emp_id}/schedule?week_offset=${selectedWeek}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSchedules(data.schedules || []);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = (weekOffset = 0) => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (weekOffset * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(selectedWeek);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">My Schedule</h2>
          <p className="text-muted mb-0">
            Welcome, {user?.first_name}! Here's your weekly schedule.
          </p>
        </div>
        
        {/* Week Navigation */}
        <div className="d-flex align-items-center gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={() => setSelectedWeek(selectedWeek - 1)}
          >
            <i className="bi bi-chevron-left"></i> Previous
          </button>
          
          <button 
            className="btn btn-outline-primary"
            onClick={() => setSelectedWeek(0)}
            disabled={selectedWeek === 0}
          >
            Current Week
          </button>
          
          <button 
            className="btn btn-outline-primary"
            onClick={() => setSelectedWeek(selectedWeek + 1)}
          >
            Next <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* Week Display */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            Week of {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h5>
          
          <div className="row g-2">
            {weekDates.map((date, index) => {
              const dateStr = date.toISOString().split('T')[0];
              const daySchedules = schedules.filter(s => 
                s.date === dateStr
              );
              
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={index} className="col-12 col-md-6 col-lg-4 col-xl-3">
                  <div className={`card h-100 ${isToday ? 'border-primary border-2' : ''}`}>
                    <div className={`card-header ${isToday ? 'bg-primary text-white' : 'bg-light'}`}>
                      <strong>{weekDays[index]}</strong>
                      <br />
                      <small>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
                      {isToday && <span className="badge bg-warning text-dark ms-2">Today</span>}
                    </div>
                    
                    <div className="card-body p-2">
                      {daySchedules.length > 0 ? (
                        daySchedules.map((shift, idx) => (
                          <div key={idx} className="p-2 mb-2 bg-light rounded">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <small className="text-muted d-block">Client</small>
                                <strong>{shift.client_name || 'N/A'}</strong>
                              </div>
                              <span className="badge bg-info">
                                {shift.shift_type || 'Shift'}
                              </span>
                            </div>
                            
                            <div className="mt-2">
                              <small className="text-muted">
                                <i className="bi bi-clock me-1"></i>
                                {shift.start_time} - {shift.end_time}
                              </small>
                            </div>
                            
                            {shift.location && (
                              <div className="mt-1">
                                <small className="text-muted">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {shift.location}
                                </small>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted py-3">
                          <i className="bi bi-calendar-x d-block mb-2" style={{ fontSize: '1.5rem' }}></i>
                          <small>No shifts</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <i className="bi bi-calendar-week text-primary" style={{ fontSize: '2rem' }}></i>
              <h3 className="mt-2 mb-0">{schedules.length}</h3>
              <p className="text-muted mb-0">Total Shifts This Week</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <i className="bi bi-clock-history text-success" style={{ fontSize: '2rem' }}></i>
              <h3 className="mt-2 mb-0">
                {schedules.reduce((total, s) => {
                  // Calculate hours between start and end time
                  if (s.start_time && s.end_time) {
                    const start = new Date(`2000-01-01 ${s.start_time}`);
                    const end = new Date(`2000-01-01 ${s.end_time}`);
                    return total + (end - start) / (1000 * 60 * 60);
                  }
                  return total;
                }, 0).toFixed(1)}
              </h3>
              <p className="text-muted mb-0">Hours Scheduled</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <i className="bi bi-people text-info" style={{ fontSize: '2rem' }}></i>
              <h3 className="mt-2 mb-0">
                {new Set(schedules.map(s => s.client_id)).size}
              </h3>
              <p className="text-muted mb-0">Clients This Week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}