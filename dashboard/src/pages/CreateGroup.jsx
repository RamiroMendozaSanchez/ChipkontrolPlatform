import { useState } from "react";
import client from "../api/client";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateGroup() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

 const createGroup = async () => {
  if (!name.trim()) {
    toast.error("Ingresa un nombre para el grupo");
    return;
  }

  try {
    setLoading(true);

    await client.post("/groups", {
      name: name.trim(),
    });

    toast.success("Grupo creado correctamente");

    setTimeout(() => {
      navigate("/groups");
    }, 1000);
  } catch (error) {
    console.error(error);

    toast.error(
      "Ocurrió un error al crear el grupo"
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <MainLayout>
      <div className="dashboard-page">

        <div className="dashboard-header">
          <div>
            <h1>➕ Crear Grupo</h1>
            <p>
              Registra un nuevo grupo para organizar
              las unidades del sistema.
            </p>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-header">
            <h2>Información del Grupo</h2>
            <p>
              Ingresa el nombre que identificará
              al grupo.
            </p>
          </div>

          <div className="form-group">
            <label>Nombre del grupo</label>

            <input
              className="form-control"
              type="text"
              placeholder="Ej. Patrullas Morelia"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/groups")}
            >
              Cancelar
            </button>

            <button
              className="btn btn-primary"
              disabled={!name.trim() || loading}
              onClick={createGroup}
            >
              {loading
                ? "Creando..."
                : "Crear Grupo"}
            </button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}