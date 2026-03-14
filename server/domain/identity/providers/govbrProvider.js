/**
 * Gov.br Provider - SINGEM
 *
 * OAuth2 Authorization Code + PKCE (S256) para Login Único gov.br
 *
 * Fluxo OIDC completo:
 *   1. getAuthorizationUrl() → monta URL de autorização com PKCE
 *   2. exchangeCodeForProfile() → troca code por tokens, valida, busca userinfo
 *
 * Referência: https://manual-roteiro-integracao-login-unico.servicos.gov.br/
 *
 * Endpoints gov.br (produção):
 *   Authorize:  https://sso.acesso.gov.br/authorize
 *   Token:      https://sso.acesso.gov.br/token
 *   UserInfo:   https://sso.acesso.gov.br/userinfo
 *   JWKS:       https://sso.acesso.gov.br/jwk
 *
 * Endpoints gov.br (homologação/staging):
 *   Authorize:  https://sso.staging.acesso.gov.br/authorize
 *   Token:      https://sso.staging.acesso.gov.br/token
 *   UserInfo:   https://sso.staging.acesso.gov.br/userinfo
 *   JWKS:       https://sso.staging.acesso.gov.br/jwk
 */

const crypto = require('crypto');
const { config } = require('../../../config');

// Cache de JWK keys (recarrega a cada 24h)
let jwksCache = null;
let jwksCacheExpiry = 0;
const JWKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

class GovBrProvider {
  constructor() {
    this.clientId = config.govbr.clientId;
    this.clientSecret = config.govbr.clientSecret;
    this.redirectUri = config.govbr.redirectUri;
    this.issuer = config.govbr.issuer;
    this.enabled = config.govbr.enabled;

    // Endpoints OIDC derivados do issuer
    this.authorizeUrl = `${this.issuer}/authorize`;
    this.tokenUrl = `${this.issuer}/token`;
    this.userInfoUrl = `${this.issuer}/userinfo`;
    this.jwksUrl = `${this.issuer}/jwk`;

    // Scopes padrão gov.br
    this.scopes = [
      'openid',
      'email',
      'profile',
      'govbr_confiabilidades',
      'govbr_empresa'
    ].join(' ');
  }

  // ========================================================================
  // PKCE Helpers
  // ========================================================================

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(codeVerifier) {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  }

  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  // ========================================================================
  // 1. Authorization URL
  // ========================================================================

