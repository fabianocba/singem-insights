/**
 * Wrapper para handlers assíncronos do Express.
 * Captura erros de async/await e encaminha ao middleware de erro.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
