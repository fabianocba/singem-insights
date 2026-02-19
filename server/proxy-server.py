#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor Proxy CORS para API do Compras.gov.br
Resolve bloqueio CORS permitindo que o navegador acesse a API via localhost
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.error
import json
import os
from urllib.parse import urlparse, parse_qs

# Configuração
PROXY_PORT = 8000
API_BASE = "https://dadosabertos.compras.gov.br"

class CORSProxyHandler(SimpleHTTPRequestHandler):
    """Handler que serve arquivos estáticos E faz proxy para API"""
    
    def end_headers(self):
        """Adiciona headers CORS em todas as respostas"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        SimpleHTTPRequestHandler.end_headers(self)
    
    def do_OPTIONS(self):
        """Responde preflight CORS"""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """
        Intercepta requisições:
        - Se começa com /api/ -> proxy para Compras.gov.br
        - Caso contrário -> serve arquivo estático
        """
        
        # Requisição para API (proxy)
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            # Serve arquivo estático normalmente
            super().do_GET()
    
    def handle_api_request(self):
        """Faz proxy da requisição para API do Compras.gov.br"""
        try:
            # Remove /api/ e monta URL completa
            api_path = self.path[5:]  # Remove "/api/"
            full_url = API_BASE + api_path
            
            print(f"\n🌐 PROXY: {self.path}")
            print(f"   → Redirecionando para: {full_url}")
            
            # Faz requisição para API
            req = urllib.request.Request(
                full_url,
                headers={
                    'Accept': 'application/json',
                    'User-Agent': 'IFDESK-Proxy/1.0'
                }
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                # Lê resposta
                data = response.read()
                content_type = response.headers.get('Content-Type', 'application/json')
                
                print(f"   ✅ Sucesso! Status: {response.status}")
                print(f"   📦 Tamanho: {len(data)} bytes")
                
                # Envia resposta para navegador
                self.send_response(response.status)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', len(data))
                self.end_headers()
                self.wfile.write(data)
                
        except urllib.error.HTTPError as e:
            # Erro HTTP da API (404, 500, etc)
            error_body = e.read()
            print(f"   ❌ Erro HTTP {e.code}: {e.reason}")
            
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            error_response = {
                "erro": True,
                "status": e.code,
                "mensagem": e.reason,
                "detalhes": error_body.decode('utf-8', errors='ignore')
            }
            self.wfile.write(json.dumps(error_response).encode())
            
        except urllib.error.URLError as e:
            # Erro de conexão
            print(f"   ❌ Erro de conexão: {e.reason}")
            
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            error_response = {
                "erro": True,
                "status": 503,
                "mensagem": "Erro ao conectar com API do Compras.gov.br",
                "detalhes": str(e.reason)
            }
            self.wfile.write(json.dumps(error_response).encode())
            
        except Exception as e:
            # Erro genérico
            print(f"   ❌ Erro inesperado: {str(e)}")
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            error_response = {
                "erro": True,
                "status": 500,
                "mensagem": "Erro interno do proxy",
                "detalhes": str(e)
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def log_message(self, format, *args):
        """Customiza log para mostrar apenas requisições importantes"""
        # Não mostra log de arquivos estáticos (CSS, JS, etc)
        if self.path.startswith('/api/'):
            print(f"[PROXY] {format % args}")

def run_server():
    """Inicia servidor proxy"""
    # Muda para diretório do script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    server = HTTPServer(('localhost', PROXY_PORT), CORSProxyHandler)
    
    print("\n" + "="*60)
    print("  🚀 SERVIDOR PROXY IFDESK INICIADO!")
    print("="*60)
    print(f"\n📍 Endereço: http://localhost:{PROXY_PORT}")
    print(f"🌐 API Proxy: http://localhost:{PROXY_PORT}/api/...")
    print(f"📁 Arquivos: Servindo arquivos deste diretório")
    print(f"\n💡 Como usar:")
    print(f"   - Navegador acessa: http://localhost:{PROXY_PORT}/index.html")
    print(f"   - JavaScript chama: /api/modulo-material/material/1")
    print(f"   - Proxy redireciona para: {API_BASE}/modulo-material/material/1")
    print(f"   - Retorna com headers CORS permitindo acesso")
    print(f"\n🛑 Para parar: Ctrl+C")
    print("="*60 + "\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Servidor encerrado pelo usuário")
        server.shutdown()

if __name__ == '__main__':
    run_server()
