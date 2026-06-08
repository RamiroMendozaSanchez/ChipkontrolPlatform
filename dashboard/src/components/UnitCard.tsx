type Unit = {
  imei: string;
  nombre: string;
  grupo: string;
  lat: number;
  lon: number;
  velocidad?: number;
};

export default function UnitCard({ unit }: { unit: Unit }) {
  const getSpeedColor = (speed?: number) => {
    if (!speed) return 'text-gray-400';
    if (speed < 10) return 'text-green-400';
    if (speed < 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIndicator = (speed?: number) => {
    if (!speed || speed === 0) {
      return <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-2"></span>;
    }
    return <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>;
  };

  return (
    <div className="card hover:scale-105 transition-all duration-300 cursor-pointer group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {getStatusIndicator(unit.velocidad)}
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            {unit.nombre}
          </h3>
        </div>
        <span className="badge text-xs bg-blue-600/30 border border-blue-500/50">
          {unit.grupo}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-gray-400">
          <span className="mr-2">📱</span>
          <span className="font-mono text-xs">{unit.imei}</span>
        </div>

        <div className="flex items-center text-gray-400">
          <span className="mr-2">📍</span>
          <span className="font-mono text-xs">
            {unit.lat.toFixed(4)}, {unit.lon.toFixed(4)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <div className="flex items-center">
            <span className="mr-2">🚗</span>
            <span className={`font-bold ${getSpeedColor(unit.velocidad)}`}>
              {unit.velocidad || 0} km/h
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {unit.velocidad && unit.velocidad > 0 ? 'En movimiento' : 'Detenido'}
          </div>
        </div>
      </div>
    </div>
  );
}