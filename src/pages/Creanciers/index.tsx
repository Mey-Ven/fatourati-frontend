import { useEffect, useState, useCallback, useRef } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon, ArrowUpIcon } from "../../icons";
import {
  CreancierService,
  ParamFacturierService,
  type Creancier,
  type ParamFacturier,
} from "../../services/api";

const emptyCreancier = {
  codeCreancier: "",
  nomCreancier: "",
  logoFile: null as File | null,
};

// Mapping colonnes CSV -> champs ParamFacturier
const CSV_FIELDS: { csv: string; key: keyof ParamFacturier }[] = [
  { csv: "code_creancier", key: "codeCreancier" },
  { csv: "nom_creancier", key: "nomCreancier" },
  { csv: "type_commission", key: "typeCommission" },
  { csv: "rib_creancier", key: "ribCreancier" },
  { csv: "type_rib", key: "typeRib" },
  { csv: "valeur_commission", key: "valeurCommission" },
  { csv: "commission_minimale", key: "commissionMinimale" },
  { csv: "commission_bmce", key: "commissionBmce" },
  { csv: "tva_bmce", key: "tvaBmce" },
  { csv: "logo", key: "logo" },
  { csv: "racine", key: "racine" },
  { csv: "annexe", key: "annexe" },
  { csv: "levelsecurity", key: "levelsecurity" },
];

