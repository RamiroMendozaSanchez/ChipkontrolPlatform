type Unit = {
  imei: string;
  nombre: string;
  grupo: string;
  lat: number;
  lon: number;
  velocidad?: number;
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
          <span>IMEI</span>

          <strong>
            {unit.imei}
          </strong>
        </div>

        <div className="unit-detail-row">
          <span>Latitud</span>

          <strong>
            {unit.lat.toFixed(5)}
          </strong>
        </div>

        <div className="unit-detail-row">
          <span>Longitud</span>

          <strong>
            {unit.lon.toFixed(5)}
          </strong>
        </div>

      </div>

    </div>
  );
}