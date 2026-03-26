import { useEffect, useMemo, useState } from "react";
import React from "react";
import {
  listarRiesgos,
  listarUsuarios,
  eliminarRiesgo,
  editarRiesgo,
  resolverRiesgo,
} from "../services/api";
import RiesgoComentarios from "./RiesgoComentarios";

type Props = {
  token: string;
};

type Riesgo = {
  id: string;
  tipo: string;
  descripcion: string;
  icono?: string | null;
  latitude: number;
  longitude: number;
  comuna?: string | null;
  created_at: string;
  usuario_email: string | null;
  usuario_nombre?: string | null;
  empresa?: string | null;
  region?: string | null;
  estado: "activo" | "resuelto";
  reportes_pendientes: number;
};

type Usuario = {
  id: string;
  email: string;
  nombre?: string;
  empresa?: string;
  region?: string;
};

const TIPOS_RIESGO = [
  "Animal agresivo",
  "Terreno en mal estado",
  "Acceso complicado",
  "Riesgo de seguridad",
  "Otro",
];

const ICONOS_OTRO = ["🚩", "🕳️", "🌳", "🌊", "⚡", "🪨", "❄️", "🚫"];

function getEmoji(tipo: string, icono?: string | null) {
  switch (tipo) {
    case "Animal agresivo":
      return "🐕";
    case "Terreno en mal estado":
      return "⚠️";
    case "Acceso complicado":
      return "🚧";
    case "Riesgo de seguridad":
      return "🚨";
    case "Otro":
      return icono || "❓";
    default:
      return "❓";
  }
}

