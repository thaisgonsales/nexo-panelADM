import { useEffect, useState } from "react";
import { getVisibleCompany, isSuperAdmin, type User } from "../utils/access";

type Page = "dashboard" | "riesgos" | "usuarios" | "sos" | "empresas";

type Props = {
  currentPage: Page;
  user: User;
  selectedCompany: string;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
};

export default function Navbar({
  currentPage,
  user,
  selectedCompany,
  onNavigate,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleCompany = getVisibleCompany(user, selectedCompany);
  const superAdmin = isSuperAdmin(user);
  const scopeLabel = visibleCompany
    ? `Panel ${visibleCompany}`
    : superAdmin
      ? "Vista global"
      : "Sin empresa";

  useEffect(() => {
    setMenuOpen(false);
  }, [currentPage]);

  function handleNavigate(page: Page) {
    onNavigate(page);
    setMenuOpen(false);
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="navbar-brand"
          onClick={() => handleNavigate("dashboard")}
          aria-label="Ir a Resumen Operativo"
        >
          <img className="navbar-logo" src="/favicon.png" alt="" />
          <span className="navbar-brand-copy">
            <span className="navbar-title">Nexo App</span>
            <span className="navbar-subtitle">Panel de gestión operativa</span>
          </span>
        </button>

        <button
          type="button"
          className="navbar-toggle"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰
        </button>

        <nav className={`navbar-menu ${menuOpen ? "open" : ""}`}>
          <button
            className={
              currentPage === "dashboard" ? "navbar-link active" : "navbar-link"
            }
            onClick={() => handleNavigate("dashboard")}
          >
            Resumen Operativo
          </button>

          <button
            className={
              currentPage === "riesgos" ? "navbar-link active" : "navbar-link"
            }
            onClick={() => handleNavigate("riesgos")}
          >
            Riesgos
          </button>

          <button
            className={currentPage === "sos" ? "navbar-link active" : "navbar-link"}
            onClick={() => handleNavigate("sos")}
          >
            SOS
          </button>

          {superAdmin && (
            <button
              className={
                currentPage === "empresas" ? "navbar-link active" : "navbar-link"
              }
              onClick={() => handleNavigate("empresas")}
            >
              Empresas
            </button>
          )}

          <button
            className={
              currentPage === "usuarios" ? "navbar-link active" : "navbar-link"
            }
            onClick={() => handleNavigate("usuarios")}
          >
            Usuarios
          </button>
        </nav>
      </div>

      <div className="navbar-right">
        <span className="navbar-scope">{scopeLabel}</span>
        <button className="navbar-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
