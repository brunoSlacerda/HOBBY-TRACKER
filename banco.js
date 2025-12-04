const { Pool } = require('pg');

// Usa a variável de ambiente DATABASE_URL
// No Render: configurada automaticamente
// Localmente: configure no arquivo .env
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERRO: DATABASE_URL não configurada!');
    console.error('   Crie um arquivo .env com: DATABASE_URL=sua_url_aqui');
    process.exit(1);
}

// Corrige URL incompleta do Render (adiciona domínio se necessário)
// Se a URL não tiver um ponto após o hostname, tenta adicionar o domínio padrão do Render
if (connectionString.includes('@dpg-') && !connectionString.includes('render.com')) {
    // Tenta adicionar o domínio mais comum do Render (Oregon)
    // Se não funcionar, você precisa copiar a URL completa do painel do Render
    const match = connectionString.match(/@(dpg-[^/]+)/);
    if (match) {
        const hostname = match[1];
        connectionString = connectionString.replace(`@${hostname}`, `@${hostname}.oregon-postgres.render.com`);
        console.log('⚠️  Tentando corrigir URL do banco automaticamente...');
        console.log('   Se não funcionar, copie a URL completa do painel do Render');
    }
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const criarTabelas = async () => {
    try {
        // CRIA TODAS AS TABELAS SEM APAGAR DADOS EXISTENTES
        // Usa CREATE TABLE IF NOT EXISTS para não apagar dados
        
        // Tabela LIVROS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS livros (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(255),
                autor VARCHAR(255),
                total_paginas INTEGER,
                pagina_atual INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'novo',
                nota INTEGER DEFAULT 0,
                resumo TEXT,
                capa_url TEXT,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Adiciona colunas que podem não existir (migração segura)
        // Verifica se as colunas existem antes de adicionar
        const colunas = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'livros'
        `);
        const colunasExistentes = colunas.rows.map(r => r.column_name);
        
        if (!colunasExistentes.includes('status')) {
            await pool.query(`ALTER TABLE livros ADD COLUMN status VARCHAR(20) DEFAULT 'novo'`);
        }
        if (!colunasExistentes.includes('nota')) {
            await pool.query(`ALTER TABLE livros ADD COLUMN nota INTEGER DEFAULT 0`);
        }
        if (!colunasExistentes.includes('resumo')) {
            await pool.query(`ALTER TABLE livros ADD COLUMN resumo TEXT`);
        }

        // Tabela CORRIDAS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS corridas (
                id SERIAL PRIMARY KEY,
                distancia_km DECIMAL(10,2),
                tempo_minutos INTEGER,
                tipo_treino VARCHAR(50),
                local VARCHAR(255),
                data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela TREINOS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS treinos (
                id SERIAL PRIMARY KEY,
                foco VARCHAR(100),
                duracao_min INTEGER,
                carga_sensacao VARCHAR(50),
                data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela TRABALHO
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trabalho (
                id SERIAL PRIMARY KEY,
                tarefas_concluidas INTEGER,
                nivel_produtividade INTEGER,
                observacao TEXT,
                data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Tabelas verificadas/criadas com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
};

// Garante que as tabelas sejam criadas apenas uma vez na inicialização
let tabelasCriadas = false;

const inicializarBanco = async () => {
    if (tabelasCriadas) return;
    
    try {
        const client = await pool.connect();
        console.log('Conectado ao DB!');
        await criarTabelas();
        tabelasCriadas = true;
        client.release();
    } catch (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    }
};

// Inicializa o banco quando o módulo é carregado
inicializarBanco();

module.exports = pool;