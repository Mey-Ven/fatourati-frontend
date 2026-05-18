import { useEffect, useState, useCallback, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { UtilisateurService, type Utilisateur } from "../../services/api";

type UserForm = {
  nom: string; prenom: string; email: string; password: string; role: string; actif: boolean;
};
const emptyForm: UserForm = { nom: "", prenom: "", email: "", password: "", role: "Consultant", actif: true };
// Note: password n'est utilisé que pour l'édition (changement optionnel)

export default function UtilisateursPage() {
  const [data, setData] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Utilisateur | null>(null);
  const [deleting, setDeleting] = useState<Utilisateur | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter(u =>
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [data, search]);

  const load = useCallback(() => {
    setLoading(true);
    UtilisateurService.getAll().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3500);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (u: Utilisateur) => {
    setEditing(u);
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email, password: "", role: u.role, actif: u.actif });
    setModalOpen(true);
  };
  const openDelete = (u: Utilisateur) => { setDeleting(u); setDeleteOpen(true); };

  const handleSave = async () => {
    if (!form.nom || !form.prenom || !form.email) {
      showToast("Nom, prénom et email sont obligatoires", "error"); return;
    }
    try {
      if (editing) {
        const payload: any = { nom: form.nom, prenom: form.prenom, email: form.email, role: form.role, actif: form.actif };
        if (form.password) payload.password = form.password;
        await UtilisateurService.update(editing.id, payload);
        showToast("Utilisateur modifié");
      } else {
        // Création sans mot de passe — généré côté serveur et envoyé par email
        await UtilisateurService.create({ nom: form.nom, prenom: form.prenom, email: form.email, role: form.role });
        showToast("Utilisateur créé — un email avec le mot de passe provisoire a été envoyé");
      }
      setModalOpen(false); load();
    } catch (e: any) { showToast("Erreur: " + e.message, "error"); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await UtilisateurService.delete(deleting.id);
      showToast("Utilisateur supprimé"); setDeleteOpen(false); load();
    } catch (e: any) { showToast("Erreur: " + e.message, "error"); }
  };

  return (
    <>
      <PageMeta title="Utilisateurs — BMCE Pay" description="" />
      <PageBreadcrumb pageTitle="Utilisateurs" />

      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${toastType === "success" ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"}`}>{toast}</div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {filtered.length} / {data.length} utilisateur(s)
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, rôle…"
              className="h-9 w-64 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
            <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              <PlusIcon className="size-4" /> Nouvel Utilisateur
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {loading ? <p className="p-6 text-center text-gray-500">Chargement...</p> : filtered.length === 0 ? (
            <p className="p-6 text-center text-gray-500">
              {search ? `Aucun résultat pour « ${search} »` : "Aucun utilisateur"}
            </p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {["ID", "Nom complet", "Email", "Rôle", "Statut", "Date Création", "Actions"].map(h => (
                    <TableCell key={h} isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{h}</TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm">{u.id}</TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-500 dark:bg-brand-500/15">
                          {u.prenom.charAt(0)}{u.nom.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{u.prenom} {u.nom}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-theme-sm dark:text-gray-300">{u.email}</TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color={u.role === "Admin" ? "primary" : "info"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color={u.actif ? "success" : "error"}>{u.actif ? "Actif" : "Inactif"}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-theme-xs">
                      {u.dateCreation ? new Date(u.dateCreation).toLocaleDateString("fr-FR") : "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-gray-500 hover:text-brand-500"><PencilIcon className="size-5" /></button>
                        <button onClick={() => openDelete(u)} className="text-gray-500 hover:text-error-500"><TrashBinIcon className="size-5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-lg p-6 lg:p-8">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white">{editing ? "Modifier l'Utilisateur" : "Nouvel Utilisateur"}</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom *</Label>
              <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Ex: Fatima" />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Benali" />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Ex: fatima@bmcepay.ma" />
          </div>
          {editing ? (
            <div>
              <Label>Nouveau mot de passe (laisser vide pour ne pas changer)</Label>
              <Input type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 caractères" />
            </div>
          ) : (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 size-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Un <strong>mot de passe provisoire</strong> sera généré automatiquement et envoyé
                  par email à l'utilisateur. Il lui sera demandé de le changer lors de sa première connexion.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rôle *</Label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                <option value="Admin">Admin</option>
                <option value="Consultant">Consultant</option>
              </select>
            </div>
            {editing && (
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                  Compte actif
                </label>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
          <button onClick={handleSave} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">{editing ? "Enregistrer" : "Créer"}</button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} className="max-w-sm p-6">
        <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Supprimer l'utilisateur</h4>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Supprimer <strong>{deleting?.prenom} {deleting?.nom}</strong> ({deleting?.email}) ?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
          <button onClick={handleDelete} className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600">Supprimer</button>
        </div>
      </Modal>
    </>
  );
}
