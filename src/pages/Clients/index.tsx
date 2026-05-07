import { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { ClientMobileService, type ClientMobile, AuthService } from "../../services/api";

export default function ClientsPage() {
  const [data, setData]       = useState<ClientMobile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const isAdmin = AuthService.getUser()?.role === "Admin";

  const load = useCallback(() => {
    setLoading(true);
    ClientMobileService.getAll()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3500);
  };

  const toggleActif = async (client: ClientMobile) => {
    try {
      await ClientMobileService.setActif(client.id, !client.actif);
      showToast(
        client.actif
          ? `Compte de ${client.prenom} ${client.nom} désactivé`
          : `Compte de ${client.prenom} ${client.nom} activé`
      );
      load();
    } catch (e: any) {
      showToast("Erreur : " + e.message, "error");
    }
  };

  const actifCount = data.filter(c => c.actif).length;

  return (
    <>
      <PageMeta title="Clients — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Clients de l'Application Mobile" />

      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          toastType === "success"
            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
            : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
        }`}>{toast}</div>
      )}

      {/* Cartes résumé */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total clients</p>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{data.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Comptes actifs</p>
          <p className="mt-1 text-2xl font-bold text-success-600">{actifCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Comptes désactivés</p>
          <p className="mt-1 text-2xl font-bold text-error-500">{data.length - actifCount}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {data.length} client(s) inscrit(s) sur l'application mobile
          </h3>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Aucun client inscrit</p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["ID", "Nom complet", "Email", "Téléphone", "CIN", "RIB Principal", "Statut", "Date inscription",
                    ...(isAdmin ? ["Action"] : [])
                  ].map(h => (
                    <TableCell key={h} isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm">{c.id}</TableCell>

                    {/* Nom complet avec avatar */}
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-500 dark:bg-brand-500/15">
                          {c.prenom.charAt(0)}{c.nom.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {c.prenom} {c.nom}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{c.email}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {c.telephone ?? <span className="italic text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="px-5 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {c.cin ?? <span className="italic text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="px-5 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {c.ribPrincipal
                        ? <span title={c.ribPrincipal}>{c.ribPrincipal.slice(0, 8)}…</span>
                        : <span className="italic text-gray-400">—</span>}
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color={c.actif ? "success" : "error"}>
                        {c.actif ? "Actif" : "Désactivé"}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-xs text-gray-500">
                      {c.dateCreation ? new Date(c.dateCreation).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>

                    {isAdmin && (
                      <TableCell className="px-5 py-4">
                        <button
                          onClick={() => toggleActif(c)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            c.actif
                              ? "bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-500/10 dark:text-error-400"
                              : "bg-success-50 text-success-600 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400"
                          }`}
                        >
                          {c.actif ? "Désactiver" : "Activer"}
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
