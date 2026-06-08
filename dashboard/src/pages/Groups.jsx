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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          👥 Grupos de Unidades
        </h1>
        <p className="text-gray-400">
          {groups.length} grupo{groups.length !== 1 ? 's' : ''} • {totalUnits} unidad{totalUnits !== 1 ? 'es' : ''} en total
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Cargando grupos...</div>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">No hay grupos disponibles</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((g) => (
            <div key={g.grupo} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📁</span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{g.grupo}</h2>
                    <p className="text-sm text-gray-400">{g.total} unidad{g.total !== 1 ? 'es' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleGroup(g.grupo)}
                  className="px-3 py-1 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors text-sm"
                >
                  {expandedGroups[g.grupo] ? '▼' : '▶'}
                </button>
              </div>

              {expandedGroups[g.grupo] && (
                <div className="border-t border-slate-700 pt-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {g.unidades.map((u) => (
                      <div
                        key={u.imei}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                      >
                        <span className="text-green-400">●</span>
                        <span className="text-sm text-gray-300 flex-1">{u.nombre}</span>
                        <span className="text-xs text-gray-500 font-mono">{u.imei}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!expandedGroups[g.grupo] && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <span>🚗</span>
                  <span>{g.total} unidad{g.total !== 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}