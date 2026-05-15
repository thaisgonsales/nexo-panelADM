export type User = {
  id?: string;
  email?: string;
  rol?: string;
  nombre?: string;
  empresa?: string;
  region?: string;
};

function normalizeCompany(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

export function isSuperAdmin(user?: User | null) {
  if (!user) return false;
  const rol = user.rol?.trim().toLowerCase();
  return rol === "superadmin" || (rol === "admin" && !normalizeCompany(user.empresa));
}

export function canAccessPanel(user?: User | null) {
  if (!user) return false;
  const rol = user.rol?.trim().toLowerCase();
  return isSuperAdmin(user) || rol === "admin";
}

export function hasCompanyScope(user?: User | null) {
  return !!user && !!user.empresa && !isSuperAdmin(user);
}

export function getVisibleCompany(user?: User | null, selectedCompany?: string | null) {
  if (!user) return "";
  if (isSuperAdmin(user)) return selectedCompany?.trim() || "";
  return user.empresa?.trim() || "";
}

export function filterUsersByCompany<T extends { empresa?: string | null }>(
  items: T[],
  user?: User | null,
  selectedCompany?: string | null,
) {
  const companyScope = getVisibleCompany(user, selectedCompany);

  if (!user || !companyScope) {
    return items;
  }

  const company = normalizeCompany(companyScope);
  return items.filter((item) => normalizeCompany(item.empresa) === company);
}

export function filterItemsByCompany<
  T extends { empresa?: string | null; usuario_email?: string | null },
>(
  items: T[],
  user?: User | null,
  companyByEmail: Record<string, string | undefined> = {},
  selectedCompany?: string | null,
) {
  const companyScope = getVisibleCompany(user, selectedCompany);

  if (!user || !companyScope) {
    return items;
  }

  const company = normalizeCompany(companyScope);

  return items.filter((item) => {
    const externalCompany = normalizeCompany(item.empresa) ||
      normalizeCompany(companyByEmail[item.usuario_email || ""]);
    return externalCompany === company;
  });
}
