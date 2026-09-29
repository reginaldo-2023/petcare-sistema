const API_CLIENTES = '/api/clientes';
const API_PETS = '/api/pets';

let clientes = [];
let pets = [];
let mensagemTimer;

document.addEventListener('DOMContentLoaded', () => {
  configurarMenu();

  document
    .getElementById('form-cliente')
    .addEventListener('submit', salvarCliente);

  document
    .getElementById('btn-cancelar-cliente')
    .addEventListener('click', cancelarEdicaoCliente);

  document
    .getElementById('campo-busca-clientes')
    .addEventListener('input', filtrarClientes);

  document
    .getElementById('form-pet')
    .addEventListener('submit', salvarPet);

  document
    .getElementById('btn-cancelar-pet')
    .addEventListener('click', cancelarEdicaoPet);

  document
    .getElementById('campo-busca-pets')
    .addEventListener('input', filtrarPets);

  carregarClientes();
  carregarPets();
});

/* =========================
   NAVEGAÇÃO ENTRE TELAS
========================= */

function configurarMenu() {
  const botoes = document.querySelectorAll('.item-menu');

  botoes.forEach((botao) => {
    botao.addEventListener('click', () => {
      const tela = botao.dataset.tela;

      document
        .querySelectorAll('.item-menu')
        .forEach((item) => item.classList.remove('ativo'));

      document
        .querySelectorAll('.tela')
        .forEach((item) => item.classList.remove('ativa'));

      botao.classList.add('ativo');
      document.getElementById(`tela-${tela}`).classList.add('ativa');

      if (tela === 'pets') {
        preencherSelectTutores();
      }
    });
  });
}

/* =========================
   CRUD DE CLIENTES - AC1
========================= */

async function carregarClientes() {
  try {
    const resposta = await fetch(API_CLIENTES);
    clientes = await resposta.json();

    renderizarClientes(clientes);
    atualizarContadorClientes();
    preencherSelectTutores();
  } catch (erro) {
    mostrarMensagem('Não foi possível carregar os clientes.', 'erro');
  }
}

async function salvarCliente(evento) {
  evento.preventDefault();

  const id = document.getElementById('cliente-id').value;

  const cliente = {
    nome: document.getElementById('nome').value.trim(),
    telefone: document.getElementById('telefone').value.trim(),
    email: document.getElementById('email').value.trim(),
    endereco: document.getElementById('endereco').value.trim()
  };

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `${API_CLIENTES}/${id}` : API_CLIENTES;

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cliente)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível salvar o cliente.');
    }

    mostrarMensagem(
      id ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!',
      'sucesso'
    );

    cancelarEdicaoCliente();
    carregarClientes();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

