import { useState } from "react";
import Login from "./pages/Login";
import Riesgos from "./pages/Riesgos";
import Usuarios from "./pages/Usuarios";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Sos from "./pages/Sos";

type Page = "dashboard" | "riesgos" | "usuarios" | "sos";

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  const [page, setPage] = useState<Page>("dashboard");

  function handleLogout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  return (
    <>
      <Navbar currentPage={page} onNavigate={setPage} onLogout={handleLogout} />

      {page === "dashboard" && <Dashboard token={token} />}
      {page === "riesgos" && <Riesgos token={token} />}
      {page === "sos" && <Sos token={token} />}
      {page === "usuarios" && <Usuarios token={token} />}
    </>
  );
}
