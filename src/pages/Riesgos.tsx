import { useEffect, useMemo, useState } from "react";
import {
  listarRiesgos,
  listarUsuarios,
  eliminarRiesgo,
  editarRiesgo,
} from "../services/api";
import RiesgoComentarios from "./RiesgoComentarios";
import React from "react";
import { resolverRiesgo } from "../services/api";

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
  reportes_pendientes: number; // 👈 NOVO
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

  // filtros
  const [usuarioId, setUsuarioId] = useState("");
  const [regionFiltro, setRegionFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [orden, setOrden] = useState("fecha_desc");
  const [paginaActual, setPaginaActual] = useState(1);

  // editar
  const [editando, setEditando] = useState<Riesgo | null>(null);
  const [tipoEdit, setTipoEdit] = useState("");
  const [descEdit, setDescEdit] = useState("");
  const [iconoEdit, setIconoEdit] = useState("");

  // mapa
  const [riesgoMapa, setRiesgoMapa] = useState<Riesgo | null>(null);

  const usuariosByEmail = useMemo(() => {
    const map = new Map<string, Usuario>();
    usuarios.forEach((u) => {
      if (u.email) map.set(u.email, u);
    });
    return map;
  }, [usuarios]);

  const regionesDisponibles = useMemo(
    () =>
      Array.from(
        new Set(usuarios.map((u) => u.region).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [usuarios],
  );

  const PAGE_SIZE = 10;

  function getUsuarioLabel(riesgo: Riesgo) {
    const parts = [riesgo.usuario_nombre, riesgo.empresa, riesgo.region].filter(
      Boolean,
    );
    if (parts.length > 0) return parts.join(" • ");

    const email = riesgo.usuario_email;
    if (!email) return "—";
    const user = usuariosByEmail.get(email);
    if (!user) return email;
    const fallbackParts = [user.nombre, user.empresa, user.region].filter(
      Boolean,
    );
    return fallbackParts.length > 0 ? fallbackParts.join(" • ") : email;
  }

  useEffect(() => {
    listarUsuarios(token).then(setUsuarios);
    cargarRiesgos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 🔁 AUTO-REFRESH PANEL (a cada 15s)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      listarRiesgos(token, {
        userId: usuarioId || undefined,
        region: regionFiltro || undefined,
        from: fechaDesde || undefined,
        to: fechaHasta || undefined,
      }).then(setRiesgos);
    }, 15000); // 15 segundos

    return () => clearInterval(interval);
  }, [token, usuarioId, regionFiltro, fechaDesde, fechaHasta]);

  function cargarRiesgos() {
    setLoading(true);

    listarRiesgos(token, {
      userId: usuarioId || undefined,
      region: regionFiltro || undefined,
      from: fechaDesde || undefined,
      to: fechaHasta || undefined,
    })
      .then(setRiesgos)
      .finally(() => setLoading(false));
  }

  function limpiarFiltros() {
    setUsuarioId("");
    setRegionFiltro("");
    setEstadoFiltro("");
    setBusqueda("");
    setFechaDesde("");
    setFechaHasta("");
    setOrden("fecha_desc");
    setPaginaActual(1);
    listarRiesgos(token).then(setRiesgos);
  }

  function formatFechaHora(fecha: string) {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

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
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
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
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [busqueda, estadoFiltro, orden, riesgos]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(riesgosFiltrados.length / PAGE_SIZE),
  );

  const riesgosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * PAGE_SIZE;
    return riesgosFiltrados.slice(inicio, inicio + PAGE_SIZE);
  }, [paginaActual, riesgosFiltrados]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, estadoFiltro, orden, usuarioId, regionFiltro, fechaDesde, fechaHasta]);

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
      const payload: any = {
        tipo: tipoEdit,
      };

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

      setEditando(null); // 👈 fecha modal
    } catch (error) {
      console.error("Error al guardar riesgo:", error);
      alert("No se pudo guardar el riesgo. Revisa la conexión.");
    }
  }

  return (
    <div className="page">
      <main className="main">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Historial de Riesgos</h2>

          {/* FILTROS */}
          <div className="filters">
            <select
              className="filter-input"
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre
                    ? `${u.nombre} · ${u.empresa || "-"} · ${u.region || "-"}`
                    : u.email}
                </option>
              ))}
            </select>

            <select
              className="filter-input"
              value={regionFiltro}
              onChange={(e) => setRegionFiltro(e.target.value)}
            >
              <option value="">Todas las regiones</option>
              {regionesDisponibles.map((region) => (
                <option key={region} value={region}>
                  {region}
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

            <input
              type="text"
              className="filter-input"
              placeholder="Buscar por tipo, comuna, usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
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

            <button className="btn-filter primary" onClick={cargarRiesgos}>
              Aplicar filtros
            </button>

            <button className="btn-filter secondary" onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>

          {loading && <p>Cargando registros…</p>}

          {!loading && riesgosFiltrados.length === 0 && (
            <p>No hay riesgos registrados</p>
          )}

          {!loading && riesgosFiltrados.length > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <small style={{ color: "#6b7280" }}>
                  Mostrando {riesgosPaginados.length} de {riesgosFiltrados.length} riesgos
                </small>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="btn-filter secondary"
                    onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                    disabled={paginaActual === 1}
                  >
                    Anterior
                  </button>
                  <small style={{ color: "#6b7280" }}>
                    Página {paginaActual} de {totalPaginas}
                  </small>
                  <button
                    className="btn-filter secondary"
                    onClick={() =>
                      setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))
                    }
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Comuna</th>
                    <th>Usuario</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {riesgosPaginados.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td>{r.tipo}</td>
                      <td>{r.descripcion || "-"}</td>
                      <td>{r.comuna || "-"}</td>
                      <td>{getUsuarioLabel(r)}</td>
                      <td>{formatFechaHora(r.created_at)}</td>

                      <td>
                        <button
                          className="btn-icon"
                          title="Ver en el mapa"
                          onClick={() => setRiesgoMapa(r)}
                        >
                          🗺️
                        </button>

                        {/* BOTÃO COMENTÁRIOS */}
                        <button
                          className="btn-icon"
                          title="Ver comentarios"
                          onClick={() =>
                            setRiesgoAbierto(
                              riesgoAbierto === r.id ? null : r.id,
                            )
                          }
                        >
                          💬
                        </button>

                        {/* EDITAR */}
                        <button
                          className="btn-icon"
                          title="Editar riesgo"
                          onClick={() => {
                            setEditando(r);
                            setTipoEdit(r.tipo);
                            setDescEdit(r.descripcion || "");
                            setIconoEdit(r.icono || ICONOS_OTRO[0]);
                          }}
                        >
                          ✏️
                        </button>

                        {/* EXCLUIR RIESGO 👇 */}
                        <button
                          className="btn-icon btn-delete"
                          title="Eliminar riesgo"
                          onClick={() => handleEliminar(r.id)}
                        >
                          🗑️
                        </button>

                        {r.estado === "activo" && r.reportes_pendientes > 0 && (
                          <span className="badge badge-warning">
                            🟡 {r.reportes_pendientes} reporte(s) pendiente(s)
                          </span>
                        )}

                        {/* RESOLVER */}
                        {r.estado === "activo" && (
                          <button
                            className="btn-icon"
                            title="Marcar como resuelto"
                            onClick={async () => {
                              if (
                                !confirm("¿Marcar este riesgo como resuelto?")
                              )
                                return;
                              await resolverRiesgo(token, r.id);
                              setRiesgos((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, estado: "resuelto" }
                                    : x,
                                ),
                              );
                            }}
                          >
                            ✅
                          </button>
                        )}

                        {/* BADGE */}
                      </td>

                      <td>
                        {r.estado === "resuelto" ? (
                          <span style={{ color: "green", fontWeight: 600 }}>
                            Resuelto
                          </span>
                        ) : (
                          <span style={{ color: "#d97706", fontWeight: 600 }}>
                            Activo
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* FILA DE REPORTES */}
                    {riesgoAbierto === r.id && (
                      <tr>
                        <td colSpan={7}>
                          <RiesgoComentarios token={token} riesgoId={r.id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </main>

      {/* MODAL EDITAR */}
      {editando && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Editar riesgo</h3>

            <label>Tipo</label>
            <select
              value={tipoEdit}
              onChange={(e) => setTipoEdit(e.target.value)}
            >
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
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
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
                          border: selected
                            ? "2px solid #2563eb"
                            : "1px solid #d1d5db",
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
                <textarea
                  rows={3}
                  value={descEdit}
                  onChange={(e) => setDescEdit(e.target.value)}
                />
              </>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleGuardarEdicion}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MAPA */}
      {riesgoMapa && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "90%", maxWidth: 800 }}>
            <h3 style={{ marginBottom: 8 }}>Riesgo en el mapa</h3>

            <p style={{ fontSize: 18, marginBottom: 4 }}>
              {getEmoji(riesgoMapa.tipo, riesgoMapa.icono)}{" "}
              <strong>{riesgoMapa.tipo}</strong>
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
