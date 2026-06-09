import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { useEffect, useState } from "react";
import client from "../api/client";
import MainLayout from "../layouts/MainLayout";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function Map() {
  const [units, setUnits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRoutes, setShowRoutes] = useState(false);
  const [routes, setRoutes] = useState([]);

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
      console.error("Error fetching units:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await client.get("/groups");
      setGroups(res.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await client.get("/units/route/today");
      setRoutes(res.data.rutas);
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  };

useEffect(() => {
  if (!showRoutes) return;

  fetchRoutes(); // carga inmediata

  const interval = setInterval(() => {
    fetchRoutes();
  }, 60000); // cada minuto

  return () => clearInterval(interval);
}, [showRoutes]);

  const filteredUnits = units.filter((u) => {
    const matchGroup = groupFilter ? u.grupo === groupFilter : true;
    const matchSearch = search
      ? u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        u.imei?.includes(search)
      : true;
    return matchGroup && matchSearch;
  });

  const getMarkerColor = (speed) => {
    if (!speed || speed === 0) return "#6b7280"; // gray
    if (speed < 10) return "#22c55e"; // green
    if (speed < 50) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  const createCustomIcon = (speed) => {
    const color = getMarkerColor(speed);
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${speed > 0 ? 'animation: pulse 2s infinite;' : ''}
      "></div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const getRouteColor = (imei) => {
  const colors = [
    "#3b82f6", // azul
    "#310e71", // rojo
    "#22c55e", // verde
    "#f59e0b", // naranja
    "#a855f7", // morado
    "#06b6d4", // cyan
    "#ec4899", // rosa
    "#84cc16", // lima
    "#f97316", // naranja fuerte
    "#14b8a6", // teal
  ];

  let hash = 0;

  for (let i = 0; i < imei.length; i++) {
    hash = imei.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

  return (
    <MainLayout>
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">
          🗺️ Mapa GPS en Tiempo Real
        </h1>
        <p className="text-gray-400">
          {filteredUnits.length} unidad{filteredUnits.length !== 1 ? 'es' : ''} visible{filteredUnits.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtros */}
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
            {g.grupo}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label>Buscar unidad</label>

      <input
        className="form-control"
        placeholder="Nombre o IMEI"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    <div>
      <label>Rutas</label>

      <button
        className={`btn ${
          showRoutes ? "btn-primary" : "btn-secondary"
        }`}
        onClick={() => setShowRoutes(!showRoutes)}
      >
        {showRoutes
          ? "Ocultar rutas"
          : "Mostrar rutas"}
      </button>
    </div>

    <div>
      <label>&nbsp;</label>

      {(groupFilter || search) ? (
        <button
          className="btn btn-danger"
          onClick={() => {
            setGroupFilter("");
            setSearch("");
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
</div>

      {/* Mapa */}
      {loading ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-gray-400">Cargando mapa...</div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <MapContainer
            center={[19.7, -101.2]}
            zoom={6}
            style={{ height: "75vh", width: "100%" }}
            className="rounded-lg"
          >
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Rutas del día */}
            {showRoutes && routes.map((route) => (
              <Polyline
                key={route.imei}
                positions={route.ruta}
                color={getRouteColor(route.imei)}
                weight={3}
                opacity={0.9}
                lineCap="round"
                lineJoin="round"
                
              >
                 <Popup>
    <div>
      <strong>{route.nombre}</strong>
      <br />
      IMEI: {route.imei}
      <br />
      Puntos: {route.total_puntos}
    </div>
  </Popup>
              </Polyline>
              
            ))}

            {filteredUnits.map((u) => (
              <Marker 
                key={u.imei} 
                position={[u.lat, u.lon]}
                icon={createCustomIcon(u.velocidad)}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="font-bold text-lg mb-2">{u.nombre}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Grupo:</span>
                        <span className="font-medium">{u.grupo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IMEI:</span>
                        <span className="font-mono text-xs">{u.imei}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Velocidad:</span>
                        <span className={`font-bold ${getMarkerColor(u.velocidad)}`}>
                          {u.velocidad || 0} km/h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Posición:</span>
                        <span className="font-mono text-xs">
                          {u.lat.toFixed(4)}, {u.lon.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </MainLayout>
  );
}