import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { useNavigate } from "react-router";
import {
  CanalPaiementService, CreancierService, AuthService,
  type CanalPaiement, type Creancier,
} from "../../services/api";

const CANAUX_DISPONIBLES = [
  "BMCE_Direct", "Agences_BMCE", "Mobile_App", "Daman_Cash", "Bank_Al_Karam",
];

const fmt = (v: string) => v.replace(/_/g, " ");
const empty: Partial<CanalPaiement> = { codeCreancier: "", nomCanal: "BMCE_Direct", actif: true };

export default function CanauxPage() {
  const navigate = useNavigate();
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
  const [creancierSearch, setCreancierSearch] = useState("");
  const [showCreancierDrop, setShowCreancierDrop] = useState(false);
  const creancierDropRef = useRef<HTMLDivElement>(null);

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

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const map = new Map<string, CanalPaiement[]>();
    for (const c of data) {
      if (q &&
        !c.codeCreancier.toLowerCase().includes(q) &&
        !fmt(c.nomCanal).toLowerCase().includes(q) &&
        !(creancierName[c.codeCreancier] ?? "").toLowerCase().includes(q)
      ) continue;
      if (!map.has(c.codeCreancier)) map.set(c.codeCreancier, []);
      const existing = map.get(c.codeCreancier)!;
      if (!existing.some(e => e.nomCanal === c.nomCanal)) existing.push(c);
    }
    return map;
  }, [data, search, creancierName]);

  const openCreate = () => {
    setEditing(null); setForm(empty);
    setCreancierSearch(""); setShowCreancierDrop(false);
    setModalOpen(true);
  };
  const openCreateFor = (code: string) => {
    setEditing(null);
    setForm({ ...empty, codeCreancier: code });
    setCreancierSearch(creancierName[code] ? `${code} — ${creancierName[code]}` : code);
    setShowCreancierDrop(false);
    setModalOpen(true);
  };
  const openEdit = (c: CanalPaiement) => {
    setEditing(c); setForm({ ...c });
    setCreancierSearch(creancierName[c.codeCreancier] ? `${c.codeCreancier} — ${creancierName[c.codeCreancier]}` : c.codeCreancier);
    setShowCreancierDrop(false);
    setModalOpen(true);
  };
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
  const isAdmin = AuthService.getUser()?.role === "Admin";

  // Filtered creanciers for the searchable combobox
  const filteredCreanciers = useMemo(() => {
    const q = creancierSearch.toLowerCase();
    if (!q) return creanciers;
    return creanciers.filter(c =>
      c.codeCreancier.toLowerCase().includes(q) ||
      c.nomCreancier.toLowerCase().includes(q)
    );
  }, [creanciers, creancierSearch]);

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
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {grouped.size} créancier(s) · {data.length} canal(aux)
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher créancier ou canal…"
              className="h-9 w-64 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
            {isAdmin && (
              <button onClick={openCreate}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                <PlusIcon className="size-4" /> Nouveau Canal
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : grouped.size === 0 ? (
            <p className="p-6 text-center text-gray-500">
              {search ? `Aucun résultat pour "${search}"` : "Aucun canal trouvé"}
            </p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["Créancier", "Canaux actifs", "Canaux inactifs", ...(isAdmin ? [""] : [])].map((h, i) => (
                    <TableCell key={i} isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {Array.from(grouped.entries()).map(([code, canaux]) => {
                  const actifs   = canaux.filter(c => c.actif);
                  const inactifs = canaux.filter(c => !c.actif);
                  return (
                    <TableRow key={code}>
                      {/* Créancier — cliquable */}
                      <TableCell className="px-5 py-4 w-56">
                        <button
                          onClick={() => navigate("/creanciers", { state: { search: code } })}
                          className="text-left hover:underline"
                        >
                          <span className="block text-sm font-semibold text-brand-600 dark:text-brand-400">
                            {code}
                          </span>
                          {creancierName[code] && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {creancierName[code]}
                            </span>
                          )}
                        </button>
                      </TableCell>

                      {/* Canaux actifs — avec boutons inline si Admin */}
                      <TableCell className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {actifs.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">—</span>
                          ) : actifs.map(c => (
                            <span key={c.id}
                              className="group inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              {fmt(c.nomCanal)}
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEdit(c)} title="Modifier"
                                    className="ml-1 text-gray-300 hover:text-brand-500 transition-colors">
                                    <PencilIcon className="size-3" />
                                  </button>
                                  <button onClick={() => openDelete(c)} title="Supprimer"
                                    className="text-gray-300 hover:text-error-500 transition-colors">
                                    <TrashBinIcon className="size-3" />
                                  </button>
                                </>
                              )}
                            </span>
                          ))}
                        </div>
                      </TableCell>

                      {/* Canaux inactifs — avec boutons inline si Admin */}
                      <TableCell className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {inactifs.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">—</span>
                          ) : inactifs.map(c => (
                            <span key={c.id}
                              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              <span className="line-through">{fmt(c.nomCanal)}</span>
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEdit(c)} title="Modifier"
                                    className="ml-1 text-gray-300 hover:text-brand-500 transition-colors">
                                    <PencilIcon className="size-3" />
                                  </button>
                                  <button onClick={() => openDelete(c)} title="Supprimer"
                                    className="text-gray-300 hover:text-error-500 transition-colors">
                                    <TrashBinIcon className="size-3" />
                                  </button>
                                </>
                              )}
                            </span>
                          ))}
                        </div>
                      </TableCell>

                      {/* Bouton "+" par ligne — Admin seulement */}
                      {isAdmin && (
                        <TableCell className="px-3 py-4 text-right">
                          <button
                            onClick={() => openCreateFor(code)}
                            title={`Ajouter un canal pour ${code}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors"
                          >
                            <PlusIcon className="size-3.5" /> Canal
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
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
          {/* Créancier — combobox avec recherche */}
          <div>
            <Label>Créancier *</Label>
            <div className="relative" ref={creancierDropRef}>
              <input
                type="text"
                value={creancierSearch}
                onChange={e => {
                  setCreancierSearch(e.target.value);
                  setShowCreancierDrop(true);
                  // Si l'utilisateur efface, on reset la sélection
                  if (!e.target.value) set("codeCreancier", "");
                }}
                onFocus={() => setShowCreancierDrop(true)}
                onBlur={() => setTimeout(() => setShowCreancierDrop(false), 150)}
                placeholder="Tapez le code ou le nom du créancier…"
                disabled={!!editing}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500 disabled:opacity-60"
              />
              {/* Indicateur de sélection */}
              {form.codeCreancier && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-500">
                  ✓
                </span>
              )}
              {/* Dropdown */}
              {showCreancierDrop && !editing && filteredCreanciers.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {filteredCreanciers.map(c => (
                    <button
                      key={c.codeCreancier}
                      type="button"
                      onMouseDown={() => {
                        set("codeCreancier", c.codeCreancier);
                        setCreancierSearch(`${c.codeCreancier} — ${c.nomCreancier}`);
                        setShowCreancierDrop(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-500/10 ${
                        form.codeCreancier === c.codeCreancier
                          ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="font-mono text-xs text-gray-400">{c.codeCreancier}</span>
                      <span className="truncate">{c.nomCreancier}</span>
                    </button>
                  ))}
                </div>
              )}
              {showCreancierDrop && !editing && filteredCreanciers.length === 0 && creancierSearch && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  Aucun créancier trouvé pour « {creancierSearch} »
                </div>
              )}
            </div>
          </div>
          <div>
            <Label>Canal de Paiement *</Label>
            <select value={form.nomCanal ?? "BMCE_Direct"} onChange={e => set("nomCanal", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
              {CANAUX_DISPONIBLES.map(nom => (
                <option key={nom} value={nom}>{fmt(nom)}</option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={form.actif ?? true}
              onChange={e => set("actif", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500" />
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
          Supprimer <strong>{deleting && fmt(deleting.nomCanal)}</strong> du créancier{" "}
          <strong>{deleting?.codeCreancier}</strong> ?
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
