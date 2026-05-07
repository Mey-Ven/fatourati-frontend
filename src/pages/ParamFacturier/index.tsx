import { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { ParamFacturierService, CreancierService, type ParamFacturier, type Creancier } from "../../services/api";

const empty: Partial<ParamFacturier> = {
  codeCreancier: "",
  nomCreancier: "",
  typeCommission: "PF",
  ribCreancier: "",
  typeRib: "C",
  valeurCommission: "",
  commissionMinimale: "",
  commissionBmce: "",
  tvaBmce: "",
  racine: "",
  annexe: "",
  levelsecurity: 0,
};

const TYPE_COMMISSION_LABELS: Record<string, string> = {
  PF: "PF (Pourcentage Fixe)",
  FF: "FF (Frais Fixes)",
  PC: "PC (Pourcentage Calcule)",
};

export default function ParamFacturierPage() {
  const [data, setData] = useState<ParamFacturier[]>([]);
  const [creanciers, setCreanciers] = useState<Creancier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ParamFacturier | null>(null);
  const [deleting, setDeleting] = useState<ParamFacturier | null>(null);
  const [form, setForm] = useState<Partial<ParamFacturier>>(empty);
  const [ribError, setRibError] = useState("");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([ParamFacturierService.getAll(), CreancierService.getAll()])
      .then(([d, c]) => { setData(d); setCreanciers(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3500);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setRibError("");
    setModalOpen(true);
  };

  const openEdit = (p: ParamFacturier) => {
    setEditing(p);
    setForm({ ...p });
    setRibError("");
    setModalOpen(true);
  };

  const openDelete = (p: ParamFacturier) => {
    setDeleting(p);
    setDeleteOpen(true);
  };

  const handleRib = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 24);
    setForm({ ...form, ribCreancier: digits });
    setRibError(
      digits.length > 0 && digits.length !== 24
        ? `${digits.length}/24 caractères`
        : ""
    );
  };

  const handleCreancierChange = (code: string) => {
    const c = creanciers.find((x) => x.codeCreancier === code);
    setForm({ ...form, codeCreancier: code, nomCreancier: c?.nomCreancier || "" });
  };

  const handleSave = async () => {
    if (!form.codeCreancier) {
      showToast("Veuillez sélectionner un créancier", "error");
      return;
    }
    if (!form.nomCreancier) {
      showToast("Le nom du créancier est obligatoire", "error");
      return;
    }
    if (form.ribCreancier && form.ribCreancier.length !== 24) {
      setRibError("Le RIB doit contenir exactement 24 chiffres");
      return;
    }

    try {
      if (editing) {
        await ParamFacturierService.update(editing.codeCreancier, form);
        showToast("Paramétrage modifié");
      } else {
        await ParamFacturierService.create(form);
        showToast("Paramétrage créé");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      showToast("Erreur: " + e.message, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await ParamFacturierService.delete(deleting.codeCreancier);
      showToast("Paramétrage supprimé");
      setDeleteOpen(false);
      load();
    } catch (e: any) {
      showToast("Erreur: " + e.message, "error");
    }
  };

  const set = (k: keyof ParamFacturier, v: any) => setForm({ ...form, [k]: v });

  // Creanciers qui n'ont pas encore de parametrage (pour le menu deroulant de creation)
  const existingCodes = new Set(data.map((d) => d.codeCreancier));
  const availableCreanciers = creanciers.filter((c) => !existingCodes.has(c.codeCreancier));

  return (
    <>
      <PageMeta title="Param. Facturier — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Paramétrage Facturier" />
      {toast && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            toastType === "success"
              ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
              : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {data.length} paramétrage(s)
          </h3>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <PlusIcon className="size-4" /> Nouveau
          </button>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Aucun paramétrage</p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "Code",
                    "Nom",
                    "Type Comm.",
                    "RIB",
                    "Type RIB",
                    "Val. Comm.",
                    "Com. Min.",
                    "Sécurité",
                    "Actions",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.map((p) => (
                  <TableRow key={p.codeCreancier}>
                    <TableCell className="px-4 py-3 font-medium text-brand-500 text-theme-sm">
                      {p.codeCreancier}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-800 text-theme-sm dark:text-white/90">
                      {p.nomCreancier}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        size="sm"
                        color={
                          p.typeCommission === "PF"
                            ? "success"
                            : p.typeCommission === "FF"
                            ? "warning"
                            : "info"
                        }
                      >
                        {p.typeCommission || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-theme-xs font-mono">
                      {p.ribCreancier || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                      {p.typeRib || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                      {p.valeurCommission || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                      {p.commissionMinimale || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                      {p.levelsecurity}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-gray-500 hover:text-brand-500"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                        <button
                          onClick={() => openDelete(p)}
                          className="text-gray-500 hover:text-error-500"
                        >
                          <TrashBinIcon className="size-5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Modal Create/Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        className="max-w-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto"
      >
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">
          {editing ? "Modifier Paramétrage" : "Nouveau Paramétrage Facturier"}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Créancier *</Label>
            <select
              value={form.codeCreancier || ""}
              onChange={(e) => handleCreancierChange(e.target.value)}
              disabled={!!editing}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 disabled:opacity-60"
            >
              <option value="">Sélectionner...</option>
              {editing
                ? creanciers
                    .filter((c) => c.codeCreancier === editing.codeCreancier)
                    .map((c) => (
                      <option key={c.codeCreancier} value={c.codeCreancier}>
                        {c.codeCreancier} - {c.nomCreancier}
                      </option>
                    ))
                : availableCreanciers.map((c) => (
                    <option key={c.codeCreancier} value={c.codeCreancier}>
                      {c.codeCreancier} - {c.nomCreancier}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <Label>Nom Créancier *</Label>
            <Input
              value={form.nomCreancier || ""}
              onChange={(e) => set("nomCreancier", e.target.value)}
            />
          </div>
          <div>
            <Label>Type Commission *</Label>
            <select
              value={form.typeCommission || "PF"}
              onChange={(e) => set("typeCommission", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {Object.entries(TYPE_COMMISSION_LABELS).map(([v, lbl]) => (
                <option key={v} value={v}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Type RIB</Label>
            <select
              value={form.typeRib || "C"}
              onChange={(e) => set("typeRib", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="C">C (Crédit)</option>
              <option value="D">D (Débit)</option>
            </select>
          </div>
          <div>
            <Label>Valeur Commission</Label>
            <Input
              value={form.valeurCommission || ""}
              onChange={(e) => set("valeurCommission", e.target.value)}
            />
          </div>
          <div>
            <Label>Commission Minimale</Label>
            <Input
              value={form.commissionMinimale || ""}
              onChange={(e) => set("commissionMinimale", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>RIB Créancier (24 chiffres)</Label>
            <Input
              value={form.ribCreancier || ""}
              onChange={(e) => handleRib(e.target.value)}
              error={!!ribError}
              hint={ribError}
              placeholder="24 chiffres"
            />
          </div>
          <div>
            <Label>Commission BMCE</Label>
            <Input
              value={form.commissionBmce || ""}
              onChange={(e) => set("commissionBmce", e.target.value)}
            />
          </div>
          <div>
            <Label>TVA BMCE</Label>
            <Input
              value={form.tvaBmce || ""}
              onChange={(e) => set("tvaBmce", e.target.value)}
            />
          </div>
          <div>
            <Label>Racine</Label>
            <Input
              value={form.racine || ""}
              onChange={(e) => set("racine", e.target.value)}
            />
          </div>
          <div>
            <Label>Annexe</Label>
            <Input
              value={form.annexe || ""}
              onChange={(e) => set("annexe", e.target.value)}
            />
          </div>
          <div>
            <Label>Niveau Sécurité</Label>
            <Input
              type="number"
              value={String(form.levelsecurity ?? 0)}
              onChange={(e) => set("levelsecurity", parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Logo (chemin/URL)</Label>
            <Input
              value={form.logo || ""}
              onChange={(e) => set("logo", e.target.value)}
              placeholder="Optionnel"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setModalOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            {editing ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </Modal>

      {/* Modal Delete */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        className="max-w-sm p-6"
      >
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
          Confirmer la suppression
        </h4>
        <p className="mb-6 text-sm text-gray-500">
          Supprimer le paramétrage facturier de "{deleting?.codeCreancier} — {deleting?.nomCreancier}" ?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600"
          >
            Supprimer
          </button>
        </div>
      </Modal>
    </>
  );
}
