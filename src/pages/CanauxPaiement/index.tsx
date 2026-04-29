import { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { CanalPaiementService, CreancierService, type CanalPaiement, type Creancier } from "../../services/api";

const CANAUX = ["Daman_Cash", "Bank_Al_Karam", "BMCE_Direct", "Agences_BMCE"];
const fmt = (v: string) => v.replace(/_/g, " ");

const empty: Partial<CanalPaiement> = { codeCreancier: "", nomCanal: "Daman_Cash", actif: true };

export default function CanauxPage() {
  const [data, setData] = useState<CanalPaiement[]>([]);
  const [creanciers, setCreanciers] = useState<Creancier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CanalPaiement | null>(null);
  const [deleting, setDeleting] = useState<CanalPaiement | null>(null);
  const [form, setForm] = useState(empty);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([CanalPaiementService.getAll(), CreancierService.getAll()])
      .then(([d, c]) => { setData(d); setCreanciers(c); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (c: CanalPaiement) => { setEditing(c); setForm({ ...c }); setModalOpen(true); };
  const openDelete = (c: CanalPaiement) => { setDeleting(c); setDeleteOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) { await CanalPaiementService.update(editing.id, form); showToast("Canal modifié"); }
      else { await CanalPaiementService.create(form); showToast("Canal créé"); }
      setModalOpen(false); load();
    } catch (e: any) { showToast("Erreur: " + e.message); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await CanalPaiementService.delete(deleting.id); showToast("Canal supprimé"); setDeleteOpen(false); load(); }
    catch (e: any) { showToast("Erreur: " + e.message); }
  };

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <>
      <PageMeta title="Canaux de Paiement — Fatourati" description="" />
      <PageBreadcrumb pageTitle="Canaux de Paiement" />
      {toast && <div className="mb-4 rounded-lg bg-success-50 p-3 text-sm text-success-600 dark:bg-success-500/15 dark:text-success-400">{toast}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{data.length} canal(aux)</h3>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"><PlusIcon className="size-4" /> Nouveau Canal</button>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? <p className="p-6 text-center text-gray-500">Chargement...</p> : data.length === 0 ? <p className="p-6 text-center text-gray-500">Aucun canal</p> : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["ID","Créancier","Canal","Statut","Actions"].map(h => (
                    <TableCell key={h} isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{h}</TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm">{c.id}</TableCell>
                    <TableCell className="px-5 py-4 font-medium text-brand-500 text-theme-sm">{c.codeCreancier}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">{fmt(c.nomCanal)}</TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color={c.actif ? "success" : "error"}>{c.actif ? "Actif" : "Inactif"}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="text-gray-500 hover:text-brand-500"><PencilIcon className="size-5" /></button>
                        <button onClick={() => openDelete(c)} className="text-gray-500 hover:text-error-500"><TrashBinIcon className="size-5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md p-6 lg:p-8">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">{editing ? "Modifier Canal" : "Nouveau Canal"}</h4>
        <div className="space-y-4">
          <div>
            <Label>Créancier *</Label>
            <select value={form.codeCreancier} onChange={(e) => set("codeCreancier", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              <option value="">Sélectionner...</option>
              {creanciers.map(c => <option key={c.codeCreancier} value={c.codeCreancier}>{c.codeCreancier} - {c.nomCreancier}</option>)}
            </select>
          </div>
          <div>
            <Label>Canal *</Label>
            <select value={form.nomCanal} onChange={(e) => set("nomCanal", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              {CANAUX.map(c => <option key={c} value={c}>{fmt(c)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="actif" checked={form.actif ?? true} onChange={(e) => set("actif", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
            <Label htmlFor="actif">Canal actif</Label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
          <button onClick={handleSave} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">{editing ? "Enregistrer" : "Créer"}</button>
        </div>
      </Modal>

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} className="max-w-sm p-6">
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Confirmer la suppression</h4>
        <p className="mb-6 text-sm text-gray-500">Supprimer le canal "{deleting && fmt(deleting.nomCanal)}" du créancier {deleting?.codeCreancier} ?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
          <button onClick={handleDelete} className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600">Supprimer</button>
        </div>
      </Modal>
    </>
  );
}
