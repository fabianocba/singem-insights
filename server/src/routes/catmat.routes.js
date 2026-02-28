const express = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../middlewares/validate');
const asyncHandler = require('../middlewares/asyncHandler');
const controller = require('../controllers/catmat.controller');
const { catmatSearchSchema, catmatCodigoSchema } = require('../validators/catmat.validators');

const router = express.Router();

router.get('/search', authenticate, validate(catmatSearchSchema), asyncHandler(controller.search));
router.get('/stats', authenticate, asyncHandler(controller.stats));
router.get('/:codigo', authenticate, validate(catmatCodigoSchema), asyncHandler(controller.getByCodigo));

module.exports = router;
