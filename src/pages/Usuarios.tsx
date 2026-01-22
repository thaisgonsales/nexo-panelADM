import { useEffect, useState } from "react";
import {
  listarUsuarios,
  crearUsuario,
  resetearPassword,
  eliminarUsuario,
} from "../services/api";
import { useToast } from "../context/ToastContext";

type Props = {
  token: string;
};

type Usuario = {
  id: string;
  email: string;
  rol: string;
  created_at: string;
};

export default function Usuarios({ token }: Props) {
  const { showToast } = useToast();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // crear usuario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"admin" | "user">("user");

  // reset contraseña
  const [usuarioReset, setUsuarioReset] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function cargarUsuarios() {
    const data = await listarUsuarios(token);
    setUsuarios(data);
  }

  async function handleCrearUsuario() {
    if (
      //!nombre
      !email ||
      !password
    ) {
      showToast("Nombre, correo y contraseña son obligatorios", "error");
      return;
    }

    try {
      await crearUsuario(token, email, password, rol);

      showToast("Usuario creado correctamente", "success");

      // limpiar formulario
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("user");

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

            {/* <input
              placeholder="Nombre del funcionario"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="auth-input"
            /> */}

            <input
              placeholder="Correo electrónico"
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
              value={rol}
              onChange={(e) => setRol(e.target.value as "admin" | "user")}
              className="auth-input"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
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
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Fecha creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    {/*
        <td>{u.nombre}</td>
        TODO: Mostrar nombre del funcionario cuando exista en el backend
      */}
                    <td>{u.email}</td>
                    <td>{u.rol}</td>
                    <td>{new Date(u.created_at).toLocaleString("es-CL")}</td>
                    <td>
                      <div className="table-actions">
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
              <button onClick={() => setUsuarioReset(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleResetPassword}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
