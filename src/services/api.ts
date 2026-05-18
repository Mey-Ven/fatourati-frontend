const API_BASE = "http://localhost:8081/api";
const API_AUTH = "http://localhost:8083/api";

// ─── Auth helper ───
function getToken(): string | null {
  return sessionStorage.getItem("token");
}

// ─── Generic fetch helper ───
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { headers, ...options });
  if (res.status === 204) return {} as T;
  if (res.status === 401) {
    // Token expiré ou invalide — nettoyer la session sans redirect agressif
    // Le ProtectedRoute gère la redirection au prochain changement de route
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    throw new Error("Session expirée — veuillez vous reconnecter");
  }
  if (res.status === 403) {
    // Accès refusé (rôle insuffisant) — ne pas toucher à la session
    throw new Error("Accès non autorisé");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

// ─── Auth ───
export interface LoginRequest { email: string; password: string; }
export interface LoginResponse {
  token: string; email: string; nom: string; prenom: string; role: string;
  mustChangePassword: boolean;
}
export interface UserInfo {
  email: string; nom: string; prenom: string; role: string;
  mustChangePassword: boolean;
}

export const AuthService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await fetch(`${API_AUTH}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erreur de connexion" }));
      throw new Error(err.message);
    }
    const resp: LoginResponse = await res.json();
    sessionStorage.setItem("token", resp.token);
    sessionStorage.setItem("user", JSON.stringify({
      email: resp.email, nom: resp.nom, prenom: resp.prenom,
      role: resp.role, mustChangePassword: resp.mustChangePassword,
    }));
    return resp;
  },
  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<LoginResponse> => {
    const res = await request<LoginResponse>(`${API_AUTH}/auth/change-password`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Mettre à jour le token et l'utilisateur en session
    sessionStorage.setItem("token", res.token);
    sessionStorage.setItem("user", JSON.stringify({
      email: res.email, nom: res.nom, prenom: res.prenom,
      role: res.role, mustChangePassword: false,
    }));
    return res;
  },
  logout: () => { sessionStorage.clear(); window.location.href = "/login"; },
  getUser: (): UserInfo | null => {
    const u = sessionStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  },
  isAuthenticated: () => !!sessionStorage.getItem("token"),
  mustChangePassword: (): boolean => {
    const user = AuthService.getUser();
    return user?.mustChangePassword === true;
  },
};

// ─── Utilisateurs (port 8083) ───
export interface Utilisateur {
  id: number; nom: string; prenom: string; email: string; role: string; actif: boolean;
  dateCreation: string; dateModification: string;
}

export const UtilisateurService = {
  getAll: () => request<Utilisateur[]>(`${API_AUTH}/utilisateurs`),
  getById: (id: number) => request<Utilisateur>(`${API_AUTH}/utilisateurs/${id}`),
  create: (data: { nom: string; prenom: string; email: string; role: string }) =>
    request<Utilisateur>(`${API_AUTH}/utilisateurs`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Utilisateur & { password?: string }>) =>
    request<Utilisateur>(`${API_AUTH}/utilisateurs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API_AUTH}/utilisateurs/${id}`, { method: "DELETE" }),
};

// ─── Types Creanciers ───
export interface Creancier {
  codeCreancier: string;
  nomCreancier: string;
  logo: string | null;
  logoUrl: string | null;
  nombreCreances: number;
  dateCreation: string;
  dateModification: string;
}

/**
 * Parametrage facturier : fiche metier complete d'un creancier.
 * PK = codeCreancier (pas d'id auto-genere).
 * Contraintes: typeCommission ∈ {PF,FF,PC}, typeRib ∈ {C,D}, RIB = 24 chiffres.
 */
export interface ParamFacturier {
  codeCreancier: string;
  nomCreancier: string;
  typeCommission: string;         // PF | FF | PC
  ribCreancier: string;
  typeRib: string;                // C | D
  valeurCommission: string;
  commissionMinimale: string;
  commissionBmce: string;
  tvaBmce: string;
  logo: string | null;
  racine: string;
  annexe: string;
  levelsecurity: number;
  dateCreation?: string;
  dateModification?: string;
}

export interface CanalPaiement {
  id: number;
  codeCreancier: string;
  nomCanal: string;
  actif: boolean;
}

// ─── Créanciers (port 8081) ───
export const CreancierService = {
  getAll: () => request<Creancier[]>(`${API_BASE}/creanciers`),
  getByCode: (code: string) => request<Creancier>(`${API_BASE}/creanciers/${code}`),
  create: async (data: FormData) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/creanciers`, { method: "POST", headers, body: data });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erreur création" }));
      throw new Error(err.message || "Erreur création");
    }
    return res.json();
  },
  update: async (code: string, data: FormData) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/creanciers/${code}`, { method: "PUT", headers, body: data });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erreur modification" }));
      throw new Error(err.message || "Erreur modification");
    }
    return res.json();
  },
  delete: (code: string) => request<void>(`${API_BASE}/creanciers/${code}`, { method: "DELETE" }),
};

/**
 * Paramétrage Facturier (port 8081)
 * Endpoints: /api/parametrage-creanciers/{code}
 * PK: codeCreancier (String, 4 caracteres).
 */
export const ParamFacturierService = {
  getAll: () => request<ParamFacturier[]>(`${API_BASE}/parametrage-creanciers`),
  getByCode: (code: string) => request<ParamFacturier>(`${API_BASE}/parametrage-creanciers/${code}`),
  create: (data: Partial<ParamFacturier>) =>
    request<ParamFacturier>(`${API_BASE}/parametrage-creanciers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (code: string, data: Partial<ParamFacturier>) =>
    request<ParamFacturier>(`${API_BASE}/parametrage-creanciers/${code}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (code: string) =>
    request<void>(`${API_BASE}/parametrage-creanciers/${code}`, { method: "DELETE" }),
};

// ─── Canaux de Paiement (port 8081) ───
export const CanalPaiementService = {
  getAll: () => request<CanalPaiement[]>(`${API_BASE}/canaux-paiement`),
  getById: (id: number) => request<CanalPaiement>(`${API_BASE}/canaux-paiement/${id}`),
  create: (data: Partial<CanalPaiement>) => request<CanalPaiement>(`${API_BASE}/canaux-paiement`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CanalPaiement>) => request<CanalPaiement>(`${API_BASE}/canaux-paiement/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API_BASE}/canaux-paiement/${id}`, { method: "DELETE" }),
};

// ─── Paiements (paiement-service port 8084) ───
const API_PAIEMENT = "http://localhost:8084/api";

export interface Paiement {
  idPaiement: string;
  codeCreancier: string;
  idCreance: string | null;
  referenceFacture: string | null;
  referenceArticle: string | null;
  ribClient: string | null;
  numeroCompte: string | null;
  numeroTiers: string | null;
  nomClient: string | null;
  montant: number;
  contratBat: string | null;
  canalPaiement: string;
  matricule: string | null;
  statut: string;
  idClient: number | null;
  referenceTransaction: string | null;
  datePaiement: string;
}

export interface PaiementSearchRequest {
  codeCreancier?: string;
  idCreance?: string;
  referenceFacture?: string;
  ribClient?: string;
  nomClient?: string;
  canalPaiement?: string;
  statut?: string;
  montantMin?: number;
  montantMax?: number;
  dateDebut?: string;
  dateFin?: string;
}

export const PaiementService = {
  getAll: () => request<Paiement[]>(`${API_PAIEMENT}/paiements`),
  getById: (id: string) => request<Paiement>(`${API_PAIEMENT}/paiements/${id}`),
  getByCreance: (idCreance: string) =>
    request<Paiement[]>(`${API_PAIEMENT}/paiements/creance/${idCreance}`),
  search: (data: PaiementSearchRequest) =>
    request<Paiement[]>(`${API_PAIEMENT}/paiements/search`, {
      method: "POST", body: JSON.stringify(data),
    }),
  create: (data: Partial<Paiement>) =>
    request<Paiement>(`${API_PAIEMENT}/paiements`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Paiement>) =>
    request<Paiement>(`${API_PAIEMENT}/paiements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`${API_PAIEMENT}/paiements/${id}`, { method: "DELETE" }),
};

