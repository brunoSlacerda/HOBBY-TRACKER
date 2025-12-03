const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://hobby_db_jjq6_user:v0OUKloX7Q6Y0rhOmjxbDAdaptGyKm7Z@dpg-d4nha7ndiees73c2ns30-a/hobby_db_jjq6';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Função para criar as tabelas
const criarTabelas = async () => {
    try {
        // 1. Limpeza: Removemos a tabela antiga de testes (só roda se ela existir)
        await pool.query(`DROP TABLE IF EXISTS registros`);

        // 2. Tabela de LIVROS (Com status de leitura e capa)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS livros (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(255),
                autor VARCHAR(255),
                total_paginas INTEGER,
                pagina_atual INTEGER DEFAULT 0,
                terminado BOOLEAN DEFAULT FALSE,
                capa_url TEXT,
                comentario TEXT,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Tabela de CORRIDAS (Com tipo de treino e local)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS corridas (
                id SERIAL PRIMARY KEY,
                distancia_km REAL,
                tempo_minutos INTEGER,
                tipo_treino VARCHAR(100),
                local VARCHAR(100),
                data DATE DEFAULT CURRENT_DATE
            )
        `);

        // 4. Tabela de TREINOS (Academia/Crossfit)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS treinos (
                id SERIAL PRIMARY KEY,
                foco VARCHAR(100),
                duracao_min INTEGER,
                carga_sensacao VARCHAR(50),
                data DATE DEFAULT CURRENT_DATE
            )
        `);

        // 5. Tabela de TRABALHO (Produtividade)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trabalho (
                id SERIAL PRIMARY KEY,
                tarefas_concluidas INTEGER,
                nivel_produtividade INTEGER,
                observacao TEXT,
                data DATE DEFAULT CURRENT_DATE
            )
        `);

        console.log('✅ Todas as tabelas foram criadas/verificadas com sucesso!');

    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
};

// Teste de conexão e criação inicial
pool.connect((err) => {
    if (err) {
        console.error('Erro de conexão:', err.message);
    } else {
        console.log('Conectado ao PostgreSQL!');
        criarTabelas();
    }
});

module.exports = pool;