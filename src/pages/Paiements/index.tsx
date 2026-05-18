import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import {
  PaiementService,
  CreancierService,
  CreanceService,
  CanalPaiementService,
  AuthService,
  type Paiement,
  type PaiementSearchRequest,
  type Creancier,
  type Creance,
  type CanalPaiement,
} from "../../services/api";

const STATUTS = ["EFFECTUE", "EN_ATTENTE", "ECHEC", "ANNULE"];

const statutColor = (s: string): "success" | "warning" | "error" | "info" => {
  if (s === "EFFECTUE")   return "success";
  if (s === "EN_ATTENTE") return "warning";
  if (s === "ECHEC")      return "error";
  return "info";
};

type PaiementForm = {
  codeCreancier: string; idCreance: string; referenceFacture: string;
  referenceArticle: string; ribClient: string; numeroCompte: string;
  numeroTiers: string; nomClient: string; montant: string; contratBat: string;
  canalPaiement: string; matricule: string; statut: string;
  referenceTransaction: string; datePaiement: string;
};

const emptyForm: PaiementForm = {
  codeCreancier: "", idCreance: "", referenceFacture: "",
  referenceArticle: "", ribClient: "", numeroCompte: "",
  numeroTiers: "", nomClient: "", montant: "", contratBat: "",
  canalPaiement: "", matricule: "", statut: "EFFECTUE",
  referenceTransaction: "", datePaiement: "",
};

const emptySearch: PaiementSearchRequest = {};

