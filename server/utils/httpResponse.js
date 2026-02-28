function buildPayload(req, data, meta) {
  const payload = {
    status: 'success',
    data,
    requestId: req?.requestId || null,
    timestamp: new Date().toISOString()
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return payload;
}

function ok(req, res, data, meta) {
  return res.status(200).json(buildPayload(req, data, meta));
}

function created(req, res, data, meta) {
  return res.status(201).json(buildPayload(req, data, meta));
}

function noContent(res) {
  return res.status(204).send();
}

function paginated(req, res, items, meta) {
  return res.status(200).json(buildPayload(req, items, meta));
}

module.exports = {
  ok,
  created,
  noContent,
  paginated
};
