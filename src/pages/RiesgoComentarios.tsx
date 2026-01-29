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

  if (loading) {
    return <p>Cargando comentarios…</p>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* 🗨️ COMENTARIOS */}
      <h4>Comentarios</h4>

      {comentarios.length === 0 ? (
        <p>No hay comentarios</p>
      ) : (
        comentarios.map((c) => (
          <div key={c.id} className="comment-box">
            <strong>{getUsuarioLabel(c)}</strong>
            <p>{c.texto}</p>
          </div>
        ))
      )}

      {/* 🚨 REPORTES */}
      <h4 style={{ marginTop: 16 }}>Reportes</h4>

      {reportes.length === 0 ? (
        <p>No hay reportes</p>
      ) : (
        reportes.map((r) => (
          <div
            key={r.id}
            style={{
              background: "#4b4948",
              border: "2px solid #facc15",
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <strong>{getUsuarioLabel(r)}</strong>
            <p>{r.texto}</p>

            <button
              className="btn-icon btn-delete"
              onClick={async () => {
                if (!confirm("¿Eliminar este reporte?")) return;
                await eliminarReporte(token, r.id);
                setReportes((prev) => prev.filter((x) => x.id !== r.id));
              }}
            >
              🗑️ Eliminar reporte
            </button>
          </div>
        ))
      )}
    </div>
  );
}
