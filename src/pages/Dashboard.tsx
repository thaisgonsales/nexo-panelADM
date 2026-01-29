import { useEffect, useMemo, useState } from "react";
import { descargarReporteMensual, listarRiesgos } from "../services/api";
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
  primary: "#22c55e",
  success: "#6ee7b7",
  warning: "#facc15",
  danger: "#f97316",
  grid: "rgba(255,255,255,0.15)",
  text: "#e5e7eb",
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
  region?: string | null;
  comuna?: string | null;
  estado?: "activo" | "resuelto" | string;
};

// Utils
function formatMonthKey(date: string) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthCL(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
  });
}

function getMonthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  return { from, to };
}

export default function Dashboard({ token }: Props) {
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesReporte, setMesReporte] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    listarRiesgos(token)
      .then(setRiesgos)
      .finally(() => setLoading(false));
  }, [token]);

  /* ======================
     MÉTRICAS
  ====================== */

  const totalRiesgos = riesgos.length;
  const riesgosActivos = riesgos.filter((r) => r.estado === "activo").length;
  const riesgosResueltos = riesgos.filter(
    (r) => r.estado && r.estado !== "activo",
  ).length;

  const riesgosPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    riesgos.forEach((r) => {
      map[r.tipo] = (map[r.tipo] || 0) + 1;
    });

    return Object.entries(map)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);
  }, [riesgos]);

  const riesgosPorMes = useMemo(() => {
    const map: Record<string, number> = {};
    riesgos.forEach((r) => {
      const monthKey = formatMonthKey(r.created_at);
      map[monthKey] = (map[monthKey] || 0) + 1;
    });

    return Object.entries(map)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-6); // últimos 6 meses
  }, [riesgos]);

  const riesgosPorComuna = useMemo(() => {
    const map: Record<string, number> = {};
    riesgos.forEach((r) => {
      const comuna = r.comuna || r.region || "Sin comuna";
      map[comuna] = (map[comuna] || 0) + 1;
    });

    return Object.entries(map)
      .map(([comuna, total]) => ({ comuna, total }))
      .sort((a, b) => b.total - a.total);
  }, [riesgos]);

  async function handleDescargarReporte() {
    try {
      setDownloading(true);
      const { from, to } = getMonthRange(mesReporte);
      const blob = await descargarReporteMensual(token, from, to);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${mesReporte}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // eslint-disable-next-line no-alert
      alert("No se pudo generar el reporte");
    } finally {
      setDownloading(false);
    }
  }

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

          <div
            className="card"
            style={{ borderLeft: `6px solid ${COLORS.success}` }}
          >
            <h4>Estado de riesgos</h4>
            <p style={{ margin: "8px 0 0", fontWeight: 600 }}>
              Activos: {riesgosActivos} · Resueltos: {riesgosResueltos}
            </p>
            <div
              style={{
                marginTop: 8,
                height: 8,
                borderRadius: 999,
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width:
                    totalRiesgos === 0
                      ? "0%"
                      : `${Math.round((riesgosActivos / totalRiesgos) * 100)}%`,
                  height: "100%",
                  background: COLORS.success,
                }}
              />
            </div>
            <small style={{ color: "#6b7280" }}>
              {totalRiesgos === 0
                ? "Sin registros"
                : `${Math.round((riesgosResueltos / totalRiesgos) * 100)}% resueltos`}
            </small>
          </div>
        </div>

        {/* GRÁFICO POR TIPO */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h4>Riesgos por tipo</h4>

          {riesgosPorTipo.length === 0 ? (
            <p>No hay datos</p>
          ) : (
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <BarChart data={riesgosPorTipo}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />

                  <XAxis dataKey="tipo" stroke={COLORS.text} />
                  <YAxis stroke={COLORS.text} />

                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                      color: "#e5e7eb",
                    }}
                  />

                  {/* 👇 ISSO É O MAIS IMPORTANTE */}
                  <Bar dataKey="total" fill={COLORS.primary} radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRÁFICO POR COMUNA */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h4>Riesgos por comuna</h4>

          {riesgosPorComuna.length === 0 ? (
            <p>No hay datos</p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={riesgosPorComuna}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="comuna" stroke={COLORS.text} />
                  <YAxis stroke={COLORS.text} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                      color: "#e5e7eb",
                    }}
                  />
                  <Bar dataKey="total" fill={COLORS.warning} radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>

        {/* GRÁFICO POR MES */}
        <div className="card">
          <h4>Evolución mensual de registros</h4>

          {riesgosPorMes.length === 0 ? (
            <p>No hay datos</p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={riesgosPorMes}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tickFormatter={formatMonthCL} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={COLORS.danger}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>

        {/* REPORTE PDF */}
        <div className="card" style={{ marginTop: 24 }}>
          <h4>Reporte mensual (PDF)</h4>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              type="month"
              value={mesReporte}
              onChange={(e) => setMesReporte(e.target.value)}
              className="auth-input"
              style={{ maxWidth: 220 }}
            />
            <button
              className="auth-button"
              onClick={handleDescargarReporte}
              disabled={downloading}
            >
              {downloading ? "Generando…" : "Generar reporte mensual"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
