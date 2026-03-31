import { useEffect, useMemo, useState } from "react";
import { actualizarEstadoSos, listarSos, SosItem } from "../services/api";

type Props = {
  token: string;
};

const ESTADOS = ["pendiente", "revisado", "atendido"] as const;

function formatFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getUsuarioLabel(item: SosItem) {
  const parts = [item.usuario_nombre, item.empresa, item.region].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : item.usuario_email || "Sin usuario";
}

function getEstadoClass(estado: string) {
  switch (estado) {
    case "atendido":
      return "risk-badge risk-badge-success";
    case "revisado":
      return "risk-badge risk-badge-alert";
    default:
      return "risk-badge risk-badge-warning";
  }
}

export default function Sos({ token }: Props) {
  const [items, setItems] = useState<SosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");

  function cargarSos() {
    setLoading(true);
    listarSos(token)
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargarSos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      listarSos(token).then(setItems).catch(() => undefined);
    }, 15000);

    return () => clearInterval(interval);
  }, [token]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return items.filter((item) => {
      if (estadoFiltro && item.estado !== estadoFiltro) return false;
      if (!texto) return true;

      const contenido = [
        item.motivo,
        item.descripcion,
        item.usuario_nombre,
        item.usuario_email,
        item.empresa,
        item.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [busqueda, estadoFiltro, items]);

  const totalPendientes = filtrados.filter((item) => item.estado === "pendiente").length;
  const totalRevisados = filtrados.filter((item) => item.estado === "revisado").length;
  const totalAtendidos = filtrados.filter((item) => item.estado === "atendido").length;

  async function handleEstado(item: SosItem, estado: (typeof ESTADOS)[number]) {
    await actualizarEstadoSos(token, item.id, estado);
    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, estado } : current,
      ),
    );
  }

  return (
    <div className="page">
      <main className="main">
        <section className="page-section">
          <div className="card risk-panel">
            <div className="risk-page-header">
              <div>
                <h2 className="page-title">Alertas SOS</h2>
                <p className="risk-page-subtitle">
                  Revisa emergencias enviadas desde la app, prioriza atención y marca el estado operativo.
                </p>
              </div>
            </div>

            <div className="risk-summary-grid">
              <div className="risk-summary-card accent-gold">
                <span className="risk-summary-label">Pendientes</span>
                <strong className="risk-summary-value">{totalPendientes}</strong>
                <span className="risk-summary-caption">Alertas nuevas sin revisión</span>
              </div>
              <div className="risk-summary-card accent-amber">
                <span className="risk-summary-label">Revisados</span>
                <strong className="risk-summary-value">{totalRevisados}</strong>
                <span className="risk-summary-caption">Casos en seguimiento</span>
              </div>
              <div className="risk-summary-card accent-green">
                <span className="risk-summary-label">Atendidos</span>
                <strong className="risk-summary-value">{totalAtendidos}</strong>
                <span className="risk-summary-caption">Emergencias cerradas</span>
              </div>
              <div className="risk-summary-card accent-slate">
                <span className="risk-summary-label">Total visibles</span>
                <strong className="risk-summary-value">{filtrados.length}</strong>
                <span className="risk-summary-caption">Resultados con filtros actuales</span>
              </div>
            </div>

            <div className="risk-toolbar card">
              <div className="risk-toolbar-head">
                <div>
                  <h3 className="risk-toolbar-title">Filtros SOS</h3>
                  <p className="risk-toolbar-copy">Busca por motivo, descripción, usuario o estado.</p>
                </div>
                <div className="risk-toolbar-actions">
                  <button className="btn-filter primary" onClick={cargarSos}>
                    Actualizar
                  </button>
                </div>
              </div>

              <div className="filters risk-filters-grid">
                <input
                  type="text"
                  className="filter-input risk-filter-search"
                  placeholder="Buscar por motivo, detalle o usuario"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />

                <select
                  className="filter-input"
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="revisado">Revisado</option>
                  <option value="atendido">Atendido</option>
                </select>
              </div>
            </div>

            {loading && <p>Cargando alertas SOS…</p>}

            {!loading && filtrados.length === 0 && (
              <div className="risk-empty-state">
                <h3>No hay alertas SOS</h3>
                <p>Cuando un usuario active el botón SOS, aparecerá aquí.</p>
              </div>
            )}

            {!loading && filtrados.length > 0 && (
              <div className="risk-results-card">
                <div className="table-wrap">
                  <table className="table risk-table">
                    <thead>
                      <tr>
                        <th>SOS</th>
                        <th>Usuario</th>
                        <th>Fecha</th>
                        <th>Ubicación</th>
                        <th>Estado</th>
                        <th>Gestión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="risk-primary-cell">
                              <div className="risk-type-line">
                                <span className="risk-type-icon">🆘</span>
                                <span className="risk-type-text">{item.motivo}</span>
                              </div>
                              <p className="risk-description-preview">
                                {item.descripcion || "Sin detalle adicional"}
                              </p>
                            </div>
                          </td>
                          <td>
                            <div className="risk-meta-cell">
                              <strong>{getUsuarioLabel(item)}</strong>
                              <span>{item.usuario_email || "Sin correo asociado"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="risk-meta-cell">
                              <strong>{formatFechaHora(item.created_at)}</strong>
                              <span>ID: {item.id}</span>
                            </div>
                          </td>
                          <td>
                            <div className="risk-meta-cell">
                              <strong>
                                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                              </strong>
                              <span>
                                <a
                                  href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "#93c5fd" }}
                                >
                                  Abrir en Google Maps
                                </a>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={getEstadoClass(item.estado)}>{item.estado}</span>
                          </td>
                          <td>
                            <div className="risk-action-grid">
                              {ESTADOS.map((estado) => (
                                <button
                                  key={estado}
                                  className={
                                    estado === "atendido"
                                      ? "risk-action-button risk-action-button-success"
                                      : "risk-action-button"
                                  }
                                  onClick={() => handleEstado(item, estado)}
                                  disabled={item.estado === estado}
                                >
                                  {estado}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
