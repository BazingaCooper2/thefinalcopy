import React from 'react';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

export default function DashboardGraphs() {
    // Sample data for clock-in/out throughout the day
    const clockData = [
        { time: '6 AM', clockedIn: 2, clockedOut: 0 },
        { time: '7 AM', clockedIn: 8, clockedOut: 1 },
        { time: '8 AM', clockedIn: 15, clockedOut: 2 },
        { time: '9 AM', clockedIn: 22, clockedOut: 3 },
        { time: '10 AM', clockedIn: 28, clockedOut: 5 },
        { time: '11 AM', clockedIn: 30, clockedOut: 8 },
        { time: '12 PM', clockedIn: 30, clockedOut: 12 },
        { time: '1 PM', clockedIn: 28, clockedOut: 15 },
        { time: '2 PM', clockedIn: 25, clockedOut: 18 },
        { time: '3 PM', clockedIn: 20, clockedOut: 22 },
        { time: '4 PM', clockedIn: 15, clockedOut: 25 },
        { time: '5 PM', clockedIn: 8, clockedOut: 28 },
        { time: '6 PM', clockedIn: 3, clockedOut: 30 },
    ];

    // Sample data for current clock status
    const clockStatusData = [
        { name: 'Clocked In', value: 30, color: '#8b5cf6' },
        { name: 'Clocked Out', value: 35, color: '#06b6d4' },
    ];

    // Sample data for employee status
    const statusData = [
        { name: 'Available', value: 45, color: '#06b6d4' },
        { name: 'Unavailable', value: 12, color: '#8b5cf6' },
        { name: 'On Leave', value: 8, color: '#f97316' },
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    }}
                >
                    <p style={{ margin: 0, fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                        {label}
                    </p>
                    {payload.map((entry, index) => (
                        <p
                            key={index}
                            style={{
                                margin: '4px 0',
                                color: entry.color,
                                fontSize: '14px',
                                fontWeight: '500',
                            }}
                        >
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const CustomLegend = ({ payload }) => {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: entry.color,
                            }}
                        />
                        <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            {/* Line Chart Row */}
            <div className="row g-4 mb-4">
                {/* Clock In/Out Activity Line Chart */}
                <div className="col-12">
                    <div className="content-card animate-slideUp" style={{ animationDelay: '100ms' }}>
                        <h3
                            className="mb-4 d-flex align-items-center gap-2"
                            style={{ color: 'var(--gray-800)' }}
                        >
                            <i className="bi bi-clock-history" style={{ color: 'var(--primary-purple)' }}></i>
                            Clock In/Out Activity
                        </h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={clockData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#9ca3af"
                                    style={{ fontSize: '13px', fontWeight: '500' }}
                                />
                                <YAxis stroke="#9ca3af" style={{ fontSize: '13px', fontWeight: '500' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend content={<CustomLegend />} />
                                <Line
                                    type="monotone"
                                    dataKey="clockedIn"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8b5cf6', r: 5 }}
                                    activeDot={{ r: 7 }}
                                    fill="url(#colorIn)"
                                    name="Clocked In"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="clockedOut"
                                    stroke="#06b6d4"
                                    strokeWidth={3}
                                    dot={{ fill: '#06b6d4', r: 5 }}
                                    activeDot={{ r: 7 }}
                                    fill="url(#colorOut)"
                                    name="Clocked Out"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Pie Charts Row */}
            <div className="row g-4 mb-4">
                {/* Clock In/Out Status Pie Chart */}
                <div className="col-12 col-lg-6">
                    <div className="content-card animate-slideUp" style={{ animationDelay: '150ms' }}>
                        <h3
                            className="mb-4 d-flex align-items-center gap-2"
                            style={{ color: 'var(--gray-800)' }}
                        >
                            <i className="bi bi-clock-fill" style={{ color: 'var(--primary-purple)' }}></i>
                            Current Clock Status
                        </h3>
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={clockStatusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {clockStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div
                                                    style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                        padding: '12px 16px',
                                                        borderRadius: '12px',
                                                        border: '1px solid rgba(139, 92, 246, 0.2)',
                                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                                    }}
                                                >
                                                    <p style={{ margin: 0, fontWeight: '600', color: '#1f2937' }}>
                                                        {payload[0].name}
                                                    </p>
                                                    <p style={{ margin: '4px 0 0 0', color: payload[0].payload.color }}>
                                                        Count: {payload[0].value}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Clock Status Legend */}
                        <div style={{ marginTop: '24px' }}>
                            {clockStatusData.map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                        marginBottom: '8px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(249, 250, 251, 0.8)',
                                        border: '1px solid rgba(229, 231, 235, 0.8)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        <span style={{ color: '#374151', fontWeight: '500', fontSize: '14px' }}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <span style={{ color: '#6b7280', fontWeight: '600', fontSize: '15px' }}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Employee Status Chart */}
                <div className="col-12 col-lg-6">
                    <div className="content-card animate-slideUp" style={{ animationDelay: '200ms' }}>
                        <h3
                            className="mb-4 d-flex align-items-center gap-2"
                            style={{ color: 'var(--gray-800)' }}
                        >
                            <i className="bi bi-pie-chart-fill" style={{ color: 'var(--primary-purple)' }}></i>
                            Employee Status
                        </h3>
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div
                                                    style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                        padding: '12px 16px',
                                                        borderRadius: '12px',
                                                        border: '1px solid rgba(139, 92, 246, 0.2)',
                                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                                    }}
                                                >
                                                    <p style={{ margin: 0, fontWeight: '600', color: '#1f2937' }}>
                                                        {payload[0].name}
                                                    </p>
                                                    <p style={{ margin: '4px 0 0 0', color: payload[0].payload.color }}>
                                                        Count: {payload[0].value}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Status Legend */}
                        <div style={{ marginTop: '24px' }}>
                            {statusData.map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                        marginBottom: '8px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(249, 250, 251, 0.8)',
                                        border: '1px solid rgba(229, 231, 235, 0.8)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        <span style={{ color: '#374151', fontWeight: '500', fontSize: '14px' }}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <span style={{ color: '#6b7280', fontWeight: '600', fontSize: '15px' }}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
