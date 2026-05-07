import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import {
  GroupIcon, ListIcon, UserCircleIcon, DollarLineIcon,
} from "../../icons";
import {
  CreancierService, CanalPaiementService, CreanceService,
  UtilisateurService, PaiementService, ClientMobileService,
  type Paiement, type CanalPaiement, type Creancier,
} from "../../services/api";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";

// ─── couleurs canal ────────────────────────────────────────────
const CANAL_COLORS: Record<string, string> = {
  BMCE_Direct:  "bg-blue-500",
  Agences_BMCE: "bg-purple-500",
  Mobile_App:   "bg-green-500",
  Daman_Cash:   "bg-orange-500",
  Bank_Al_Karam:"bg-pink-500",
};
const CANAL_LABELS: Record<string, string> = {
  BMCE_Direct:  "BMCE Direct",
  Agences_BMCE: "Agences BMCE",
  Mobile_App:   "App Mobile",
  Daman_Cash:   "Daman Cash",
  Bank_Al_Karam:"Bank Al Karam",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Stat card ─────────────────────────────────────────────────
function StatCard({
  title, value, sub, icon, iconBg, to,
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; iconBg: string; to?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03] hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90 truncate">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

// ─── Horizontal bar chart ───────────────────────────────────────
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-gray-600 dark:text-gray-400 truncate">{label}</span>
      <div className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800 h-2">
        <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}

// ─── Statut badge ───────────────────────────────────────────────
function statutBadge(s: string) {
  const map: Record<string, "success" | "error" | "warning" | "info"> = {
    SUCCÈS: "success", SUCCES: "success",
    ECHEC: "error", ÉCHEC: "error",
    EN_ATTENTE: "warning", PENDING: "warning",
  };
  return <Badge size="sm" color={map[s] ?? "info"}>{s}</Badge>;
}

// ─── Main Dashboard ─────────────────────────────────────────────
export default function Home() {
  const [paiements,   setPaiements]   = useState<Paiement[]>([]);
  const [creanciers,  setCreanciers]  = useState<Creancier[]>([]);
  const [canaux,      setCanaux]      = useState<CanalPaiement[]>([]);
  const [nbCreances,  setNbCreances]  = useState(0);
  const [nbUsers,     setNbUsers]     = useState(0);
  const [nbClients,   setNbClients]   = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      PaiementService.getAll(),
      CreancierService.getAll(),
      CanalPaiementService.getAll(),
      CreanceService.getAll(),
      UtilisateurService.getAll(),
      ClientMobileService.getAll(),
    ]).then(([p, c, cx, cr, u, cl]) => {
      if (p.status  === "fulfilled") setPaiements(p.value);
      if (c.status  === "fulfilled") setCreanciers(c.value);
      if (cx.status === "fulfilled") setCanaux(cx.value);
      if (cr.status === "fulfilled") setNbCreances(cr.value.length);
      if (u.status  === "fulfilled") setNbUsers(u.value.length);
      if (cl.status === "fulfilled") setNbClients(cl.value.length);
    }).finally(() => setLoading(false));
  }, []);

  // ── Paiements stats ──────────────────────────────────────────
  const totalMontant = useMemo(
    () => paiements.reduce((s, p) => s + (p.montant ?? 0), 0), [paiements]
  );
  const nbSucces = useMemo(
    () => paiements.filter(p => ["SUCCÈS", "SUCCES"].includes(p.statut)).length, [paiements]
  );
  const nbEchec = useMemo(
    () => paiements.filter(p => ["ECHEC", "ÉCHEC"].includes(p.statut)).length, [paiements]
  );

  // ── Breakdown by canal ───────────────────────────────────────
  const byCanal = useMemo(() => {
    const map: Record<string, number> = {};
    paiements.forEach(p => { map[p.canalPaiement] = (map[p.canalPaiement] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [paiements]);
  const maxCanal = byCanal[0]?.[1] ?? 1;

  // ── Breakdown by créancier ───────────────────────────────────
  const byCreancier = useMemo(() => {
    const map: Record<string, number> = {};
    paiements.forEach(p => { map[p.codeCreancier] = (map[p.codeCreancier] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [paiements]);
  const maxCreancier = byCreancier[0]?.[1] ?? 1;

  // ── Créancier name lookup ────────────────────────────────────
  const creancierMap = useMemo(() => {
    const m: Record<string, string> = {};
    creanciers.forEach(c => { m[c.codeCreancier] = c.nomCreancier; });
    return m;
  }, [creanciers]);

  // ── Canaux actifs ────────────────────────────────────────────
  const canauxActifs = useMemo(() => canaux.filter(c => c.actif).length, [canaux]);

  // ── 8 derniers paiements ─────────────────────────────────────
  const recent = useMemo(
    () => [...paiements].sort((a, b) =>
      new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime()
    ).slice(0, 8),
    [paiements]
  );

  return (
    <>
      <PageMeta title="Tableau de bord — BMCE Pay" description="" />

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tableau de bord</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vue d'ensemble — BMCE Pay BackOffice
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Chargement des données…
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Ligne 1 : Stats Paiements ─────────────────────── */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Paiements
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                title="Total paiements"
                value={paiements.length}
                sub="tous statuts"
                icon={<DollarLineIcon />}
                iconBg="bg-brand-50 text-brand-500 dark:bg-brand-500/15"
                to="/paiements"
              />
              <StatCard
                title="Montant total"
                value={`${fmt(totalMontant)} MAD`}
                sub="flux cumulé"
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                iconBg="bg-success-50 text-success-500 dark:bg-success-500/15"
              />
              <StatCard
                title="Paiements réussis"
                value={nbSucces}
                sub={paiements.length > 0 ? `${Math.round((nbSucces / paiements.length) * 100)}% taux de succès` : "—"}
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                iconBg="bg-green-50 text-green-500 dark:bg-green-500/15"
              />
              <StatCard
                title="Paiements échoués"
                value={nbEchec}
                sub={paiements.length > 0 ? `${Math.round((nbEchec / paiements.length) * 100)}% taux d'échec` : "—"}
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                }
                iconBg="bg-error-50 text-error-500 dark:bg-error-500/15"
              />
            </div>
          </div>

          {/* ── Ligne 2 : Stats Référentiel ───────────────────── */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Référentiel
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              <StatCard
                title="Créanciers"
                value={creanciers.length}
                icon={<GroupIcon />}
                iconBg="bg-purple-50 text-purple-500 dark:bg-purple-500/15"
                to="/creanciers"
              />
              <StatCard
                title="Créances"
                value={nbCreances}
                icon={<ListIcon />}
                iconBg="bg-blue-50 text-blue-500 dark:bg-blue-500/15"
                to="/creances"
              />
              <StatCard
                title="Canaux actifs"
                value={canauxActifs}
                sub={`sur ${canaux.length} total`}
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                  </svg>
                }
                iconBg="bg-orange-50 text-orange-500 dark:bg-orange-500/15"
                to="/canaux"
              />
              <StatCard
                title="Clients mobiles"
                value={nbClients}
                icon={<UserCircleIcon />}
                iconBg="bg-teal-50 text-teal-500 dark:bg-teal-500/15"
                to="/clients"
              />
              <StatCard
                title="Utilisateurs BO"
                value={nbUsers}
                icon={
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                }
                iconBg="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                to="/utilisateurs"
              />
            </div>
          </div>

          {/* ── Ligne 3 : Répartition + Activité récente ─────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Répartition par canal */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                Répartition par canal
              </h4>
              {byCanal.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>
              ) : (
                <div className="space-y-3">
                  {byCanal.map(([canal, count]) => (
                    <BarRow
                      key={canal}
                      label={CANAL_LABELS[canal] ?? canal.replace(/_/g, " ")}
                      value={count}
                      max={maxCanal}
                      color={CANAL_COLORS[canal] ?? "bg-gray-400"}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Répartition par créancier */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                Top créanciers (par volume)
              </h4>
              {byCreancier.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>
              ) : (
                <div className="space-y-3">
                  {byCreancier.map(([code, count]) => (
                    <BarRow
                      key={code}
                      label={creancierMap[code] ?? code}
                      value={count}
                      max={maxCreancier}
                      color="bg-brand-500"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Ligne 4 : Activité récente ────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-6 py-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Activité récente
              </h4>
              <Link to="/paiements"
                className="text-xs font-medium text-brand-500 hover:underline">
                Voir tout →
              </Link>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
              {recent.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Aucun paiement enregistré</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      <th className="px-5 py-3">Référence</th>
                      <th className="px-5 py-3">Créancier</th>
                      <th className="px-5 py-3">Client</th>
                      <th className="px-5 py-3">Canal</th>
                      <th className="px-5 py-3 text-right">Montant</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recent.map(p => (
                      <tr key={p.idPaiement} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {p.idPaiement.slice(0, 8)}…
                        </td>
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{p.codeCreancier}</span>
                          {creancierMap[p.codeCreancier] && (
                            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                              — {creancierMap[p.codeCreancier]}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                          {p.nomClient ?? <span className="italic text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white ${CANAL_COLORS[p.canalPaiement] ?? "bg-gray-400"}`}>
                            {CANAL_LABELS[p.canalPaiement] ?? p.canalPaiement.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-800 dark:text-white/90">
                          {fmt(p.montant)} <span className="text-xs font-normal text-gray-400">MAD</span>
                        </td>
                        <td className="px-5 py-3">{statutBadge(p.statut)}</td>
                        <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {fmtDate(p.datePaiement)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}
    </>
  );
}
