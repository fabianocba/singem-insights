import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Notificacao {
  id: string;
  tipo: 'sm_almox' | 'sb_patrim' | 'sol_veiculo' | 'sol_servico' | 'os' | 'geral';
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
  link?: string;
}

interface NotificacoesContextType {
  notificacoes: Notificacao[];
  naoLidas: number;
  adicionarNotificacao: (n: Omit<Notificacao, 'id' | 'data' | 'lida'>) => void;
  marcarComoLida: (id: string) => void;
  marcarTodasComoLidas: () => void;
  limpar: () => void;
}

const NotificacoesContext = createContext<NotificacoesContextType | null>(null);

export function useNotificacoes() {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error("useNotificacoes deve ser usado dentro de NotificacoesProvider");
  return ctx;
}

const INICIAIS: Notificacao[] = [
  { id: '1', tipo: 'sm_almox', titulo: 'SM-2026-002 Aprovada', mensagem: 'Sua solicitação de material foi aprovada pelo Almoxarifado.', data: '2026-04-08T10:30:00', lida: false, link: '/solicitacoes/almoxarifado' },
  { id: '2', tipo: 'sol_veiculo', titulo: 'SV-2026-002 — Veículo designado', mensagem: 'Micro-ônibus Volare designado para sua viagem a Salvador.', data: '2026-04-08T09:15:00', lida: false, link: '/solicitacoes/transportes' },
  { id: '3', tipo: 'sol_servico', titulo: 'SS-2026-002 — OS Gerada', mensagem: 'OS-2026-047 foi gerada para o reparo do ar-condicionado.', data: '2026-04-07T16:45:00', lida: false, link: '/solicitacoes/ordem-servico' },
  { id: '4', tipo: 'sm_almox', titulo: 'SM-2026-004 Atendida', mensagem: 'Sua solicitação foi totalmente atendida. Retire no Almoxarifado.', data: '2026-04-07T14:20:00', lida: true, link: '/solicitacoes/almoxarifado' },
  { id: '5', tipo: 'sol_veiculo', titulo: 'SV-2026-004 Rejeitada', mensagem: 'Sem ônibus disponível na data solicitada. Tente outra data.', data: '2026-04-07T11:00:00', lida: true, link: '/solicitacoes/transportes' },
  { id: '6', tipo: 'sb_patrim', titulo: 'SB-2026-002 Aprovada', mensagem: 'Solicitação de bens aprovada. Cadeiras e mesa serão entregues.', data: '2026-04-06T15:30:00', lida: true, link: '/solicitacoes/patrimonio' },
];

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(INICIAIS);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const adicionarNotificacao = useCallback((n: Omit<Notificacao, 'id' | 'data' | 'lida'>) => {
    const nova: Notificacao = {
      ...n,
      id: String(Date.now()),
      data: new Date().toISOString(),
      lida: false,
    };
    setNotificacoes(prev => [nova, ...prev]);
  }, []);

  const marcarComoLida = useCallback((id: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  }, []);

  const marcarTodasComoLidas = useCallback(() => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  }, []);

  const limpar = useCallback(() => {
    setNotificacoes([]);
  }, []);

  return (
    <NotificacoesContext.Provider value={{ notificacoes, naoLidas, adicionarNotificacao, marcarComoLida, marcarTodasComoLidas, limpar }}>
      {children}
    </NotificacoesContext.Provider>
  );
}
