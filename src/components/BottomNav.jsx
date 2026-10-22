const TABS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "corrections", label: "Corrections", icon: "✏️" },
  { id: "progress", label: "Progress", icon: "📈" },
];

export default function BottomNav({ current, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={"nav-item" + (current === tab.id ? " active" : "")}
          onClick={() => onChange(tab.id)}
          aria-current={current === tab.id ? "page" : undefined}
        >
          <span className="nav-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
