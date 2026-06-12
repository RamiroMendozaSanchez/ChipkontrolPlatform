import { useEffect, useState, useContext } from "react";
import client from "../api/client";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";

export default function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [group, setGroup] = useState("");
  const [role, setRole] = useState("user");

  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { user } = useContext(AuthContext);

  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await client.get("/groups");

      setGroups(res.data);
    } catch (error) {
      console.error(error);
      toast.error("No fue posible cargar los grupos");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await client.get("/users");

      setUsers(
        Array.isArray(res.data)
          ? res.data
          : res.data.data || []
      );
    } catch (error) {
      console.error(error);
      toast.error("No fue posible cargar usuarios");
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setUsername("");
    setPassword("");
    setGroup("");
    setRole("user");
  };

  const createUser = async () => {
    if (!username.trim()) {
      toast.error("Ingresa un usuario");
      return;
    }

    if (password.length < 6) {
      toast.error(
        "La contraseña debe tener al menos 6 caracteres"
      );
      return;
    }

    try {
      setLoading(true);

      let payload = {
        username: username.trim(),
        password,
        grupo: group || null,
        role,
      };

      // Si es administrador de grupo
      if (user.role === "group_admin") {
        payload = {
          username: username.trim(),
          password,
          grupo: user.grupo,
          role: "user",
        };
      }

      await client.post("/users", payload);

      toast.success("Usuario creado correctamente");

      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
        "Error al crear usuario"
      );
    } finally {
      setLoading(false);
    }
  };

  const editUser = async (username) => {
    try {
      const res = await client.get(
        `/users/${username}`
      );

      const userData = res.data;

      setEditingUser(userData.username);
      setUsername(userData.username);
      setPassword("");
      setGroup(userData.grupo || "");
      setRole(userData.role || "user");

    } catch (error) {
      toast.error(
        "No fue posible cargar usuario"
      );
    }
  };

  const updateUser = async () => {
    try {
      setLoading(true);

      const payload = {
        grupo: group || null,
        role,
      };

      if (password.trim()) {
        payload.password = password;
      }

      await client.patch(
        `/users/${editingUser}`,
        payload
      );

      toast.success(
        "Usuario actualizado correctamente"
      );

      resetForm();
      fetchUsers();

    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
        "Error al actualizar usuario"
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (username) => {
    const confirmDelete = window.confirm(
      `¿Eliminar usuario ${username}?`
    );

    if (!confirmDelete) return;

    try {
      await client.delete(
        `/users/${username}`
      );

      toast.success(
        "Usuario eliminado"
      );

      fetchUsers();

    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.detail ||
        "Error al eliminar usuario"
      );
    }
  };

  const isAdmin =
    !group || group.trim() === "";

  return (
    <MainLayout>
  <div className="dashboard-page">

    <div className="dashboard-header">
      <div>
        <h1>👤 Administración de Usuarios</h1>
        <p>
          Gestiona usuarios, permisos y grupos del sistema SITRACK.
        </p>
      </div>
    </div>

    {/* RESUMEN */}

    <div className="stats-grid">

      <div className="stat-card">
        <span>Total Usuarios</span>
        <strong>{users.length}</strong>
      </div>

      <div className="stat-card">
        <span>Administradores</span>
        <strong>
          {users.filter(u => u.role === "admin").length}
        </strong>
      </div>

      <div className="stat-card">
        <span>Admin. Grupo</span>
        <strong>
          {users.filter(u => u.role === "group_admin").length}
        </strong>
      </div>

      <div className="stat-card">
        <span>Usuarios</span>
        <strong>
          {users.filter(u => u.role === "user").length}
        </strong>
      </div>

    </div>

    <div className="users-page-layout">

      {/* FORMULARIO */}

      <div className="form-card">

        <div className="form-card-header">

          <div className="form-icon">
            {editingUser ? "✏️" : "👤"}
          </div>

          <div>
            <h2>
              {editingUser
                ? "Editar Usuario"
                : "Nuevo Usuario"}
            </h2>

            <p>
              {editingUser
                ? "Actualiza los datos del usuario seleccionado"
                : "Crear una nueva cuenta de acceso"}
            </p>
          </div>

        </div>

        <div className="form-group">
          <label>Usuario</label>

          <input
            className="form-control"
            value={username}
            disabled={!!editingUser}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Nombre de usuario"
          />
        </div>

        <div className="form-group">
          <label>
            {editingUser
              ? "Nueva contraseña (opcional)"
              : "Contraseña"}
          </label>

          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="••••••••"
          />
        </div>

        {user?.role === "admin" && (
          <>
            <div className="form-group">
              <label>Grupo</label>

              <select
                className="form-control"
                value={group}
                onChange={(e) =>
                  setGroup(e.target.value)
                }
              >
                <option value="">
                  Sin grupo (Administrador)
                </option>

                {groups.map((g) => (
                  <option
                    key={g.grupo}
                    value={g.grupo}
                  >
                    {g.grupo}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Rol</label>

              <select
                className="form-control"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value)
                }
              >
                <option value="user">
                  Usuario
                </option>

                <option value="group_admin">
                  Administrador de Grupo
                </option>

                <option value="admin">
                  Administrador Global
                </option>
              </select>
            </div>
          </>
        )}

        {user?.role === "group_admin" && (
          <div className="form-group">
            <label>Grupo asignado</label>

            <input
              className="form-control"
              disabled
              value={user?.grupo || ""}
            />
          </div>
        )}

        <div
          className={`role-indicator ${
            role === "admin"
              ? "role-admin"
              : role === "group_admin"
              ? "role-group-admin"
              : "role-user"
          }`}
        >
          {role === "admin"
            ? "🔑 Administrador Global"
            : role === "group_admin"
            ? "🛡️ Administrador de Grupo"
            : "👤 Usuario"}
        </div>

        <div className="form-actions">

          {editingUser && (
            <button
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}

          <button
            className="btn btn-primary"
            disabled={
              loading ||
              !username.trim() ||
              (!editingUser && !password.trim())
            }
            onClick={
              editingUser
                ? updateUser
                : createUser
            }
          >
            {loading
              ? editingUser
                ? "Actualizando..."
                : "Creando..."
              : editingUser
              ? "Actualizar Usuario"
              : "Crear Usuario"}
          </button>

        </div>

      </div>

      {/* TABLA */}

      {/* TABLA */}

<div className="table-card">

  <div className="table-card-header">
    <div>
      <h2>Usuarios Registrados</h2>
      <p>
        Administración de accesos al sistema
      </p>
    </div>
  </div>

  <table className="table">

    <thead>
      <tr>
        <th>Usuario</th>
        <th>Rol</th>
        <th>Grupo</th>
        <th>Acciones</th>
      </tr>
    </thead>

    <tbody>

      {users.map((u) => (
        <tr key={u.username}>

          <td>{u.username}</td>

          <td>
            {u.role === "admin"
              ? "Administrador"
              : u.role === "group_admin"
              ? "Admin Grupo"
              : "Usuario"}
          </td>

          <td>
            {u.grupo || "-"}
          </td>

          <td>
            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >

              <button
                className="btn btn-secondary"
                onClick={() =>
                  editUser(u.username)
                }
              >
                Editar
              </button>

              <button
                className="btn btn-danger"
                onClick={() =>
                  deleteUser(u.username)
                }
              >
                Eliminar
              </button>

            </div>
          </td>

        </tr>
      ))}

      {users.length === 0 && (
        <tr>
          <td
            colSpan="4"
            style={{
              textAlign: "center",
              padding: "30px",
            }}
          >
            No hay usuarios registrados
          </td>
        </tr>
      )}

    </tbody>

  </table>

</div>

    </div>

  </div>
</MainLayout>
  );
}