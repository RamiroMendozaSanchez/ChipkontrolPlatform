import { useEffect, useState } from "react";
import client from "../api/client";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [group, setGroup] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
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

      const isAdmin =
        !group || group.trim() === "";

      await client.post("/users", {
        username: username.trim(),
        password,
        grupo: isAdmin ? null : group,
        role: isAdmin ? "admin" : "user",
      });

      toast.success(
        "Usuario creado correctamente"
      );

      setTimeout(() => {
        navigate("/");
      }, 1000);

    } catch (error) {
      console.error(error);

      toast.error(
        "Ocurrió un error al crear el usuario"
      );
    } finally {
      setLoading(false);
    }
  };

  const isAdmin =
    !group || group.trim() === "";

  return (
    <MainLayout>
      <div className="dashboard-page">

        <div className="dashboard-header">
          <div>
            <h1>👤 Crear Usuario</h1>
            <p>
              Registra nuevos usuarios y
              asígnalos a un grupo.
            </p>
          </div>
        </div>

        <div className="form-card">

          <div className="form-card-header">
            <h2>Información del Usuario</h2>
            <p>
              Completa los datos para crear
              una nueva cuenta.
            </p>
          </div>

          <div className="form-group">
            <label>Usuario</label>

            <input
              className="form-control"
              placeholder="Ej. operador01"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>

            <input
              className="form-control"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

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
                Administrador (sin grupo)
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

          <div
            className={`role-indicator ${
              isAdmin
                ? "role-admin"
                : "role-user"
            }`}
          >
            {isAdmin
              ? "🔑 Se creará como Administrador"
              : "👤 Se creará como Usuario"}
          </div>

          <div className="form-actions">

            <button
              className="btn btn-secondary"
              onClick={() => navigate("/")}
            >
              Cancelar
            </button>

            <button
              className="btn btn-primary"
              disabled={
                loading ||
                !username.trim() ||
                !password.trim()
              }
              onClick={createUser}
            >
              {loading
                ? "Creando..."
                : "Crear Usuario"}
            </button>

          </div>

        </div>
      </div>
    </MainLayout>
  );
}