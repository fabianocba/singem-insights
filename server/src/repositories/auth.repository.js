const auth = require('../../middleware/auth');

async function saveRefreshToken(userId, refreshToken) {
  return auth.saveRefreshToken(userId, refreshToken);
}

module.exports = {
  saveRefreshToken
};
