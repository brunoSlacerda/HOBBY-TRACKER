const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgresql://hobby_db_jjq6_user:v0OUKloX7Q6Y0rhOmjxbDAdaptGyKm7Z@dpg-d4nha7ndiees73c2ns30-a/hobby_db_jjq6';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const criarTabelas = async () => {
    try {
        // 1. Apagamos a tabela antiga para recriar com a nova estrutura
        await pool.query(`DROP TABLE IF EXISTS livros`);

        // 2. Nova Tabela LIVROS (Mais completa)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS livros (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(255),
                autor VARCHAR(255),
                total_paginas INTEGER,
                pagina_atual INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'novo', -- 'novo', 'lendo', 'concluido'
                nota INTEGER DEFAULT 0,            -- 1 a 10
                resumo TEXT,                       -- Resumo pessoal
                capa_url TEXT,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // As outras tabelas não precisam ser recriadas, mas o IF NOT EXISTS garante que não dê erro
        // ... (Seu código das outras tabelas corridas/treinos/trabalho continua aqui igualzinho, não precisa apagar) ...
        
        console.log('✅ Tabela de Livros atualizada para versão Kanban!');
    } catch (err) {
        console.error('❌ Erro:', err);
    }
};

pool.connect((err) => {
    if (err) console.error('Erro conexão:', err.message);
    else {
        console.log('Conectado ao DB!');
        criarTabelas();
    }
});

module.exports = pool;