const express = require('express');
const pool = require('../database');

const router = express.Router();

function idValido(valor) {
  return /^[1-9]\d*$/.test(String(valor));
}

function erroHttp(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

function validarDados(corpo) {
  const dados = corpo || {};

  if (!idValido(dados.pet_id) || !idValido(dados.servico_id)) {
    throw erroHttp(400, 'Selecione um pet e um serviço válidos.');
  }

  const data = typeof dados.data === 'string' ? dados.data : '';
  const horario = typeof dados.horario === 'string'
    ? dados.horario
    : '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw erroHttp(400, 'Informe uma data válida.');
  }

  const dataTeste = new Date(`${data}T00:00:00.000Z`);

  if (
    Number(data.slice(0, 4)) < 1900 ||
    Number.isNaN(dataTeste.getTime()) ||
    dataTeste.toISOString().slice(0, 10) !== data
  ) {
    throw erroHttp(400, 'Informe uma data válida.');
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
    throw erroHttp(400, 'Informe um horário válido, no formato HH:MM.');
  }

  const status = dados.status === undefined
    ? 'agendado'
    : dados.status;

  if (!['agendado', 'concluido', 'cancelado'].includes(status)) {
    throw erroHttp(400, 'Selecione um status válido.');
  }

  if (
    dados.observacoes !== undefined &&
    typeof dados.observacoes !== 'string'
  ) {
    throw erroHttp(400, 'As observações devem ser um texto.');
  }

  const observacoes = (dados.observacoes || '').trim();

  if (observacoes.length > 500) {
    throw erroHttp(400, 'As observações podem ter até 500 caracteres.');
  }

  return {
    petId: String(dados.pet_id),
    servicoId: String(dados.servico_id),
    data,
    horario,
    status,
    observacoes
  };
}

function responderErro(res, erro) {
  if (erro.status) {
    return res.status(erro.status).json({ erro: erro.message });
  }

  if (erro.code === '23503') {
    return res.status(400).json({
      erro: 'O pet ou serviço informado não existe mais.'
    });
  }

  if (erro.code === '22003' || erro.code === '22P02') {
    return res.status(400).json({
      erro: 'Um dos identificadores informados é inválido.'
    });
  }

  console.error('Erro na API de agendamentos:', erro);

  return res.status(500).json({
    erro: 'Não foi possível concluir a operação de agendamento.'
  });
}

router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        a.id,
        a.pet_id,
        a.servico_id,
        TO_CHAR(a.data, 'YYYY-MM-DD') AS data,
        TO_CHAR(a.horario, 'HH24:MI') AS horario,
        TO_CHAR(
          a.data + a.horario
          + a.duracao_minutos * INTERVAL '1 minute',
          'HH24:MI'
        ) AS horario_fim,
        a.duracao_minutos,
        a.status,
        a.observacoes,
        p.nome AS pet_nome,
        c.nome AS tutor_nome,
        s.nome AS servico_nome
      FROM agendamentos a
      INNER JOIN pets p ON p.id = a.pet_id
      INNER JOIN clientes c ON c.id = p.cliente_id
      INNER JOIN servicos s ON s.id = a.servico_id
      ORDER BY a.data ASC, a.horario ASC, a.id ASC
    `);

    res.json(resultado.rows);
  } catch (erro) {
    responderErro(res, erro);
  }
});

async function salvarAgendamento(req, res) {
  const editando = req.method === 'PUT';
  const id = editando ? req.params.id : null;

  let conexao;

  try {
    if (editando && !idValido(id)) {
      throw erroHttp(400, 'ID de agendamento inválido.');
    }

    const dados = validarDados(req.body);

    conexao = await pool.connect();

    await conexao.query('BEGIN');

    await conexao.query(
      'LOCK TABLE agendamentos IN SHARE ROW EXCLUSIVE MODE'
    );

    let atual = null;

    if (editando) {
      const encontrado = await conexao.query(
        'SELECT * FROM agendamentos WHERE id = $1 FOR UPDATE',
        [id]
      );

      atual = encontrado.rows[0];

      if (!atual) {
        throw erroHttp(404, 'Agendamento não encontrado.');
      }
    }

    const pet = await conexao.query(
      'SELECT id FROM pets WHERE id = $1 FOR KEY SHARE',
      [dados.petId]
    );

    if (pet.rows.length === 0) {
      throw erroHttp(400, 'O pet selecionado não existe.');
    }

    const servico = await conexao.query(
      `SELECT id, duracao_minutos
       FROM servicos
       WHERE id = $1
       FOR SHARE`,
      [dados.servicoId]
    );

    if (servico.rows.length === 0) {
      throw erroHttp(400, 'O serviço selecionado não existe.');
    }

    const mesmoServico = atual &&
      String(atual.servico_id) === dados.servicoId;

    const duracao = mesmoServico
      ? atual.duracao_minutos
      : servico.rows[0].duracao_minutos;

    const [hora, minuto] = dados.horario.split(':').map(Number);
    const fimEmMinutos = hora * 60 + minuto + duracao;

    if (fimEmMinutos > 1440) {
      throw erroHttp(
        400,
        'O atendimento deve terminar até meia-noite do mesmo dia.'
      );
    }

    if (dados.status !== 'cancelado') {
      const conflito = await conexao.query(
        `SELECT id
         FROM agendamentos
         WHERE pet_id = $1
           AND status <> 'cancelado'
           AND ($5::integer IS NULL OR id <> $5::integer)
           AND (data + horario) <
               ($2::date + $3::time
                + $4::integer * INTERVAL '1 minute')
           AND (data + horario
                + duracao_minutos * INTERVAL '1 minute') >
               ($2::date + $3::time)
         LIMIT 1`,
        [dados.petId, dados.data, dados.horario, duracao, id]
      );

      if (conflito.rows.length > 0) {
        throw erroHttp(
          409,
          'Este pet já possui um atendimento nesse intervalo de horário.'
        );
      }
    }

    const valores = [
      dados.petId,
      dados.servicoId,
      dados.data,
      dados.horario,
      duracao,
      dados.status,
      dados.observacoes
    ];

    let resultado;

    if (editando) {
      resultado = await conexao.query(
        `UPDATE agendamentos
         SET pet_id = $1,
             servico_id = $2,
             data = $3,
             horario = $4,
             duracao_minutos = $5,
             status = $6,
             observacoes = $7
         WHERE id = $8
         RETURNING id`,
        [...valores, id]
      );
    } else {
      resultado = await conexao.query(
        `INSERT INTO agendamentos (
           pet_id,
           servico_id,
           data,
           horario,
           duracao_minutos,
           status,
           observacoes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        valores
      );
    }

    await conexao.query('COMMIT');

    res.status(editando ? 200 : 201).json({
      id: resultado.rows[0].id,
      mensagem: editando
        ? 'Agendamento atualizado com sucesso.'
        : 'Agendamento cadastrado com sucesso.'
    });
  } catch (erro) {
    if (conexao) {
      try {
        await conexao.query('ROLLBACK');
      } catch (erroRollback) {
        console.error('Erro ao desfazer operação:', erroRollback);
      }
    }

    responderErro(res, erro);
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
}

router.post('/', salvarAgendamento);
router.put('/:id', salvarAgendamento);

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      erro: 'ID de agendamento inválido.'
    });
  }

  try {
    const resultado = await pool.query(
      'DELETE FROM agendamentos WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Agendamento não encontrado.'
      });
    }

    res.json({
      mensagem: 'Agendamento excluído com sucesso.'
    });
  } catch (erro) {
    responderErro(res, erro);
  }
});

module.exports = router;