function norm(s: string) {
  return s.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "").replace(/^\xEF\xBB\xBF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => norm(h.replace(/^["']+|["']+$/g, "")));
  return lines.slice(1).map((line) => {
    const vals = line.split(sep).map((v) => v.trim().replace(/^["']+|["']+$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] || "";
    });
    return obj;
  });
}

function csvRowToParam(row: Record<string, string>): Partial<ParamFacturier> {
  const param: any = {};
  const nr: Record<string, string> = {};
  Object.keys(row).forEach((k) => {
    nr[norm(k)] = row[k];
  });
  CSV_FIELDS.forEach(({ csv, key }) => {
    const v = nr[csv];
    if (v !== undefined && v !== "") {
      if (key === "levelsecurity") {
        param[key] = parseInt(v) || 0;
      } else {
        param[key] = v;
      }
    }
  });
  return param;
}

export default function CreanciersPage() {
  const [data, setData] = useState<Creancier[]>([]);
  const [params, setParams] = useState<ParamFacturier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Creancier | null>(null);
  const [deleting, setDeleting] = useState<Creancier | null>(null);
  const [form, setForm] = useState(emptyCreancier);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Import CSV
  const [importOpen, setImportOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Partial<ParamFacturier>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([CreancierService.getAll(), ParamFacturierService.getAll()])
      .then(([c, p]) => {
        setData(c);
        setParams(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 4000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCreancier);
    setModalOpen(true);
  };

  const openEdit = (c: Creancier) => {
    setEditing(c);
    setForm({
      codeCreancier: c.codeCreancier,
      nomCreancier: c.nomCreancier || "",
      logoFile: null,
    });
    setModalOpen(true);
  };

  const openDelete = (c: Creancier) => {
    setDeleting(c);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.codeCreancier || form.codeCreancier.length > 4) {
      showToast("Code créancier obligatoire (max 4 caractères)", "error");
      return;
    }
    const fd = new FormData();
    fd.append("codeCreancier", form.codeCreancier);
    fd.append("nomCreancier", form.nomCreancier);
    if (form.logoFile) fd.append("logo", form.logoFile);
    try {
      if (editing) {
        await CreancierService.update(editing.codeCreancier, fd);
        showToast("Créancier modifié");
      } else {
        await CreancierService.create(fd);
        showToast("Créancier créé");
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
      await CreancierService.delete(deleting.codeCreancier);
      showToast("Créancier supprimé");
      setDeleteOpen(false);
      load();
    } catch (e: any) {
      showToast("Erreur: " + e.message, "error");
    }
  };

  // ─── Import CSV ───
  const openImport = () => {
    setCsvPreview([]);
    setImportResults(null);
    setImportOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target?.result as string);
      setCsvPreview(rows.map(csvRowToParam).filter((p) => p.codeCreancier && p.nomCreancier));
      setImportResults(null);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (csvPreview.length === 0) return;
    setImporting(true);
    let success = 0;
    const skipped: string[] = [];
    const errors: string[] = [];
    const existing = new Set(params.map((p) => p.codeCreancier));

    for (let i = 0; i < csvPreview.length; i++) {
      const row = csvPreview[i];
      if (!row.codeCreancier) continue;
      if (existing.has(row.codeCreancier)) {
        skipped.push(`Ligne ${i + 1} (${row.codeCreancier}): déjà existant`);
        continue;
      }
      try {
        await ParamFacturierService.create(row);
        existing.add(row.codeCreancier);
        success++;
      } catch (e: any) {
        errors.push(`Ligne ${i + 1} (${row.codeCreancier}): ${e.message}`);
      }
    }
    setImportResults({ success, errors: [...skipped, ...errors] });
    setImporting(false);
    if (success > 0) load();
  };

  // Nombre de parametrages facturier par creancier (0 ou 1 desormais)
  const hasParam = (code: string) => params.some((p) => p.codeCreancier === code);

  return (
    <>
      <PageMeta title="Créanciers — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Créanciers" />
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
            {data.length} créancier(s)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={openImport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ArrowUpIcon className="size-4" /> Importer CSV
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <PlusIcon className="size-4" /> Nouveau Créancier
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Aucun créancier</p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["Code", "Nom", "Logo", "Créances", "Paramétrage", "Actions"].map((h) => (
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
                {data.map((c) => (
                  <TableRow key={c.codeCreancier}>
                    <TableCell className="px-5 py-4 font-medium text-brand-500 text-theme-sm">
                      {c.codeCreancier}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                      {c.nomCreancier}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      {c.logoUrl ? (
                        <img
                          src={c.logoUrl}
                          alt=""
                          className="h-8 w-8 rounded object-contain"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-50 text-xs font-bold text-brand-500">
                          {c.codeCreancier.charAt(0)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color="info">
                        {c.nombreCreances} créance(s)
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      {hasParam(c.codeCreancier) ? (
                        <Badge size="sm" color="success">
                          Configuré
                        </Badge>
                      ) : (
                        <Badge size="sm" color="warning">
                          Non configuré
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-gray-500 hover:text-brand-500"
                        >
                          <PencilIcon className="size-5" />
                        </button>
                        <button
                          onClick={() => openDelete(c)}
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

      {/* Modal Créancier Create/Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        className="max-w-xl p-6 lg:p-8"
      >
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">
          {editing ? "Modifier le créancier" : "Nouveau créancier"}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Code Créancier * (max 4)</Label>
            <Input
              value={form.codeCreancier}
              onChange={(e) =>
                setForm({ ...form, codeCreancier: e.target.value.toUpperCase().slice(0, 4) })
              }
              placeholder="Ex: LYDE"
              disabled={!!editing}
            />
          </div>
          <div>
            <Label>Nom Créancier</Label>
            <Input
              value={form.nomCreancier}
              onChange={(e) => setForm({ ...form, nomCreancier: e.target.value })}
              placeholder="Ex: LYDEC"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Logo</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({ ...form, logoFile: e.target.files?.[0] || null })
              }
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-500 hover:file:bg-brand-100"
            />
            {editing?.logoUrl && (
              <img src={editing.logoUrl} alt="" className="mt-2 h-10 object-contain" />
            )}
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

      {/* Modal Créancier Delete */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        className="max-w-sm p-6"
      >
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
          Supprimer le créancier
        </h4>
        <p className="mb-6 text-sm text-gray-500">
          Supprimer "{deleting?.nomCreancier}" ({deleting?.codeCreancier}) ? Cette action
          supprimera aussi le logo et potentiellement le paramétrage associé.
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

      {/* Modal CSV Import */}
      <Modal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        className="max-w-3xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto"
      >
        <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
          Importer des paramétrages facturier depuis CSV
        </h4>
        <p className="mb-5 text-sm text-gray-500">
          Colonnes attendues :{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">
            code_creancier, nom_creancier, type_commission, rib_creancier, type_rib,
            valeur_commission, commission_minimale, commission_bmce, tva_bmce, logo,
            racine, annexe, levelsecurity
          </code>
          . Les créanciers déjà configurés seront ignorés.
        </p>
        <div className="mb-5">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-500 hover:file:bg-brand-100 dark:file:bg-brand-500/15 dark:file:text-brand-400"
          />
        </div>
        {csvPreview.length > 0 && !importResults && (
          <>
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {csvPreview.length} ligne(s) détectée(s)
            </p>
            <div className="mb-5 max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader className="sticky top-0 border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-gray-800">
                  <TableRow>
                    {["#", "Code", "Nom", "Type Comm.", "RIB", "Val. Comm.", "Sécurité"].map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {csvPreview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-3 py-2 text-gray-400 text-theme-xs">
                        {i + 1}
                      </TableCell>
                      <TableCell className="px-3 py-2 font-medium text-brand-500 text-theme-xs">
                        {row.codeCreancier}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs">
                        {row.nomCreancier || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge
                          size="sm"
                          color={
                            row.typeCommission === "PF"
                              ? "success"
                              : row.typeCommission === "FF"
                              ? "warning"
                              : "info"
                          }
                        >
                          {row.typeCommission || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs font-mono">
                        {row.ribCreancier
                          ? row.ribCreancier.slice(0, 6) + "…"
                          : "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs">
                        {row.valeurCommission || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs">
                        {row.levelsecurity ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {importResults && (
          <div className="mb-5 space-y-2">
            {importResults.success > 0 && (
              <div className="rounded-lg bg-success-50 p-3 text-sm text-success-600 dark:bg-success-500/15 dark:text-success-400">
                {importResults.success} paramétrage(s) importé(s).
              </div>
            )}
            {importResults.errors.length > 0 && (
              <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                <p className="font-medium mb-1">{importResults.errors.length} erreur(s) :</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {importResults.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setImportOpen(false);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            {importResults ? "Fermer" : "Annuler"}
          </button>
          {csvPreview.length > 0 && !importResults && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {importing ? "Import..." : `Importer ${csvPreview.length} ligne(s)`}
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
