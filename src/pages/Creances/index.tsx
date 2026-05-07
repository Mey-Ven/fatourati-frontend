import { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import {
  CreanceService,
  CreancierService,
  PaiementService,
  type Creance,
  type Creancier,
  type Paiement,
} from "../../services/api";

type CreanceForm = { codeCreancier: string; idCreance: string; nomCreance: string };
const emptyForm: CreanceForm = { codeCreancier: "", idCreance: "", nomCreance: "" };

const statutPaiementColor = (s: string): "success" | "warning" | "error" | "info" => {
  if (s === "EFFECTUE")   return "success";
  if (s === "EN_ATTENTE") return "warning";
  if (s === "ECHEC")      return "error";
  return "info";
};

export default function CreancesPage() {
  const [data, setData]         = useState<Creance[]>([]);
  const [creanciers, setCreanciers] = useState<Creancier[]>([]);
  const [loading, setLoading]   = useState(true);

  // ── CRUD modals ─────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing]       = useState<Creance | null>(null);
  const [deleting, setDeleting]     = useState<Creance | null>(null);
  const [form, setForm]             = useState<CreanceForm>(emptyForm);

  // ── Modal paiements liés ────────────────────────────────────────────────────
  const [paiementsOpen, setPaiementsOpen]   = useState(false);
  const [selectedCreance, setSelectedCreance] = useState<Creance | null>(null);
  const [paiements, setPaiements]           = useState<Paiement[]>([]);
  const [paiementsLoading, setPaiementsLoading] = useState(false);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast]       = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([CreanceService.getAll(), CreancierService.getAll()])
      .then(([d, c]) => { setData(d); setCreanciers(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3500);
  };

  // ── CRUD handlers ────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit   = (c: Creance) => {
    setEditing(c);
    setForm({ codeCreancier: c.codeCreancier, idCreance: c.idCreance, nomCreance: c.nomCreance || "" });
    setModalOpen(true);
  };
  const openDelete = (c: Creance) => { setDeleting(c); setDeleteOpen(true); };

  const handleSave = async () => {
    if (!form.codeCreancier || !form.idCreance) {
      showToast("Code créancier et ID créance sont obligatoires", "error"); return;
    }
    try {
      if (editing) { await CreanceService.update(editing.idCreance, form); showToast("Créance modifiée"); }
      else { await CreanceService.create(form); showToast("Créance créée"); }
      setModalOpen(false); load();
    } catch (e: any) { showToast("Erreur: " + e.message, "error"); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await CreanceService.delete(deleting.idCreance);
      showToast("Créance supprimée"); setDeleteOpen(false); load();
    } catch (e: any) { showToast("Erreur: " + e.message, "error"); }
  };

  // ── Voir paiements liés ──────────────────────────────────────────────────────
  const openPaiements = async (creance: Creance) => {
    setSelectedCreance(creance);
    setPaiementsOpen(true);
    setPaiementsLoading(true);
    setPaiements([]);
    try {
      const result = await PaiementService.getByCreance(creance.idCreance);
      setPaiements(result);
    } catch {
      setPaiements([]);
    } finally {
      setPaiementsLoading(false);
    }
  };

  const totalPaye = paiements
    .filter(p => p.statut === "EFFECTUE")
    .reduce((sum, p) => sum + Number(p.montant), 0);

  const getCreancierNom = (code: string) =>
    creanciers.find(c => c.codeCreancier === code)?.nomCreancier || code;

  return (
    <>
      <PageMeta title="Créances — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Créances" />

      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          toastType === "success"
            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
            : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
        }`}>{toast}</div>
      )}

      {/* ── Tableau créances ── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {data.length} créance(s)
          </h3>
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <PlusIcon className="size-4" /> Nouvelle Créance
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Aucune créance enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    {["ID Créance", "Créancier", "Nom Créance", "Paiements liés", "Date Création", "Actions"].map(h => (
                      <TableCell key={h} isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {data.map(c => (
                    <TableRow key={c.idCreance}>
                      <TableCell className="px-5 py-4 font-semibold text-brand-500 text-theme-sm">
                        {c.idCreance}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {c.codeCreancier}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {getCreancierNom(c.codeCreancier)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                        {c.nomCreance}
                      </TableCell>

                      {/* ── Bouton Paiements liés ── */}
                      <TableCell className="px-5 py-4">
                        <button
                          onClick={() => openPaiements(c)}
                          className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5
                                     text-xs font-medium text-brand-600 hover:bg-brand-100
                                     dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                                 M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Voir paiements
                        </button>
                      </TableCell>

                      <TableCell className="px-5 py-4 text-gray-500 text-theme-xs">
                        {c.dateCreation ? new Date(c.dateCreation).toLocaleDateString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="text-gray-500 hover:text-brand-500">
                            <PencilIcon className="size-5" />
                          </button>
                          <button onClick={() => openDelete(c)} className="text-gray-500 hover:text-error-500">
                            <TrashBinIcon className="size-5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Paiements liés à la créance ── */}
      <Modal isOpen={paiementsOpen} onClose={() => setPaiementsOpen(false)} className="max-w-3xl p-6 lg:p-8">
        <div className="mb-5">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
            Paiements liés à la créance
          </h4>
          {selectedCreance && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-brand-500">{selectedCreance.idCreance}</span>
              {" — "}{selectedCreance.nomCreance}
              {" · "}<span className="text-gray-400">{getCreancierNom(selectedCreance.codeCreancier)}</span>
            </p>
          )}
        </div>

        {paiementsLoading ? (
          <p className="py-8 text-center text-gray-500">Chargement des paiements...</p>
        ) : paiements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500">Aucun paiement enregistré pour cette créance.</p>
          </div>
        ) : (
          <>
            {/* Résumé */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
                <p className="text-xs text-gray-500">Total paiements</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white">{paiements.length}</p>
              </div>
              <div className="rounded-lg bg-success-50 p-3 text-center dark:bg-success-500/10">
                <p className="text-xs text-success-600">Montant réglé (EFFECTUE)</p>
                <p className="text-lg font-bold text-success-700">
                  {totalPaye.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD
                </p>
              </div>
              <div className="rounded-lg bg-warning-50 p-3 text-center dark:bg-warning-500/10">
                <p className="text-xs text-warning-600">En attente / Échec</p>
                <p className="text-lg font-bold text-warning-700">
                  {paiements.filter(p => p.statut !== "EFFECTUE" && p.statut !== "ANNULE").length} paiement(s)
                </p>
              </div>
            </div>

            {/* Table paiements */}
            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    {["ID Paiement", "Montant (MAD)", "Canal", "Statut", "Date"].map(h => (
                      <TableCell key={h} isHeader
                        className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paiements.map(p => (
                    <TableRow key={p.idPaiement}>
                      <TableCell className="px-4 py-3 font-mono text-xs text-gray-500">
                        {p.idPaiement}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                        {Number(p.montant).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {p.canalPaiement.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge size="sm" color={statutPaiementColor(p.statut)}>{p.statut}</Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-gray-500">
                        {new Date(p.datePaiement).toLocaleString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={() => setPaiementsOpen(false)}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Fermer
          </button>
        </div>
      </Modal>

      {/* ── Modal Créer / Modifier créance ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-lg p-6 lg:p-8">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">
          {editing ? "Modifier la Créance" : "Nouvelle Créance"}
        </h4>
        <div className="space-y-4">
          <div>
            <Label>Créancier *</Label>
            <select value={form.codeCreancier}
              onChange={e => setForm({ ...form, codeCreancier: e.target.value })}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              <option value="">Sélectionner un créancier...</option>
              {creanciers.map(c => (
                <option key={c.codeCreancier} value={c.codeCreancier}>
                  {c.codeCreancier} — {c.nomCreancier}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>ID Créance * (max 10 caractères)</Label>
            <Input value={form.idCreance}
              onChange={e => setForm({ ...form, idCreance: e.target.value.slice(0, 10) })}
              placeholder="Ex: FACT001" disabled={!!editing} />
            {!editing && (
              <p className="mt-1 text-xs text-gray-400">Clé primaire, ne pourra plus être modifié.</p>
            )}
          </div>
          <div>
            <Label>Nom Créance</Label>
            <Input value={form.nomCreance}
              onChange={e => setForm({ ...form, nomCreance: e.target.value })}
              placeholder="Ex: Facture Eau ONEE" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Annuler
          </button>
          <button onClick={handleSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            {editing ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </Modal>

      {/* ── Modal Suppression ── */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} className="max-w-sm p-6">
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
          Confirmer la suppression
        </h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Supprimer la créance <strong>{deleting?.idCreance}</strong> ({deleting?.nomCreance}) ?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Annuler
          </button>
          <button onClick={handleDelete}
            className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600">
            Supprimer
          </button>
        </div>
      </Modal>
    </>
  );
}
