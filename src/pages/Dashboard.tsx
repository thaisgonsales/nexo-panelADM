import { useEffect, useMemo, useState } from "react";
import { listarRiesgos } from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const COLORS = {
  primary: "#2563eb",
  success: "#16a34a",
  warning: "#d97706",
  grid: "#e5e7eb",
};

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
};

// Utils
function formatDateCL(date: string) {
  return new Date(date).toLocaleDateString("es-CL");
}

export default function Dashboard({ token }: Props) {
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarRiesgos(token)
      .then(setRiesgos)
      .finally(() => setLoading(false));
  }, [token]);

  /* ======================
     MÉTRICAS
  ====================== */

  const totalRiesgos = riesgos.length;

  const riesgosPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    riesgos.forEach((r) => {
      map[r.tipo] = (map[r.tipo] || 0) + 1;
    });

    return Object.entries(map)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);
  }, [riesgos]);

  const riesgosPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    riesgos.forEach((r) => {
      const dia = formatDateCL(r.created_at);
      map[dia] = (map[dia] || 0) + 1;
    });

    return Object.entries(map)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime())
      .slice(-7); // últimos 7 días
  }, [riesgos]);

  if (loading) {
    return <p style={{ padding: 24 }}>Cargando dashboard…</p>;
  }

  return (
    <div className="page">
      <main className="main">
        <h2 style={{ marginTop: 0 }}>Dashboard</h2>

        {/* CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            className="card"
            style={{ borderLeft: `6px solid ${COLORS.primary}` }}
          >
            <h4>Total de riesgos</h4>
            <p style={{ fontSize: 36, margin: 0, fontWeight: 700 }}>
              {totalRiesgos}
            </p>
            <small style={{ color: "#6b7280" }}>Registros totales</small>
          </div>

          {riesgosPorTipo[0] && (
            <div
              className="card"
              style={{ borderLeft: `6px solid ${COLORS.warning}` }}
            >
              <h4>Riesgo más común</h4>
              <p style={{ fontSize: 20, margin: "8px 0", fontWeight: 600 }}>
                {riesgosPorTipo[0].tipo}
              </p>
              <small style={{ color: "#6b7280" }}>
                {riesgosPorTipo[0].total} registros
              </small>
            </div>
          )}
        </div>

        {/* GRÁFICO POR TIPO */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h4>Riesgos por tipo</h4>

          {riesgosPorTipo.length === 0 ? (
            <p>No hay datos</p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={riesgosPorTipo}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill={COLORS.primary}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRÁFICO POR DÍA */}
        <div className="card">
          <h4>Riesgos por día (últimos 7 días)</h4>

          {riesgosPorDia.length === 0 ? (
            <p>No hay datos</p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={riesgosPorDia}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={COLORS.success}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
