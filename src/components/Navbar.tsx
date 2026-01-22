type Page = "dashboard" | "riesgos" | "usuarios";

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
};

export default function Navbar({ currentPage, onNavigate, onLogout }: Props) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        {/* MARCA */}
        <div className="navbar-brand">
          <div className="navbar-title">NEXO · Admin Panel</div>
          <div className="navbar-subtitle">Community Watch & Map</div>
        </div>

        {/* MENU */}
        <nav className="navbar-menu">
          <button
            className={
              currentPage === "dashboard" ? "navbar-link active" : "navbar-link"
            }
            onClick={() => onNavigate("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={
              currentPage === "riesgos" ? "navbar-link active" : "navbar-link"
            }
            onClick={() => onNavigate("riesgos")}
          >
            Riesgos
          </button>

          <button
            className={
              currentPage === "usuarios" ? "navbar-link active" : "navbar-link"
            }
            onClick={() => onNavigate("usuarios")}
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
