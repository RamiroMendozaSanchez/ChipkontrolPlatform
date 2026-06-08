import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  // 🔥 ESTO ES LO QUE TE FALTA
  const navigate = useNavigate();

  return (
    <div className="sidebar">
      <div>
        <div className="logo">SITRACK</div>

        <div className="nav">
          <button onClick={() => navigate("/")}>Dashboard</button>
          <button onClick={() => navigate("/map")}>Mapa</button>
          <button onClick={() => navigate("/groups")}>Grupos</button>
          <button onClick={() => navigate("/admin/groups/new")}>
  ➕ Grupo
</button>

<button onClick={() => navigate("/admin/users/new")}>
  👤 Usuario
</button>
        </div>
      </div>

      <div>
        <p>{user?.username}</p>
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}