  /**
   * Gera URL de autorização OAuth2 + PKCE para o gov.br
   * @param {object} [params]
   * @param {string} [params.state] - State anti-CSRF (gera se não fornecido)
   * @param {string} [params.nonce] - Nonce para ID token (gera se não fornecido)
   * @param {string} [params.redirectUri] - Redirect URI override
   * @returns {{ url: string, state: string, nonce: string, codeVerifier: string }}
   */
  getAuthorizationUrl({ state, nonce, redirectUri } = {}) {
    if (!this.clientId) {
      const err = new Error('Gov.br não configurado: GOVBR_CLIENT_ID ausente');
      err.statusCode = 500;
      throw err;
    }

    const finalState = state || this.generateState();
    const finalNonce = nonce || this.generateNonce();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const finalRedirectUri = redirectUri || this.redirectUri;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: finalRedirectUri,
      scope: this.scopes,
      state: finalState,
      nonce: finalNonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      url: `${this.authorizeUrl}?${params.toString()}`,
      state: finalState,
      nonce: finalNonce,
      codeVerifier,
      codeChallenge
    };
  }

  // ========================================================================
  // 2. Token Exchange
  // ========================================================================

  /**
   * Troca authorization code por tokens
   * @param {{ code: string, codeVerifier: string, redirectUri?: string }} params
   * @returns {Promise<{ access_token: string, id_token: string, token_type: string, expires_in: number }>}
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
      code_verifier: codeVerifier
    });

    // Gov.br usa Basic Auth (client_id:client_secret) no header
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[GovBr] Token exchange failed:', response.status, errorData);
      const err = new Error(`Falha ao trocar code por token gov.br: ${response.status}`);
      err.statusCode = 401;
      err.details = errorData;
      throw err;
    }

    return response.json();
  }

  // ========================================================================
  // 3. UserInfo
  // ========================================================================

  /**
   * Busca informações do usuário no endpoint /userinfo
   * @param {string} accessToken
   * @returns {Promise<object>} Claims do usuário
   */
  async getUserInfo(accessToken) {
    const response = await fetch(this.userInfoUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[GovBr] UserInfo failed:', response.status, errorData);
      const err = new Error(`Falha ao obter dados do usuário gov.br: ${response.status}`);
      err.statusCode = 401;
      err.details = errorData;
      throw err;
    }

    return response.json();
  }

  // ========================================================================
  // 4. JWKS (JSON Web Key Set)
  // ========================================================================

  /**
   * Busca as chaves públicas do gov.br (com cache)
   * @returns {Promise<object[]>} Array de JWK keys
   */
  async getJWKS() {
    const now = Date.now();
    if (jwksCache && now < jwksCacheExpiry) {
      return jwksCache;
    }

    const response = await fetch(this.jwksUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      console.error('[GovBr] JWKS fetch failed:', response.status);
      // Se tiver cache anterior, usa mesmo expirado
      if (jwksCache) {
        console.warn('[GovBr] Usando JWKS do cache anterior (expirado)');
        return jwksCache;
      }
      const err = new Error('Falha ao obter chaves JWKS do gov.br');
      err.statusCode = 502;
      throw err;
    }

    const data = await response.json();
    jwksCache = data.keys || [];
    jwksCacheExpiry = now + JWKS_CACHE_TTL_MS;

    return jwksCache;
  }

  /**
   * Valida id_token (assinatura, issuer, audience, exp, nonce)
   * @param {string} idToken
   * @param {string} [expectedNonce]
   * @returns {Promise<object>} Payload decodificado
   */
  async validateIdToken(idToken, expectedNonce) {
    // Decodifica header para obter kid
    const [headerB64] = idToken.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

    // Busca chave pública correspondente
    const keys = await this.getJWKS();
    const key = keys.find((k) => k.kid === header.kid);

    if (!key) {
      const err = new Error('Chave JWK não encontrada para validação do id_token gov.br');
      err.statusCode = 401;
      throw err;
    }

    // Importa chave pública e verifica assinatura
    const cryptoKey = crypto.createPublicKey({ key, format: 'jwk' });
    const [, payloadB64, signatureB64] = idToken.split('.');
    const data = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, 'base64url');

    const algMap = { RS256: 'sha256', RS384: 'sha384', RS512: 'sha512' };
    const alg = algMap[header.alg];
    if (!alg) {
      const err = new Error(`Algoritmo não suportado: ${header.alg}`);
      err.statusCode = 401;
      throw err;
    }

    const isValid = crypto.verify(alg, Buffer.from(data), cryptoKey, signature);
    if (!isValid) {
      const err = new Error('Assinatura do id_token gov.br inválida');
      err.statusCode = 401;
      throw err;
    }

    // Decodifica payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Valida issuer
    if (payload.iss !== this.issuer) {
      const err = new Error(`Issuer inválido: esperado ${this.issuer}, recebido ${payload.iss}`);
      err.statusCode = 401;
      throw err;
    }

    // Valida audience
    if (payload.aud !== this.clientId) {
      const err = new Error('Audience do id_token não corresponde ao client_id');
      err.statusCode = 401;
      throw err;
    }

    // Valida expiração
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      const err = new Error('id_token gov.br expirado');
      err.statusCode = 401;
      throw err;
    }

    // Valida nonce (se fornecido)
    if (expectedNonce && payload.nonce !== expectedNonce) {
      const err = new Error('Nonce do id_token não corresponde');
      err.statusCode = 401;
      throw err;
    }

    return payload;
  }

  // ========================================================================
  // 5. Fluxo completo: code → tokens → validate → userinfo → profile
  // ========================================================================

  /**
   * Troca authorization code por profile normalizado
   * @param {{ code: string, codeVerifier: string, nonce?: string, redirectUri?: string }} params
   * @returns {Promise<object>} Profile normalizado SINGEM
   */
  async exchangeCodeForProfile({ code, codeVerifier, nonce, redirectUri }) {
    // 1. Troca code por tokens
    const tokenData = await this.exchangeCodeForToken({ code, codeVerifier, redirectUri });

    // 2. Valida id_token (assinatura + claims)
    let idTokenPayload = null;
    if (tokenData.id_token) {
      idTokenPayload = await this.validateIdToken(tokenData.id_token, nonce);
    }

    // 3. Busca userinfo
    const userInfo = await this.getUserInfo(tokenData.access_token);

    // 4. Normaliza para profile padrão SINGEM
    return this.normalizeProfile(userInfo, idTokenPayload, tokenData);
  }

  // ========================================================================
  // 6. Normalização de profile
  // ========================================================================

  /**
   * Normaliza claims do gov.br para profile padrão SINGEM
   * @param {object} userInfo - Claims do /userinfo
   * @param {object|null} idTokenPayload - Claims do id_token
   * @param {object} tokenData - Dados dos tokens
   * @returns {object} Profile normalizado
   */
  normalizeProfile(userInfo, idTokenPayload, tokenData = {}) {
    // Gov.br retorna CPF no campo 'sub' (sem formatação, 11 dígitos)
    const sub = userInfo.sub || idTokenPayload?.sub;
    const cpf = sub ? sub.replace(/\D/g, '') : null;

    // Nome: prioriza nome_social se disponível
    const name = userInfo.name || userInfo.nome || idTokenPayload?.name || 'Usuário Gov.br';

    // Email precisa de verificação
    const email = userInfo.email || idTokenPayload?.email || null;
    const emailVerified = userInfo.email_verified === true || idTokenPayload?.email_verified === true;

    // Nível de confiabilidade (selos) do gov.br
    // Retornado via scope govbr_confiabilidades
    const confiabilidades = userInfo.govbr_confiabilidades || [];
    const level = this.resolveConfiabilidade(confiabilidades);

    // Foto de perfil (se disponível)
    const picture = userInfo.picture || idTokenPayload?.picture || null;

    // Telefone
    const phone = userInfo.phone_number || null;
    const phoneVerified = userInfo.phone_number_verified === true;

    return {
      provider: 'govbr',
      providerUserId: sub,
      cpf,
      name,
      email,
      emailVerified,
      level,
      confiabilidades,
      picture,
      phone,
      phoneVerified,
      _raw: {
        userInfo,
        idTokenPayload: idTokenPayload
          ? { sub: idTokenPayload.sub, iss: idTokenPayload.iss, aud: idTokenPayload.aud }
          : null,
        tokenMeta: {
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope
        }
      }
    };
  }

  /**
   * Resolve nível de confiabilidade gov.br
   * Selos: 1 = bronze (auto-cadastro), 2 = prata (validação facial), 3 = ouro (certificado digital)
   * @param {number[]} confiabilidades
   * @returns {'ouro'|'prata'|'bronze'}
   */
  resolveConfiabilidade(confiabilidades) {
    if (!Array.isArray(confiabilidades) || confiabilidades.length === 0) {
      return 'bronze';
    }
    const niveis = confiabilidades.map(Number);
    if (niveis.includes(3)) {
      return 'ouro';
    }
    if (niveis.includes(2)) {
      return 'prata';
    }
    return 'bronze';
  }

  // ========================================================================
  // 7. Utilitários
  // ========================================================================

  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  getConfig() {
    return {
      enabled: this.enabled,
      configured: this.isConfigured(),
      issuer: this.issuer,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      redirectUri: this.redirectUri
    };
  }
}

const govbrProvider = new GovBrProvider();

module.exports = govbrProvider;
module.exports.GovBrProvider = GovBrProvider;
