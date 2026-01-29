import { useEffect, useState } from "react";
import {
  listarUsuarios,
  crearUsuario,
  resetearPassword,
  eliminarUsuario,
  setUsuarioActivo,
} from "../services/api";
import { useToast } from "../context/ToastContext";

type Props = {
  token: string;
};

type Usuario = {
  id: string;
  email: string;
  rol: string;
  nombre?: string;
  rut?: string;
  empresa?: string;
  region?: string;
  active?: number | boolean;
  created_at: string;
};

export default function Usuarios({ token }: Props) {
  const { showToast } = useToast();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // crear usuario
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"admin" | "user">("user");
  const [empresa, setEmpresa] = useState("Inproel");
  const [region, setRegion] = useState("");
  const [active, setActive] = useState(true);

  // reset contraseña
  const [usuarioReset, setUsuarioReset] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function cargarUsuarios() {
    const data = await listarUsuarios(token);
    setUsuarios(data);
  }

  function validarRut(rutValue: string) {
    const clean = rutValue.replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length < 2) return false;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    if (!/^\d+$/.test(body)) return false;

    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const mod = 11 - (sum % 11);
    const dvCalc = mod === 11 ? "0" : mod === 10 ? "K" : String(mod);
    return dv === dvCalc;
  }

  function normalizarRut(rutValue: string) {
    return rutValue.replace(/[^0-9kK]/g, "").toUpperCase();
  }

  function formatearRut(rutValue: string) {
    const clean = normalizarRut(rutValue);
    if (clean.length < 2) return rutValue;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${withDots}-${dv}`;
  }

  async function handleCrearUsuario() {
    if (
      !nombre ||
      !rut ||
      !email ||
      !password ||
      !empresa ||
      !region
    ) {
      showToast(
        "Nombre, RUT, correo, contraseña, empresa y región son obligatorios",
        "error",
      );
      return;
    }

    if (!validarRut(rut)) {
      showToast("RUT inválido", "error");
      return;
    }

    try {
      await crearUsuario(token, {
        nombre,
        rut,
        email,
        password,
        rol,
        empresa,
        region,
        active,
      });

      showToast("Usuario creado correctamente", "success");

      // limpiar formulario
      setNombre("");
      setRut("");
      setEmail("");
      setPassword("");
      setRol("user");
      setEmpresa("Inproel");
      setRegion("");
      setActive(true);

      await cargarUsuarios();
    } catch {
      showToast("No se pudo crear el usuario (¿ya existe?)", "error");
    }
  }

  async function handleResetPassword() {
    if (!usuarioReset) return;

    if (!newPassword || newPassword.length < 4) {
      showToast("La contraseña debe tener al menos 4 caracteres", "error");
      return;
    }

    try {
      await resetearPassword(token, usuarioReset.id, newPassword);

      showToast("Contraseña actualizada correctamente", "success");

      setUsuarioReset(null);
      setNewPassword("");
    } catch {
      showToast("No se pudo resetear la contraseña", "error");
    }
  }

  async function handleEliminarUsuario(user: Usuario) {
    const confirmar = confirm(
      `¿Eliminar definitivamente el usuario ${user.email}?\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmar) return;

    try {
      await eliminarUsuario(token, user.id);

      setUsuarios((prev) => prev.filter((u) => u.id !== user.id));
      showToast("Usuario eliminado", "success");
    } catch {
      showToast("No se pudo eliminar el usuario", "error");
    }
  }

  async function handleToggleActivo(user: Usuario) {
    const isActive =
      typeof user.active === "number" ? user.active === 1 : !!user.active;
    const nextActive = !isActive;

    try {
      await setUsuarioActivo(token, user.id, nextActive);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, active: nextActive ? 1 : 0 } : u,
        ),
      );
      showToast(
        nextActive ? "Usuario activado" : "Usuario desactivado",
        "success",
      );
    } catch {
      showToast("No se pudo actualizar el estado", "error");
    }
  }

  useEffect(() => {
    listarUsuarios(token)
      .then(setUsuarios)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="page">
      <main className="main">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Usuarios</h2>

          {/* CREAR USUARIO */}
          <div style={{ marginBottom: 24 }}>
            <h3>Crear usuario</h3>

            <input
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="auth-input"
            />

            <input
              placeholder="RUT"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              onBlur={() => setRut(formatearRut(rut))}
              className="auth-input"
            />

            <input
              placeholder="Correo electrónico o usuario"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
            />

            <select
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="auth-input"
            >
              <option value="Inproel">Inproel</option>
            </select>

            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="auth-input"
            >
              <option value="">Seleccione región / zona</option>
              <option value="Chiloé">Chiloé</option>
              <option value="Valdivia">Valdivia</option>
            </select>

            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as "admin" | "user")}
              className="auth-input"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>

            <select
              value={active ? "1" : "0"}
              onChange={(e) => setActive(e.target.value === "1")}
              className="auth-input"
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>

            <button className="auth-button" onClick={handleCrearUsuario}>
              Crear usuario
            </button>
          </div>

          {/* LISTA */}
          {loading && <p>Cargando usuarios…</p>}

          {!loading && usuarios.length === 0 && (
            <p>No hay usuarios registrados</p>
          )}

          {!loading && usuarios.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Usuario</th>
                  <th>Empresa</th>
                  <th>Región</th>
                  <th>Estado</th>
                  <th>Rol</th>
                  <th>Fecha creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre || "-"}</td>
                    <td>{u.rut ? formatearRut(u.rut) : "-"}</td>
                    <td>{u.email}</td>
                    <td>{u.empresa || "-"}</td>
                    <td>{u.region || "-"}</td>
                    <td>
                      {typeof u.active === "number"
                        ? u.active === 1
                          ? "Activo"
                          : "Inactivo"
                        : u.active
                          ? "Activo"
                          : "Inactivo"}
                    </td>
                    <td>{u.rol}</td>
                    <td>{new Date(u.created_at).toLocaleString("es-CL")}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-icon btn-edit"
                          title={
                            typeof u.active === "number"
                              ? u.active === 1
                                ? "Desactivar"
                                : "Activar"
                              : u.active
                                ? "Desactivar"
                                : "Activar"
                          }
                          onClick={() => handleToggleActivo(u)}
                        >
                          {typeof u.active === "number"
                            ? u.active === 1
                              ? "⏸️"
                              : "▶️"
                            : u.active
                              ? "⏸️"
                              : "▶️"}
                        </button>

                        <button
                          className="btn-icon btn-edit"
                          title="Resetear contraseña"
                          onClick={() => setUsuarioReset(u)}
                        >
                          🔑
                        </button>

                        <button
                          className="btn-icon btn-delete"
                          title="Eliminar usuario"
                          onClick={() => handleEliminarUsuario(u)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* MODAL RESET */}
      {usuarioReset && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Resetear contraseña</h3>

            <p>
              Usuario: <strong>{usuarioReset.email}</strong>
            </p>

            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="auth-input"
            />

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUsuarioReset(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleResetPassword}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