function renderizarClientes(lista) {
  const tbody = document.getElementById('lista-clientes');

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="vazio">Nenhum cliente encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map((cliente) => `
    <tr>
      <td>${escaparHtml(cliente.nome)}</td>
      <td>${escaparHtml(cliente.telefone)}</td>
      <td>${escaparHtml(cliente.email)}</td>
      <td>${escaparHtml(cliente.endereco)}</td>
      <td>
        <div class="acoes-tabela">
          <button class="botao-tabela editar" onclick="editarCliente(${cliente.id})">
            Editar
          </button>
          <button class="botao-tabela excluir" onclick="excluirCliente(${cliente.id})">
            Excluir
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filtrarClientes(evento) {
  const termo = evento.target.value.toLowerCase().trim();

  const filtrados = clientes.filter((cliente) => (
    cliente.nome.toLowerCase().includes(termo) ||
    cliente.email.toLowerCase().includes(termo) ||
    cliente.telefone.toLowerCase().includes(termo)
  ));

  renderizarClientes(filtrados);
}

function editarCliente(id) {
  const cliente = clientes.find((item) => item.id === id);

  if (!cliente) {
    return;
  }

  mostrarTela('clientes');

  document.getElementById('cliente-id').value = cliente.id;
  document.getElementById('nome').value = cliente.nome;
  document.getElementById('telefone').value = cliente.telefone;
  document.getElementById('email').value = cliente.email;
  document.getElementById('endereco').value = cliente.endereco;

  document.getElementById('titulo-formulario-cliente').textContent = 'Editar cliente';
  document.getElementById('btn-salvar-cliente').textContent = 'Salvar alterações';
  document.getElementById('btn-cancelar-cliente').hidden = false;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirCliente(id) {
  const cliente = clientes.find((item) => item.id === id);

  if (!cliente) {
    return;
  }

  const confirmou = confirm(
    `Deseja excluir o cliente "${cliente.nome}"? Os pets vinculados também serão excluídos.`
  );

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_CLIENTES}/${id}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível excluir o cliente.');
    }

    mostrarMensagem('Cliente excluído com sucesso!', 'sucesso');
    carregarClientes();
    carregarPets();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

function cancelarEdicaoCliente() {
  document.getElementById('form-cliente').reset();
  document.getElementById('cliente-id').value = '';
  document.getElementById('titulo-formulario-cliente').textContent =
    'Cadastrar novo cliente';
  document.getElementById('btn-salvar-cliente').textContent = 'Cadastrar cliente';
  document.getElementById('btn-cancelar-cliente').hidden = true;
}

function atualizarContadorClientes() {
  document.getElementById('total-clientes').textContent = clientes.length;
}

/* =========================
   CRUD DE PETS - AC2
========================= */

async function carregarPets() {
  try {
    const resposta = await fetch(API_PETS);
    pets = await resposta.json();

    renderizarPets(pets);
    atualizarContadorPets();
  } catch (erro) {
    mostrarMensagem('Não foi possível carregar os pets.', 'erro');
  }
}

async function salvarPet(evento) {
  evento.preventDefault();

  const id = document.getElementById('pet-id').value;

  const pet = {
    nome: document.getElementById('pet-nome').value.trim(),
    especie: document.getElementById('pet-especie').value,
    raca: document.getElementById('pet-raca').value.trim(),
    idade: document.getElementById('pet-idade').value,
    porte: document.getElementById('pet-porte').value,
    cliente_id: document.getElementById('pet-cliente').value
  };

  const metodo = id ? 'PUT' : 'POST';
  const url = id ? `${API_PETS}/${id}` : API_PETS;

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pet)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível salvar o pet.');
    }

    mostrarMensagem(
      id ? 'Pet atualizado com sucesso!' : 'Pet cadastrado com sucesso!',
      'sucesso'
    );

    cancelarEdicaoPet();
    carregarPets();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

function renderizarPets(lista) {
  const tbody = document.getElementById('lista-pets');

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="vazio">Nenhum pet encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map((pet) => `
    <tr>
      <td>${escaparHtml(pet.nome)}</td>
      <td>${escaparHtml(pet.especie)}</td>
      <td>${escaparHtml(pet.raca || 'Não informada')}</td>
      <td>${pet.idade} ano(s)</td>
      <td>${escaparHtml(pet.porte)}</td>
      <td>${escaparHtml(pet.tutor_nome)}</td>
      <td>
        <div class="acoes-tabela">
          <button class="botao-tabela editar" onclick="editarPet(${pet.id})">
            Editar
          </button>
          <button class="botao-tabela excluir" onclick="excluirPet(${pet.id})">
            Excluir
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filtrarPets(evento) {
  const termo = evento.target.value.toLowerCase().trim();

  const filtrados = pets.filter((pet) => (
    pet.nome.toLowerCase().includes(termo) ||
    pet.especie.toLowerCase().includes(termo) ||
    pet.tutor_nome.toLowerCase().includes(termo)
  ));

  renderizarPets(filtrados);
}

function preencherSelectTutores(tutorSelecionado = '') {
  const select = document.getElementById('pet-cliente');

  const valorAtual = tutorSelecionado || select.value;

  select.innerHTML = `
    <option value="">Selecione o tutor responsável</option>
    ${clientes.map((cliente) => `
      <option value="${cliente.id}">
        ${escaparHtml(cliente.nome)}
      </option>
    `).join('')}
  `;

  select.value = valorAtual;
}

function editarPet(id) {
  const pet = pets.find((item) => item.id === id);

  if (!pet) {
    return;
  }

  mostrarTela('pets');

  document.getElementById('pet-id').value = pet.id;
  document.getElementById('pet-nome').value = pet.nome;
  document.getElementById('pet-especie').value = pet.especie;
  document.getElementById('pet-raca').value = pet.raca || '';
  document.getElementById('pet-idade').value = pet.idade;
  document.getElementById('pet-porte').value = pet.porte;

  preencherSelectTutores(String(pet.cliente_id));

  document.getElementById('titulo-formulario-pet').textContent = 'Editar pet';
  document.getElementById('btn-salvar-pet').textContent = 'Salvar alterações';
  document.getElementById('btn-cancelar-pet').hidden = false;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirPet(id) {
  const pet = pets.find((item) => item.id === id);

  if (!pet) {
    return;
  }

  const confirmou = confirm(`Deseja excluir o pet "${pet.nome}"?`);

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_PETS}/${id}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível excluir o pet.');
    }

    mostrarMensagem('Pet excluído com sucesso!', 'sucesso');
    carregarPets();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

function cancelarEdicaoPet() {
  document.getElementById('form-pet').reset();
  document.getElementById('pet-id').value = '';
  document.getElementById('titulo-formulario-pet').textContent =
    'Cadastrar novo pet';
  document.getElementById('btn-salvar-pet').textContent = 'Cadastrar pet';
  document.getElementById('btn-cancelar-pet').hidden = true;
  preencherSelectTutores();
}

function atualizarContadorPets() {
  document.getElementById('total-pets').textContent = pets.length;
}

/* =========================
   FUNÇÕES GERAIS
========================= */

function mostrarTela(nomeTela) {
  document
    .querySelectorAll('.item-menu')
    .forEach((item) => item.classList.remove('ativo'));

  document
    .querySelectorAll('.tela')
    .forEach((item) => item.classList.remove('ativa'));

  document
    .querySelector(`.item-menu[data-tela="${nomeTela}"]`)
    .classList.add('ativo');

  document.getElementById(`tela-${nomeTela}`).classList.add('ativa');
}

function mostrarMensagem(texto, tipo) {
  const elemento = document.getElementById('mensagem');

  clearTimeout(mensagemTimer);

  elemento.textContent = texto;
  elemento.className = `mensagem ${tipo} visivel`;

  mensagemTimer = setTimeout(() => {
    elemento.className = 'mensagem';
  }, 3500);
}

function escaparHtml(valor) {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}