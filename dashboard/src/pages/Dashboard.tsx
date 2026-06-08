import { useEffect, useState } from "react";
import client from "../api/client";
import UnitCard from "../components/UnitCard";
import MainLayout from "../layouts/MainLayout";

type Unit = {
  imei: string;
  nombre: string;
  grupo: string;
  lat: number;
  lon: number;
  velocidad?: number;
};

type Group = {
  grupo: string;
  total_unidades: number;
};

export default function Dashboard() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchUnits, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchUnits(), fetchGroups()]);
    setLoading(false);
  };

  const fetchUnits = async () => {
    try {
      const res = await client.get("/units/live");
      setUnits(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await client.get("/groups");
      setGroups(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredUnits = units.filter((u) => {
    const matchGroup = groupFilter ? u.grupo === groupFilter : true;

    const matchSearch = searchFilter
      ? u.nombre?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.imei?.includes(searchFilter)
      : true;

    return matchGroup && matchSearch;
  });

  return (
    <MainLayout>
      <div className="dashboard-page">
        {/* HEADER */}

        <div className="dashboard-header">
          <div>
            <h1>🚗 Unidades en Tiempo Real</h1>
            <p>
              {filteredUnits.length} unidad
              {filteredUnits.length !== 1 ? "es" : ""}
              {" "}
              disponible
              {filteredUnits.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* STATS */}

        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Unidades</span>
            <strong>{units.length}</strong>
          </div>

          <div className="stat-card">
            <span>Grupos</span>
            <strong>{groups.length}</strong>
          </div>

          <div className="stat-card">
            <span>Mostrando</span>
            <strong>{filteredUnits.length}</strong>
          </div>
        </div>

        {/* FILTROS */}

        <div className="filters-card">
          <div className="filters-header">
            <span>⚙️</span>
            <h2>Filtros</h2>
          </div>

          <div className="filters-grid">
            <div>
              <label>Grupo</label>

              <select
                className="form-control"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="">Todos los grupos</option>

                {groups.map((g) => (
                  <option
                    key={g.grupo}
                    value={g.grupo}
                  >
                    {g.grupo} ({g.total_unidades})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Buscar unidad</label>

              <input
                className="form-control"
                type="text"
                placeholder="Nombre o IMEI"
                value={searchFilter}
                onChange={(e) =>
                  setSearchFilter(e.target.value)
                }
              />
            </div>

            <div>
              <label>&nbsp;</label>

              {(groupFilter || searchFilter) ? (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setGroupFilter("");
                    setSearchFilter("");
                  }}
                >
                  Limpiar filtros
                </button>
              ) : (
                <div className="btn empty-filter-box">
                  Sin filtros activos
                </div>
              )}
            </div>
          </div>

          {(groupFilter || searchFilter) && (
            <div className="active-filters">
              {groupFilter && (
                <div className="filter-badge">
                  📁 {groupFilter}

                  <button
                    onClick={() =>
                      setGroupFilter("")
                    }
                  >
                    ✕
                  </button>
                </div>
              )}

              {searchFilter && (
                <div className="filter-badge">
                  🔍 {searchFilter}

                  <button
                    onClick={() =>
                      setSearchFilter("")
                    }
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RESULTADOS */}

        {loading ? (
          <div className="loading-state">
            Cargando unidades...
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="empty-state">
            No se encontraron unidades
          </div>
        ) : (
          <div className="units-grid">
            {filteredUnits.map((u) => (
              <UnitCard
                key={u.imei}
                unit={u}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}