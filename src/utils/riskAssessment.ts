export const RISK_ZONE_RADIUS_METERS = 50;

export type RiskLevel = "Tolerable" | "Moderado" | "Importante" | "Intolerable";

export type RiskLike = {
  id: string;
  tipo: string;
  latitude: number;
  longitude: number;
  estado?: string;
};

export type RiskAssessment = {
  nearbyCount: number;
  vep: 2 | 4 | 8 | 16;
  level: RiskLevel;
  accentClass: string;
  shortLabel: string;
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(
  a: Pick<RiskLike, "latitude" | "longitude">,
  b: Pick<RiskLike, "latitude" | "longitude">,
) {
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function isComparableRisk(base: RiskLike, candidate: RiskLike) {
  if (candidate.estado === "resuelto") return false;
  return candidate.tipo === base.tipo;
}

export function assessRisk(risk: RiskLike, allRisks: RiskLike[]): RiskAssessment {
  const nearbyCount = allRisks.filter((candidate) => {
    if (!isComparableRisk(risk, candidate)) return false;

    const distance = distanceInMeters(risk, candidate);
    return distance <= RISK_ZONE_RADIUS_METERS;
  }).length;

  if (nearbyCount >= 16) {
    return {
      nearbyCount,
      vep: 16,
      level: "Intolerable",
      accentClass: "critical",
      shortLabel: "Escalar de inmediato",
    };
  }

  if (nearbyCount >= 8) {
    return {
      nearbyCount,
      vep: 8,
      level: "Importante",
      accentClass: "important",
      shortLabel: "Requiere control reforzado",
    };
  }

  if (nearbyCount >= 4) {
    return {
      nearbyCount,
      vep: 4,
      level: "Moderado",
      accentClass: "moderate",
      shortLabel: "Preparar medidas preventivas",
    };
  }

  return {
    nearbyCount,
    vep: 2,
    level: "Tolerable",
    accentClass: "tolerable",
    shortLabel: "Atencion preventiva",
  };
}
