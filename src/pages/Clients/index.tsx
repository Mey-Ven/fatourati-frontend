import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import {
  ClientMobileService,
  AuthService,
  type ClientMobile,
  type ClientMobileCreateRequest,
  type ClientMobileUpdateRequest,
} from "../../services/api";

// ── types ────────────────────────────────────────────────────────────────────
type ModalMode = "create" | "edit" | "delete" | null;

interface FormState {
  prenom: string; nom: string; email: string; password: string;
  telephone: string; cin: string;
}

const emptyForm: FormState = {
  prenom: "", nom: "", email: "", password: "",
  telephone: "", cin: "",
};

// ── helpers ──────────────────────────────────────────────────────────────────
function initials(c: ClientMobile) {
  return `${c.prenom.charAt(0)}${c.nom.charAt(0)}`.toUpperCase();
}

function InputField({
  label, value, onChange, type = "text", placeholder, optional,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{optional && <span className="ml-1 text-gray-400 font-normal">(optionnel)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
    </div>
  );
}

// ── component ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const location = useLocation();
  const [data,       setData]       = useState<ClientMobile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState((location.state as any)?.search ?? "");
  const [toast,      setToast]      = useState("");
  const [toastType,  setToastType]  = useState<"success" | "error">("success");

  const [mode,       setMode]       = useState<ModalMode>(null);
  const [selected,   setSelected]   = useState<ClientMobile | null>(null);
  const [form,       setForm]       = useState<FormState>(emptyForm);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");

  const isAdmin = AuthService.getUser()?.role === "Admin";

  // ── data loading ─────────────────────────────────────────────────────────
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

  // ── modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm); setFormError(""); setMode("create");
  };

  const openEdit = (c: ClientMobile) => {
    setSelected(c);
    setForm({
      prenom: c.prenom, nom: c.nom, email: c.email, password: "",
      telephone: c.telephone ?? "", cin: c.cin ?? "",
    });
    setFormError("");
    setMode("edit");
  };

  const openDelete = (c: ClientMobile) => { setSelected(c); setMode("delete"); };
  const closeModal = () => { setMode(null); setSelected(null); setFormError(""); };

  const setF = (k: keyof FormState) => (v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setFormError("");
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      setFormError("Prénom, nom et email sont obligatoires."); return;
    }
    if (mode === "create" && !form.password) {
      setFormError("Le mot de passe est obligatoire pour la création."); return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        const payload: ClientMobileCreateRequest = {
          prenom:    form.prenom.trim(),
          nom:       form.nom.trim(),
          email:     form.email.trim(),
          password:  form.password,
          telephone: form.telephone.trim() || undefined,
          cin:       form.cin.trim() || undefined,
        };
        await ClientMobileService.create(payload);
        showToast(`Compte de ${form.prenom} ${form.nom} créé`);
      } else if (mode === "edit" && selected) {
        const payload: ClientMobileUpdateRequest = {
          prenom:    form.prenom.trim(),
          nom:       form.nom.trim(),
          email:     form.email.trim(),
          telephone: form.telephone.trim() || undefined,
          cin:       form.cin.trim() || undefined,
          password:  form.password || undefined,
        };
        await ClientMobileService.update(selected.id, payload);
        showToast(`Compte de ${form.prenom} ${form.nom} mis à jour`);
      }
      closeModal();
      load();
    } catch (e: any) {
      setFormError(e.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await ClientMobileService.delete(selected.id);
      showToast(`Compte de ${selected.prenom} ${selected.nom} supprimé`);
      closeModal();
      load();
    } catch (e: any) {
      showToast("Erreur : " + e.message, "error");
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  // ── toggle actif ──────────────────────────────────────────────────────────
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter(c =>
      c.email.toLowerCase().includes(q) ||
      (c.nom + " " + c.prenom).toLowerCase().includes(q) ||
      (c.cin ?? "").toLowerCase().includes(q) ||
      (c.telephone ?? "").includes(q)
    );
  }, [data, search]);

  const actifCount = data.filter(c => c.actif).length;

  return (
    <>
      <PageMeta title="Clients — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Clients de l'Application Mobile" />

      {/* Toast */}
      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          toastType === "success"
            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
            : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
        }`}>{toast}</div>
      )}

      {/* Stats cards */}
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

      {/* Table card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {filtered.length} / {data.length} client(s)
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, email, CIN…"
              className="h-9 w-64 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
            {isAdmin && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau client
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-gray-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-gray-500">
              {search ? `Aucun résultat pour "${search}"` : "Aucun client inscrit"}
            </p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["ID", "Nom complet", "Email", "Téléphone", "CIN", "Statut", "Date inscription",
                    ...(isAdmin ? ["Actions"] : [])
                  ].map(h => (
                    <TableCell key={h} isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm">{c.id}</TableCell>

                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-500 dark:bg-brand-500/15">
                          {initials(c)}
                        </div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {c.prenom} {c.nom}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{c.email}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {c.telephone ?? <span className="italic text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="px-5 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {c.cin ?? <span className="italic text-gray-400">—</span>}
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
                        <div className="flex items-center gap-2">
                          {/* Activer / Désactiver */}
                          <button
                            onClick={() => toggleActif(c)}
                            title={c.actif ? "Désactiver" : "Activer"}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              c.actif
                                ? "bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-500/10 dark:text-error-400"
                                : "bg-success-50 text-success-600 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400"
                            }`}
                          >
                            {c.actif ? "Désactiver" : "Activer"}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEdit(c)}
                            title="Modifier"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors dark:bg-blue-500/10 dark:text-blue-400"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => openDelete(c)}
                            title="Supprimer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-50 text-error-600 hover:bg-error-100 transition-colors dark:bg-error-500/10 dark:text-error-400"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* ── Create / Edit modal ─────────────────────────────────────────────── */}
      {(mode === "create" || mode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {mode === "create" ? "Nouveau client mobile" : `Modifier — ${selected?.prenom} ${selected?.nom}`}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Prénom *" value={form.prenom} onChange={setF("prenom")} placeholder="Sara" />
                <InputField label="Nom *" value={form.nom} onChange={setF("nom")} placeholder="Alami" />
              </div>

              <InputField label="Email *" value={form.email} onChange={setF("email")}
                type="email" placeholder="sara.alami@gmail.com" />

              <InputField
                label={mode === "create" ? "Mot de passe *" : "Nouveau mot de passe"}
                value={form.password} onChange={setF("password")}
                type="password"
                placeholder={mode === "edit" ? "Laisser vide pour ne pas modifier" : "Min. 6 caractères"}
                optional={mode === "edit"}
              />

              <InputField label="Téléphone" value={form.telephone} onChange={setF("telephone")}
                placeholder="+212661234567" optional />

              <InputField label="CIN" value={form.cin} onChange={setF("cin")}
                placeholder="AB123456" optional />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <button onClick={closeModal}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
                {saving ? "Enregistrement..." : mode === "create" ? "Créer le compte" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ────────────────────────────────────────────────────── */}
      {mode === "delete" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
                <svg className="h-7 w-7 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-800 dark:text-white">Supprimer le compte</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Êtes-vous sûr de vouloir supprimer le compte de{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {selected.prenom} {selected.nom}
                </span>{" "}? Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <button onClick={closeModal} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 rounded-xl bg-error-500 py-2.5 text-sm font-semibold text-white hover:bg-error-600 disabled:opacity-60 transition-colors">
                {saving ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
