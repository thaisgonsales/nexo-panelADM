import { useEffect, useState } from "react";
import {
  listarComentariosPorRiesgo,
  listarReportesPorRiesgo,
  eliminarReporte,
  listarUsuarios,
} from "../services/api";

type Props = {
  token: string;
  riesgoId: string;
};

type Comentario = {
  id: number;
  texto: string;
  created_at: string;
  user_id?: string;
  usuario: string;
  tipo: "comentario" | "reporte_resuelto";
};

type Usuario = {
  id: string;
  nombre?: string;
  empresa?: string;
  region?: string;
};

export default function RiesgoComentarios({ token, riesgoId }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [reportes, setReportes] = useState<Comentario[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      listarComentariosPorRiesgo(token, riesgoId),
      listarReportesPorRiesgo(token, riesgoId),
      listarUsuarios(token),
    ])
      .then(([comentariosData, reportesData, usuariosData]) => {
        setComentarios(comentariosData);
        setReportes(reportesData);
        setUsuarios(usuariosData);
      })
      .finally(() => setLoading(false));
  }, [token, riesgoId]);

  function getUsuarioLabel(comentario: Comentario) {
    const userId = comentario.user_id;
    if (!userId) return comentario.usuario;
    const user = usuarios.find((u) => u.id === userId);
    if (!user) return comentario.usuario;
    const parts = [user.nombre, user.empresa, user.region].filter(Boolean);
    return parts.length > 0 ? parts.join(" • ") : comentario.usuario;
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return <p>Cargando comentarios…</p>;
  }

  return (
    <div className="comment-section">
      <h4>Comentarios</h4>

      {comentarios.length === 0 ? (
        <p className="comment-empty">No hay comentarios</p>
      ) : (
        <div className="comment-list">
          {comentarios.map((c) => (
            <article key={c.id} className="comment-card">
              <div className="comment-header">
                <strong className="comment-author">{getUsuarioLabel(c)}</strong>
                <span className="comment-date">{formatFecha(c.created_at)}</span>
              </div>
              <p className="comment-text">{c.texto}</p>
            </article>
          ))}
        </div>
      )}

      <h4 style={{ marginTop: 20 }}>Reportes</h4>

      {reportes.length === 0 ? (
        <p className="comment-empty">No hay reportes</p>
      ) : (
        <div className="comment-list">
          {reportes.map((r) => (
            <article key={r.id} className="comment-card report-card-item">
              <div className="comment-header">
                <strong className="comment-author">{getUsuarioLabel(r)}</strong>
                <span className="comment-date">{formatFecha(r.created_at)}</span>
              </div>

              <p className="comment-text">{r.texto}</p>

              <button
                className="btn-icon btn-delete comment-delete-button"
                onClick={async () => {
                  if (!confirm("¿Eliminar este reporte?")) return;
                  await eliminarReporte(token, r.id);
                  setReportes((prev) => prev.filter((x) => x.id !== r.id));
                }}
              >
                🗑️ Eliminar reporte
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
