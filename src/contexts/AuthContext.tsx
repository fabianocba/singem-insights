import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface UsuarioAuth {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  setor: string;
  perfil: "admin" | "gestor" | "solicitante";
  modulos?: string[];
  avatar?: string;
}

interface AuthContextType {
  usuario: UsuarioAuth | null;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateUsuario: (email: string, changes: Partial<UsuarioAuth>) => void;
  getAllUsers: () => UsuarioAuth[];
}

const AuthContext = createContext<AuthContextType | null>(null);

/* ─── Usuários demo para testes ─────────────── */
const DEMO_USERS: Record<string, { senha: string; user: UsuarioAuth }> = {
  "admin@ifbaiano.edu.br": {
    senha: "admin123",
    user: { id: "1", nome: "Administrador", email: "admin@ifbaiano.edu.br", cargo: "Administrador do Sistema", setor: "Diretoria de Administração", perfil: "admin" },
  },
  "gestor@ifbaiano.edu.br": {
    senha: "gestor123",
    user: { id: "2", nome: "Maria Santos", email: "gestor@ifbaiano.edu.br", cargo: "Coord. Almoxarifado", setor: "Coordenação de Almoxarifado", perfil: "gestor", modulos: ["almoxarifado", "patrimonio"] },
  },
  "solicitante@ifbaiano.edu.br": {
    senha: "user123",
    user: { id: "3", nome: "João Pereira", email: "solicitante@ifbaiano.edu.br", cargo: "Técnico Administrativo", setor: "Coordenação de Ensino", perfil: "solicitante" },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(() => {
    const saved = localStorage.getItem("singem-auth");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (email: string, senha: string) => {
    const entry = DEMO_USERS[email.toLowerCase().trim()];
    if (!entry) return { ok: false, error: "Usuário não encontrado." };
    if (entry.senha !== senha) return { ok: false, error: "Senha incorreta." };
    setUsuario(entry.user);
    localStorage.setItem("singem-auth", JSON.stringify(entry.user));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
    localStorage.removeItem("singem-auth");
  }, []);

  const updateUsuario = useCallback((email: string, changes: Partial<UsuarioAuth>) => {
    // Update DEMO_USERS in memory
    const key = email.toLowerCase().trim();
    if (DEMO_USERS[key]) {
      DEMO_USERS[key].user = { ...DEMO_USERS[key].user, ...changes };
    }
    // If the updated user is the logged-in user, refresh session
    setUsuario(prev => {
      if (prev && prev.email.toLowerCase() === key) {
        const updated = { ...prev, ...changes };
        localStorage.setItem("singem-auth", JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  const getAllUsers = useCallback(() => {
    return Object.values(DEMO_USERS).map(entry => entry.user);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, isAuthenticated: !!usuario, login, logout, updateUsuario, getAllUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
