import { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import {
  CreanceFormulaireService,
  CreanceService,
  type CreanceFormulaire,
  type Creance,
} from "../../services/api";

// ─── Constants ───
const TYPE_CHAMPS = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Zone de texte" },
  { value: "select", label: "Liste déroulante" },
];

const typeColor = (t: string) => {
  switch (t) {
    case "text": return "primary";
    case "number": return "info";
    case "date": return "warning";
    case "textarea": return "dark";
    case "select": return "success";
    default: return "light";
  }
};

type FormData = {
  idCreance: string;
  nomChamp: string;
  codeChamp: string;
  typeChamp: string;
  ordre: number;
  obligatoire: boolean;
};

const emptyForm: FormData = {
  idCreance: "",
  nomChamp: "",
  codeChamp: "",
  typeChamp: "text",
  ordre: 0,
  obligatoire: false,
};

export default function CreanceFormulairesPage() {
  // ─── State ───
  const [data, setData] = useState<CreanceFormulaire[]>([]);
  const [creances, setCreances] = useState<Creance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCreance, setFilterCreance] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CreanceFormulaire | null>(null);
  const [deleting, setDeleting] = useState<CreanceFormulaire | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ─── Load ───
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      CreanceFormulaireService.getAll(),
      CreanceService.getAll(),
    ])
      .then(([f, c]) => {
        setData(f);
        setCreances(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadByCreance = useCallback((idCreance: string) => {
    if (!idCreance) {
      load();
      return;
    }
    setLoading(true);
    CreanceFormulaireService.getByCreance(idCreance)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [load]);

  // ─── Filter ───
  const handleFilterChange = (idCreance: string) => {
    setFilterCreance(idCreance);
    loadByCreance(idCreance);
  };

  // ─── Toast ───
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3500);
  };

  // ─── CRUD ───
  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      idCreance: filterCreance || "",
      ordre: data.length + 1,
    });
    setModalOpen(true);
  };

  const openEdit = (f: CreanceFormulaire) => {
    setEditing(f);
    setForm({
      idCreance: f.idCreance,
      nomChamp: f.nomChamp,
      codeChamp: f.codeChamp,
      typeChamp: f.typeChamp,
      ordre: f.ordre,
      obligatoire: f.obligatoire,
    });
    setModalOpen(true);
  };

  const openDelete = (f: CreanceFormulaire) => {
    setDeleting(f);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.idCreance || !form.nomChamp || !form.codeChamp) {
      showToast("Créance, Nom du champ et Code sont obligatoires", "error");
      return;
    }
    try {
      if (editing) {
        await CreanceFormulaireService.update(editing.id, form);
        showToast("Champ formulaire modifié");
      } else {
        await CreanceFormulaireService.create(form);
        showToast("Champ formulaire créé");
      }
      setModalOpen(false);
      if (filterCreance) loadByCreance(filterCreance);
      else load();
    } catch (e: any) {
      showToast("Erreur: " + e.message, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await CreanceFormulaireService.delete(deleting.id);
      showToast("Champ supprimé");
      setDeleteOpen(false);
      if (filterCreance) loadByCreance(filterCreance);
      else load();
    } catch (e: any) {
      showToast("Erreur: " + e.message, "error");
    }
  };

  // ─── Helpers ───
  const getCreanceNom = (id: string) => creances.find((c) => c.idCreance === id)?.nomCreance || "";

  return (
    <>
      <PageMeta title="Formulaires Créance — Fatourati" description="" />
      <PageBreadcrumb pageTitle="Formulaires Créance" />

      {/* Toast */}
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

      {/* Card principale */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header avec filtre + bouton */}
        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {data.length} champ(s)
            </h3>
            {/* Filtre par créance */}
            <select
              value={filterCreance}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">Toutes les créances</option>
              {creances.map((c) => (
                <option key={c.idCreance} value={c.idCreance}>
                  {c.idCreance} — {c.nomCreance}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <PlusIcon className="size-4" /> Nouveau Champ
          </button>
        </div>

        {/* Tableau */}
        <div className="border-t border-gray-100 dark:border-gray-800">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-gray-500">
              Aucun champ de formulaire.{" "}
              {!filterCreance
                ? "Sélectionnez une créance ou créez un nouveau champ."
                : 'Cliquez sur "Nouveau Champ" pour en ajouter.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    {[
                      "ID",
                      "Créance",
                      "Ordre",
                      "Nom du champ",
                      "Code",
                      "Type",
                      "Obligatoire",
                      "Actions",
                    ].map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {data.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="px-5 py-3 text-gray-500 text-theme-sm">
                        {f.id}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <div>
                          <span className="block font-medium text-brand-500 text-theme-sm">
                            {f.idCreance}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {getCreanceNom(f.idCreance)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {f.ordre}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {f.nomChamp}
                      </TableCell>
                      <TableCell className="px-5 py-3 font-mono text-xs text-gray-500">
                        {f.codeChamp}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Badge size="sm" color={typeColor(f.typeChamp) as any}>
                          {TYPE_CHAMPS.find((t) => t.value === f.typeChamp)?.label ||
                            f.typeChamp}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Badge size="sm" color={f.obligatoire ? "error" : "light"}>
                          {f.obligatoire ? "Oui" : "Non"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(f)}
                            className="text-gray-500 hover:text-brand-500"
                          >
                            <PencilIcon className="size-5" />
                          </button>
                          <button
                            onClick={() => openDelete(f)}
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
            </div>
          )}
        </div>
      </div>

      {/* ═══ Modal Create/Edit ═══ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        className="max-w-lg p-6 lg:p-8"
      >
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">
          {editing ? "Modifier le Champ" : "Nouveau Champ de Formulaire"}
        </h4>
        <div className="space-y-4">
          <div>
            <Label>Créance *</Label>
            <select
              value={form.idCreance}
              onChange={(e) => setForm({ ...form, idCreance: e.target.value })}
              disabled={!!editing}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">Sélectionner une créance...</option>
              {creances.map((c) => (
                <option key={c.idCreance} value={c.idCreance}>
                  {c.idCreance} — {c.nomCreance}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du champ *</Label>
              <Input
                value={form.nomChamp}
                onChange={(e) => setForm({ ...form, nomChamp: e.target.value })}
                placeholder="Ex: Numéro Compteur"
              />
            </div>
            <div>
              <Label>Code champ *</Label>
              <Input
                value={form.codeChamp}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codeChamp: e.target.value.toUpperCase().replace(/\s/g, "_"),
                  })
                }
                placeholder="Ex: NUM_COMPTEUR"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type de champ *</Label>
              <select
                value={form.typeChamp}
                onChange={(e) => setForm({ ...form, typeChamp: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {TYPE_CHAMPS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={form.ordre}
                onChange={(e) =>
                  setForm({ ...form, ordre: parseInt(e.target.value) || 0 })
                }
                min="0"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="obligatoire"
              checked={form.obligatoire}
              onChange={(e) =>
                setForm({ ...form, obligatoire: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <Label htmlFor="obligatoire">Champ obligatoire</Label>
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

      {/* ═══ Modal Delete ═══ */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        className="max-w-sm p-6"
      >
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
          Supprimer le champ
        </h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Supprimer le champ "<strong>{deleting?.nomChamp}</strong>" (
          {deleting?.codeChamp}) de la créance {deleting?.idCreance} ?
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
