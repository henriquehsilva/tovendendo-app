import { Link } from "react-router-dom";

const icons = {
  stores: <><path d="M4 9h16l-2-5H6Z"/><path d="M5.5 9v11h13V9M9 20v-6h6v6"/></>,
  resources: <><path d="M5 4h14v16H5Z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  login: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></>,
  create: <><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
};

function MobileSiteNav({ marketplace = false }) {
  const items = [
    { to: "/lojas", label: "Lojas", icon: "stores", active: marketplace },
    { to: "/doc", label: "Recursos", icon: "resources" },
    { to: "/admin/login", label: "Entrar", icon: "login" },
    { to: "/admin/login?criar=1", label: "Criar loja", icon: "create", primary: true },
  ];

  return (
    <nav className="mobile-site-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`${item.active ? "active" : ""} ${item.primary ? "primary" : ""}`.trim()}
          aria-current={item.active ? "page" : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{icons[item.icon]}</svg>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default MobileSiteNav;
