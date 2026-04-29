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
  if (res.status === 401 || res.status === 403) {
    sessionStorage.clear();
    window.location.href = "/login";
    throw new Error("Session expirée");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

// ─── Auth ───
export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { token: string; email: string; nom: string; prenom: string; role: string; }
export interface UserInfo { email: string; nom: string; prenom: string; role: string; }

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
    sessionStorage.setItem("user", JSON.stringify({ email: resp.email, nom: resp.nom, prenom: resp.prenom, role: resp.role }));
    return resp;
  },
  logout: () => { sessionStorage.clear(); window.location.href = "/login"; },
  getUser: (): UserInfo | null => {
    const u = sessionStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  },
  isAuthenticated: () => !!sessionStorage.getItem("token"),
};

// ─── Utilisateurs (port 8083) ───
export interface Utilisateur {
  id: number; nom: string; prenom: string; email: string; role: string; actif: boolean;
  dateCreation: string; dateModification: string;
}

export const UtilisateurService = {
  getAll: () => request<Utilisateur[]>(`${API_AUTH}/utilisateurs`),
  getById: (id: number) => request<Utilisateur>(`${API_AUTH}/utilisateurs/${id}`),
  create: (data: { nom: string; prenom: string; email: string; password: string; role: string }) =>
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
