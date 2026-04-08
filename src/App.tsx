import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { NotificacoesProvider } from "./contexts/NotificacoesContext";
import AppLayout from "./components/AppLayout";
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificacoesProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Index />} />
            {/* Almoxarifado */}
            <Route path="/almoxarifado" element={<AppLayout modulo="almoxarifado"><AlmoxarifadoDashboard /></AppLayout>} />
            <Route path="/almoxarifado/empenhos" element={<AppLayout modulo="almoxarifado"><Empenhos modulo="almoxarifado" /></AppLayout>} />
            <Route path="/almoxarifado/notas-fiscais" element={<AppLayout modulo="almoxarifado"><NotasFiscais modulo="almoxarifado" /></AppLayout>} />
            <Route path="/almoxarifado/estoque" element={<AppLayout modulo="almoxarifado"><Estoque /></AppLayout>} />
            <Route path="/almoxarifado/catalogo" element={<AppLayout modulo="almoxarifado"><Catalogo /></AppLayout>} />
            <Route path="/almoxarifado/liberar-material" element={<AppLayout modulo="almoxarifado"><LiberarMaterial /></AppLayout>} />
            <Route path="/almoxarifado/adm" element={<AppLayout modulo="almoxarifado"><AdmAlmoxarifado /></AppLayout>} />
            <Route path="/almoxarifado/solicitacoes" element={<AppLayout modulo="almoxarifado"><GestorAprovacoes modulo="almoxarifado" /></AppLayout>} />
            {/* Patrimônio */}
            <Route path="/patrimonio" element={<AppLayout modulo="patrimonio"><PatrimonioDashboard /></AppLayout>} />
            <Route path="/patrimonio/empenhos" element={<AppLayout modulo="patrimonio"><Empenhos modulo="patrimonio" /></AppLayout>} />
            <Route path="/patrimonio/notas-fiscais" element={<AppLayout modulo="patrimonio"><NotasFiscais modulo="patrimonio" /></AppLayout>} />
            <Route path="/patrimonio/itens" element={<AppLayout modulo="patrimonio"><ItensPatrimoniais /></AppLayout>} />
            <Route path="/patrimonio/movimentacao" element={<AppLayout modulo="patrimonio"><MovimentacaoBens /></AppLayout>} />
            <Route path="/patrimonio/adm" element={<AppLayout modulo="patrimonio"><AdmPatrimonio /></AppLayout>} />
            <Route path="/patrimonio/solicitacoes" element={<AppLayout modulo="patrimonio"><GestorAprovacoes modulo="patrimonio" /></AppLayout>} />
            {/* Transportes */}
            <Route path="/transportes" element={<AppLayout modulo="transportes"><TransportesDashboard /></AppLayout>} />
            <Route path="/transportes/cadastros" element={<AppLayout modulo="transportes"><Cadastros /></AppLayout>} />
            <Route path="/transportes/manutencao" element={<AppLayout modulo="transportes"><Manutencao /></AppLayout>} />
            <Route path="/transportes/agendamentos" element={<AppLayout modulo="transportes"><Agendamentos /></AppLayout>} />
            <Route path="/transportes/adm" element={<AppLayout modulo="transportes"><AdmTransportes /></AppLayout>} />
            <Route path="/transportes/solicitacoes" element={<AppLayout modulo="transportes"><GestorAprovacoes modulo="transportes" /></AppLayout>} />
            {/* Serviços Gerais */}
            <Route path="/servicos" element={<AppLayout modulo="servicos"><ServicosDashboard /></AppLayout>} />
            <Route path="/servicos/contratos" element={<AppLayout modulo="servicos"><Empenhos modulo="servicos" /></AppLayout>} />
            <Route path="/servicos/notas-fiscais" element={<AppLayout modulo="servicos"><NotasFiscais modulo="servicos" /></AppLayout>} />
            <Route path="/servicos/ordens" element={<AppLayout modulo="servicos"><OrdensServico /></AppLayout>} />
            <Route path="/servicos/adm" element={<AppLayout modulo="servicos"><AdmServicos /></AppLayout>} />
            <Route path="/servicos/solicitacoes" element={<AppLayout modulo="servicos"><GestorAprovacoes modulo="servicos" /></AppLayout>} />
            {/* Solicitações */}
            <Route path="/solicitacoes" element={<AppLayout modulo="solicitacoes"><SolicitacoesDashboard /></AppLayout>} />
            <Route path="/solicitacoes/almoxarifado" element={<AppLayout modulo="solicitacoes"><SolicitacaoMaterial modulo="almoxarifado" /></AppLayout>} />
            <Route path="/solicitacoes/patrimonio" element={<AppLayout modulo="solicitacoes"><SolicitacaoMaterial modulo="patrimonio" /></AppLayout>} />
            <Route path="/solicitacoes/transportes" element={<AppLayout modulo="solicitacoes"><SolicitacaoTransportes /></AppLayout>} />
            <Route path="/solicitacoes/ordem-servico" element={<AppLayout modulo="solicitacoes"><OrdemServico /></AppLayout>} />
            {/* Configurações */}
            <Route path="/configuracoes" element={<AppLayout><Configuracoes /></AppLayout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificacoesProvider>
    </QueryClientProvider>
  );
}

export default App;
