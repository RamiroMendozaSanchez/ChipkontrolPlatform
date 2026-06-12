import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/chipkontrol-logo.png";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
  {
    label: "Dashboard",
    icon: "📊",
    path: "/",
    roles: ["admin", "group_admin", "user"],
  },
  {
    label: "Mapa",
    icon: "🗺️",
    path: "/map",
    roles: ["admin","group_admin", "user"],
  },
  {
    label: "Grupos",
    icon: "👥",
    path: "/groups",
    roles: ["admin"],
  },
  {
    label: "Nuevo Grupo",
    icon: "➕",
    path: "/admin/groups/new",
    roles: ["admin"],
  },
  {
    label: "Nuevo Usuario",
    icon: "👤",
    path: "/admin/users/new",
    roles: ["admin", "group_admin"],
  },
];

  return (
    <aside className="sidebar">

      <div>

        <div className="sidebar-logo">
  <img
    src={logo}
    alt="ChipKontrol"
    className="sidebar-logo-image"
  />
</div>

        <nav className="sidebar-nav">
  {menuItems
    .filter(item => item.roles.includes(user?.role))
    .map((item) => (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={`nav-item ${
          location.pathname === item.path
            ? "active"
            : ""
        }`}
      >
        <span>{item.icon}</span>
        {item.label}
      </button>
    ))}
</nav>

      </div>

      <div className="sidebar-footer">

        <div className="user-card">

          <div className="user-avatar">
            {user?.username
              ?.charAt(0)
              ?.toUpperCase()}
          </div>

          <div>
            <strong>
              {user?.username}
            </strong>

            <span>
              Usuario conectado
            </span>
          </div>

        </div>

        <button
          className="logout-btn"
          onClick={logout}
        >
          🚪 Cerrar sesión
        </button>

      </div>

    </aside>
  );
}