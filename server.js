require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/clientes', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM clientes ORDER BY id DESC'
    );

    res.json(resultado.rows);
  } catch (erro) {
    res.status(500).json({ erro: 'Não foi possível listar os clientes.' });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nome, telefone, email, endereco } = req.body;

  if (!nome || !telefone || !email || !endereco) {
    return res.status(400).json({
      erro: 'Preencha nome, telefone, e-mail e endereço.'
    });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO clientes (nome, telefone, email, endereco)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome, telefone, email, endereco]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(400).json({
        erro: 'Já existe um cliente cadastrado com este e-mail.'
      });
    }

    res.status(500).json({ erro: 'Não foi possível cadastrar o cliente.' });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { nome, telefone, email, endereco } = req.body;
  const { id } = req.params;

  if (!nome || !telefone || !email || !endereco) {
    return res.status(400).json({
      erro: 'Preencha nome, telefone, e-mail e endereço.'
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE clientes
       SET nome = $1, telefone = $2, email = $3, endereco = $4
       WHERE id = $5
       RETURNING *`,
      [nome, telefone, email, endereco, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(400).json({
        erro: 'Já existe um cliente cadastrado com este e-mail.'
      });
    }

    res.status(500).json({ erro: 'Não foi possível atualizar o cliente.' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      'DELETE FROM clientes WHERE id = $1 RETURNING *',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    res.json({ mensagem: 'Cliente excluído com sucesso.' });
  } catch (erro) {
    res.status(500).json({ erro: 'Não foi possível excluir o cliente.' });
  }
});

app.listen(PORT, () => {
  console.log(`PetCare rodando em http://localhost:${PORT}`);
});