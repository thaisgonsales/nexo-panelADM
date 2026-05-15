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
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

const COLORS = {
  primary: "#2dd4bf",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#f97316",
  grid: "rgba(255,255,255,0.15)",
  text: "#e5e7eb",
  sos: "#e11d48",
  active: "#f59e0b",
  review: "#3b82f6",
  muted: "#94a3b8",
};

const tooltipStyle = {
  background: "#020617",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10,
  color: "#e5e7eb",
};

function toPercent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

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
    month: "short",
  });
}

function formatMonthLongCL(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
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
  const riesgosEnRevision = riesgosFiltrados.filter(
    (r) => r.estado === "en_revision",
  ).length;
  const riesgosResueltos = riesgosFiltrados.filter(
    (r) => r.estado === "resuelto",
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

  const riesgosPorTipoTop = useMemo(
    () =>
      riesgosPorTipo.slice(0, 8).map((item) => ({
        ...item,
        porcentaje: toPercent(item.total, totalRiesgos),
        etiqueta: `${item.total} (${toPercent(item.total, totalRiesgos)}%)`,
      })),
    [riesgosPorTipo, totalRiesgos],
  );

  const sosPorMotivo = useMemo(() => {
    const map: Record<string, number> = {};
    sosFiltrados.forEach((item) => {
      map[item.motivo] = (map[item.motivo] || 0) + 1;
    });

    return Object.entries(map)
      .map(([motivo, total]) => ({ motivo, total }))
      .sort((a, b) => b.total - a.total);
  }, [sosFiltrados]);

  const sosPorMotivoTop = useMemo(
    () =>
      sosPorMotivo.slice(0, 6).map((item) => ({
        ...item,
        porcentaje: toPercent(item.total, totalSos),
        etiqueta: `${item.total} (${toPercent(item.total, totalSos)}%)`,
      })),
    [sosPorMotivo, totalSos],
  );

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

  const tendenciaMensual = useMemo(() => {
    if (riesgosPorMes.length < 2) {
      return "Aún no hay suficientes meses para comparar tendencia.";
    }

    const ultimo = riesgosPorMes[riesgosPorMes.length - 1];
    const anterior = riesgosPorMes[riesgosPorMes.length - 2];
    const diferencia = ultimo.total - anterior.total;

    if (diferencia === 0) {
      return `Sin variación frente al mes anterior: ${ultimo.total} registros en ${formatMonthLongCL(ultimo.mes)}.`;
    }

    return diferencia > 0
      ? `Aumento de ${diferencia} registro(s) frente al mes anterior: ${ultimo.total} en ${formatMonthLongCL(ultimo.mes)}.`
      : `Disminución de ${Math.abs(diferencia)} registro(s) frente al mes anterior: ${ultimo.total} en ${formatMonthLongCL(ultimo.mes)}.`;
  }, [riesgosPorMes]);

  const riesgosPorComunaTop = useMemo(
    () =>
      riesgosPorComuna.slice(0, 10).map((item) => ({
        ...item,
        porcentaje: toPercent(item.total, totalRiesgos),
        etiqueta: `${item.total} (${toPercent(item.total, totalRiesgos)}%)`,
      })),
    [riesgosPorComuna, totalRiesgos],
  );

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

  const riesgosPorEmpresaTop = useMemo(
    () =>
      riesgosPorEmpresa.slice(0, 8).map((item) => ({
        ...item,
        porcentaje: toPercent(item.total, totalRiesgos),
        etiqueta: `${item.total} (${toPercent(item.total, totalRiesgos)}%)`,
      })),
    [riesgosPorEmpresa, totalRiesgos],
  );

  const estadoRiesgosData = [
    { name: "Activos", value: riesgosActivos, color: COLORS.active },
    { name: "En revisión", value: riesgosEnRevision, color: COLORS.review },
    { name: "Resueltos", value: riesgosResueltos, color: COLORS.success },
  ].filter((item) => item.value > 0);

  const estadoSosData = [
    { name: "Pendientes", value: sosPendientes, color: COLORS.sos },
    { name: "Revisados", value: sosRevisados, color: COLORS.review },
    { name: "Atendidos", value: sosAtendidos, color: COLORS.success },
  ].filter((item) => item.value > 0);

  const lecturaEjecutiva = useMemo(() => {
    const tipoPrincipal = riesgosPorTipo[0]?.tipo || "sin tipo predominante";
    const comunaPrincipal = riesgosPorComuna[0]?.comuna || "sin comuna predominante";
    const motivoSos = sosPorMotivo[0]?.motivo || "sin motivo predominante";

    return [
      `${totalRiesgos} riesgos registrados en el período seleccionado; ${riesgosActivos} activos, ${riesgosEnRevision} en revisión y ${riesgosResueltos} resueltos.`,
      `El riesgo más frecuente es ${tipoPrincipal} y la mayor concentración territorial está en ${comunaPrincipal}.`,
      `${totalSos} alertas SOS registradas; el motivo principal es ${motivoSos}.`,
    ];
  }, [
    riesgosActivos,
    riesgosEnRevision,
    riesgosPorComuna,
    riesgosPorTipo,
    riesgosResueltos,
    sosPorMotivo,
    totalRiesgos,
    totalSos,
  ]);

  async function handleDescargarReporte() {
    try {
      setDownloading(true);
      const { from, to } = getMonthRange(mesReporte);
      const blob = await descargarReporteMensual(token, from, to);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe-operativo-${mesReporte}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo generar el reporte");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <p style={{ padding: 24 }}>Cargando resumen operativo…</p>;
  }

  return (
    <div className="page">
      <main className="main">
        <section className="page-section">
          <h2 className="page-title">Resumen Operativo</h2>

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

          <div className="executive-strip">
            <div className="executive-list">
              {lecturaEjecutiva.map((item) => (
                <div className="executive-item" key={item}>
                  {item}
                </div>
              ))}
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
          </div>

          <div className="chart-grid">
            <div className="card chart-card chart-card-half">
              <h4>Estado operativo de riesgos</h4>
              {estadoRiesgosData.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={estadoRiesgosData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={94}
                        paddingAngle={3}
                      >
                        {estadoRiesgosData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card chart-card-half">
              <h4>Estado de alertas SOS</h4>
              {estadoSosData.length === 0 ? (
                <p>No hay alertas SOS</p>
              ) : (
                <div className="chart-box">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={estadoSosData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={94}
                        paddingAngle={3}
                      >
                        {estadoSosData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h4>Riesgos más frecuentes</h4>
              {riesgosPorTipoTop.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box chart-box-tall">
                  <ResponsiveContainer>
                    <BarChart data={riesgosPorTipoTop} layout="vertical" margin={{ left: 12, right: 44 }}>
                      <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis type="number" stroke={COLORS.text} allowDecimals={false} />
                      <YAxis dataKey="tipo" type="category" stroke={COLORS.text} width={150} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="total" fill={COLORS.primary} radius={8}>
                        <LabelList dataKey="etiqueta" position="right" fill={COLORS.text} fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h4>Concentración territorial</h4>
              {riesgosPorComunaTop.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box chart-box-tall">
                  <ResponsiveContainer>
                    <BarChart data={riesgosPorComunaTop} layout="vertical" margin={{ left: 12, right: 44 }}>
                      <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis type="number" stroke={COLORS.text} allowDecimals={false} />
                      <YAxis dataKey="comuna" type="category" stroke={COLORS.text} width={150} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="total" fill={COLORS.warning} radius={8}>
                        <LabelList dataKey="etiqueta" position="right" fill={COLORS.text} fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h4>Riesgos por empresa</h4>
              {riesgosPorEmpresaTop.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box">
                  <ResponsiveContainer>
                    <BarChart data={riesgosPorEmpresaTop} layout="vertical" margin={{ left: 12, right: 44 }}>
                      <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis type="number" stroke={COLORS.text} allowDecimals={false} />
                      <YAxis dataKey="empresa" type="category" stroke={COLORS.text} width={150} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="total" fill={COLORS.success} radius={8}>
                        <LabelList dataKey="etiqueta" position="right" fill={COLORS.text} fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h4>SOS por motivo</h4>
              {sosPorMotivoTop.length === 0 ? (
                <p>No hay alertas SOS</p>
              ) : (
                <div className="chart-box">
                  <ResponsiveContainer>
                    <BarChart data={sosPorMotivoTop} layout="vertical" margin={{ left: 12, right: 44 }}>
                      <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis type="number" stroke={COLORS.text} allowDecimals={false} />
                      <YAxis dataKey="motivo" type="category" stroke={COLORS.text} width={150} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="total" fill={COLORS.sos} radius={8}>
                        <LabelList dataKey="etiqueta" position="right" fill={COLORS.text} fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card chart-card chart-card-wide">
              <div className="chart-title-row">
                <div>
                  <h4>Tendencia mensual de riesgos</h4>
                  <p>Registros creados por mes en el período seleccionado.</p>
                </div>
                <span className="chart-insight">{tendenciaMensual}</span>
              </div>
              {riesgosPorMes.length === 0 ? (
                <p>No hay datos</p>
              ) : (
                <div className="chart-box">
                  <ResponsiveContainer>
                    <LineChart data={riesgosPorMes} margin={{ top: 22, right: 28, left: 6, bottom: 8 }}>
                      <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="mes" stroke={COLORS.text} tickFormatter={formatMonthCL} />
                      <YAxis stroke={COLORS.text} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(label) => formatMonthLongCL(String(label))}
                      />
                      <Line
                        name="Riesgos registrados"
                        type="monotone"
                        dataKey="total"
                        stroke={COLORS.primary}
                        strokeWidth={3}
                        dot={{ r: 5, strokeWidth: 2, fill: "#020617" }}
                        activeDot={{ r: 7 }}
                      >
                        <LabelList dataKey="total" position="top" fill={COLORS.text} fontSize={12} />
                      </Line>
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
