import { useEffect, useState } from "react";
import client from "../api/client";
import MainLayout from "../layouts/MainLayout";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await client.get("/groups/detail");
      setGroups(res.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const totalUnits = groups.reduce((sum, g) => sum + g.total, 0);

  return (
  <MainLayout>
    <div className="dashboard-page">

      <div className="dashboard-header">
        <div>
          <h1>👥 Grupos de Unidades</h1>
          <p>
            {groups.length} grupo
            {groups.length !== 1 ? "s" : ""}
            {" • "}
            {totalUnits} unidad
            {totalUnits !== 1 ? "es" : ""}
            {" "}en total
          </p>
        </div>
      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <span>Grupos</span>
          <strong>{groups.length}</strong>
        </div>

        <div className="stat-card">
          <span>Unidades</span>
          <strong>{totalUnits}</strong>
        </div>

        <div className="stat-card">
          <span>Promedio</span>
          <strong>
            {groups.length
              ? Math.round(totalUnits / groups.length)
              : 0}
          </strong>
        </div>

      </div>

      {loading ? (
        <div className="loading-state">
          Cargando grupos...
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          No hay grupos registrados
        </div>
      ) : (
        <div className="groups-grid">

          {groups.map((g) => (
            <div
              key={g.grupo}
              className="group-card"
            >

              <div className="group-card-header">

                <div className="group-info">
                  <div className="group-icon">
                    📁
                  </div>

                  <div>
                    <h2>{g.grupo}</h2>

                    <p>
                      {g.total} unidad
                      {g.total !== 1
                        ? "es"
                        : ""}
                    </p>
                  </div>
                </div>

                <button
                  className="expand-btn"
                  onClick={() =>
                    toggleGroup(g.grupo)
                  }
                >
                  {expandedGroups[g.grupo]
                    ? "−"
                    : "+"}
                </button>

              </div>

              <div className="group-summary">
                🚗 {g.total} unidades registradas
              </div>

              {expandedGroups[g.grupo] && (
                <div className="group-units">

                  {g.unidades.map((u) => (
                    <div
                      key={u.imei}
                      className="unit-row"
                    >
                      <div className="unit-name">
                        <span className="unit-dot"></span>
                        {u.nombre}
                      </div>

                      <span className="unit-imei">
                        {u.imei}
                      </span>
                    </div>
                  ))}

                </div>
              )}

            </div>
          ))}

        </div>
      )}

    </div>
  </MainLayout>
);
}