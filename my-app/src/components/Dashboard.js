import DashboardCard from './DashboardCard';
import MapSection from './MapSection';

export default function Dashboard() {
  const kpiData = [
    { label: 'Expired End Dates', value: '00', color: 'bg-purple-100' },
    { label: 'Clocked-in via Mobile', value: '03', color: 'bg-purple-100' },
    { label: 'Expiring Skills', value: '66', color: 'bg-purple-100' },
    { label: 'Forms to Approve', value: '03', color: 'bg-purple-100' },
    { label: 'Open Tickets', value: '00', color: 'bg-purple-100' },
    { label: 'Scheduled Visits', value: '30', color: 'bg-purple-100' },
    { label: 'Vacant Visits', value: '09', color: 'bg-orange-100' },
    { label: 'Late Visits', value: '30', color: 'bg-orange-100' },
    { label: 'Accepted Visit Offers', value: '03', color: 'bg-green-100' },
    { label: 'Expired Visit Offers', value: '00', color: 'bg-purple-100' },
    { label: 'COVID-19 Screener Alerts', value: '00', color: 'bg-purple-100' },
    { label: 'Overdue First Visit', value: '00', color: 'bg-purple-100' },
    { label: 'My Tasks Due Today', value: '00', color: 'bg-purple-100' },
    { label: 'Family Portal Open Requests', value: '00', color: 'bg-purple-100' },
    { label: 'Tasks Due Today', value: '00', color: 'bg-purple-100' },
  ];

  return (
    <div className="container-fluid flex-1 p-2">
      <h1 className="font-bold mb-4">Live Dashboard</h1>
      <div className='row'>
        <div className='col-xs-6 col-sm-4 col-md-3 col-lg-3'>
        {kpiData.map((item, index) => (index%4 === 0) && (
          <div><DashboardCard key={index} {...item} /></div>
        ))}
        </div>
        <div className="col-xs-6 col-sm-4 col-md-3 col-lg-3">
        {kpiData.map((item, index) => (index %4 === 1) && (
          <div><DashboardCard key={index} {...item} /></div>
        ))}
        </div>
        <div className="col-xs-6 col-sm-4 col-md-3 col-lg-3">
        {kpiData.map((item, index) => (index %4 === 2) && (
          <div><DashboardCard key={index} {...item} /></div>
        ))}
        </div>
        <div className="col-xs-6 col-sm-4 col-md-3 col-lg-3">
        {kpiData.map((item, index) => (index %4 === 3) && (
          <div><DashboardCard key={index} {...item} /></div>
        ))}
        </div>
      </div>
      <br />
      <MapSection />
    </div>
  );
}
