const AppError = require('../utils/appError');

function formatZodError(error) {
  const details = [];

  const pushIssue = (issue) => {
    if (issue.code === 'invalid_union' && Array.isArray(issue.errors)) {
      for (const unionBranchErrors of issue.errors) {
        for (const branchIssue of unionBranchErrors) {
          pushIssue(branchIssue);
        }
      }
      return;
    }

    details.push({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    });
  };

  for (const issue of error.issues) {
    pushIssue(issue);
  }

  return details;
}

function validate(schema = {}) {
  return (req, _res, next) => {
    try {
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      return next();
    } catch (error) {
      if (error && error.name === 'ZodError') {
        return next(new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos', formatZodError(error)));
      }

      return next(error);
    }
  };
}

module.exports = validate;
