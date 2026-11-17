(() => {
  const API = '/api/agendamentos';

  const rotulosStatus = {
    agendado: 'Agendado',
    concluido: 'Concluído',
    cancelado: 'Cancelado'
  };

  let agendamentos = [];
  let servicosDisponiveis = [];
  let ocupado = false;
  let cadastrosCarregados = false;

  const elemento = (id) => document.getElementById(id);

  async function requisitar(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || 'Não foi possível concluir a operação.'
      );
    }

    return dados;
  }

  function informar(texto, erro = false) {
    const retorno = elemento('retorno-agendamento');

    retorno.textContent = texto;
    retorno.style.color = erro
      ? 'var(--vermelho)'
      : 'var(--verde)';
  }

  function atualizarBotao() {
    elemento('btn-salvar-agendamento').disabled =
      ocupado || !cadastrosCarregados;
  }

  function preencherSelect(id, lista, textoInicial, criarTexto) {
    const select = elemento(id);
    const anterior = select.value;

    select.replaceChildren();
    select.add(new Option(textoInicial, ''));

    for (const item of lista) {
      select.add(new Option(criarTexto(item), String(item.id)));
    }

    if (lista.some((item) => String(item.id) === anterior)) {
      select.value = anterior;
    }
  }

  function atualizarAvisoDuracao() {
    const idEdicao = elemento('agendamento-id').value;
    const servicoId = elemento('agendamento-servico').value;

    const atual = agendamentos.find(
      (item) => String(item.id) === idEdicao
    );

    const servico = servicosDisponiveis.find(
      (item) => String(item.id) === servicoId
    );

    const aviso = elemento('aviso-duracao-agendamento');

    if (!servico) {
      aviso.textContent =
        'A duração será definida pelo serviço selecionado.';
      return;
    }

    const mesmoServico = atual &&
      String(atual.servico_id) === servicoId;

    const duracao = mesmoServico
      ? atual.duracao_minutos
      : servico.duracao_minutos;

    aviso.textContent = mesmoServico
      ? `Duração registrada: ${duracao} minutos.`
      : `Duração prevista: ${duracao} minutos.`;
  }

  async function carregarDados() {
    const [pets, servicos, lista] = await Promise.all([
      requisitar('/api/pets'),
      requisitar('/api/servicos'),
      requisitar(API)
    ]);

    servicosDisponiveis = servicos;
    agendamentos = lista;

    preencherSelect(
      'agendamento-pet',
      pets,
      pets.length ? 'Selecione o pet' : 'Cadastre um pet primeiro',
      (pet) => `${pet.nome} — tutor: ${pet.tutor_nome}`
    );

    preencherSelect(
      'agendamento-servico',
      servicos,
      servicos.length
        ? 'Selecione o serviço'
        : 'Cadastre um serviço primeiro',
      (servico) =>
        `${servico.nome} — ${servico.duracao_minutos} min`
    );

    cadastrosCarregados = pets.length > 0 && servicos.length > 0;

    elemento('total-agendamentos').textContent =
      agendamentos.length;

    renderizar();
    atualizarAvisoDuracao();
    atualizarBotao();
  }

  async function atualizarTela() {
    if (ocupado) return;

    ocupado = true;
    atualizarBotao();

    try {
      await carregarDados();
    } catch (erro) {
      cadastrosCarregados = false;
      informar(erro.message, true);
      mostrarLinhaVazia('Não foi possível atualizar os agendamentos.');
    } finally {
      ocupado = false;
      atualizarBotao();
    }
  }

  function mostrarLinhaVazia(texto) {
    const tbody = elemento('lista-agendamentos');
    const linha = document.createElement('tr');
    const celula = document.createElement('td');

    celula.colSpan = 8;
    celula.className = 'vazio';
    celula.textContent = texto;

    linha.appendChild(celula);
    tbody.replaceChildren(linha);
  }

  function formatarData(data) {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function criarCelula(texto) {
    const celula = document.createElement('td');
    celula.textContent = texto;
    return celula;
  }

  function criarBotao(texto, acao, id, classe) {
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.className = `botao-tabela ${classe}`;
    botao.textContent = texto;
    botao.dataset.acao = acao;
    botao.dataset.id = String(id);

    return botao;
  }

  function renderizar() {
    const termo = elemento('campo-busca-agendamentos')
      .value.trim().toLocaleLowerCase('pt-BR');

    const lista = agendamentos.filter((item) => {
      const texto = [
        item.pet_nome,
        item.tutor_nome,
        item.servico_nome,
        rotulosStatus[item.status],
        item.observacoes,
        item.data,
        formatarData(item.data)
      ].join(' ').toLocaleLowerCase('pt-BR');

      return texto.includes(termo);
    });

    if (lista.length === 0) {
      mostrarLinhaVazia('Nenhum agendamento encontrado.');
      return;
    }

    const tbody = elemento('lista-agendamentos');
    tbody.replaceChildren();

    for (const item of lista) {
      const linha = document.createElement('tr');
      const acoes = document.createElement('td');
      const grupo = document.createElement('div');

      grupo.className = 'acoes-tabela';

      grupo.append(
        criarBotao('Editar', 'editar', item.id, 'editar'),
        criarBotao('Excluir', 'excluir', item.id, 'excluir')
      );

      acoes.appendChild(grupo);

      linha.append(
        criarCelula(formatarData(item.data)),
        criarCelula(`${item.horario} às ${item.horario_fim}`),
        criarCelula(item.pet_nome),
        criarCelula(item.tutor_nome),
        criarCelula(item.servico_nome),
        criarCelula(rotulosStatus[item.status] || item.status),
        criarCelula(item.observacoes || '—'),
        acoes
      );

      tbody.appendChild(linha);
    }
  }

  function limparFormulario() {
    elemento('form-agendamento').reset();
    elemento('agendamento-id').value = '';

    elemento('titulo-formulario-agendamento').textContent =
      'Cadastrar novo agendamento';

    elemento('btn-salvar-agendamento').textContent =
      'Cadastrar agendamento';

    elemento('btn-cancelar-agendamento').hidden = true;

    atualizarAvisoDuracao();
  }

  function editar(item) {
    elemento('agendamento-id').value = item.id;
    elemento('agendamento-pet').value = String(item.pet_id);
    elemento('agendamento-servico').value = String(item.servico_id);
    elemento('agendamento-data').value = item.data;
    elemento('agendamento-horario').value = item.horario;
    elemento('agendamento-status').value = item.status;
    elemento('agendamento-observacoes').value = item.observacoes;

    elemento('titulo-formulario-agendamento').textContent =
      'Editar agendamento';

    elemento('btn-salvar-agendamento').textContent =
      'Salvar alterações';

    elemento('btn-cancelar-agendamento').hidden = false;

    informar('');
    atualizarAvisoDuracao();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(evento) {
    evento.preventDefault();

    if (ocupado || !cadastrosCarregados) return;

    const id = elemento('agendamento-id').value;

    const dados = {
      pet_id: elemento('agendamento-pet').value,
      servico_id: elemento('agendamento-servico').value,
      data: elemento('agendamento-data').value,
      horario: elemento('agendamento-horario').value,
      status: elemento('agendamento-status').value,
      observacoes: elemento('agendamento-observacoes').value.trim()
    };

    ocupado = true;
    atualizarBotao();

    let salvo = false;

    try {
      const resultado = await requisitar(
        id ? `${API}/${id}` : API,
        {
          method: id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        }
      );

      salvo = true;
      limparFormulario();
      await carregarDados();
      informar(resultado.mensagem);
    } catch (erro) {
      informar(
        salvo
          ? `O agendamento foi salvo, mas a lista não foi atualizada: ${erro.message}`
          : erro.message,
        true
      );
    } finally {
      ocupado = false;
      atualizarBotao();
    }
  }

  async function excluir(item) {
    const confirmou = confirm(
      `Excluir o agendamento de ${item.pet_nome}, em ` +
      `${formatarData(item.data)} às ${item.horario}? ` +
      'O pet e o serviço não serão excluídos.'
    );

    if (!confirmou || ocupado) return;

    ocupado = true;
    atualizarBotao();

    let excluido = false;

    try {
      await requisitar(`${API}/${item.id}`, { method: 'DELETE' });
      excluido = true;

      if (
        elemento('agendamento-id').value === String(item.id)
      ) {
        limparFormulario();
      }

      await carregarDados();
      informar('Agendamento excluído com sucesso.');
    } catch (erro) {
      informar(
        excluido
          ? `O agendamento foi excluído, mas a lista não foi atualizada: ${erro.message}`
          : erro.message,
        true
      );
    } finally {
      ocupado = false;
      atualizarBotao();
    }
  }

  function iniciar() {
    elemento('form-agendamento').addEventListener('submit', salvar);

    elemento('btn-cancelar-agendamento').addEventListener(
      'click',
      () => {
        if (ocupado) return;
        limparFormulario();
        informar('');
      }
    );

    elemento('agendamento-servico').addEventListener(
      'change',
      atualizarAvisoDuracao
    );

    elemento('campo-busca-agendamentos').addEventListener(
      'input',
      renderizar
    );

    elemento('lista-agendamentos').addEventListener(
      'click',
      (evento) => {
        if (ocupado) return;

        const botao = evento.target.closest('button[data-acao]');

        if (!botao) return;

        const item = agendamentos.find(
          (registro) => String(registro.id) === botao.dataset.id
        );

        if (!item) return;

        if (botao.dataset.acao === 'editar') editar(item);
        if (botao.dataset.acao === 'excluir') excluir(item);
      }
    );

    document.querySelector(
      '.item-menu[data-tela="agendamentos"]'
    ).addEventListener('click', atualizarTela);

    atualizarTela();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();