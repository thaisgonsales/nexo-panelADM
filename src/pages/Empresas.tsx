import { isSuperAdmin } from "../utils/access";
import type { User } from "../utils/access";

type Props = {
  user: User;
  selectedCompany: string;
  onSelectCompany: (company: string) => void;
};

const COMPANIES = ["Orsocom", "Inproel", "Empresa 3", "Empresa 4", "Empresa 5", "Empresa 6"];
const MODULES = ["Resumen Operativo", "Riesgos", "SOS", "Usuarios"];

export default function Empresas({ user, selectedCompany, onSelectCompany }: Props) {
  const superAdmin = isSuperAdmin(user);
  const companyName = user.empresa?.trim() || "Sin empresa definida";
  const activeCompany = superAdmin ? selectedCompany : user.empresa || "";

  return (
    <div className="page">
      <main className="main">
        <section className="page-section">
          <div className="card">
            <h2 className="page-title">Empresas</h2>
            <p className="page-copy">
              {superAdmin
                ? activeCompany
                  ? `Estás viendo el panel de ${activeCompany}. Puedes cambiar de empresa desde esta lista.`
                  : "Selecciona una empresa para abrir su panel con Resumen Operativo, Riesgos, SOS y Usuarios."
                : `Tu acceso está limitado a la empresa ${companyName}. Verás solo los datos registrados por tu empresa en todo el panel.`}
            </p>

            <div className="form-section">
              <h3>Empresas registradas</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Panel admin</th>
                      <th>Acceso</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPANIES.map((empresa) => (
                      <tr key={empresa}>
                        <td>{empresa}</td>
                        <td>{MODULES.join(" · ")}</td>
                        <td>
                          {superAdmin || empresa.toLowerCase() === companyName.toLowerCase()
                            ? "Visible"
                            : "Restringido"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={!superAdmin && empresa.toLowerCase() !== companyName.toLowerCase()}
                            onClick={() => onSelectCompany(empresa)}
                          >
                            {activeCompany.toLowerCase() === empresa.toLowerCase()
                              ? "Abrir panel"
                              : "Ver panel"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!superAdmin && (
              <div className="form-section">
                <p>
                  Si necesitas acceso a otra empresa, contacta al admin global para que te lo autorice.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
