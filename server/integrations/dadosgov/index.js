const { DadosGovCkanClient } = require('./ckanClient');

const ckanClient = new DadosGovCkanClient();

function buildContext(req, fallbackRoute) {
  return {
    requestId: req?.requestId || null,
    user: req?.user || null,
    routeInterna: req?.originalUrl || fallbackRoute
  };
}

module.exports = {
  async packageSearch(req) {
    const q = req?.query?.q;
    return ckanClient.packageSearch(q, buildContext(req, '/api/integracoes/dadosgov/ckan/package_search'));
  },

  async packageShow(req) {
    const id = req?.query?.id;
    return ckanClient.packageShow(id, buildContext(req, '/api/integracoes/dadosgov/ckan/package_show'));
  },

  async downloadResource(req) {
    const resourceUrl = req?.query?.resource_url || req?.query?.resourceUrl || req?.query?.url;
    return ckanClient.downloadResource(
      resourceUrl,
      buildContext(req, '/api/integracoes/dadosgov/ckan/resource_download')
    );
  },

  async health(req) {
    return ckanClient.health(buildContext(req, '/api/integracoes/dadosgov/ckan/health'));
  }
};
