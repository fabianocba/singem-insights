import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { NotificacoesProvider } from "./contexts/NotificacoesContext";
import { SolicitacoesProvider } from "./contexts/SolicitacoesContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Empenhos from "./pages/Empenhos";
import NotasFiscais from "./pages/NotasFiscais";
import Estoque from "./pages/almoxarifado/Estoque";
import Catalogo from "./pages/almoxarifado/Catalogo";
import LiberarMaterial from "./pages/almoxarifado/LiberarMaterial";
import AdmAlmoxarifado from "./pages/almoxarifado/AdmAlmoxarifado";
import SolicitacaoMaterial from "./pages/SolicitacaoMaterial";
import AlmoxarifadoDashboard from "./pages/almoxarifado/AlmoxarifadoDashboard";
import PatrimonioDashboard from "./pages/patrimonio/PatrimonioDashboard";
import ItensPatrimoniais from "./pages/patrimonio/ItensPatrimoniais";
import MovimentacaoBens from "./pages/patrimonio/MovimentacaoBens";
import AdmPatrimonio from "./pages/patrimonio/AdmPatrimonio";
import TransportesDashboard from "./pages/transportes/TransportesDashboard";
import Cadastros from "./pages/transportes/Cadastros";
import Manutencao from "./pages/transportes/Manutencao";
import Agendamentos from "./pages/transportes/Agendamentos";
import AdmTransportes from "./pages/transportes/AdmTransportes";
import ServicosDashboard from "./pages/servicos/ServicosDashboard";
import OrdensServico from "./pages/servicos/OrdensServico";
import AdmServicos from "./pages/servicos/AdmServicos";
import SolicitacoesDashboard from "./pages/solicitacoes/SolicitacoesDashboard";
import SolicitacaoTransportes from "./pages/solicitacoes/SolicitacaoTransportes";
import OrdemServico from "./pages/solicitacoes/OrdemServico";
import Configuracoes from "./pages/Configuracoes";
import GestorAprovacoes from "./pages/shared/GestorAprovacoes";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedProfiles, requiredModulo }: { children: React.ReactNode; allowedProfiles?: string[]; requiredModulo?: string }) {
  const { isAuthenticated, usuario } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedProfiles && usuario && !allowedProfiles.includes(usuario.perfil)) {
    // Admin bypass
    if (usuario.perfil !== "admin") return <Navigate to="/" replace />;
  }
  if (requiredModulo && usuario && usuario.perfil === "gestor") {
    if (!usuario.modulos?.includes(requiredModulo)) return <Navigate to="/" replace />;
  }
  if (requiredModulo && usuario && usuario.perfil === "solicitante") {
    // Solicitante can only access solicitacoes routes
    if (requiredModulo !== "solicitacoes") return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      {/* Almoxarifado */}
      <Route path="/almoxarifado" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><AlmoxarifadoDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/almoxarifado/empenhos" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><Empenhos modulo="almoxarifado" /></AppLayout></ProtectedRoute>} />
      <Route path="/almoxarifado/notas-fiscais" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><NotasFiscais modulo="almoxarifado" /></AppLayout></ProtectedRoute>} />
      <Route path="/almoxarifado/estoque" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><Estoque /></AppLayout></ProtectedRoute>} />
      <Route path="/almoxarifado/catalogo" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><Catalogo /></AppLayout></ProtectedRoute>} />
      <Route path="/almoxarifado/liberar-material" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><LiberarMaterial /></AppLayout></ProtectedRoute>} />
      <Route path="/almoxarifado/adm" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><AdmAlmoxarifado /></AppLayout></ProtectedRoute>} />
      <Route path="/almoxarifado/solicitacoes" element={<ProtectedRoute><AppLayout modulo="almoxarifado"><GestorAprovacoes modulo="almoxarifado" /></AppLayout></ProtectedRoute>} />
      {/* Patrimônio */}
      <Route path="/patrimonio" element={<ProtectedRoute><AppLayout modulo="patrimonio"><PatrimonioDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/patrimonio/empenhos" element={<ProtectedRoute><AppLayout modulo="patrimonio"><Empenhos modulo="patrimonio" /></AppLayout></ProtectedRoute>} />
      <Route path="/patrimonio/notas-fiscais" element={<ProtectedRoute><AppLayout modulo="patrimonio"><NotasFiscais modulo="patrimonio" /></AppLayout></ProtectedRoute>} />
      <Route path="/patrimonio/itens" element={<ProtectedRoute><AppLayout modulo="patrimonio"><ItensPatrimoniais /></AppLayout></ProtectedRoute>} />
      <Route path="/patrimonio/movimentacao" element={<ProtectedRoute><AppLayout modulo="patrimonio"><MovimentacaoBens /></AppLayout></ProtectedRoute>} />
      <Route path="/patrimonio/adm" element={<ProtectedRoute><AppLayout modulo="patrimonio"><AdmPatrimonio /></AppLayout></ProtectedRoute>} />
      <Route path="/patrimonio/solicitacoes" element={<ProtectedRoute><AppLayout modulo="patrimonio"><GestorAprovacoes modulo="patrimonio" /></AppLayout></ProtectedRoute>} />
      {/* Transportes */}
      <Route path="/transportes" element={<ProtectedRoute><AppLayout modulo="transportes"><TransportesDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/transportes/cadastros" element={<ProtectedRoute><AppLayout modulo="transportes"><Cadastros /></AppLayout></ProtectedRoute>} />
      <Route path="/transportes/manutencao" element={<ProtectedRoute><AppLayout modulo="transportes"><Manutencao /></AppLayout></ProtectedRoute>} />
      <Route path="/transportes/agendamentos" element={<ProtectedRoute><AppLayout modulo="transportes"><Agendamentos /></AppLayout></ProtectedRoute>} />
      <Route path="/transportes/adm" element={<ProtectedRoute><AppLayout modulo="transportes"><AdmTransportes /></AppLayout></ProtectedRoute>} />
      <Route path="/transportes/solicitacoes" element={<ProtectedRoute><AppLayout modulo="transportes"><GestorAprovacoes modulo="transportes" /></AppLayout></ProtectedRoute>} />
      {/* Serviços Gerais */}
      <Route path="/servicos" element={<ProtectedRoute><AppLayout modulo="servicos"><ServicosDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/servicos/contratos" element={<ProtectedRoute><AppLayout modulo="servicos"><Empenhos modulo="servicos" /></AppLayout></ProtectedRoute>} />
      <Route path="/servicos/notas-fiscais" element={<ProtectedRoute><AppLayout modulo="servicos"><NotasFiscais modulo="servicos" /></AppLayout></ProtectedRoute>} />
      <Route path="/servicos/ordens" element={<ProtectedRoute><AppLayout modulo="servicos"><OrdensServico /></AppLayout></ProtectedRoute>} />
      <Route path="/servicos/adm" element={<ProtectedRoute><AppLayout modulo="servicos"><AdmServicos /></AppLayout></ProtectedRoute>} />
      <Route path="/servicos/solicitacoes" element={<ProtectedRoute><AppLayout modulo="servicos"><GestorAprovacoes modulo="servicos" /></AppLayout></ProtectedRoute>} />
      {/* Solicitações */}
      <Route path="/solicitacoes" element={<ProtectedRoute><AppLayout modulo="solicitacoes"><SolicitacoesDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/solicitacoes/almoxarifado" element={<ProtectedRoute><AppLayout modulo="solicitacoes"><SolicitacaoMaterial modulo="almoxarifado" /></AppLayout></ProtectedRoute>} />
      <Route path="/solicitacoes/patrimonio" element={<ProtectedRoute><AppLayout modulo="solicitacoes"><SolicitacaoMaterial modulo="patrimonio" /></AppLayout></ProtectedRoute>} />
      <Route path="/solicitacoes/transportes" element={<ProtectedRoute><AppLayout modulo="solicitacoes"><SolicitacaoTransportes /></AppLayout></ProtectedRoute>} />
      <Route path="/solicitacoes/ordem-servico" element={<ProtectedRoute><AppLayout modulo="solicitacoes"><OrdemServico /></AppLayout></ProtectedRoute>} />
      {/* Configurações */}
      <Route path="/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificacoesProvider>
          <SolicitacoesProvider>
            <BrowserRouter>
              <Toaster position="top-right" richColors />
              <AppRoutes />
            </BrowserRouter>
          </SolicitacoesProvider>
        </NotificacoesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
