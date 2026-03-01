import repository from '../../core/repository.js';

export async function listarUnidades() {
  return repository.listUnidades();
}

export async function salvarUnidade(unidade) {
  return repository.saveUnidade(unidade);
}

export async function excluirUnidade(id) {
  const unidades = await repository.listUnidades();
  const unidade = unidades.find((item) => String(item.id) === String(id));

  if (!unidade) {
    return false;
  }

  if (unidade.ativa === false) {
    return true;
  }

  await repository.saveUnidade({ ...unidade, ativa: false });
  return true;
}
