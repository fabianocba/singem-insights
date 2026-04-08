import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Package, Landmark, Truck, Wrench, X } from "lucide-react";
import { useNotificacoes } from "../contexts/NotificacoesContext";
import { cn } from "../lib/utils";

const tipoIcons: Record<string, { icon: typeof Bell; color: string }> = {
  sm_almox: { icon: Package, color: 'text-emerald-400' },
  sb_patrim: { icon: Landmark, color: 'text-blue-400' },
  sol_veiculo: { icon: Truck, color: 'text-amber-400' },
  sol_servico: { icon: Wrench, color: 'text-purple-400' },
  os: { icon: Wrench, color: 'text-purple-400' },
  geral: { icon: Bell, color: 'text-cyan-400' },
};

function tempoRelativo(dataStr: string) {
  const agora = new Date();
  const data = new Date(dataStr);
  const diff = Math.floor((agora.getTime() - data.getTime()) / 1000);
  if (diff < 60) return 'Agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationCenter() {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = (id: string, link?: string) => {
    marcarComoLida(id);
    if (link) {
      navigate(link);
      setAberto(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(!aberto)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="h-5 w-5 text-white/70" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[480px] rounded-xl border border-border bg-card shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
              {naoLidas > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">{naoLidas}</span>
              )}
            </div>
            {naoLidas > 0 && (
              <button onClick={marcarTodasComoLidas} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Sem notificações
              </div>
            ) : (
              notificacoes.map(n => {
                const tipoInfo = tipoIcons[n.tipo] || tipoIcons.geral;
                const Icon = tipoInfo.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n.id, n.link)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b border-border/20",
                      !n.lida && "bg-primary/5"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", !n.lida ? 'bg-primary/10' : 'bg-muted/30')}>
                      <Icon className={cn("h-4 w-4", tipoInfo.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-xs font-medium truncate", !n.lida ? 'text-foreground' : 'text-muted-foreground')}>{n.titulo}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{tempoRelativo(n.data)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                    </div>
                    {!n.lida && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
