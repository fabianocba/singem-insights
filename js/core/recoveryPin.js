/**
 * 🔢 Sistema de PIN de Recuperação - IFDESK
 *
 * Gera e valida PINs numéricos de 6 dígitos para recuperação de senha.
 * PINs são armazenados com hash PBKDF2 (mesma segurança da senha).
 */

/**
 * Gera um PIN numérico de 6 dígitos
 * @returns {string} PIN de 6 dígitos (exemplo: "483920")
 */
export function generateRecoveryPin() {
  // Gera 6 dígitos aleatórios usando crypto.getRandomValues
  const array = new Uint8Array(6);
  window.crypto.getRandomValues(array);

  // Converte cada byte para um dígito (0-9)
  const pin = Array.from(array)
    .map((byte) => byte % 10)
    .join('');

  return pin;
}

/**
 * Valida formato do PIN
 * @param {string} pin - PIN a validar
 * @returns {boolean} PIN válido
 */
export function isValidPinFormat(pin) {
  if (!pin || typeof pin !== 'string') {
    return false;
  }

  // Deve ter exatamente 6 caracteres
  if (pin.length !== 6) {
    return false;
  }

  // Deve conter apenas dígitos
  return /^\d{6}$/.test(pin);
}

/**
 * Cria hash do PIN usando PBKDF2-SHA256
 * @param {string} pin - PIN a ser hasheado
 * @returns {Promise<string>} Hash no formato "salt:hash" (hex)
 */
export async function hashPin(pin) {
  if (!isValidPinFormat(pin)) {
    throw new Error('PIN inválido. Deve ter 6 dígitos numéricos.');
  }

  try {
    // Gera salt aleatório
    const salt = window.crypto.getRandomValues(new Uint8Array(16));

    // Converte PIN para ArrayBuffer
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin);

    // Importa como chave
    const key = await window.crypto.subtle.importKey('raw', pinBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);

    // Deriva bits usando PBKDF2
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );

    // Converte para hex
    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const hashHex = Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Retorna no formato "salt:hash"
    return `${saltHex}:${hashHex}`;
  } catch (error) {
    console.error('Erro ao gerar hash do PIN:', error);
    throw new Error('Falha ao processar PIN de recuperação');
  }
}

/**
 * Verifica se um PIN corresponde ao hash armazenado
 * @param {string} pin - PIN fornecido pelo usuário
 * @param {string} storedHash - Hash armazenado no formato "salt:hash"
 * @returns {Promise<boolean>} PIN corresponde ao hash
 */
export async function verifyPin(pin, storedHash) {
  if (!isValidPinFormat(pin)) {
    return false;
  }

  if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }

  try {
    // Separa salt e hash
    const [saltHex, hashHex] = storedHash.split(':');

    // Converte salt de hex para Uint8Array
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));

    // Converte PIN para ArrayBuffer
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin);

    // Importa como chave
    const key = await window.crypto.subtle.importKey('raw', pinBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);

    // Deriva bits com o mesmo salt
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );

    // Converte para hex
    const hashArray = new Uint8Array(derivedBits);
    const computedHashHex = Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Compara com hash armazenado
    return computedHashHex === hashHex;
  } catch (error) {
    console.error('Erro ao verificar PIN:', error);
    return false;
  }
}

/**
 * Formata PIN para exibição (com espaços)
 * @param {string} pin - PIN de 6 dígitos
 * @returns {string} PIN formatado (exemplo: "483 920")
 */
export function formatPinDisplay(pin) {
  if (!isValidPinFormat(pin)) {
    return pin;
  }

  return `${pin.slice(0, 3)} ${pin.slice(3, 6)}`;
}

/**
 * Cria mensagem de exibição do PIN (uma única vez)
 * @param {string} pin - PIN gerado
 * @returns {string} Mensagem formatada
 */
export function createPinDisplayMessage(pin) {
  const formatted = formatPinDisplay(pin);

  return `
🔐 PIN DE RECUPERAÇÃO GERADO

Seu PIN de recuperação é:

    ${formatted}

⚠️ IMPORTANTE:
• Guarde este código em local seguro
• Ele será necessário para recuperar sua senha
• Este código não será exibido novamente
• Você pode redefini-lo nas configurações do usuário

✅ PIN salvo com sucesso!
`.trim();
}

console.log('🔢 Módulo de Recovery PIN inicializado');
