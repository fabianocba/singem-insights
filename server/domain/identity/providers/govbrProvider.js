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

    // Remove trailing slash do issuer para consistência
    this.issuer = this.issuer ? this.issuer.replace(/\/+$/, '') : '';

    // Endpoints OIDC derivados do issuer
    this.authorizeUrl = `${this.issuer}/authorize`;
    this.tokenUrl = `${this.issuer}/token`;
    this.userInfoUrl = `${this.issuer}/userinfo`;
    this.jwksUrl = `${this.issuer}/jwk`;
    this.logoutUrl = `${this.issuer}/logout`;

    // Scopes padrão gov.br (conforme roteiro oficial de integração)
    // https://acesso.gov.br/roteiro-tecnico/iniciarintegracao.html
    this.scopes = ['openid', 'email', 'profile', 'govbr_confiabilidades', 'govbr_confiabilidades_idtoken'].join(' ');
  }

  // ========================================================================
  // PKCE Helpers
  // ========================================================================

  generateCodeVerifier() {
    // RFC 7636: code_verifier deve ter entre 43 e 128 caracteres
    // 48 bytes → 64 caracteres em base64url (margem segura)
    return crypto.randomBytes(48).toString('base64url');
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

      // Mensagens amigáveis baseadas nos erros comuns do gov.br
      // https://acesso.gov.br/roteiro-tecnico/erroscomuns.html
      let message = 'Falha na autenticação gov.br';

      if (response.status === 401) {
        // invalid_client ou Bad credentials → client_secret errado
        if (errorData.includes('invalid_client') || errorData.includes('Bad credentials')) {
          message = 'Credenciais do sistema inválidas (client_id/client_secret). Contate o administrador.';
        } else {
          message = 'Credenciais rejeitadas pelo gov.br. Contate o administrador.';
        }
      } else if (errorData.includes('invalid_grant')) {
        message = 'URL de retorno (redirect_uri) não cadastrada no gov.br. Contate o administrador.';
      }

      const err = new Error(message);
      err.statusCode = response.status;
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

    // Valida issuer (tolera trailing slash - gov.br pode retornar com ou sem)
    const normalizeIssuer = (iss) => String(iss || '').replace(/\/+$/, '');
    if (normalizeIssuer(payload.iss) !== normalizeIssuer(this.issuer)) {
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

    // 3. Decodifica access_token para extrair AMR/2FA
    // (conforme doc gov.br, amr com "mfa" indica 2FA ativado)
    let accessTokenPayload = null;
    if (tokenData.access_token) {
      try {
        const [, payloadB64] = tokenData.access_token.split('.');
        if (payloadB64) {
          accessTokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        }
      } catch {
        console.warn('[GovBr] Não foi possível decodificar access_token payload');
      }
    }

    // 4. Busca userinfo
    const userInfo = await this.getUserInfo(tokenData.access_token);

    // 5. Normaliza para profile padrão SINGEM
    return this.normalizeProfile(userInfo, idTokenPayload, tokenData, accessTokenPayload);
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
  normalizeProfile(userInfo, idTokenPayload, tokenData = {}, accessTokenPayload = null) {
    // Gov.br retorna CPF no campo 'sub' (sem formatação, 11 dígitos)
    // Formato pode ser "12345678900" ou "123456789-00" (com hífen)
    const sub = userInfo.sub || idTokenPayload?.sub;
    const cpf = sub ? sub.replace(/\D/g, '') : null;

    // Nome: prioriza social_name conforme roteiro gov.br
    const name =
      userInfo.social_name ||
      idTokenPayload?.social_name ||
      userInfo.name ||
      userInfo.nome ||
      idTokenPayload?.name ||
      'Usuário Gov.br';

    // Email (pode não vir se email_verified=false conforme doc)
    const email = userInfo.email || idTokenPayload?.email || null;
    const emailVerified =
      String(userInfo.email_verified) === 'true' || String(idTokenPayload?.email_verified) === 'true';

    // Nível de confiabilidade via reliability_info do id_token
    // (scope govbr_confiabilidades_idtoken — roteiro oficial)
    const reliabilityInfo = idTokenPayload?.reliability_info || null;
    const level = reliabilityInfo ? this.resolveReliabilityLevel(reliabilityInfo) : 'bronze';
    const confiabilidades = reliabilityInfo?.reliabilities || [];

    // Foto de perfil (protegida, necessita access_token para acessar)
    const picture = userInfo.picture || idTokenPayload?.picture || null;

    // Telefone (pode não vir se phone_number_verified=false conforme doc)
    const phone = userInfo.phone_number || null;
    const phoneVerified = String(userInfo.phone_number_verified) === 'true';

    // Método de autenticação usado pelo cidadão
    // AMR vem no access_token (fonte oficial do 2FA conforme doc gov.br)
    // Fallback para id_token se access_token não decodificado
    const amr = accessTokenPayload?.amr || idTokenPayload?.amr || [];

    // Detecção de 2FA: presença de "mfa" no AMR indica segundo fator ativado
    // https://acesso.gov.br/roteiro-tecnico/presenca2faautenticacao.html
    const mfaEnabled = Array.isArray(amr) && amr.includes('mfa');

    // CNPJ (quando autenticação por certificado digital de PJ)
    const cnpj = accessTokenPayload?.cnpj || null;

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
      amr,
      mfaEnabled,
      cnpj,
      _raw: {
        userInfo,
        idTokenPayload: idTokenPayload
          ? {
              sub: idTokenPayload.sub,
              iss: idTokenPayload.iss,
              aud: idTokenPayload.aud,
              reliability_info: reliabilityInfo
            }
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
   * Resolve nível de confiabilidade a partir do reliability_info do id_token
   * Conforme roteiro oficial gov.br:
   *   reliability_info.level: "gold" | "silver" | "bronze"
   *   reliability_info.reliabilities: [{ id: "601", updatedAt: "..." }]
   *
   * Selos conhecidos (tabela oficial):
   *   101=INSS, 201=RecFed → Bronze
   *   301=ServPub*, 401=Facial(Senatran), 60x=Bancos → Prata
   *   701=TSE, 702=BioDigital, 801=CertDigital, 901=CIN → Ouro
   *
   * @param {object} reliabilityInfo - { level, reliabilities }
   * @returns {'ouro'|'prata'|'bronze'}
   */
  resolveReliabilityLevel(reliabilityInfo) {
    if (!reliabilityInfo || !reliabilityInfo.level) {
      return 'bronze';
    }
    const levelMap = { gold: 'ouro', silver: 'prata', bronze: 'bronze' };
    return levelMap[reliabilityInfo.level.toLowerCase()] || 'bronze';
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
