import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
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
import TransportesDashboard from "./pages/transportes/TransportesDashboard";
import ServicosDashboard from "./pages/servicos/ServicosDashboard";
import Configuracoes from "./pages/Configuracoes";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
          <Route path="/almoxarifado/solicitacao" element={<AppLayout modulo="almoxarifado"><SolicitacaoMaterial modulo="almoxarifado" /></AppLayout>} />
          {/* Patrimônio */}
          <Route path="/patrimonio" element={<AppLayout modulo="patrimonio"><PatrimonioDashboard /></AppLayout>} />
          <Route path="/patrimonio/empenhos" element={<AppLayout modulo="patrimonio"><Empenhos modulo="patrimonio" /></AppLayout>} />
          <Route path="/patrimonio/notas-fiscais" element={<AppLayout modulo="patrimonio"><NotasFiscais modulo="patrimonio" /></AppLayout>} />
          <Route path="/patrimonio/solicitacao" element={<AppLayout modulo="patrimonio"><SolicitacaoMaterial modulo="patrimonio" /></AppLayout>} />
          {/* Transportes */}
          <Route path="/transportes" element={<AppLayout modulo="transportes"><TransportesDashboard /></AppLayout>} />
          <Route path="/transportes/solicitacao" element={<AppLayout modulo="transportes"><SolicitacaoMaterial modulo="transportes" /></AppLayout>} />
          {/* Serviços Gerais */}
          <Route path="/servicos" element={<AppLayout modulo="servicos"><ServicosDashboard /></AppLayout>} />
          <Route path="/servicos/contratos" element={<AppLayout modulo="servicos"><Empenhos modulo="servicos" /></AppLayout>} />
          <Route path="/servicos/notas-fiscais" element={<AppLayout modulo="servicos"><NotasFiscais modulo="servicos" /></AppLayout>} />
          {/* Configurações */}
          <Route path="/configuracoes" element={<AppLayout><Configuracoes /></AppLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
