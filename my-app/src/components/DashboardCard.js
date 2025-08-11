
export default function DashboardCard({ label, value, icon, color }) {
  return (
    <div className={`p-4 rounded shadow-sm ${color} flex items-center justify-between min-w-[180px]`}>
      <div>
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-sm">{label}</div>
      </div>
      <div>{icon}</div>
    </div>
  );
}
