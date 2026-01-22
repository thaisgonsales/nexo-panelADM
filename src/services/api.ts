const API_URL = "https://app-riscos-backend-production.up.railway.app";
// const API_URL = "http://192.168.1.29:3000";

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Login inválido");
  return res.json();
}

type RiesgosFiltros = {
  userId?: string;
  from?: string;
  to?: string;
};

export async function listarRiesgos(token: string, filtros?: RiesgosFiltros) {
  const params = new URLSearchParams();

  if (filtros?.userId) params.append("user_id", filtros.userId);
  if (filtros?.from) params.append("from", filtros.from);
  if (filtros?.to) params.append("to", filtros.to);

  const query = params.toString();
  const url = query ? `${API_URL}/riesgos?${query}` : `${API_URL}/riesgos`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("No autorizado");
  return res.json();
}

export async function listarUsuarios(token: string) {
  const res = await fetch(`${API_URL}/usuarios`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("No autorizado");
  }

  return res.json();
}

export async function crearUsuario(
  token: string,
  email: string,
  password: string,
  rol: "admin" | "user",
) {
  const res = await fetch(`${API_URL}/usuarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      password,
      rol,
    }),
  });

  if (!res.ok) {
    throw new Error("Error al crear usuario");
  }

  return res.json();
}

export async function eliminarRiesgo(token: string, id: string) {
  const res = await fetch(`${API_URL}/riesgos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error al eliminar riesgo");
  }

  return res.json();
}

export async function editarRiesgo(
  token: string,
  id: string,
  data: { tipo: string; descripcion: string },
) {
  const res = await fetch(`${API_URL}/riesgos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Error al editar riesgo");
  }

  return res.json();
}

export async function resetearPassword(
  token: string,
  userId: string,
  newPassword: string,
) {
  const res = await fetch(`${API_URL}/usuarios/${userId}/reset-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  if (!res.ok) {
    throw new Error("Error al resetear contraseña");
  }

  return res.json();
}

export async function eliminarUsuario(token: string, userId: string) {
  const res = await fetch(`${API_URL}/usuarios/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error al eliminar usuario");
  }

  return res.json();
}

export async function listarReportesPorRiesgo(token: string, riesgoId: string) {
  const res = await fetch(
    `${API_URL}/admin/riesgos/${riesgoId}/reportes`, // ✅ rota correta
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Error al obtener reportes");
  }

  return res.json();
}

export async function resolverRiesgo(token: string, riesgoId: string) {
  const res = await fetch(`${API_URL}/admin/riesgos/${riesgoId}/resolver`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error al resolver riesgo");
  }

  return res.json();
}

export async function listarReportes(token: string, riesgoId: string) {
  const res = await fetch(`${API_URL}/admin/riesgos/${riesgoId}/reportes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error al obtener reportes");
  }

  return res.json();
}

// 👇 COMENTÁRIOS NORMAIS DO RIESGO (PANEL ADMIN)
export async function listarComentariosPorRiesgo(
  token: string,
  riesgoId: string,
) {
  const res = await fetch(`${API_URL}/admin/riesgos/${riesgoId}/comentarios`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error al obtener comentarios");
  }

  return res.json();
}

export async function eliminarReporte(token: string, reporteId: number) {
  const res = await fetch(`${API_URL}/admin/reportes/${reporteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error al eliminar reporte");
  }

  return res.json();
}
