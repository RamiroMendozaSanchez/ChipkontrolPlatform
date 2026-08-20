type Unit = {
  wialon_id: number;
  nombre: string;
  grupo: string;
  lat: number;
  lon: number;
  velocidad?: number;

  curso?: number;
  satelites?: number;
  voltaje?: number;
  hora?: string;
};

const formatDate = (date?: string) => {
  if (!date) return "-";

  return new Date(date).toLocaleString(
    "es-MX",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
};

export default function UnitCard({
  unit,
}: {
  unit: Unit;
}) {
  const speed = unit.velocidad || 0;

  const getStatus = () => {
    if (speed === 0)
      return {
        text: "Detenido",
        className: "status-stopped",
      };

    return {
      text: "En movimiento",
      className: "status-moving",
    };
  };

  const status = getStatus();

  console.log("UnitCard render", unit);

  return (
    <div className="unit-card">

      <div className="unit-card-header">

        <div>
          <h3>{unit.nombre}</h3>

          <span className="unit-group">
            📁 {unit.grupo}
          </span>
        </div>

        <div
          className={`unit-status ${status.className}`}
        >
          {status.text}
        </div>

      </div>

      <div className="unit-speed">

        <span>🚗</span>

        <strong>
          {speed}
        </strong>

        <small>km/h</small>

      </div>

      <div className="unit-details">
  <div className="unit-detail-row">
    <span>ID Wialon</span>
    <strong>{unit.wialon_id}</strong>
  </div>

  <div className="unit-detail-row">
    <span>Latitud</span>
    <strong>{unit.lat.toFixed(5)}</strong>
  </div>

  <div className="unit-detail-row">
    <span>Longitud</span>
    <strong>{unit.lon.toFixed(5)}</strong>
  </div>

  <div className="unit-detail-row">
    <span>Curso</span>
    <strong>
      {unit.curso ?? 0}°
    </strong>
  </div>

  <div className="unit-detail-row">
    <span>Satélites</span>
    <strong>
      {unit.satelites ?? "-"}
    </strong>
  </div>

  <div className="unit-detail-row">
    <span>Voltaje</span>
    <strong>
      {unit.voltaje
        ? `${unit.voltaje} V`
        : "-"}
    </strong>
  </div>

  <div className="unit-detail-row">
    <span>Último reporte</span>
    <strong>
      {formatDate(unit.hora)}
    </strong>
  </div>
</div>

    </div>
  );
}