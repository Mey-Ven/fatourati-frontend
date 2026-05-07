import { useEffect, useState, useCallback, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import {
  CanalPaiementService, CreancierService,
  type CanalPaiement, type Creancier,
} from "../../services/api";

const CANAUX_DISPONIBLES = [
  "BMCE_Direct",
  "Agences_BMCE",
  "Mobile_App",
  "Daman_Cash",
  "Bank_Al_Karam",
];

const CANAL_COLORS: Record<string, string> = {
  BMCE_Direct:   "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Agences_BMCE:  "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  Mobile_App:    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  Daman_Cash:    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Bank_Al_Karam: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
};

const fmt = (v: string) => v.replace(/_/g, " ");
const empty: Partial<CanalPaiement> = { codeCreancier: "", nomCanal: "BMCE_Direct", actif: true };

export default function CanauxPage() {
  const [data, setData]             = useState<CanalPaiement[]>([]);
  const [creanciers, setCreanciers] = useState<Creancier[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [modalOpen, setModalOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing]       = useState<CanalPaiement | null>(null);
  const [deleting, setDeleting]     = useState<CanalPaiement | null>(null);
  const [form, setForm]             = useState<Partial<CanalPaiement>>(empty);
  const [toast, setToast]           = useState("");
  const [toastType, setToastType]   = useState<"success" | "error">("success");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([CanalPaiementService.getAll(), CreancierService.getAll()])
      .then(([d, c]) => { setData(d); setCreanciers(c); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3000);
  };

  const creancierName = useMemo(
    () => Object.fromEntries(creanciers.map(c => [c.codeCreancier, c.nomCreancier])),
    [creanciers]
  );

  // Grouper par créancier + dédupliquer par nomCanal (garde le premier de chaque type)
  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const map = new Map<string, CanalPaiement[]>();
    for (const c of data) {
      if (
        q &&
        !c.codeCreancier.toLowerCase().includes(q) &&
        !fmt(c.nomCanal).toLowerCase().includes(q) &&
        !(creancierName[c.codeCreancier] ?? "").toLowerCase().includes(q)
      ) continue;
      if (!map.has(c.codeCreancier)) map.set(c.codeCreancier, []);
      const existing = map.get(c.codeCreancier)!;
      // Ne pas ajouter si ce type de canal existe déjà pour ce créancier
      if (!existing.some(e => e.nomCanal === c.nomCanal)) {
        existing.push(c);
      }
    }
    return map;
  }, [data, search, creancierName]);

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit   = (c: CanalPaiement) => { setEditing(c); setForm({ ...c }); setModalOpen(true); };
  const openDelete = (c: CanalPaiement) => { setDeleting(c); setDeleteOpen(true); };

  const handleSave = async () => {
    if (!form.codeCreancier || !form.nomCanal) {
      showToast("Créancier et canal sont obligatoires", "error"); return;
    }
    try {
      if (editing) {
        await CanalPaiementService.update(editing.id, form);
        showToast("Canal modifié");
      } else {
        await CanalPaiementService.create(form);
        showToast("Canal créé");
      }
      setModalOpen(false); load();
    } catch (e: any) { showToast("Erreur : " + e.message, "error"); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await CanalPaiementService.delete(deleting.id);
      showToast("Canal supprimé"); setDeleteOpen(false); load();
    } catch (e: any) { showToast("Erreur : " + e.message, "error"); }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <PageMeta title="Canaux de Paiement — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Canaux de Paiement" />

      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          toastType === "success"
            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
            : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
        }`}>{toast}</div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Barre d'actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {grouped.size} créancier(s) · {data.length} canal(aux) au total
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <PlusIcon className="size-4" /> Nouveau Canal
            </button>
          </div>
        </div>

        {/* Tableau */}
        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : grouped.size === 0 ? (
            <p className="p-6 text-center text-gray-500">Aucun canal trouvé</p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["Créancier", "Canaux de Paiement", "Actions"].map(h => (
                    <TableCell key={h} isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {Array.from(grouped.entries()).map(([code, canaux]) => (
                  <TableRow key={code}>
                    {/* Créancier */}
                    <TableCell className="px-5 py-4 w-64">
                      <span className="font-medium text-gray-800 dark:text-white/90">{code}</span>
                      {creancierName[code] && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {creancierName[code]}
                        </p>
                      )}
                    </TableCell>

                    {/* Canaux groupés */}
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {canaux.map(c => (
                          <span
                            key={c.id}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                              c.actif
                                ? CANAL_COLORS[c.nomCanal] ?? "bg-gray-100 text-gray-600"
                                : "bg-gray-100 text-gray-400 line-through dark:bg-gray-800 dark:text-gray-500"
                            }`}
                          >
                            {fmt(c.nomCanal)}
                            {!c.actif && <span className="text-[10px] no-underline not-italic">(inactif)</span>}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    {/* Actions par canal */}
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        {canaux.map(c => (
                          <div key={c.id} className="flex items-center gap-1">
                            <span className="w-28 truncate text-xs text-gray-400">{fmt(c.nomCanal)}</span>
                            <button onClick={() => openEdit(c)}
                              className="text-gray-400 hover:text-brand-500">
                              <PencilIcon className="size-4" />
                            </button>
                            <button onClick={() => openDelete(c)}
                              className="text-gray-400 hover:text-error-500">
                              <TrashBinIcon className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Modal Créer / Modifier */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md p-6 lg:p-8">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">
          {editing ? "Modifier le Canal" : "Nouveau Canal"}
        </h4>
        <div className="space-y-4">
          <div>
            <Label>Créancier *</Label>
            <select
              value={form.codeCreancier ?? ""}
              onChange={e => set("codeCreancier", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">— Sélectionner un créancier —</option>
              {creanciers.map(c => (
                <option key={c.codeCreancier} value={c.codeCreancier}>
                  {c.codeCreancier} — {c.nomCreancier}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Canal de Paiement *</Label>
            <select
              value={form.nomCanal ?? "BMCE_Direct"}
              onChange={e => set("nomCanal", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {CANAUX_DISPONIBLES.map(nom => (
                <option key={nom} value={nom}>{fmt(nom)}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.actif ?? true}
              onChange={e => set("actif", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Canal actif</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Annuler
          </button>
          <button onClick={handleSave}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
            {editing ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </Modal>

      {/* Modal Suppression */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} className="max-w-sm p-6">
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Supprimer le canal</h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Supprimer le canal <strong>{deleting && fmt(deleting.nomCanal)}</strong>{" "}
          du créancier <strong>{deleting?.codeCreancier}</strong> ?
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