// ─── Créances (creance-service port 8082) ───
const API_CREANCE = "http://localhost:8082/api";

export interface Creance {
  idCreance: string;
  codeCreancier: string;
  nomCreance: string;
  dateCreation: string;
}

export interface CreanceDetail extends Creance {
  creancierInfo: Record<string, any>;
}

export const CreanceService = {
  getAll: () => request<Creance[]>(`${API_CREANCE}/creances`),
  getById: (idCreance: string) => request<Creance>(`${API_CREANCE}/creances/${idCreance}`),
  getDetail: (idCreance: string) => request<CreanceDetail>(`${API_CREANCE}/creances/${idCreance}/detail`),
  getByCreancier: (code: string) => request<Creance[]>(`${API_CREANCE}/creances/creancier/${code}`),
  create: (data: { codeCreancier: string; idCreance: string; nomCreance: string }) =>
    request<Creance>(`${API_CREANCE}/creances`, { method: "POST", body: JSON.stringify(data) }),
  update: (idCreance: string, data: { codeCreancier: string; idCreance: string; nomCreance: string }) =>
    request<Creance>(`${API_CREANCE}/creances/${idCreance}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (idCreance: string) =>
    request<void>(`${API_CREANCE}/creances/${idCreance}`, { method: "DELETE" }),
};

// ─── Clients mobiles (client-service port 8085) ───
const API_CLIENT = "http://localhost:8085/api";

export interface ClientMobile {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  cin: string | null;
  actif: boolean;
  dateCreation: string;
  dateModification: string;
}

export interface ClientMobileCreateRequest {
  prenom: string; nom: string; email: string; password: string;
  telephone?: string; cin?: string;
}
export interface ClientMobileUpdateRequest {
  prenom: string; nom: string; email: string;
  telephone?: string; cin?: string;
  password?: string;
}

export const ClientMobileService = {
  getAll: () => request<ClientMobile[]>(`${API_CLIENT}/clients`),

  create: (data: ClientMobileCreateRequest) =>
    request<ClientMobile>(`${API_CLIENT}/clients/register`, {
      method: "POST", body: JSON.stringify(data),
    }),

  update: (id: number, data: ClientMobileUpdateRequest) =>
    request<ClientMobile>(`${API_CLIENT}/clients/${id}`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`${API_CLIENT}/clients/${id}`, { method: "DELETE" }),

  setActif: (id: number, actif: boolean) =>
    request<ClientMobile>(`${API_CLIENT}/clients/${id}/actif?actif=${actif}`, { method: "PUT" }),
};
