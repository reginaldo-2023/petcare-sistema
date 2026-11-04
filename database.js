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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pets (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(80) NOT NULL,
        especie VARCHAR(50) NOT NULL,
        raca VARCHAR(80),
        idade INTEGER NOT NULL CHECK (idade >= 0),
        porte VARCHAR(20) NOT NULL,
        cliente_id INTEGER NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pet_cliente
          FOREIGN KEY (cliente_id)
          REFERENCES clientes(id)
          ON DELETE CASCADE
      )
    `);

        await pool.query(`
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pet_servicos (
        pet_id INTEGER NOT NULL,
        servico_id INTEGER NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (pet_id, servico_id),

        CONSTRAINT fk_pet_servico_pet
          FOREIGN KEY (pet_id)
          REFERENCES pets(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_pet_servico_servico
          FOREIGN KEY (servico_id)
          REFERENCES servicos(id)
          ON DELETE CASCADE
      )
    `);

    console.log('Tabelas clientes e pets criadas ou verificadas.');
  } catch (erro) {
    console.error('Erro ao criar tabelas:', erro.message);
  }
}

criarTabelas();

module.exports = pool;