// ── Composant Select réutilisable ─────────────────────────────────────────────
const Select = ({ value, onChange, disabled, children, placeholder }: {
  value: string; onChange: (v: string) => void;
  disabled?: boolean; children: React.ReactNode; placeholder?: string;
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm
               disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
               dark:border-gray-700 dark:bg-gray-900 dark:text-white/90
               dark:disabled:bg-gray-800"
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
);

export default function PaiementsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // ── Données principales ───────────────────────────────────────────────────
  const [data, setData]         = useState<Paiement[]>([]);
  const [loading, setLoading]   = useState(true);

  // ── Référentiels (chargés une fois au montage) ────────────────────────────
  const [creanciers, setCreanciers]   = useState<Creancier[]>([]);
  const [allCreances, setAllCreances] = useState<Creance[]>([]);
  const [allCanaux, setAllCanaux]     = useState<CanalPaiement[]>([]);

  // ── Listes filtrées selon la sélection en cours ───────────────────────────
  const [canauxForm,    setCanauxForm]    = useState<CanalPaiement[]>([]);
  const [creancesForm,  setCreancesForm]  = useState<Creance[]>([]);
  const [canauxSearch,  setCanauxSearch]  = useState<CanalPaiement[]>([]);
  const [creancesSearch,setCreancesSearch]= useState<Creance[]>([]);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing,  setEditing]      = useState<Paiement | null>(null);
  const [deleting, setDeleting]     = useState<Paiement | null>(null);

  // ── Formulaire & recherche ────────────────────────────────────────────────
  const [form,   setForm]   = useState<PaiementForm>(emptyForm);
  const navState = (location.state as any) ?? {};
  const [search, setSearch] = useState<PaiementSearchRequest>(
    navState.search ? { codeCreancier: navState.search } : emptySearch
  );
  const [isSearchActive, setIsSearchActive] = useState(!!navState.search);
  const [searchOpen, setSearchOpen] = useState(!!navState.search);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast]         = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Maps lookup (code → nom) pour enrichir le tableau ────────────────────
  const creancierMap = useMemo(() =>
    Object.fromEntries(creanciers.map(c => [c.codeCreancier, c.nomCreancier])),
    [creanciers]
  );
  const creanceMap = useMemo(() =>
    Object.fromEntries(allCreances.map(c => [c.idCreance, c.nomCreance])),
    [allCreances]
  );

  // ── Chargement initial ────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    PaiementService.getAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    CreancierService.getAll().then(setCreanciers).catch(() => {});
    CreanceService.getAll().then(setAllCreances).catch(() => {});
    CanalPaiementService.getAll().then(setAllCanaux).catch(() => {});
  }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3500);
  };

  // ── Quand le créancier change dans le formulaire ──────────────────────────
  const onCreancierChangeForm = (code: string) => {
    setForm(f => ({ ...f, codeCreancier: code, canalPaiement: "", idCreance: "" }));
    if (code) {
      setCanauxForm(allCanaux.filter(c => c.codeCreancier === code && c.actif));
      setCreancesForm(allCreances.filter(c => c.codeCreancier === code));
    } else {
      setCanauxForm([]);
      setCreancesForm([]);
    }
  };

  // ── Quand le créancier change dans la recherche ───────────────────────────
  const onCreancierChangeSearch = (code: string) => {
    setSearch(s => ({ ...s, codeCreancier: code, canalPaiement: undefined, idCreance: undefined }));
    if (code) {
      setCanauxSearch(allCanaux.filter(c => c.codeCreancier === code && c.actif));
      setCreancesSearch(allCreances.filter(c => c.codeCreancier === code));
    } else {
      setCanauxSearch([]);
      setCreancesSearch([]);
    }
  };

  // ── Ouvrir modal création ─────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setCanauxForm([]);
    setCreancesForm([]);
    setModalOpen(true);
  };

  // ── Ouvrir modal édition ──────────────────────────────────────────────────
  const openEdit = (p: Paiement) => {
    setEditing(p);
    setForm({
      codeCreancier: p.codeCreancier ?? "", idCreance: p.idCreance ?? "",
      referenceFacture: p.referenceFacture ?? "", referenceArticle: p.referenceArticle ?? "",
      ribClient: p.ribClient ?? "", numeroCompte: p.numeroCompte ?? "",
      numeroTiers: p.numeroTiers ?? "", nomClient: p.nomClient ?? "",
      montant: p.montant?.toString() ?? "", contratBat: p.contratBat ?? "",
      canalPaiement: p.canalPaiement ?? "", matricule: p.matricule ?? "",
      statut: p.statut ?? "EFFECTUE", referenceTransaction: p.referenceTransaction ?? "",
      datePaiement: p.datePaiement ? p.datePaiement.slice(0, 16) : "",
    });
    if (p.codeCreancier) {
      setCanauxForm(allCanaux.filter(c => c.codeCreancier === p.codeCreancier && c.actif));
      setCreancesForm(allCreances.filter(c => c.codeCreancier === p.codeCreancier));
    }
    setModalOpen(true);
  };

  const openDelete = (p: Paiement) => { setDeleting(p); setDeleteOpen(true); };

  // ── Sauvegarder ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.codeCreancier || !form.montant || !form.canalPaiement) {
      showToast("Créancier, montant et canal sont obligatoires", "error"); return;
    }
    try {
      const payload: Partial<Paiement> = {
        codeCreancier: form.codeCreancier,
        idCreance: form.idCreance || undefined,
        referenceFacture: form.referenceFacture || undefined,
        referenceArticle: form.referenceArticle || undefined,
        ribClient: form.ribClient || undefined,
        numeroCompte: form.numeroCompte || undefined,
        numeroTiers: form.numeroTiers || undefined,
        nomClient: form.nomClient || undefined,
        montant: parseFloat(form.montant),
        contratBat: form.contratBat || undefined,
        canalPaiement: form.canalPaiement,
        matricule: form.matricule || undefined,
        statut: form.statut,
        referenceTransaction: form.referenceTransaction || undefined,
        datePaiement: form.datePaiement || undefined,
      };
      if (editing) {
        await PaiementService.update(editing.idPaiement, payload);
        showToast("Paiement modifié");
      } else {
        await PaiementService.create(payload);
        showToast("Paiement enregistré");
      }
      setModalOpen(false); load();
    } catch (e: any) { showToast("Erreur : " + e.message, "error"); }
  };

  // ── Supprimer ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await PaiementService.delete(deleting.idPaiement);
      showToast("Paiement supprimé"); setDeleteOpen(false); load();
    } catch (e: any) { showToast("Erreur : " + e.message, "error"); }
  };

  // ── Recherche ────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    setLoading(true);
    try {
      const cleaned: PaiementSearchRequest = {};
      if (search.codeCreancier)    cleaned.codeCreancier   = search.codeCreancier;
      if (search.idCreance)        cleaned.idCreance        = search.idCreance;
      if (search.referenceFacture) cleaned.referenceFacture = search.referenceFacture;
      if (search.ribClient)        cleaned.ribClient        = search.ribClient;
      if (search.nomClient)        cleaned.nomClient        = search.nomClient;
      if (search.canalPaiement)    cleaned.canalPaiement    = search.canalPaiement;
      if (search.statut)           cleaned.statut           = search.statut;
      if (search.montantMin)       cleaned.montantMin       = Number(search.montantMin);
      if (search.montantMax)       cleaned.montantMax       = Number(search.montantMax);
      if (search.dateDebut)        cleaned.dateDebut        = search.dateDebut + ":00";
      if (search.dateFin)          cleaned.dateFin          = search.dateFin + ":59";

      const results = await PaiementService.search(cleaned);
      setData(results);
      setIsSearchActive(true);
    } catch (e: any) { showToast("Erreur recherche : " + e.message, "error"); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setSearch(emptySearch);
    setCanauxSearch([]);
    setCreancesSearch([]);
    setIsSearchActive(false);
    load();
  };

  const sf = (field: keyof PaiementSearchRequest, value: any) =>
    setSearch(s => ({ ...s, [field]: value }));

  const isAdmin = AuthService.getUser()?.role === "Admin";

  return (
    <>
      <PageMeta title="Paiements — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Historique des Paiements" />

      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${toastType === "success"
          ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
          : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"}`}>
          {toast}
        </div>
      )}

      {/* ── Panneau de recherche (masqué par défaut) ─────────────────────── */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <button onClick={() => setSearchOpen(o => !o)}
          className="flex w-full items-center justify-between px-6 py-3 text-left">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtres de recherche
            {isSearchActive && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">Actif</span>}
          </span>
          <svg className={`size-4 text-gray-400 transition-transform ${searchOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {searchOpen && (
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <Label>Créancier</Label>
                <Select value={search.codeCreancier ?? ""} placeholder="— Tous —" onChange={onCreancierChangeSearch}>
                  {creanciers.map(c => <option key={c.codeCreancier} value={c.codeCreancier}>{c.codeCreancier} — {c.nomCreancier}</option>)}
                </Select>
              </div>
              <div>
                <Label>Créance</Label>
                <Select value={search.idCreance ?? ""}
                  placeholder={search.codeCreancier ? "— Toutes —" : "— Choisir créancier —"}
                  onChange={v => sf("idCreance", v || undefined)} disabled={!search.codeCreancier}>
                  {(search.codeCreancier ? creancesSearch : allCreances).map(c => <option key={c.idCreance} value={c.idCreance}>{c.nomCreance}</option>)}
                </Select>
              </div>
              <div>
                <Label>Canal</Label>
                <Select value={search.canalPaiement ?? ""}
                  placeholder={search.codeCreancier ? "— Tous —" : "— Choisir créancier —"}
                  onChange={v => sf("canalPaiement", v || undefined)} disabled={!search.codeCreancier}>
                  {(search.codeCreancier ? canauxSearch : allCanaux).filter(c => c.actif)
                    .map(c => <option key={c.id} value={c.nomCanal}>{c.nomCanal.replace(/_/g, " ")}</option>)}
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={search.statut ?? ""} placeholder="— Tous —" onChange={v => sf("statut", v || undefined)}>
                  {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <Label>Nom client</Label>
                <Input placeholder="Recherche partielle…" value={search.nomClient ?? ""}
                  onChange={e => sf("nomClient", e.target.value || undefined)} />
              </div>
              <div>
                <Label>Réf. facture</Label>
                <Input placeholder="FAC-2025-001" value={search.referenceFacture ?? ""}
                  onChange={e => sf("referenceFacture", e.target.value || undefined)} />
              </div>
              <div>
                <Label>Montant min</Label>
                <Input type="number" placeholder="0" value={search.montantMin ?? ""}
                  onChange={e => sf("montantMin", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Montant max</Label>
                <Input type="number" placeholder="∞" value={search.montantMax ?? ""}
                  onChange={e => sf("montantMax", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Date début</Label>
                <Input type="datetime-local" value={(search.dateDebut ?? "").replace(":00", "")}
                  onChange={e => sf("dateDebut", e.target.value)} />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input type="datetime-local" value={(search.dateFin ?? "").replace(":59", "")}
                  onChange={e => sf("dateFin", e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={handleReset}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                Réinitialiser
              </button>
              <button onClick={handleSearch}
                className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
                Rechercher
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tableau des paiements ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {data.length} paiement(s)
            {isSearchActive && <span className="ml-2 text-xs text-brand-500">— résultat filtré</span>}
          </h3>
          {isAdmin && (
            <button onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              <PlusIcon className="size-4" /> Nouveau Paiement
            </button>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Aucun paiement trouvé</p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["ID · Date", "Créancier", "Créance", "Canal", "Client", "Montant", "Statut", ...(isAdmin ? ["Actions"] : [])].map(h => (
                    <TableCell key={h} isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.map(p => (
                  <TableRow key={p.idPaiement}>

                    {/* ID + Date combinés */}
                    <TableCell className="px-5 py-4 whitespace-nowrap">
                      <span className="block font-mono text-xs text-gray-500">{p.idPaiement}</span>
                      <span className="text-xs text-gray-400">{new Date(p.datePaiement).toLocaleString("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
                    </TableCell>

                    {/* Créancier — cliquable */}
                    <TableCell className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate("/creanciers", { state: { search: p.codeCreancier } })}
                        className="text-left hover:underline"
                      >
                        <span className="block text-sm font-semibold text-brand-600 dark:text-brand-400">
                          {p.codeCreancier}
                        </span>
                        <span className="text-xs text-gray-400">
                          {creancierMap[p.codeCreancier] ?? ""}
                        </span>
                      </button>
                    </TableCell>

                    {/* Créance — cliquable */}
                    <TableCell className="px-5 py-4 whitespace-nowrap">
                      {p.idCreance ? (
                        <button
                          onClick={() => navigate("/creances", { state: { search: p.idCreance } })}
                          className="text-left hover:underline"
                        >
                          <span className="block font-mono text-xs font-medium text-brand-600 dark:text-brand-400">
                            {p.idCreance}
                          </span>
                          <span className="text-xs text-gray-400">
                            {creanceMap[p.idCreance] ?? ""}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </TableCell>

                    {/* Canal de paiement */}
                    <TableCell className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 whitespace-nowrap">
                        {p.canalPaiement.replace(/_/g, " ")}
                      </span>
                    </TableCell>

                    {/* Client */}
                    <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-[120px] truncate">
                      {p.nomClient ?? <span className="text-gray-400 italic">—</span>}
                    </TableCell>

                    {/* Montant */}
                    <TableCell className="px-4 py-4 text-sm font-semibold text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {Number(p.montant).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="px-4 py-4">
                      <Badge size="sm" color={statutColor(p.statut)}>{p.statut}</Badge>
                    </TableCell>

                    {/* Actions — Admin seulement */}
                    {isAdmin && (
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)} title="Modifier"
                            className="text-gray-400 hover:text-brand-500 transition-colors">
                            <PencilIcon className="size-5" />
                          </button>
                          <button onClick={() => openDelete(p)} title="Supprimer"
                            className="text-gray-400 hover:text-error-500 transition-colors">
                            <TrashBinIcon className="size-5" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ── Modal Créer / Modifier ─────────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-2xl p-6 lg:p-8">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">
          {editing ? "Modifier le Paiement" : "Nouveau Paiement"}
        </h4>
        <div className="space-y-4">

          {/* Créancier */}
          <div>
            <Label>Créancier *</Label>
            <Select value={form.codeCreancier} placeholder="— Sélectionner un créancier —"
              onChange={onCreancierChangeForm}>
              {creanciers.map(c => (
                <option key={c.codeCreancier} value={c.codeCreancier}>
                  {c.codeCreancier} — {c.nomCreancier}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Canal — filtré par créancier */}
            <div>
              <Label>Canal de Paiement *</Label>
              <Select
                value={form.canalPaiement}
                placeholder={form.codeCreancier ? "— Sélectionner un canal —" : "— Choisir d'abord un créancier —"}
                onChange={v => setForm(f => ({ ...f, canalPaiement: v }))}
                disabled={!form.codeCreancier}
              >
                {canauxForm.map(c => (
                  <option key={c.id} value={c.nomCanal}>
                    {c.nomCanal.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
              {form.codeCreancier && canauxForm.length === 0 && (
                <p className="mt-1 text-xs text-warning-500">Aucun canal actif pour ce créancier</p>
              )}
            </div>

            {/* Créance — filtrée par créancier */}
            <div>
              <Label>Créance *</Label>
              <Select
                value={form.idCreance}
                placeholder={form.codeCreancier ? "— Sélectionner une créance —" : "— Choisir d'abord un créancier —"}
                onChange={v => setForm(f => ({ ...f, idCreance: v }))}
                disabled={!form.codeCreancier}
              >
                {creancesForm.map(c => (
                  <option key={c.idCreance} value={c.idCreance}>
                    {c.idCreance} — {c.nomCreance}
                  </option>
                ))}
              </Select>
              {form.codeCreancier && creancesForm.length === 0 && (
                <p className="mt-1 text-xs text-warning-500">Aucune créance pour ce créancier</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom Client</Label>
              <Input value={form.nomClient} placeholder="Ex: Mohammed Alami"
                onChange={e => setForm({ ...form, nomClient: e.target.value })} />
            </div>
            <div>
              <Label>RIB Client</Label>
              <Input value={form.ribClient} placeholder="24 chiffres"
                onChange={e => setForm({ ...form, ribClient: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Référence Facture</Label>
              <Input value={form.referenceFacture} placeholder="Ex: FAC-2025-001"
                onChange={e => setForm({ ...form, referenceFacture: e.target.value })} />
            </div>
            <div>
              <Label>Référence Transaction</Label>
              <Input value={form.referenceTransaction} placeholder="Ex: TXN-00123"
                onChange={e => setForm({ ...form, referenceTransaction: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Montant (MAD) *</Label>
              <Input type="number" value={form.montant} placeholder="0.00"
                onChange={e => setForm({ ...form, montant: e.target.value })} />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.statut} onChange={v => setForm(f => ({ ...f, statut: v }))}>
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label>Matricule</Label>
              <Input value={form.matricule}
                onChange={e => setForm({ ...form, matricule: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Date de Paiement</Label>
            <Input type="datetime-local" value={form.datePaiement}
              onChange={e => setForm({ ...form, datePaiement: e.target.value })} />
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

      {/* ── Modal Suppression ─────────────────────────────────────────────── */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} className="max-w-sm p-6">
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Supprimer le paiement</h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Supprimer le paiement <strong>{deleting?.idPaiement}</strong> de{" "}
          <strong>{Number(deleting?.montant).toLocaleString("fr-MA")} MAD</strong> ?
          <br />Cette action est irréversible.
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
