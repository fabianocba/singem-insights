import * as dbGateway from '../../core/dbGateway.js';

export async function excluirDocumento(app, documentoId, tipo) {
  const tipoNome = tipo === 'empenho' ? 'Empenho' : 'Nota Fiscal';

  const confirmacao = confirm(
    `ATENCAO!\n\n` +
      `Deseja realmente excluir este ${tipoNome}?\n\n` +
      `Esta acao ira:\n` +
      `${tipo === 'empenho' ? '- Remover os saldos relacionados\n' : ''}` +
      `- Remover o registro do banco de dados\n\n` +
      `Esta operacao NAO pode ser desfeita!`
  );

  if (!confirmacao) {
    return;
  }

  try {
    app.showLoading('Excluindo documento...');

    if (tipo === 'empenho') {
      await dbGateway.deleteRecord('empenhos', documentoId);
      const saldos = await dbGateway.getByIndex('saldosEmpenhos', 'empenhoId', documentoId);
      for (const saldo of saldos) {
        await dbGateway.deleteRecord('saldosEmpenhos', saldo.id);
      }
    } else {
      await dbGateway.deleteRecord('notasFiscais', documentoId);
    }

    const arquivos = await dbGateway.getByIndex('arquivos', 'documentoId', documentoId);
    for (const arquivo of arquivos || []) {
      await dbGateway.deleteRecord('arquivos', arquivo.id);
    }

    app.showSuccess(`${tipoNome} excluido com sucesso do banco de dados.`);
    await app.carregarEmpenhosSelect();
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    app.showError(`Erro ao excluir ${tipoNome}: ${error.message}`);
  } finally {
    app.hideLoading();
  }
}

export async function limparRegistrosDeletados(app) {
  try {
    app.showLoading('Limpando registros deletados...');

    let totalExcluidos = 0;

    const todosEmpenhos = await dbGateway.buscarEmpenhos(true);
    const empenhosDeletados = todosEmpenhos.filter((emp) => emp.arquivoDeletado);

    for (const empenho of empenhosDeletados) {
      const saldos = await dbGateway.getByIndex('saldosEmpenhos', 'empenhoId', empenho.id);
      for (const saldo of saldos) {
        await dbGateway.deleteRecord('saldosEmpenhos', saldo.id);
      }

      await dbGateway.deleteRecord('empenhos', empenho.id);
      totalExcluidos++;
      console.log(`Empenho ${empenho.numero} excluido do banco`);
    }

    const notasFiscais = await dbGateway.getAll('notasFiscais');
    const nfsDeletadas = notasFiscais.filter((nf) => nf.arquivoDeletado);

    for (const nf of nfsDeletadas) {
      await dbGateway.deleteRecord('notasFiscais', nf.id);
      totalExcluidos++;
      console.log(`NF ${nf.numero} excluida do banco`);
    }

    await app.carregarEmpenhosSelect();

    alert(`Limpeza concluida!\n\n${totalExcluidos} registro(s) deletado(s) permanentemente do banco de dados.`);
  } catch (error) {
    console.error('Erro ao limpar registros:', error);
    app.showError(`Erro na limpeza: ${error.message}`);
  } finally {
    app.hideLoading();
  }
}

export async function limparRegistrosOrfaos(app) {
  try {
    app.showLoading('Buscando registros orfaos...');

    const todosEmpenhos = await dbGateway.buscarEmpenhos(true);
    const todosArquivos = await dbGateway.getAll('arquivos');

    const mapaArquivos = new Map();
    todosArquivos.forEach((arquivo) => {
      if (arquivo.tipoDocumento === 'empenho') {
        mapaArquivos.set(arquivo.documentoId, arquivo);
      }
    });

    const empenhosOrfaos = todosEmpenhos.filter((emp) => !mapaArquivos.has(emp.id));

    if (empenhosOrfaos.length === 0) {
      alert('Nenhum registro orfao encontrado!');
      return;
    }

    const mensagem =
      `LIMPAR REGISTROS ORFAOS\n\n` +
      `Encontrados ${empenhosOrfaos.length} empenho(s) sem arquivo PDF vinculado:\n\n` +
      empenhosOrfaos
        .map((e) => `- NE ${e.numero} - ${e.fornecedor}`)
        .join('\n')
        .substring(0, 500) +
      (empenhosOrfaos.length > 10 ? '\n...' : '') +
      `\n\nDeseja excluir permanentemente esses registros?\nEsta acao NAO pode ser desfeita!`;

    const confirmar = confirm(mensagem);
    if (!confirmar) {
      return;
    }

    let totalExcluidos = 0;

    for (const empenho of empenhosOrfaos) {
      const saldos = await dbGateway.getByIndex('saldosEmpenhos', 'empenhoId', empenho.id);
      for (const saldo of saldos) {
        await dbGateway.deleteRecord('saldosEmpenhos', saldo.id);
      }

      await dbGateway.deleteRecord('empenhos', empenho.id);
      totalExcluidos++;
      console.log(`Empenho orfao ${empenho.numero} excluido do banco`);
    }

    await app.carregarEmpenhosSelect();

    alert(`Limpeza de orfaos concluida!\n\n${totalExcluidos} empenho(s) sem arquivo foram excluidos do banco.`);
  } catch (error) {
    console.error('Erro ao limpar registros orfaos:', error);
    app.showError(`Erro na limpeza: ${error.message}`);
  } finally {
    app.hideLoading();
  }
}
