const API_URL = '/api/clientes';

let clientes = [];
let mensagemTimer;

document.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('form-cliente')
    .addEventListener('submit', salvarCliente);

  document
    .getElementById('btn-cancelar')
    .addEventListener('click', cancelarEdicao);

  document
    .getElementById('campo-busca')
    .addEventListener('input', filtrarClientes);

  carregarClientes();
});

async function carregarClientes() {
  try {
    const resposta = await fetch(API_URL);
    clientes = await resposta.json();

    renderizarClientes(clientes);
    atualizarContador();
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
  const url = id ? `${API_URL}/${id}` : API_URL;

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

    cancelarEdicao();
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
        <td colspan="5" class="vazio">
          Nenhum cliente encontrado.
        </td>
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

  const filtrados = clientes.filter((cliente) => {
    return (
      cliente.nome.toLowerCase().includes(termo) ||
      cliente.email.toLowerCase().includes(termo) ||
      cliente.telefone.toLowerCase().includes(termo)
    );
  });

  renderizarClientes(filtrados);
}

function editarCliente(id) {
  const cliente = clientes.find((item) => item.id === id);

  if (!cliente) {
    return;
  }

  document.getElementById('cliente-id').value = cliente.id;
  document.getElementById('nome').value = cliente.nome;
  document.getElementById('telefone').value = cliente.telefone;
  document.getElementById('email').value = cliente.email;
  document.getElementById('endereco').value = cliente.endereco;

  document.getElementById('titulo-formulario').textContent = 'Editar cliente';
  document.getElementById('btn-salvar').textContent = 'Salvar alterações';
  document.getElementById('btn-cancelar').hidden = false;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirCliente(id) {
  const cliente = clientes.find((item) => item.id === id);

  if (!cliente) {
    return;
  }

  const confirmou = confirm(
    `Deseja excluir o cliente "${cliente.nome}"?`
  );

  if (!confirmou) {
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível excluir o cliente.');
    }

    mostrarMensagem('Cliente excluído com sucesso!', 'sucesso');
    carregarClientes();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  }
}

function cancelarEdicao() {
  document.getElementById('form-cliente').reset();
  document.getElementById('cliente-id').value = '';
  document.getElementById('titulo-formulario').textContent =
    'Cadastrar novo cliente';
  document.getElementById('btn-salvar').textContent = 'Cadastrar cliente';
  document.getElementById('btn-cancelar').hidden = true;
}

function atualizarContador() {
  document.getElementById('total-clientes').textContent = clientes.length;
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