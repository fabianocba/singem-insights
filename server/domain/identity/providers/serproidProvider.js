/**
 * SerproID Provider - SINGEM
 *
 * OAuth2 Authorization Code + PKCE (S256)
 * Endpoints SerproID:
 *   HOMOLOG: https://hom.serproid.serpro.gov.br
 *   PROD:    https://serproid.serpro.gov.br
 */

const crypto = require('crypto');
const { config } = require('../../../config');

class SerproIDProvider {
  constructor() {
    this.clientId = config.serproid.clientId;
    this.clientSecret = config.serproid.clientSecret;
    this.redirectUri = config.serproid.redirectUri;
    this.baseUrl = config.serproid.baseUrl;
    this.enabled = config.serproid.enabled;

    // Endpoints OAuth2
    this.authorizeUrl = `${this.baseUrl}/oauth/v0/oauth/authorize`;
    this.tokenUrl = `${this.baseUrl}/oauth/v0/oauth/token`;
    this.certificateDiscoveryUrl = `${this.baseUrl}/oauth/v0/oauth/certificate-discovery`;
  }

  /**
   * Gera code_verifier (43-128 caracteres, URL-safe)
   */
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Gera code_challenge a partir do code_verifier (S256)
   */
  generateCodeChallenge(codeVerifier) {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  }

  /**
   * Gera state anti-CSRF
   */
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Gera URL de autorização OAuth2 + PKCE
   * @param {object} params - { state, codeVerifier, redirectUri }
   * @returns {object} { url, state, codeVerifier, codeChallenge }
   */
  getAuthorizationUrl({ state, codeVerifier, redirectUri } = {}) {
    if (!this.clientId) {
      const err = new Error('SerproID não configurado: SERPROID_CLIENT_ID ausente');
      err.statusCode = 500;
      throw err;
    }

    const finalState = state || this.generateState();
    const finalCodeVerifier = codeVerifier || this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(finalCodeVerifier);
    const finalRedirectUri = redirectUri || this.redirectUri;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: finalRedirectUri,
      scope: 'authentication_session',
      state: finalState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      url: `${this.authorizeUrl}?${params.toString()}`,
      state: finalState,
      codeVerifier: finalCodeVerifier,
      codeChallenge
    };
  }

  /**
   * Troca authorization code por tokens
   * @param {object} params - { code, codeVerifier, redirectUri }
   * @returns {Promise<object>} { access_token, token_type, expires_in, ... }
   */
  async exchangeCodeForToken({ code, codeVerifier, redirectUri }) {
    if (!code || !codeVerifier) {
      const err = new Error('code e codeVerifier são obrigatórios');
      err.statusCode = 400;
      throw err;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri || this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code_verifier: codeVerifier
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[SerproID] Token exchange failed:', response.status, errorData);
      const err = new Error(`Falha ao trocar code por token: ${response.status}`);
      err.statusCode = 401;
      err.details = errorData;
      throw err;
    }

    return response.json();
  }

  /**
   * Obtém informações do certificado (CPF/CNPJ)
   * @param {string} accessToken - Token de acesso obtido
   * @returns {Promise<object>} Dados do certificado
   */
  async getCertificateInfo(accessToken) {
    const response = await fetch(this.certificateDiscoveryUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[SerproID] Certificate discovery failed:', response.status, errorData);
      const err = new Error(`Falha ao obter dados do certificado: ${response.status}`);
      err.statusCode = 401;
      err.details = errorData;
      throw err;
    }

    return response.json();
  }

  /**
   * Fluxo completo: code → token → certificate-discovery → profile normalizado
   * @param {object} params - { code, codeVerifier, redirectUri }
   * @returns {Promise<object>} Profile normalizado
   */
  async exchangeCodeForProfile({ code, codeVerifier, redirectUri }) {
    // 1. Troca code por token
    const tokenData = await this.exchangeCodeForToken({ code, codeVerifier, redirectUri });

    // 2. Obtém dados do certificado
    const certInfo = await this.getCertificateInfo(tokenData.access_token);

    // 3. Normaliza para profile padrão
    return this.normalizeProfile(certInfo, tokenData);
  }

  /**
   * Normaliza dados do SerproID para profile padrão SINGEM
   * @param {object} certInfo - Dados do certificate-discovery
   * @param {object} tokenData - Dados do token (opcional)
   * @returns {object} Profile normalizado
   */
  normalizeProfile(certInfo, tokenData = {}) {
    // Extrai CPF ou CNPJ do certificado
    // O SerproID retorna campos como: cpf, cnpj, nome, email, etc.
    const cpf = certInfo.cpf || certInfo.subject?.cpf || null;
    const cnpj = certInfo.cnpj || certInfo.subject?.cnpj || null;
    const nome = certInfo.nome || certInfo.name || certInfo.subject?.commonName || 'Usuário SerproID';
    const email = certInfo.email || certInfo.subject?.email || null;

    return {
      provider: 'serproid',
      providerUserId: cpf || cnpj || certInfo.serialNumber,
      cpf: cpf ? cpf.replace(/\D/g, '') : null,
      cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
      name: nome,
      email,
      certificateInfo: {
        serialNumber: certInfo.serialNumber,
        issuer: certInfo.issuer,
        validFrom: certInfo.notBefore,
        validTo: certInfo.notAfter
      },
      _raw: {
        certInfo,
        tokenData: {
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope
        }
      }
    };
  }

  /**
   * Verifica se integração está configurada
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Retorna info de configuração (sem secrets)
   */
  getConfig() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured(),
      baseUrl: this.baseUrl,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      redirectUri: this.redirectUri
    };
  }
}

module.exports = new SerproIDProvider();
