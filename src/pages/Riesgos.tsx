import { useEffect, useState } from "react";
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
  latitude: number;
  longitude: number;
  created_at: string;
  usuario_email: string | null;
  estado: "activo" | "resuelto";
  reportes_pendientes: number; // 👈 NOVO
};

type Usuario = {
  id: string;
  email: string;
};

const TIPOS_RIESGO = [
  "Animal agresivo",
  "Terreno en mal estado",
  "Acceso complicado",
  "Riesgo de seguridad",
  "Otro",
];

function getEmoji(tipo: string) {
  switch (tipo) {
    case "Animal agresivo":
      return "🐕";
    case "Terreno en mal estado":
      return "⚠️";
    case "Acceso complicado":
      return "🚧";
    case "Riesgo de seguridad":
      return "🚨";
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
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // editar
  const [editando, setEditando] = useState<Riesgo | null>(null);
  const [tipoEdit, setTipoEdit] = useState("");
  const [descEdit, setDescEdit] = useState("");

  // mapa
  const [riesgoMapa, setRiesgoMapa] = useState<Riesgo | null>(null);

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
        from: fechaDesde || undefined,
        to: fechaHasta || undefined,
      }).then(setRiesgos);
    }, 15000); // 15 segundos

    return () => clearInterval(interval);
  }, [token, usuarioId, fechaDesde, fechaHasta]);

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

  function limpiarFiltros() {
    setUsuarioId("");
    setFechaDesde("");
    setFechaHasta("");
    listarRiesgos(token).then(setRiesgos);
  }

  function formatFechaHora(fecha: string) {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

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

    try {
      const payload: any = {
        tipo: tipoEdit,
      };

      if (tipoEdit === "Otro") {
        payload.descripcion = descEdit;
      }

      await editarRiesgo(token, editando.id, payload);

      setRiesgos((prev) =>
        prev.map((r) =>
          r.id === editando.id
            ? {
                ...r,
                tipo: tipoEdit,
                descripcion: tipoEdit === "Otro" ? descEdit : "",
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
                  {u.email}
                </option>
              ))}
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

            <button className="btn-filter primary" onClick={cargarRiesgos}>
              Aplicar filtros
            </button>

            <button className="btn-filter secondary" onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>

          {loading && <p>Cargando registros…</p>}

          {!loading && riesgos.length === 0 && (
            <p>No hay riesgos registrados</p>
          )}

          {!loading && riesgos.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {riesgos.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td>{r.tipo}</td>
                      <td>{r.descripcion || "-"}</td>
                      <td>{r.usuario_email || "—"}</td>
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
                        <td colSpan={6}>
                          <RiesgoComentarios token={token} riesgoId={r.id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
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
              {getEmoji(riesgoMapa.tipo)} <strong>{riesgoMapa.tipo}</strong>
            </p>

            {riesgoMapa.descripcion && (
              <p style={{ color: "#555", marginBottom: 12 }}>
                Descripción: {riesgoMapa.descripcion}
              </p>
            )}

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
