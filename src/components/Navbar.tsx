import { useEffect, useState } from "react";

type Page = "dashboard" | "riesgos" | "usuarios" | "sos";

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
};

export default function Navbar({ currentPage, onNavigate, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <div className="navbar-brand">
          <div className="navbar-title">NEXO · Admin Panel</div>
          <div className="navbar-subtitle">Community Watch & Map</div>
        </div>

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
            Dashboard
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
        <button className="navbar-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
