import { useEffect, useState } from "react";
import {
  listarComentariosPorRiesgo,
  listarReportesPorRiesgo,
  eliminarReporte,
} from "../services/api";

type Props = {
  token: string;
  riesgoId: string;
};

type Comentario = {
  id: number;
  texto: string;
  created_at: string;
  usuario: string;
  tipo: "comentario" | "reporte_resuelto";
};

export default function RiesgoComentarios({ token, riesgoId }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [reportes, setReportes] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      listarComentariosPorRiesgo(token, riesgoId),
      listarReportesPorRiesgo(token, riesgoId),
    ])
      .then(([comentariosData, reportesData]) => {
        setComentarios(comentariosData);
        setReportes(reportesData);
      })
      .finally(() => setLoading(false));
  }, [token, riesgoId]);

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
            <strong>{c.usuario}</strong>
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
            <strong>{r.usuario}</strong>
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
