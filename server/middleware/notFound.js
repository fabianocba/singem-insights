function notFoundHandler(_req, res) {
  return res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint não encontrado'
    }
  });
}

module.exports = notFoundHandler;
