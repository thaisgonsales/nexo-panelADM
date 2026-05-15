import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Riesgos from "./pages/Riesgos";
import Usuarios from "./pages/Usuarios";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Sos from "./pages/Sos";
import Empresas from "./pages/Empresas";
import { isSuperAdmin, type User } from "./utils/access";

type Page = "dashboard" | "riesgos" | "usuarios" | "sos" | "empresas";

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState<Page>("dashboard");
  const [selectedCompany, setSelectedCompany] = useState<string>(() => {
    return localStorage.getItem("selectedCompany") || "";
  });

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedCompany");
    setToken(null);
    setUser(null);
    setSelectedCompany("");
  }

  function handleLogin(tokenValue: string, userValue: User) {
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
    const loginCompany = isSuperAdmin(userValue) ? "" : userValue.empresa || "";
    setSelectedCompany(loginCompany);
    if (loginCompany) {
      localStorage.setItem("selectedCompany", loginCompany);
    } else {
      localStorage.removeItem("selectedCompany");
    }
    setPage("dashboard");
  }

  function handleSelectCompany(company: string) {
    if (!user) return;

    const nextCompany = isSuperAdmin(user) ? company : user.empresa || "";
    setSelectedCompany(nextCompany);
    if (nextCompany) {
      localStorage.setItem("selectedCompany", nextCompany);
    } else {
      localStorage.removeItem("selectedCompany");
    }
    setPage("dashboard");
  }

  useEffect(() => {
    if (user && !isSuperAdmin(user) && page === "empresas") {
      setPage("dashboard");
    }
  }, [page, user]);

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Navbar
        currentPage={page}
        user={user}
        selectedCompany={selectedCompany}
        onNavigate={setPage}
        onLogout={handleLogout}
      />

      {page === "dashboard" && (
        <Dashboard token={token} user={user} selectedCompany={selectedCompany} />
      )}
      {page === "riesgos" && (
        <Riesgos token={token} user={user} selectedCompany={selectedCompany} />
      )}
      {page === "sos" && <Sos token={token} user={user} selectedCompany={selectedCompany} />}
      {page === "usuarios" && (
        <Usuarios token={token} user={user} selectedCompany={selectedCompany} />
      )}
      {page === "empresas" && (
        <Empresas
          user={user}
          selectedCompany={selectedCompany}
          onSelectCompany={handleSelectCompany}
        />
      )}
    </>
  );
}
