const express = require('express');
const pool = require('../database');

const router = express.Router();

const tabelaPronta = pool.query(`
  CREATE TABLE IF NOT EXISTS servicos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(300) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    duracao_minutos INTEGER NOT NULL
      CHECK (duracao_minutos BETWEEN 1 AND 1440),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

tabelaPronta
  .then(() => console.log('Tabela servicos criada ou verificada.'))
  .catch((erro) => console.error('Erro ao criar tabela servicos:', erro.message));

function validarServico(dados) {
  const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
  const descricao =
    typeof dados.descricao === 'string' ? dados.descricao.trim() : '';
  const precoTexto = String(dados.preco ?? '').trim();
  const duracaoTexto = String(dados.duracao_minutos ?? '').trim();

  if (!nome || !descricao || !precoTexto || !duracaoTexto) {
    return { erro: 'Preencha nome, descrição, preço e duração.' };
  }

  if (nome.length > 100 || descricao.length > 300) {
    return { erro: 'Nome ou descrição excede o limite permitido.' };
  }

  if (!/^\d{1,8}(\.\d{1,2})?$/.test(precoTexto)) {
    return { erro: 'Informe um preço válido, com até duas casas decimais.' };
  }

  const duracao = Number(duracaoTexto);

  if (!Number.isInteger(duracao) || duracao < 1 || duracao > 1440) {
    return { erro: 'A duração deve estar entre 1 e 1440 minutos.' };
  }

  return { nome, descricao, preco: precoTexto, duracao };
}

function idValido(id) {
  return /^[1-9]\d*$/.test(id);
}

router.get('/', async (req, res) => {
  try {
    await tabelaPronta;

const resultado = await pool.query(`
  SELECT
    servicos.id,
    servicos.nome,
    servicos.descricao,
    servicos.preco,
    servicos.duracao_minutos,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', pets.id,
          'nome', pets.nome
        )
        ORDER BY pets.nome
      ) FILTER (WHERE pets.id IS NOT NULL),
      '[]'
    ) AS pets
  FROM servicos
  LEFT JOIN pet_servicos
    ON pet_servicos.servico_id = servicos.id
  LEFT JOIN pets
    ON pets.id = pet_servicos.pet_id
  GROUP BY servicos.id
  ORDER BY servicos.id DESC
`);

    res.json(resultado.rows);
  } catch (erro) {
    console.error('Erro ao listar serviços:', erro);
    res.status(500).json({ erro: 'Não foi possível listar os serviços.' });
  }
});

router.post('/', async (req, res) => {
  const dados = validarServico(req.body);

  if (dados.erro) {
    return res.status(400).json({ erro: dados.erro });
  }

  try {
    await tabelaPronta;

    const resultado = await pool.query(
      `INSERT INTO servicos (nome, descricao, preco, duracao_minutos)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dados.nome, dados.descricao, dados.preco, dados.duracao]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error('Erro ao cadastrar serviço:', erro);
    res.status(500).json({ erro: 'Não foi possível cadastrar o serviço.' });
  }
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'ID de serviço inválido.' });
  }

  const dados = validarServico(req.body);

  if (dados.erro) {
    return res.status(400).json({ erro: dados.erro });
  }

  try {
    await tabelaPronta;

    const resultado = await pool.query(
      `UPDATE servicos
       SET nome = $1, descricao = $2, preco = $3, duracao_minutos = $4
       WHERE id = $5
       RETURNING *`,
      [
        dados.nome,
        dados.descricao,
        dados.preco,
        dados.duracao,
        req.params.id
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Serviço não encontrado.' });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar serviço:', erro);
    res.status(500).json({ erro: 'Não foi possível atualizar o serviço.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ erro: 'ID de serviço inválido.' });
  }

  try {
    await tabelaPronta;

    const resultado = await pool.query(
      'DELETE FROM servicos WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Serviço não encontrado.' });
    }

    res.json({ mensagem: 'Serviço excluído com sucesso.' });
  } catch (erro) {
    console.error('Erro ao excluir serviço:', erro);

    if (erro.code === '23503') {
      return res.status(409).json({
        erro: 'Este serviço está vinculado a um agendamento e não pode ser excluído.'
      });
    }

    res.status(500).json({ erro: 'Não foi possível excluir o serviço.' });
  }
});

router.get('/pets-disponiveis', async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        pets.id,
        pets.nome,
        pets.especie,
        clientes.nome AS tutor_nome
      FROM pets
      INNER JOIN clientes
        ON clientes.id = pets.cliente_id
      ORDER BY pets.nome
    `);

    res.json(resultado.rows);
  } catch (erro) {
    console.error('Erro ao listar pets disponíveis:', erro);
    res.status(500).json({
      erro: 'Não foi possível listar os pets.'
    });
  }
});

router.post('/:servicoId/pets', async (req, res) => {
  const { servicoId } = req.params;
  const { pet_id } = req.body;

  if (!/^[1-9]\d*$/.test(servicoId)) {
    return res.status(400).json({
      erro: 'ID do serviço inválido.'
    });
  }

  const petIdNumero = Number(pet_id);

  if (!Number.isInteger(petIdNumero) || petIdNumero < 1) {
    return res.status(400).json({
      erro: 'Selecione um pet válido.'
    });
  }

  try {
    await tabelaPronta;

    const resultado = await pool.query(
      `INSERT INTO pet_servicos (pet_id, servico_id)
       VALUES ($1, $2)
       ON CONFLICT (pet_id, servico_id) DO NOTHING
       RETURNING pet_id, servico_id`,
      [petIdNumero, servicoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(409).json({
        erro: 'Este pet já está vinculado ao serviço.'
      });
    }

    res.status(201).json({
      mensagem: 'Pet vinculado ao serviço com sucesso.'
    });
  } catch (erro) {
    console.error('Erro ao vincular pet ao serviço:', erro);

    if (erro.code === '23503') {
      return res.status(400).json({
        erro: 'O pet ou serviço selecionado não existe.'
      });
    }

    res.status(500).json({
      erro: 'Não foi possível vincular o pet ao serviço.'
    });
  }
});

router.delete('/:servicoId/pets/:petId', async (req, res) => {
  const { servicoId, petId } = req.params;

  if (!/^[1-9]\d*$/.test(servicoId) || !/^[1-9]\d*$/.test(petId)) {
    return res.status(400).json({
      erro: 'Identificador inválido.'
    });
  }

  try {
    const resultado = await pool.query(
      `DELETE FROM pet_servicos
       WHERE servico_id = $1 AND pet_id = $2
       RETURNING pet_id`,
      [servicoId, petId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Vínculo não encontrado.'
      });
    }

    res.json({
      mensagem: 'Pet desvinculado do serviço com sucesso.'
    });
  } catch (erro) {
    console.error('Erro ao remover vínculo:', erro);
    res.status(500).json({
      erro: 'Não foi possível remover o vínculo.'
    });
  }
});

module.exports = router;