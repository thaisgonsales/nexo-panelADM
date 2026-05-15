import { useEffect, useState } from "react";
import {
  listarUsuarios,
  crearUsuario,
  resetearPassword,
  eliminarUsuario,
  setUsuarioActivo,
  editarUsuario,
} from "../services/api";
import { useToast } from "../context/ToastContext";
import type { User } from "../utils/access";
import { filterUsersByCompany, isSuperAdmin } from "../utils/access";

type Props = {
  token: string;
  user: User;
  selectedCompany?: string;
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

export default function Usuarios({ token, user, selectedCompany = "" }: Props) {
  const { showToast } = useToast();

  const superAdmin = isSuperAdmin(user);
  const isCompanyAdmin = user.rol?.trim().toLowerCase() === "admin" && !!user.empresa;
  const canEditUsers = superAdmin || isCompanyAdmin;
  const empresaRestringida = superAdmin ? selectedCompany : user.empresa || "";
  const canCreateUsers = canEditUsers && (superAdmin || !!empresaRestringida);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"admin" | "user">("user");
  const [empresa, setEmpresa] = useState<string>(empresaRestringida);
  const [region, setRegion] = useState("");
  const [active, setActive] = useState(true);
  const [usuarioReset, setUsuarioReset] = useState<Usuario | null>(null);
  const [usuarioEdit, setUsuarioEdit] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editRut, setEditRut] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRol, setEditRol] = useState<"admin" | "user">("user");
  const [editEmpresa, setEditEmpresa] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [newPassword, setNewPassword] = useState("");

  async function cargarUsuarios() {
    const data = await listarUsuarios(token);
    setUsuarios(filterUsersByCompany(data, user, selectedCompany));
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
    if (!canCreateUsers) return;

    if (!nombre || !rut || !email || !password || !region || (!empresa && !empresaRestringida)) {
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
        rol: superAdmin ? rol : "user",
        empresa: superAdmin ? empresa : empresaRestringida,
        region,
        active,
      });

      showToast("Usuario creado correctamente", "success");
      setNombre("");
      setRut("");
      setEmail("");
      setPassword("");
      setRol("user");
      setEmpresa(empresaRestringida);
      setRegion("");
      setActive(true);

      await cargarUsuarios();
    } catch {
      showToast("No se pudo crear el usuario (¿ya existe?)", "error");
    }
  }

  async function handleResetPassword() {
    if (!canEditUsers) return;
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

  function abrirEdicion(usuario: Usuario) {
    if (!canEditUsers) return;

    setUsuarioEdit(usuario);
    setEditNombre(usuario.nombre || "");
    setEditRut(usuario.rut ? formatearRut(usuario.rut) : "");
    setEditEmail(usuario.email || "");
    setEditRol(usuario.rol === "admin" ? "admin" : "user");
    setEditEmpresa(usuario.empresa || "");
    setEditRegion(usuario.region || "");
    setEditActive(typeof usuario.active === "number" ? usuario.active === 1 : !!usuario.active);
  }

  async function handleEditarUsuario() {
    if (!canEditUsers || !usuarioEdit) return;

    if (!editNombre || !editRut || !editEmail || !editRegion || (superAdmin && !editEmpresa)) {
      showToast("Nombre, RUT, correo, empresa y región son obligatorios", "error");
      return;
    }

    if (!validarRut(editRut)) {
      showToast("RUT inválido", "error");
      return;
    }

    try {
      await editarUsuario(token, usuarioEdit.id, {
        nombre: editNombre,
        rut: editRut,
        email: editEmail,
        rol: editRol,
        empresa: editEmpresa,
        region: editRegion,
        active: editActive,
      });

      showToast("Usuario actualizado correctamente", "success");
      setUsuarioEdit(null);
      await cargarUsuarios();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "No se pudo editar el usuario",
        "error",
      );
    }
  }

  async function handleEliminarUsuario(user: Usuario) {
    if (!canEditUsers) return;

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
    if (!canEditUsers) return;

    const isActive = typeof user.active === "number" ? user.active === 1 : !!user.active;
    const nextActive = !isActive;

    try {
      await setUsuarioActivo(token, user.id, nextActive);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: nextActive ? 1 : 0 } : u)),
      );
      showToast(nextActive ? "Usuario activado" : "Usuario desactivado", "success");
    } catch {
      showToast("No se pudo actualizar el estado", "error");
    }
  }

  useEffect(() => {
    cargarUsuarios().finally(() => setLoading(false));
  }, [token, selectedCompany]);

  useEffect(() => {
    setEmpresa(empresaRestringida);
  }, [empresaRestringida]);

  return (
    <div className="page">
      <main className="main">
        <section className="page-section">
          <div className="card">
            <h2 className="page-title">Usuarios</h2>

            {canCreateUsers && (
              <div className="form-section">
                <h3>Crear usuario</h3>

                <div className="form-grid">
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

                  <input
                    placeholder="Empresa"
                    value={superAdmin ? empresa : empresaRestringida}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="auth-input"
                    disabled={!superAdmin || !!selectedCompany}
                  />

                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="auth-input"
                  >
                    <option value="">Seleccione región / zona</option>
                    <option value="Chiloé">Chiloé</option>
                    <option value="Valdivia">Valdivia</option>
                  </select>

                  {superAdmin && (
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value as "admin" | "user")}
                      className="auth-input"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  )}

                  <select
                    value={active ? "1" : "0"}
                    onChange={(e) => setActive(e.target.value === "1")}
                    className="auth-input"
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>

                <button className="auth-button form-submit" onClick={handleCrearUsuario}>
                  Crear usuario
                </button>
              </div>
            )}

            {loading && <p>Cargando usuarios…</p>}

            {!loading && usuarios.length === 0 && <p>No hay usuarios registrados</p>}

            {!loading && usuarios.length > 0 && (
              <div className="table-wrap">
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
                      {canEditUsers && <th>Acciones</th>}
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
                        {canEditUsers && (
                          <td>
                            <div className="table-actions table-actions-wrap">
                            <button
                              className="btn-icon btn-edit"
                              title="Editar usuario"
                              onClick={() => abrirEdicion(u)}
                            >
                              ✏️
                            </button>

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
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {canEditUsers && usuarioReset && (
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

              <button type="button" className="btn-primary" onClick={handleResetPassword}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {canEditUsers && usuarioEdit && (
        <div className="modal-backdrop">
          <div className="modal modal-wide">
            <h3>Editar usuario</h3>

            <div className="form-grid">
              <input
                placeholder="Nombre completo"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="auth-input"
              />

              <input
                placeholder="RUT"
                value={editRut}
                onChange={(e) => setEditRut(e.target.value)}
                onBlur={() => setEditRut(formatearRut(editRut))}
                className="auth-input"
              />

              <input
                placeholder="Correo electrónico o usuario"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="auth-input"
              />

              <input
                placeholder="Empresa"
                value={editEmpresa}
                onChange={(e) => setEditEmpresa(e.target.value)}
                className="auth-input"
                disabled={!superAdmin}
              />

              <select
                value={editRegion}
                onChange={(e) => setEditRegion(e.target.value)}
                className="auth-input"
              >
                <option value="">Seleccione región / zona</option>
                <option value="Chiloé">Chiloé</option>
                <option value="Valdivia">Valdivia</option>
              </select>

              {superAdmin && (
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as "admin" | "user")}
                  className="auth-input"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              )}

              <select
                value={editActive ? "1" : "0"}
                onChange={(e) => setEditActive(e.target.value === "1")}
                className="auth-input"
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUsuarioEdit(null)}
              >
                Cancelar
              </button>

              <button type="button" className="btn-primary" onClick={handleEditarUsuario}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