export default function Riesgos({ token }: Props) {
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [riesgoAbierto, setRiesgoAbierto] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [orden, setOrden] = useState("fecha_desc");
  const [paginaActual, setPaginaActual] = useState(1);
  const [editando, setEditando] = useState<Riesgo | null>(null);
  const [tipoEdit, setTipoEdit] = useState("");
  const [descEdit, setDescEdit] = useState("");
  const [iconoEdit, setIconoEdit] = useState("");
  const [riesgoMapa, setRiesgoMapa] = useState<Riesgo | null>(null);

  const usuariosByEmail = useMemo(() => {
    const map = new Map<string, Usuario>();
    usuarios.forEach((u) => {
      if (u.email) map.set(u.email, u);
    });
    return map;
  }, [usuarios]);

  const usuariosDisponibles = useMemo(
    () =>
      usuarios
        .map((u) => ({
          id: u.id,
          label: u.nombre
            ? `${u.nombre} · ${u.empresa || "-"} · ${u.region || "-"}`
            : u.email,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [usuarios],
  );

  const PAGE_SIZE = 10;

  function getUsuarioLabel(riesgo: Riesgo) {
    const parts = [riesgo.usuario_nombre, riesgo.empresa, riesgo.region].filter(Boolean);
    if (parts.length > 0) return parts.join(" • ");

    const email = riesgo.usuario_email;
    if (!email) return "—";
    const user = usuariosByEmail.get(email);
    if (!user) return email;
    const fallbackParts = [user.nombre, user.empresa, user.region].filter(Boolean);
    return fallbackParts.length > 0 ? fallbackParts.join(" • ") : email;
  }

  function formatFechaHora(fecha: string) {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function limpiarFiltros() {
    setUsuarioId("");
    setEstadoFiltro("");
    setBusqueda("");
    setFechaDesde("");
    setFechaHasta("");
    setOrden("fecha_desc");
    setPaginaActual(1);
    listarRiesgos(token).then(setRiesgos);
  }

  function cargarRiesgos() {
    setLoading(true);

    listarRiesgos(token, {
      userId: usuarioId || undefined,
      from: fechaDesde || undefined,
      to: fechaHasta || undefined,
    })
      .then(setRiesgos)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    listarUsuarios(token).then(setUsuarios);
    cargarRiesgos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      listarRiesgos(token, {
        userId: usuarioId || undefined,
        from: fechaDesde || undefined,
        to: fechaHasta || undefined,
      }).then(setRiesgos);
    }, 15000);

    return () => clearInterval(interval);
  }, [token, usuarioId, fechaDesde, fechaHasta]);

  const riesgosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const filtrados = riesgos.filter((r) => {
      if (estadoFiltro && r.estado !== estadoFiltro) return false;

      if (!texto) return true;

      const contenido = [
        r.tipo,
        r.descripcion,
        r.comuna,
        r.region,
        r.usuario_nombre,
        r.usuario_email,
        r.empresa,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });

    return [...filtrados].sort((a, b) => {
      switch (orden) {
        case "fecha_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "comuna_asc":
          return (a.comuna || "").localeCompare(b.comuna || "", "es");
        case "comuna_desc":
          return (b.comuna || "").localeCompare(a.comuna || "", "es");
        case "tipo_asc":
          return a.tipo.localeCompare(b.tipo, "es");
        case "tipo_desc":
          return b.tipo.localeCompare(a.tipo, "es");
        case "estado_asc":
          return a.estado.localeCompare(b.estado, "es");
        case "estado_desc":
          return b.estado.localeCompare(a.estado, "es");
        case "fecha_desc":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [busqueda, estadoFiltro, orden, riesgos]);

  const totalPaginas = Math.max(1, Math.ceil(riesgosFiltrados.length / PAGE_SIZE));

  const riesgosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * PAGE_SIZE;
    return riesgosFiltrados.slice(inicio, inicio + PAGE_SIZE);
  }, [paginaActual, riesgosFiltrados]);

  const totalActivos = riesgosFiltrados.filter((r) => r.estado === "activo").length;
  const totalResueltos = riesgosFiltrados.filter((r) => r.estado === "resuelto").length;
  const riesgosConReportes = riesgosFiltrados.filter((r) => r.reportes_pendientes > 0).length;
  const totalReportesPendientes = riesgosFiltrados.reduce(
    (total, riesgo) => total + riesgo.reportes_pendientes,
    0,
  );

  const filtrosActivos = [
    usuarioId ? `Usuario: ${usuariosDisponibles.find((u) => u.id === usuarioId)?.label || "seleccionado"}` : null,
    estadoFiltro ? `Estado: ${estadoFiltro}` : null,
    fechaDesde ? `Desde: ${fechaDesde}` : null,
    fechaHasta ? `Hasta: ${fechaHasta}` : null,
    busqueda ? `Búsqueda: ${busqueda}` : null,
    orden !== "fecha_desc" ? `Orden: ${orden}` : null,
  ].filter(Boolean) as string[];

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, estadoFiltro, orden, usuarioId, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este riesgo?")) return;

    await eliminarRiesgo(token, id);
    setRiesgos((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleGuardarEdicion() {
    if (!editando) return;

    if (!tipoEdit) {
      alert("Debe seleccionar un tipo");
      return;
    }

    if (tipoEdit === "Otro" && descEdit.trim() === "") {
      alert("La descripción es obligatoria para 'Otro'");
      return;
    }

    if (tipoEdit === "Otro" && !iconoEdit) {
      alert("Debe seleccionar un icono para 'Otro'");
      return;
    }

    try {
      const payload: any = { tipo: tipoEdit };

      if (tipoEdit === "Otro") {
        payload.descripcion = descEdit;
        payload.icono = iconoEdit;
      } else {
        payload.descripcion = "";
        payload.icono = null;
      }

      await editarRiesgo(token, editando.id, payload);

      setRiesgos((prev) =>
        prev.map((r) =>
          r.id === editando.id
            ? {
                ...r,
                tipo: tipoEdit,
                descripcion: tipoEdit === "Otro" ? descEdit : "",
                icono: tipoEdit === "Otro" ? iconoEdit : null,
              }
            : r,
        ),
      );

      setEditando(null);
    } catch (error) {
      console.error("Error al guardar riesgo:", error);
      alert("No se pudo guardar el riesgo. Revisa la conexión.");
    }
  }

  return (
    <div className="page">
      <main className="main">
        <section className="page-section">
          <div className="card risk-panel">
            <div className="risk-page-header">
              <div>
                <h2 className="page-title">Gestión de Riesgos</h2>
                <p className="risk-page-subtitle">
                  Administra incidentes, revisa reportes pendientes y accede al historial
                  operativo desde una sola vista.
                </p>
              </div>
            </div>

            <div className="risk-summary-grid">
              <div className="risk-summary-card accent-green">
                <span className="risk-summary-label">Total visibles</span>
                <strong className="risk-summary-value">{riesgosFiltrados.length}</strong>
                <span className="risk-summary-caption">Resultados con filtros actuales</span>
              </div>
              <div className="risk-summary-card accent-amber">
                <span className="risk-summary-label">Activos</span>
                <strong className="risk-summary-value">{totalActivos}</strong>
                <span className="risk-summary-caption">Riesgos que siguen abiertos</span>
              </div>
              <div className="risk-summary-card accent-slate">
                <span className="risk-summary-label">Resueltos</span>
                <strong className="risk-summary-value">{totalResueltos}</strong>
                <span className="risk-summary-caption">Incidentes ya cerrados</span>
              </div>
              <div className="risk-summary-card accent-gold">
                <span className="risk-summary-label">Reportes pendientes</span>
                <strong className="risk-summary-value">{totalReportesPendientes}</strong>
                <span className="risk-summary-caption">En {riesgosConReportes} riesgo(s) con revisión pendiente</span>
              </div>
            </div>

            <div className="risk-toolbar card">
              <div className="risk-toolbar-head">
                <div>
                  <h3 className="risk-toolbar-title">Filtros y búsqueda</h3>
                  <p className="risk-toolbar-copy">Refina la vista por responsable, estado, fechas o texto libre.</p>
                </div>
                <div className="risk-toolbar-actions">
                  <button className="btn-filter primary" onClick={cargarRiesgos}>
                    Aplicar filtros
                  </button>
                  <button className="btn-filter secondary" onClick={limpiarFiltros}>
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="filters risk-filters-grid">
                <input
                  type="text"
                  className="filter-input risk-filter-search"
                  placeholder="Buscar por tipo, comuna, usuario o descripción"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />

                <select
                  className="filter-input"
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {usuariosDisponibles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-input"
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="resuelto">Resueltos</option>
                </select>

                <input
                  type="date"
                  className="filter-input"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />

                <input
                  type="date"
                  className="filter-input"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />

                <select
                  className="filter-input"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                >
                  <option value="fecha_desc">Fecha: más reciente</option>
                  <option value="fecha_asc">Fecha: más antigua</option>
                  <option value="comuna_asc">Comuna: A-Z</option>
                  <option value="comuna_desc">Comuna: Z-A</option>
                  <option value="tipo_asc">Tipo: A-Z</option>
                  <option value="tipo_desc">Tipo: Z-A</option>
                  <option value="estado_asc">Estado: A-Z</option>
                  <option value="estado_desc">Estado: Z-A</option>
                </select>
              </div>

              {filtrosActivos.length > 0 && (
                <div className="risk-filter-chips">
                  {filtrosActivos.map((filtro) => (
                    <span key={filtro} className="risk-filter-chip">
                      {filtro}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {loading && <p>Cargando registros…</p>}

            {!loading && riesgosFiltrados.length === 0 && (
              <div className="risk-empty-state">
                <h3>No hay riesgos para mostrar</h3>
                <p>Prueba ajustando los filtros o limpiando la búsqueda para ver más resultados.</p>
              </div>
            )}

            {!loading && riesgosFiltrados.length > 0 && (
              <div className="risk-results-card">
                <div className="risk-results-header">
                  <div>
                    <h3 className="risk-results-title">Listado operativo</h3>
                    <p className="risk-results-copy">
                      Mostrando {(paginaActual - 1) * PAGE_SIZE + 1} a {Math.min(paginaActual * PAGE_SIZE, riesgosFiltrados.length)} de {riesgosFiltrados.length} riesgos.
                    </p>
                  </div>

                  <div className="risk-pagination">
                    <small className="risk-pagination-copy">Página {paginaActual} de {totalPaginas}</small>
                    <button
                      className="btn-filter secondary"
                      onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                      disabled={paginaActual === 1}
                    >
                      Anterior
                    </button>
                    <button
                      className="btn-filter secondary"
                      onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                      disabled={paginaActual === totalPaginas}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="table risk-table">
                    <thead>
                      <tr>
                        <th>Riesgo</th>
                        <th>Ubicación</th>
                        <th>Reportado por</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Gestión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riesgosPaginados.map((r) => (
                        <React.Fragment key={r.id}>
                          <tr className={riesgoAbierto === r.id ? "risk-row-expanded" : undefined}>
                            <td>
                              <div className="risk-primary-cell">
                                <div className="risk-type-line">
                                  <span className="risk-type-icon">{getEmoji(r.tipo, r.icono)}</span>
                                  <span className="risk-type-text">{r.tipo}</span>
                                </div>
                                <p className="risk-description-preview">{r.descripcion || "Sin descripción adicional"}</p>
                              </div>
                            </td>
                            <td>
                              <div className="risk-meta-cell">
                                <strong>{r.comuna || "Sin comuna"}</strong>
                                <span>{r.region || "Región no informada"}</span>
                              </div>
                            </td>
                            <td>
                              <div className="risk-meta-cell">
                                <strong>{getUsuarioLabel(r)}</strong>
                                <span>{r.usuario_email || "Sin correo asociado"}</span>
                              </div>
                            </td>
                            <td>
                              <div className="risk-status-stack">
                                <span className={r.estado === "resuelto" ? "risk-badge risk-badge-success" : "risk-badge risk-badge-warning"}>
                                  {r.estado === "resuelto" ? "Resuelto" : "Activo"}
                                </span>
                                {r.reportes_pendientes > 0 && (
                                  <span className="risk-badge risk-badge-alert">
                                    {r.reportes_pendientes} reporte(s) pendiente(s)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="risk-meta-cell">
                                <strong>{formatFechaHora(r.created_at)}</strong>
                                <span>ID: {r.id}</span>
                              </div>
                            </td>
                            <td>
                              <div className="risk-action-grid">
                                <button className="risk-action-button" onClick={() => setRiesgoMapa(r)}>
                                  <span>🗺️</span>
                                  <span>Mapa</span>
                                </button>
                                <button
                                  className="risk-action-button"
                                  onClick={() => setRiesgoAbierto(riesgoAbierto === r.id ? null : r.id)}
                                >
                                  <span>💬</span>
                                  <span>{riesgoAbierto === r.id ? "Ocultar" : "Comentarios"}</span>
                                </button>
                                <button
                                  className="risk-action-button"
                                  onClick={() => {
                                    setEditando(r);
                                    setTipoEdit(r.tipo);
                                    setDescEdit(r.descripcion || "");
                                    setIconoEdit(r.icono || ICONOS_OTRO[0]);
                                  }}
                                >
                                  <span>✏️</span>
                                  <span>Editar</span>
                                </button>
                                {r.estado === "activo" && (
                                  <button
                                    className="risk-action-button risk-action-button-success"
                                    onClick={async () => {
                                      if (!confirm("¿Marcar este riesgo como resuelto?")) return;
                                      await resolverRiesgo(token, r.id);
                                      setRiesgos((prev) =>
                                        prev.map((x) => (x.id === r.id ? { ...x, estado: "resuelto" } : x)),
                                      );
                                    }}
                                  >
                                    <span>✅</span>
                                    <span>Resolver</span>
                                  </button>
                                )}
                                <button className="risk-action-button risk-action-button-danger" onClick={() => handleEliminar(r.id)}>
                                  <span>🗑️</span>
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {riesgoAbierto === r.id && (
                            <tr className="risk-detail-row">
                              <td colSpan={6}>
                                <div className="risk-detail-panel">
                                  <div className="risk-detail-header">
                                    <h4>Historial y reportes</h4>
                                    <span>Seguimiento del riesgo {r.tipo}</span>
                                  </div>
                                  <RiesgoComentarios token={token} riesgoId={r.id} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {editando && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Editar riesgo</h3>

            <label>Tipo</label>
            <select value={tipoEdit} onChange={(e) => setTipoEdit(e.target.value)}>
              <option value="">Seleccionar</option>
              {TIPOS_RIESGO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {tipoEdit === "Otro" && (
              <>
                <label>Icono</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {ICONOS_OTRO.map((icono) => {
                    const selected = iconoEdit === icono;
                    return (
                      <button
                        key={icono}
                        type="button"
                        onClick={() => setIconoEdit(icono)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          border: selected ? "2px solid #2563eb" : "1px solid #d1d5db",
                          background: selected ? "#dbeafe" : "#fff",
                          cursor: "pointer",
                          fontSize: 22,
                        }}
                      >
                        {icono}
                      </button>
                    );
                  })}
                </div>

                <label>Descripción</label>
                <textarea rows={3} value={descEdit} onChange={(e) => setDescEdit(e.target.value)} />
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setEditando(null)}>
                Cancelar
              </button>

              <button type="button" className="btn-primary" onClick={handleGuardarEdicion}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {riesgoMapa && (
        <div className="modal-backdrop">
          <div className="modal modal-wide">
            <h3 style={{ marginBottom: 8 }}>Riesgo en el mapa</h3>

            <p style={{ fontSize: 18, marginBottom: 4 }}>
              {getEmoji(riesgoMapa.tipo, riesgoMapa.icono)} <strong>{riesgoMapa.tipo}</strong>
            </p>

            {riesgoMapa.descripcion && (
              <p style={{ color: "#555", marginBottom: 12 }}>
                Descripción: {riesgoMapa.descripcion}
              </p>
            )}

            <p style={{ color: "#555", marginBottom: 12 }}>
              Comuna: {riesgoMapa.comuna || "Sin comuna"}
            </p>

            <iframe
              width="100%"
              height="400"
              style={{ border: 0, borderRadius: 12 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps?q=${riesgoMapa.latitude},${riesgoMapa.longitude}&z=17&output=embed`}
            />

            <RiesgoComentarios token={token} riesgoId={riesgoMapa.id} />

            <div className="modal-actions">
              <button onClick={() => setRiesgoMapa(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
