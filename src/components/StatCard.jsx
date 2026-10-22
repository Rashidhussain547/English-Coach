export default function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
