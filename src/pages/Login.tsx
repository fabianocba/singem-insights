import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!email.trim() || !senha.trim()) { setErro("Preencha email e senha."); return; }
    setLoading(true);
    const result = await login(email, senha);
    setLoading(false);
    if (result.ok) { navigate("/"); }
    else { setErro(result.error || "Erro ao autenticar."); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-4">
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="relative w-full max-w-md space-y-6">
        {/* Logo e título */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-3xl mb-5 shadow-2xl">
            SG
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SINGEM</h1>
          <p className="text-emerald-200/70 text-sm mt-1.5">Sistema Inteligente de Gestão de Materiais e Logística</p>
        </div>

        {/* Card de login */}
        <Card className="bg-white/[0.07] backdrop-blur-xl border-white/10 shadow-2xl">
          <CardContent className="p-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-emerald-100/80 text-xs font-medium">Email institucional</Label>
                <Input
                  type="email"
                  placeholder="seu.email@ifbaiano.edu.br"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErro(""); }}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-11"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-emerald-100/80 text-xs font-medium">Senha</Label>
                  <button type="button" className="text-[11px] text-emerald-300/60 hover:text-emerald-300 transition-colors">
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={senha}
                    onChange={e => { setSenha(e.target.value); setErro(""); }}
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:ring-emerald-400/20 h-11 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="flex items-center gap-2 text-red-300 text-xs bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {erro}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-all shadow-lg shadow-emerald-500/25"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><LogIn className="h-4 w-4 mr-2" />Entrar</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Credenciais demo */}
        <div className="bg-white/[0.04] backdrop-blur border border-white/10 rounded-lg p-4 space-y-2">
          <p className="text-emerald-200/50 text-[10px] font-medium uppercase tracking-wider text-center">Credenciais de demonstração</p>
          <div className="grid gap-1.5 text-xs">
            {[
              { label: "Admin", email: "admin@ifbaiano.edu.br", senha: "admin123" },
              { label: "Gestor", email: "gestor@ifbaiano.edu.br", senha: "gestor123" },
              { label: "Solicitante", email: "solicitante@ifbaiano.edu.br", senha: "user123" },
            ].map(c => (
              <button
                key={c.email}
                type="button"
                onClick={() => { setEmail(c.email); setSenha(c.senha); setErro(""); }}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-colors text-left"
              >
                <span className="text-emerald-200/70 font-medium">{c.label}</span>
                <span className="text-white/40 font-mono text-[10px]">{c.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-emerald-200/30 text-[10px]">
          © 2026 SINGEM — IF Baiano
        </p>
      </div>
    </div>
  );
}
