import { useEffect, useState } from "react";
import { Link } from "react-router";
import { GroupIcon, ShootingStarIcon, ListIcon, UserCircleIcon } from "../../icons";
import { CreancierService, CanalPaiementService, CreanceService, UtilisateurService } from "../../services/api";
import PageMeta from "../../components/common/PageMeta";

interface StatCard {
  title: string;
  count: number;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export default function Home() {
  const [stats, setStats] = useState<StatCard[]>([
    { title: "Créanciers", count: 0, icon: <GroupIcon />, path: "/creanciers", color: "bg-brand-50 text-brand-500 dark:bg-brand-500/15" },
    { title: "Créances", count: 0, icon: <ListIcon />, path: "/creances", color: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15" },
    { title: "Canaux Paiement", count: 0, icon: <ShootingStarIcon />, path: "/canaux", color: "bg-warning-50 text-warning-500 dark:bg-warning-500/15" },
    { title: "Utilisateurs", count: 0, icon: <UserCircleIcon />, path: "/utilisateurs", color: "bg-success-50 text-success-500 dark:bg-success-500/15" },
  ]);

  useEffect(() => {
    Promise.all([
      CreancierService.getAll().catch(() => []),
      CreanceService.getAll().catch(() => []),
      CanalPaiementService.getAll().catch(() => []),
      UtilisateurService.getAll().catch(() => []),
    ]).then(([c, cr, cx, u]) => {
      setStats(prev => prev.map((s, i) => ({ ...s, count: [c.length, cr.length, cx.length, u.length][i] })));
    }).catch(() => {});
  }, []);

  return (
    <>
      <PageMeta title="Fatourati BackOffice — Dashboard" description="" />
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tableau de bord</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Vue d'ensemble — Fatourati BackOffice</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6">
        {stats.map((s) => (
          <Link to={s.path} key={s.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.title}</p>
                <h4 className="mt-2 text-3xl font-bold text-gray-800 dark:text-white/90">{s.count}</h4>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}>{s.icon}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
