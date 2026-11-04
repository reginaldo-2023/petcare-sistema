const API_SERVICOS_AC3 = '/api/servicos';
const API_PETS_SERVICOS_AC3 = '/api/servicos/pets-disponiveis';

let servicosAc3 = [];
let temporizadorMensagemAc3;

const moedaAc3 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

document.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('form-servico')
    .addEventListener('submit', salvarServicoAc3);

  document
    .getElementById('btn-cancelar-servico')
    .addEventListener('click', cancelarEdicaoServicoAc3);

  document
    .getElementById('campo-busca-servicos')
    .addEventListener('input', atualizarListaServicosAc3);

  document
    .getElementById('lista-servicos')
    .addEventListener('click', tratarCliqueServicoAc3);

  document
    .querySelector('[data-tela="servicos"]')
    .addEventListener('click', carregarPetsParaServicoAc3);

  carregarServicosAc3();
  carregarPetsParaServicoAc3();
});

async function requisitarServicosAc3(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível concluir a operação.');
  }

  return dados;
}

async function carregarPetsParaServicoAc3() {
  const select = document.getElementById('servico-pet');
  const valorAnterior = select.value;

  try {
    const pets = await requisitarServicosAc3(API_PETS_SERVICOS_AC3);

    select.replaceChildren();

    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = pets.length
      ? 'Nenhum pet selecionado'
      : 'Cadastre um pet antes de vinculá-lo';

    select.appendChild(opcaoInicial);

    for (const pet of pets) {
      const opcao = document.createElement('option');
      opcao.value = String(pet.id);
      opcao.textContent = `${pet.nome} — tutor: ${pet.tutor_nome}`;
      select.appendChild(opcao);
    }

    if (pets.some((pet) => String(pet.id) === valorAnterior)) {
      select.value = valorAnterior;
    }
  } catch (erro) {
    select.replaceChildren();

    const opcaoErro = document.createElement('option');
    opcaoErro.value = '';
    opcaoErro.textContent = 'Não foi possível carregar os pets';
    select.appendChild(opcaoErro);

    mostrarMensagemServicoAc3(erro.message, 'erro');
  }
}

async function carregarServicosAc3() {
  try {
    servicosAc3 = await requisitarServicosAc3(API_SERVICOS_AC3);

    atualizarListaServicosAc3();

    document.getElementById('total-servicos').textContent =
      servicosAc3.length;
  } catch (erro) {
    const tbody = document.getElementById('lista-servicos');
    tbody.replaceChildren();

    const linha = document.createElement('tr');
    const celula = document.createElement('td');

    celula.colSpan = 6;
    celula.className = 'vazio';
    celula.textContent = 'Não foi possível carregar os serviços.';

    linha.appendChild(celula);
    tbody.appendChild(linha);

    mostrarMensagemServicoAc3(erro.message, 'erro');
  }
}

function atualizarListaServicosAc3() {
  const busca = document
    .getElementById('campo-busca-servicos')
    .value.toLocaleLowerCase('pt-BR')
    .trim();

  const filtrados = servicosAc3.filter((servico) => {
    return (
      servico.nome.toLocaleLowerCase('pt-BR').includes(busca) ||
      servico.descricao.toLocaleLowerCase('pt-BR').includes(busca)
    );
  });

  renderizarServicosAc3(filtrados);
}

function renderizarServicosAc3(lista) {
  const tbody = document.getElementById('lista-servicos');
  tbody.replaceChildren();

  if (lista.length === 0) {
    const linha = document.createElement('tr');
    const celula = document.createElement('td');

    celula.colSpan = 6;
    celula.className = 'vazio';
    celula.textContent = 'Nenhum serviço encontrado.';

    linha.appendChild(celula);
    tbody.appendChild(linha);
    return;
  }

  for (const servico of lista) {
    const linha = document.createElement('tr');

    const nome = document.createElement('td');
    nome.textContent = servico.nome;

    const descricao = document.createElement('td');
    descricao.textContent = servico.descricao;

    const preco = document.createElement('td');
    preco.textContent = moedaAc3.format(Number(servico.preco));

    const duracao = document.createElement('td');
    duracao.textContent = `${servico.duracao_minutos} min`;

    const petsCelula = document.createElement('td');
    const petsVinculados = Array.isArray(servico.pets)
      ? servico.pets
      : [];

    if (petsVinculados.length === 0) {
      petsCelula.textContent = 'Nenhum pet vinculado';
    } else {
      for (const pet of petsVinculados) {
        const item = document.createElement('div');
        item.className = 'pet-vinculado';

        const nomePet = document.createElement('span');
        nomePet.textContent = pet.nome;

        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'botao-tabela excluir';
        remover.textContent = 'Desvincular';
        remover.dataset.acao = 'desvincular';
        remover.dataset.id = servico.id;
        remover.dataset.petId = pet.id;

        item.append(nomePet, remover);
        petsCelula.appendChild(item);
      }
    }

    const acoes = document.createElement('td');
    const grupo = document.createElement('div');
    grupo.className = 'acoes-tabela';

    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'botao-tabela editar';
    editar.textContent = 'Editar';
    editar.dataset.acao = 'editar';
    editar.dataset.id = servico.id;

    const excluir = document.createElement('button');
    excluir.type = 'button';
    excluir.className = 'botao-tabela excluir';
    excluir.textContent = 'Excluir';
    excluir.dataset.acao = 'excluir';
    excluir.dataset.id = servico.id;

    grupo.append(editar, excluir);
    acoes.appendChild(grupo);

    linha.append(
      nome,
      descricao,
      preco,
      duracao,
      petsCelula,
      acoes
    );

    tbody.appendChild(linha);
  }
}

