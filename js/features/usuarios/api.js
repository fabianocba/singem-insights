import repository from '../../core/repository.js';

export async function listarUsuarios() {
  return repository.listUsuarios();
}

export async function salvarUsuario(usuario) {
  return repository.saveUsuario(usuario);
}

export async function excluirUsuario(id) {
  const usuarios = await repository.listUsuarios();
  const usuario = usuarios.find((item) => String(item.id) === String(id));

  if (!usuario) {
    return false;
  }

  if (usuario.ativo === false) {
    return true;
  }

  await repository.saveUsuario({ ...usuario, ativo: false });
  return true;
}
