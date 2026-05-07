import { useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { AuthService } from "../../services/api";

// ─── Utilitaire force de mot de passe ───────────────────────
function passwordScore(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[@#$%&*!+=\-_]/.test(pwd)) score++;
  return score;
}

const STRENGTH = [
  { label: "Très faible", color: "bg-red-500",    text: "text-red-600"    },
  { label: "Faible",      color: "bg-orange-400", text: "text-orange-600" },
  { label: "Faible",      color: "bg-orange-400", text: "text-orange-600" },
  { label: "Moyen",       color: "bg-yellow-400", text: "text-yellow-600" },
  { label: "Fort",        color: "bg-green-500",  text: "text-green-600"  },
  { label: "Fort",        color: "bg-green-500",  text: "text-green-600"  }, // score max = 5
];

// ─── Modale changement de mot de passe ──────────────────────
function ChangePasswordModal({ onSuccess }: { onSuccess: () => void }) {
  const [oldPwd,    setOldPwd]    = useState("");
  const [newPwd,    setNewPwd]    = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  const score    = passwordScore(newPwd);
  const strength = STRENGTH[score];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPwd || !newPwd || !confirm) {
      setError("Tous les champs sont obligatoires."); return;
    }
    if (newPwd !== confirm) {
      setError("Les mots de passe ne correspondent pas."); return;
    }
    if (score < 4) {
      setError("Le mot de passe n'est pas assez fort (voir indicateur ci-dessous)."); return;
    }

    setLoading(true);
    try {
      await AuthService.changePassword({ oldPassword: oldPwd, newPassword: newPwd });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  // Bouton "oeil" réutilisable
  const EyeBtn = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
      {show ? (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      ) : (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );

  return (
    /* Overlay — pas de onClick sur l'overlay pour rendre la modale infranchissable */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
            <svg className="size-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Première connexion
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Définissez votre mot de passe personnel
            </p>
          </div>
        </div>

        {/* Bandeau info */}
        <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-500/10 dark:border-amber-500/20">
          <p className="text-sm text-amber-800 dark:text-amber-400">
            ⚠️ Vous devez définir un nouveau mot de passe avant d'accéder à l'application.
            Cette étape est <strong>obligatoire</strong>.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mot de passe provisoire */}
          <div>
            <Label>Mot de passe provisoire *</Label>
            <div className="relative">
              <Input type={showOld ? "text" : "password"}
                value={oldPwd} onChange={(e) => setOldPwd(e.target.value)}
                placeholder="Votre mot de passe reçu par email" />
              <EyeBtn show={showOld} onToggle={() => setShowOld(!showOld)} />
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <Label>Nouveau mot de passe *</Label>
            <div className="relative">
              <Input type={showNew ? "text" : "password"}
                value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min. 8 car. — maj, min, chiffre, symbole" />
              <EyeBtn show={showNew} onToggle={() => setShowNew(!showNew)} />
            </div>

            {/* Barre de force */}
            {newPwd.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        score >= i ? strength.color : "bg-gray-200 dark:bg-gray-700"
                      }`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength.text}`}>
                  Force : {strength.label}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {[
                    { ok: newPwd.length >= 8,          label: "Au moins 8 caractères"  },
                    { ok: /[A-Z]/.test(newPwd),         label: "Une lettre majuscule"   },
                    { ok: /[a-z]/.test(newPwd),         label: "Une lettre minuscule"   },
                    { ok: /[0-9]/.test(newPwd),         label: "Un chiffre"             },
                    { ok: /[@#$%&*!+=\-_]/.test(newPwd),label: "Un symbole (@#$%&*!…)" },
                  ].map(({ ok, label }) => (
                    <li key={label} className={ok ? "text-green-600 dark:text-green-400" : ""}>
                      {ok ? "✓" : "○"} {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div>
            <Label>Confirmer le nouveau mot de passe *</Label>
            <div className="relative">
              <Input type={showConf ? "text" : "password"}
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Répéter le nouveau mot de passe" />
              <EyeBtn show={showConf} onToggle={() => setShowConf(!showConf)} />
            </div>
            {confirm.length > 0 && newPwd !== confirm && (
              <p className="mt-1 text-xs text-error-500">Les mots de passe ne correspondent pas.</p>
            )}
            {confirm.length > 0 && newPwd === confirm && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Les mots de passe correspondent.</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 mt-2">
            {loading ? "Enregistrement..." : "Confirmer le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page Login ──────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Veuillez remplir tous les champs"); return; }
    setError("");
    setLoading(true);
    try {
      const resp = await AuthService.login({ email, password });
      if (resp.mustChangePassword) {
        // Afficher la modale bloquante avant toute navigation
        setShowChangeModal(true);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    setShowChangeModal(false);
    navigate("/");
  };

  return (
    <>
      <PageMeta title="Connexion — BMCE Pay BackOffice" description="" />

      {/* Modale bloquante première connexion */}
      {showChangeModal && <ChangePasswordModal onSuccess={handlePasswordChanged} />}

      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img src="/images/logo/auth-logo.svg" alt="BMCE Pay" className="h-12 dark:hidden" />
            <img src="/images/logo/logo-dark.svg" alt="BMCE Pay" className="hidden h-12 dark:block" />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Connexion</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Accédez à votre espace BackOffice</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bmcepay.ma" />
              </div>

              <div>
                <Label>Mot de passe</Label>
                <div className="relative">
                  <Input type={showPwd ? "text" : "password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? (
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={loading}
                className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            BMCE Pay BackOffice © 2025
          </p>
        </div>
      </div>
    </>
  );
}