async function salvarServicoAc3(evento) {
  evento.preventDefault();

  const id = document.getElementById('servico-id').value;
  const petId = document.getElementById('servico-pet').value;

  const servico = {
    nome: document.getElementById('servico-nome').value.trim(),
    descricao: document.getElementById('servico-descricao').value.trim(),
    preco: document.getElementById('servico-preco').value,
    duracao_minutos: document.getElementById('servico-duracao').value
  };

  const botao = document.getElementById('btn-salvar-servico');
  botao.disabled = true;

  let servicoSalvo;

  try {
    servicoSalvo = await requisitarServicosAc3(
      id ? `${API_SERVICOS_AC3}/${id}` : API_SERVICOS_AC3,
      {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servico)
      }
    );

    if (petId) {
      await requisitarServicosAc3(
        `${API_SERVICOS_AC3}/${servicoSalvo.id}/pets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pet_id: petId })
        }
      );
    }

    cancelarEdicaoServicoAc3();
    await carregarServicosAc3();

    mostrarMensagemServicoAc3(
      id
        ? 'Serviço atualizado com sucesso!'
        : 'Serviço cadastrado com sucesso!',
      'sucesso'
    );
  } catch (erro) {
    if (servicoSalvo) {
      cancelarEdicaoServicoAc3();
      await carregarServicosAc3();

      mostrarMensagemServicoAc3(
        `O serviço foi salvo, mas o pet não foi vinculado: ${erro.message}`,
        'erro'
      );
    } else {
      mostrarMensagemServicoAc3(erro.message, 'erro');
    }
  } finally {
    botao.disabled = false;
  }
}

function tratarCliqueServicoAc3(evento) {
  const botao = evento.target.closest('button[data-acao][data-id]');

  if (!botao) return;

  const id = Number(botao.dataset.id);
  const servico = servicosAc3.find((item) => item.id === id);

  if (!servico) return;

  if (botao.dataset.acao === 'editar') {
    editarServicoAc3(servico);
  }

  if (botao.dataset.acao === 'excluir') {
    excluirServicoAc3(servico);
  }

  if (botao.dataset.acao === 'desvincular') {
    const petId = Number(botao.dataset.petId);
    const pet = Array.isArray(servico.pets)
      ? servico.pets.find((item) => item.id === petId)
      : null;

    if (pet) {
      desvincularPetAc3(servico, pet);
    }
  }
}

function editarServicoAc3(servico) {
  document.getElementById('servico-id').value = servico.id;
  document.getElementById('servico-nome').value = servico.nome;
  document.getElementById('servico-descricao').value = servico.descricao;
  document.getElementById('servico-preco').value = servico.preco;
  document.getElementById('servico-duracao').value =
    servico.duracao_minutos;

  document.getElementById('servico-pet').value = '';

  document.getElementById('titulo-formulario-servico').textContent =
    'Editar serviço';

  document.getElementById('btn-salvar-servico').textContent =
    'Salvar alterações';

  document.getElementById('btn-cancelar-servico').hidden = false;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function desvincularPetAc3(servico, pet) {
  const confirmou = confirm(
    `Desvincular "${pet.nome}" do serviço "${servico.nome}"?`
  );

  if (!confirmou) return;

  try {
    await requisitarServicosAc3(
      `${API_SERVICOS_AC3}/${servico.id}/pets/${pet.id}`,
      { method: 'DELETE' }
    );

    await carregarServicosAc3();

    mostrarMensagemServicoAc3(
      'Pet desvinculado do serviço com sucesso!',
      'sucesso'
    );
  } catch (erro) {
    mostrarMensagemServicoAc3(erro.message, 'erro');
  }
}

async function excluirServicoAc3(servico) {
  if (!confirm(`Deseja excluir o serviço "${servico.nome}"?`)) {
    return;
  }

  try {
    await requisitarServicosAc3(
      `${API_SERVICOS_AC3}/${servico.id}`,
      { method: 'DELETE' }
    );

    cancelarEdicaoServicoAc3();
    await carregarServicosAc3();

    mostrarMensagemServicoAc3(
      'Serviço excluído com sucesso!',
      'sucesso'
    );
  } catch (erro) {
    mostrarMensagemServicoAc3(erro.message, 'erro');
  }
}

function cancelarEdicaoServicoAc3() {
  document.getElementById('form-servico').reset();
  document.getElementById('servico-id').value = '';

  document.getElementById('titulo-formulario-servico').textContent =
    'Cadastrar novo serviço';

  document.getElementById('btn-salvar-servico').textContent =
    'Cadastrar serviço';

  document.getElementById('btn-cancelar-servico').hidden = true;
}

function mostrarMensagemServicoAc3(texto, tipo) {
  const elemento = document.getElementById('mensagem');

  clearTimeout(temporizadorMensagemAc3);

  elemento.textContent = texto;
  elemento.className = `mensagem ${tipo} visivel`;

  temporizadorMensagemAc3 = setTimeout(() => {
    elemento.className = 'mensagem';
  }, 3500);
}