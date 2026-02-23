import React, { useEffect, useState } from 'react';
import DashboardCard from './DashboardCard';
import DashboardGraphs from './DashboardGraphs';
import MapSection from './MapSection';
import CalendarSchedule from './CalendarSchedule';
import API_URL from '../config/api';

// ── Skeleton components ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 16,
      padding: '20px 22px',
      background: 'linear-gradient(135deg, #f0eeff 0%, #e8e5f5 100%)',
      border: '1px solid rgba(139,92,246,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      overflow: 'hidden',
      position: 'relative',
      minHeight: 130,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)',
        animation: 'shimmer 1.5s infinite',
        zIndex: 1,
      }} />
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#d4d0ea' }} />
      <div>
        <div style={{ width: '50%', height: 30, borderRadius: 8, background: '#d4d0ea', marginBottom: 8 }} />
        <div style={{ width: '70%', height: 11, borderRadius: 6, background: '#e2dff5' }} />
      </div>
    </div>
  );
}

function SkeletonSection({ height = 300 }) {
  return (
    <div style={{
      borderRadius: 20,
      height,
      background: 'linear-gradient(135deg, #f5f3ff 0%, #eeedfb 100%)',
      border: '1px solid rgba(139,92,246,0.08)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
        animation: 'shimmer 1.5s infinite',
      }} />
      {/* skeleton header strip */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid rgba(139,92,246,0.08)',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#d4d0ea' }} />
        <div style={{ width: 140, height: 14, borderRadius: 6, background: '#d4d0ea' }} />
      </div>
    </div>
  );
}

// ── KPI theme catalogue (original light/purple palette) ───────────────────────
const KPI_THEMES = {
  'Schedule Visits':    { bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', accent: '#7c3aed', icon: '📅', text: '#5b21b6', iconBg: 'rgba(124,58,237,0.13)' },
  'Clocked-in':         { bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', accent: '#0284c7', icon: '⏱️', text: '#0c4a6e', iconBg: 'rgba(2,132,199,0.12)'  },
  'Offers Sent':        { bg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)', accent: '#9333ea', icon: '📨', text: '#6b21a8', iconBg: 'rgba(147,51,234,0.12)' },
  'Available':          { bg: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', accent: '#16a34a', icon: '✅', text: '#14532d', iconBg: 'rgba(22,163,74,0.12)'  },
  'On Leave':           { bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)', accent: '#ea580c', icon: '🌴', text: '#7c2d12', iconBg: 'rgba(234,88,12,0.12)'  },
  'Unavailable - Sick': { bg: 'linear-gradient(135deg,#fef2f2,#fecaca)', accent: '#dc2626', icon: '🤒', text: '#7f1d1d', iconBg: 'rgba(220,38,38,0.12)'  },
  'Total Clients':      { bg: 'linear-gradient(135deg,#e0f7fa,#b2ebf2)', accent: '#0891b2', icon: '👥', text: '#164e63', iconBg: 'rgba(8,145,178,0.12)'  },
};

function KpiCard({ label, value, index }) {
  const t = KPI_THEMES[label] || {
    bg: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
    accent: '#64748b', icon: '📊', text: '#334155', iconBg: 'rgba(100,116,139,0.12)'
  };
  const [hov, setHov] = useState(false);

  return (
    <div
      className="dash-kpi-card"
      style={{
        borderRadius: 16,
        padding: '20px 22px',
        background: t.bg,
        border: `1px solid ${t.accent}25`,
        display: 'flex', flexDirection: 'column', gap: 14,
        position: 'relative', overflow: 'hidden', cursor: 'default',
        transition: 'transform .2s ease, box-shadow .2s ease',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? `0 14px 32px ${t.accent}25` : '0 2px 8px rgba(0,0,0,0.06)',
        animationDelay: `${index * 60}ms`,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: t.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>
        {t.icon}
      </div>

      <div>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.5px', color: t.text }}>
          {value ?? '—'}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase', color: t.accent, marginTop: 6, opacity: 0.85,
        }}>
          {label}
        </div>
      </div>

      {/* accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg,${t.accent},${t.accent}44)`,
        opacity: hov ? 0.9 : 0.4, transition: 'opacity .2s',
      }} />
      {/* decorative bubble */}
      <div style={{
        position: 'absolute', bottom: -24, right: -24,
        width: 90, height: 90, borderRadius: '50%',
        background: t.accent, opacity: 0.06,
      }} />
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(139,92,246,0.1)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(139,92,246,0.06)',
    }}>
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid rgba(139,92,246,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg,#fafaff 0%,#f5f3ff 100%)',
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#4c1d95', letterSpacing: '.3px' }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: '20px 24px 24px' }}>{children}</div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [kpiData, setKpiData]           = useState([]);
  const [totalClients, setTotalClients] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchData = async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const [statsRes, clientsRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/stats`),
        fetch(`${API_URL}/clients`),
      ]);
      const stats   = await statsRes.json();
      const clients = await clientsRes.json();
      setKpiData(stats);
      setTotalClients(clients?.count ?? clients?.clients?.length ?? 0);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const id = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(id);
  }, []);

  const allKpi = [...kpiData, { label: 'Total Clients', value: totalClients }];
  const timeStr = lastRefreshed
    ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        .dash-kpi-card { animation: fadeSlideUp .4s ease both; }
        .dash-section  { animation: fadeSlideUp .5s ease both; }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg,#f5f7fa 0%,#e9ecef 100%)',
        minHeight: 'calc(100vh - 60px)',
        padding: '28px 32px',
        display: 'flex', flexDirection: 'column', gap: 28,
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase', color: '#7c3aed', marginBottom: 6,
            }}>
              Operations Center
            </div>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 800, color: '#1e1b4b',
              lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <i className="bi bi-pie-chart-fill" style={{ color: '#7c3aed', fontSize: 26 }} />
              Live Dashboard
            </h1>
            {timeStr && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
                Last refreshed at {timeStr} · auto-updates every 60s
              </p>
            )}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)',
            borderRadius: 999, padding: '8px 16px',
            fontSize: 12, fontWeight: 700, color: '#15803d', letterSpacing: '.5px',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#16a34a', animation: 'livePulse 1.8s infinite',
            }} />
            LIVE
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))',
          gap: 16,
        }}>
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
            : allKpi.map((item, i) => (
                <KpiCard key={item.label} label={item.label} value={item.value} index={i} />
              ))
          }
        </div>

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        {loading ? (
          <SkeletonSection height={320} />
        ) : (
          <div className="dash-section" style={{ animationDelay: '360ms' }}>
            <Section title="Analytics & Trends" icon="📊">
              <DashboardGraphs />
            </Section>
          </div>
        )}

        {/* ── Map + Calendar ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
          gap: 20,
        }}>
          {loading ? (
            <>
              <SkeletonSection height={340} />
              <SkeletonSection height={340} />
            </>
          ) : (
            <>
              <div className="dash-section" style={{ animationDelay: '440ms' }}>
                <Section title="Live Employee Locations" icon="🗺️">
                  <MapSection />
                </Section>
              </div>
              <div className="dash-section" style={{ animationDelay: '500ms' }}>
                <Section title="Schedule & Calendar" icon="📆">
                  <CalendarSchedule />
                </Section>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  );
}