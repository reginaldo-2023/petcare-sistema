require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        email VARCHAR(120) NOT NULL UNIQUE,
        endereco VARCHAR(200) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tabela clientes criada ou verificada.');
  } catch (erro) {
    console.error('Erro ao criar tabelas:', erro.message);
  }
}

criarTabelas();

module.exports = pool;