export default function MobileNav({
  items,
  currentView,
  onChangeView,
}) {
  return (
    <nav className="mobile-nav" aria-label="Mobile primary">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === currentView ? "mobile-nav-item active" : "mobile-nav-item"}
          onClick={() => onChangeView(item.id)}
        >
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
