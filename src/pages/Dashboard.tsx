import { useEffect, useMemo, useState } from "react";
import {
  descargarReporteMensual,
  listarRiesgos,
  listarSos,
  listarUsuarios,
  SosItem,
} from "../services/api";
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
  sos: "#fb7185",
};

type Props = {
  token: string;
};

type Usuario = {
  id: string;
  email?: string | null;
  empresa?: string | null;
  region?: string | null;
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

function getLatestMonthKey(dates: string[]) {
  const valid = dates.filter(Boolean).sort();
  const latest = valid[valid.length - 1];
  return latest ? latest.slice(0, 7) : null;
}

export default function Dashboard({ token }: Props) {
  const [riesgos, setRiesgos] = useState<Riesgo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sosItems, setSosItems] = useState<SosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoFiltro, setPeriodoFiltro] = useState("todos");
  const [mesReporte, setMesReporte] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([listarRiesgos(token), listarUsuarios(token), listarSos(token)])
      .then(([riesgosData, usuariosData, sosData]) => {
        setRiesgos(riesgosData);
        setUsuarios(usuariosData);
        setSosItems(sosData);

        const latestMonth = getLatestMonthKey([
          ...riesgosData.map((item: Riesgo) => item.created_at),
          ...sosData.map((item: SosItem) => item.created_at),
        ]);

        if (latestMonth) {
          setMesReporte(latestMonth);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const empresaPorEmail = useMemo(
    () =>
      usuarios.reduce<Record<string, string>>((acc, usuario) => {
        if (usuario.email && usuario.empresa) {
          acc[usuario.email] = usuario.empresa;
        }
        return acc;
      }, {}),
    [usuarios],
  );

  const riesgosFiltrados = useMemo(() => {
    const now = new Date();

    return riesgos.filter((riesgo) => {
      if (periodoFiltro === "todos") {
        return true;
      }

      const createdAt = new Date(riesgo.created_at);
      const diffMs = now.getTime() - createdAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (periodoFiltro === "7d") {
        return diffDays <= 7;
      }

      if (periodoFiltro === "30d") {
        return diffDays <= 30;
      }

      if (periodoFiltro === "mes_actual") {
        return (
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [periodoFiltro, riesgos]);

  const sosFiltrados = useMemo(() => {
    const now = new Date();

    return sosItems.filter((item) => {
      if (periodoFiltro === "todos") {
        return true;
      }

      const createdAt = new Date(item.created_at);
      const diffMs = now.getTime() - createdAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (periodoFiltro === "7d") {
        return diffDays <= 7;
      }

      if (periodoFiltro === "30d") {
        return diffDays <= 30;
      }

      if (periodoFiltro === "mes_actual") {
        return (
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [periodoFiltro, sosItems]);

  const totalRiesgos = riesgosFiltrados.length;
  const riesgosActivos = riesgosFiltrados.filter(
    (r) => r.estado === "activo",
  ).length;
  const riesgosResueltos = riesgosFiltrados.filter(
    (r) => r.estado && r.estado !== "activo",
  ).length;

  const totalSos = sosFiltrados.length;
  const sosPendientes = sosFiltrados.filter((item) => item.estado === "pendiente").length;
  const sosRevisados = sosFiltrados.filter((item) => item.estado === "revisado").length;
  const sosAtendidos = sosFiltrados.filter((item) => item.estado === "atendido").length;

  const riesgosPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    riesgosFiltrados.forEach((r) => {
      map[r.tipo] = (map[r.tipo] || 0) + 1;
    });

    return Object.entries(map)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);
  }, [riesgosFiltrados]);

  const sosPorMotivo = useMemo(() => {
    const map: Record<string, number> = {};
    sosFiltrados.forEach((item) => {
      map[item.motivo] = (map[item.motivo] || 0) + 1;
    });

    return Object.entries(map)
      .map(([motivo, total]) => ({ motivo, total }))
      .sort((a, b) => b.total - a.total);
  }, [sosFiltrados]);

  const riesgosPorMes = useMemo(() => {
    const map: Record<string, number> = {};
    riesgosFiltrados.forEach((r) => {
      const monthKey = formatMonthKey(r.created_at);
      map[monthKey] = (map[monthKey] || 0) + 1;
    });

    return Object.entries(map)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-6);
  }, [riesgosFiltrados]);

  const riesgosPorComuna = useMemo(() => {
    const map: Record<string, number> = {};
    riesgosFiltrados.forEach((r) => {
      const comuna = r.comuna || r.region || "Sin comuna";
      map[comuna] = (map[comuna] || 0) + 1;
    });

    return Object.entries(map)
      .map(([comuna, total]) => ({ comuna, total }))
      .sort((a, b) => b.total - a.total);
  }, [riesgosFiltrados]);

  const riesgosPorEmpresa = useMemo(() => {
    const map: Record<string, number> = {};
    riesgosFiltrados.forEach((riesgo) => {
      const empresa =
        (riesgo.usuario_email && empresaPorEmail[riesgo.usuario_email]) ||
        "Sin empresa";
      map[empresa] = (map[empresa] || 0) + 1;
    });

    return Object.entries(map)
      .map(([empresa, total]) => ({ empresa, total }))
      .sort((a, b) => b.total - a.total);
  }, [empresaPorEmail, riesgosFiltrados]);

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
        <section className="page-section">
          <h2 className="page-title">Dashboard</h2>

          <div className="card toolbar-card">
            <div className="toolbar-grid">
              <select
                className="auth-input"
                value={periodoFiltro}
                onChange={(e) => setPeriodoFiltro(e.target.value)}
              >
                <option value="todos">Todo el período</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="mes_actual">Mes actual</option>
              </select>
            </div>
          </div>

          <div className="stats-grid">
            <div
              className="card metric-card"
              style={{ borderLeft: `6px solid ${COLORS.primary}` }}
            >
              <h4>Total de riesgos</h4>
              <p style={{ fontSize: 36, margin: 0, fontWeight: 700 }}>
                {totalRiesgos}
              </p>
              <small style={{ color: "#6b7280" }}>Registros totales</small>
            </div>

            <div
              className="card metric-card"
              style={{ borderLeft: `6px solid ${COLORS.sos}` }}
            >
              <h4>Total SOS</h4>
              <p style={{ fontSize: 36, margin: 0, fontWeight: 700 }}>
                {totalSos}
              </p>
              <small style={{ color: "#6b7280" }}>
                {sosPendientes} pendientes · {sosAtendidos} atendidos
              </small>
            </div>

            {riesgosPorTipo[0] && (
              <div
                className="card metric-card"
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

            {sosPorMotivo[0] && (
              <div
                className="card metric-card"
                style={{ borderLeft: `6px solid ${COLORS.danger}` }}
              >
                <h4>Motivo SOS principal</h4>
                <p style={{ fontSize: 20, margin: "8px 0", fontWeight: 600 }}>
                  {sosPorMotivo[0].motivo}
                </p>
                <small style={{ color: "#6b7280" }}>
                  {sosPorMotivo[0].total} alertas
                </small>
              </div>
            )}

            <div
              className="card metric-card"
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

            <div
              className="card metric-card"
              style={{ borderLeft: `6px solid ${COLORS.sos}` }}
            >
              <h4>Estado de SOS</h4>
              <p style={{ margin: "8px 0 0", fontWeight: 600 }}>
                Pendientes: {sosPendientes} · Revisados: {sosRevisados}
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
                      totalSos === 0
                        ? "0%"
                        : `${Math.round((sosAtendidos / totalSos) * 100)}%`,
                    height: "100%",
                    background: COLORS.sos,
                  }}
                />
              </div>
              <small style={{ color: "#6b7280" }}>
                {totalSos === 0
                  ? "Sin alertas"
                  : `${Math.round((sosAtendidos / totalSos) * 100)}% atendidos`}
              </small>
            </div>
          </div>

          <div className="chart-grid">
            <div className="card chart-card">
              <h4>Riesgos por tipo</h4>
              {riesgosPorTipo.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box chart-box-tall">
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
                      <Bar dataKey="total" fill={COLORS.primary} radius={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h4>SOS por motivo</h4>
              {sosPorMotivo.length === 0 ? (
                <p>No hay alertas SOS</p>
              ) : (
                <div className="chart-box chart-box-tall">
                  <ResponsiveContainer>
                    <BarChart data={sosPorMotivo}>
                      <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="motivo" stroke={COLORS.text} />
                      <YAxis stroke={COLORS.text} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 10,
                          color: "#e5e7eb",
                        }}
                      />
                      <Bar dataKey="total" fill={COLORS.sos} radius={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h4>Riesgos por comuna</h4>
              {riesgosPorComuna.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box">
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

            <div className="card chart-card">
              <h4>Riesgos por empresa</h4>
              {riesgosPorEmpresa.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box">
                  <ResponsiveContainer>
                    <BarChart data={riesgosPorEmpresa}>
                      <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="empresa" stroke={COLORS.text} />
                      <YAxis stroke={COLORS.text} />
                      <Tooltip
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 10,
                          color: "#e5e7eb",
                        }}
                      />
                      <Bar dataKey="total" fill={COLORS.success} radius={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h4>Evolución mensual de registros</h4>
              {riesgosPorMes.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box">
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
          </div>

          <div className="card report-card">
            <h4>Reporte mensual (PDF)</h4>
            <div className="report-actions">
              <input
                type="month"
                value={mesReporte}
                onChange={(e) => setMesReporte(e.target.value)}
                className="auth-input"
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
        </section>
      </main>
    </div>
  );
}
