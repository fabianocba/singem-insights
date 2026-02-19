/**
 * Ponto de entrada principal para o módulo de Consultas Diversas
 * Este arquivo importa e exporta todas as funcionalidades necessárias
 */

import * as Cache from './cache.js';
import * as API from './apiCompras.js';
import * as Mapeadores from './mapeadores.js';
import * as UI from './uiConsultas.js';

// Exporta tudo de forma agrupada
export { Cache, API, Mapeadores, UI };

// Exporta funções principais diretamente
export const init = UI.init;
export const showConsulta = UI.showConsulta;
export const showMenu = UI.showMenu;

// Debug
console.log('✅ Módulo de Consultas carregado!');
console.log('📦 Funções disponíveis:', {
  init: typeof init,
  showConsulta: typeof showConsulta,
  showMenu: typeof showMenu
});
