#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Proxy local para API SIASG - Contorna bloqueios CORS
Permite que o frontend acesse a API do governo federal sem problemas de CORS
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import sys

# Configurações
PORTA_PROXY = 8001
API_BASE = "https://compras.dados.gov.br"

class ProxyHandler(BaseHTTPRequestHandler):

    def _set_cors_headers(self):
        """Define headers CORS para permitir requisições do frontend"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json; charset=utf-8')

    def do_OPTIONS(self):
        """Responde requisições OPTIONS (preflight CORS)"""
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        """Encaminha requisições GET para a API do governo"""
        try:
            # Extrair o caminho e query string
            path = self.path

            # Construir URL completa da API
            url_api = API_BASE + path

            print(f"\n{'='*60}")
            print(f"📡 REQUISIÇÃO RECEBIDA")
            print(f"{'='*60}")
            print(f"🔗 Path solicitado: {path}")
            print(f"🌐 URL da API: {url_api}")
            print(f"{'='*60}\n")

            # Fazer requisição para a API do governo
            print("⏳ Aguardando resposta da API...")
            req = urllib.request.Request(url_api)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
            req.add_header('Accept', 'application/json')

            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read()

                print(f"✅ Resposta recebida!")
                print(f"📊 Status: {response.status}")
                print(f"📦 Tamanho: {len(data)} bytes")

                # Tentar decodificar JSON para contar registros
                try:
                    json_data = json.loads(data.decode('utf-8'))
                    if isinstance(json_data, list):
                        print(f"📋 Registros: {len(json_data)}")
                    else:
                        print(f"📋 Tipo: Objeto único")
                except:
                    pass

                print(f"{'='*60}\n")

                # Enviar resposta para o frontend
                self.send_response(200)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(data)

        except urllib.error.HTTPError as e:
            print(f"\n❌ ERRO HTTP: {e.code} - {e.reason}")
            print(f"URL: {url_api}\n")

            error_response = {
                'error': True,
                'status': e.code,
                'message': f'Erro HTTP {e.code}: {e.reason}',
                'url': url_api
            }

            self.send_response(e.code)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))

        except urllib.error.URLError as e:
            print(f"\n❌ ERRO DE URL: {e.reason}")
            print(f"URL: {url_api}\n")

            error_response = {
                'error': True,
                'message': f'Erro de conexão: {e.reason}',
                'url': url_api
            }

            self.send_response(500)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))

        except Exception as e:
            print(f"\n❌ ERRO INESPERADO: {str(e)}\n")

            error_response = {
                'error': True,
                'message': f'Erro interno: {str(e)}',
                'url': url_api if 'url_api' in locals() else 'desconhecido'
            }

            self.send_response(500)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        """Suprime logs automáticos do servidor (já temos logs customizados)"""
        pass


def run_server():
    """Inicia o servidor proxy"""
    server_address = ('', PORTA_PROXY)
    httpd = HTTPServer(server_address, ProxyHandler)

    print("\n" + "="*60)
    print("🚀 PROXY API SIASG - SERVIDOR INICIADO")
    print("="*60)
    print(f"🌐 Servidor rodando em: http://localhost:{PORTA_PROXY}")
    print(f"📡 API de destino: {API_BASE}")
    print("="*60)
    print("\n💡 COMO USAR:")
    print(f"   Altere a URL base no frontend de:")
    print(f"   {API_BASE}")
    print(f"   para:")
    print(f"   http://localhost:{PORTA_PROXY}")
    print("\n⚠️  Pressione Ctrl+C para parar o servidor\n")
    print("="*60 + "\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n" + "="*60)
        print("🛑 Servidor proxy encerrado pelo usuário")
        print("="*60 + "\n")
        httpd.server_close()
        sys.exit(0)


if __name__ == '__main__':
    run_server()
