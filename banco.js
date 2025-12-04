const { Pool } = require('pg');

// Usa a variável de ambiente DATABASE_URL
// No Render: configurada automaticamente
// Localmente: configure no arquivo .env
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERRO: DATABASE_URL não configurada!');
    console.error('   Crie um arquivo .env com: DATABASE_URL=sua_url_aqui');
    console.error('   Ou configure a variável de ambiente DATABASE_URL no Render');
    console.warn('⚠️  Continuando sem DATABASE_URL - o servidor iniciará mas as rotas do banco falharão');
    console.warn('   Configure DATABASE_URL no painel do Render em: Settings > Environment Variables');
    // Não faz exit(1) para não quebrar o deploy
    // A conexão falhará quando tentar usar, mas permite que o servidor inicie
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

// Cria o pool (mesmo sem connectionString para não quebrar o código)
// Se não tiver connectionString, vai falhar nas queries mas não quebra o deploy
const pool = new Pool({
  connectionString: connectionString || 'postgresql://invalid',
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
        try {
            const colunas = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'livros' AND table_schema = 'public'
            `);
            const colunasExistentes = colunas.rows.map(r => r.column_name);
            
            if (!colunasExistentes.includes('status')) {
                try {
                    await pool.query(`ALTER TABLE livros ADD COLUMN status VARCHAR(20) DEFAULT 'novo'`);
                } catch (e) {
                    // Coluna pode ter sido criada entre a verificação e a adição
                }
            }
            if (!colunasExistentes.includes('nota')) {
                try {
                    await pool.query(`ALTER TABLE livros ADD COLUMN nota INTEGER DEFAULT 0`);
                } catch (e) {
                    // Coluna pode ter sido criada entre a verificação e a adição
                }
            }
            if (!colunasExistentes.includes('resumo')) {
                try {
                    await pool.query(`ALTER TABLE livros ADD COLUMN resumo TEXT`);
                } catch (e) {
                    // Coluna pode ter sido criada entre a verificação e a adição
                }
            }
        } catch (migErr) {
            // Ignora erros de migração (tabela pode não existir ainda ou colunas já existem)
            console.log('ℹ️  Migração de colunas (pode ser ignorado):', migErr.message);
        }

        // Tabela CORRIDAS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS corridas (
                id SERIAL PRIMARY KEY,
                distancia_km DECIMAL(10,2),
                tempo_minutos INTEGER,
                tipo_treino VARCHAR(50),
                local VARCHAR(255),
                data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                strava_id BIGINT UNIQUE,
                strava_name VARCHAR(255),
                pace VARCHAR(20),
                average_speed_kmh DECIMAL(10,2),
                total_elevation_gain DECIMAL(10,2)
            )
        `);

        // Adiciona colunas do Strava se não existirem
        try {
            const colunas = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'corridas' AND table_schema = 'public'
            `);
            const colunasExistentes = colunas.rows.map(r => r.column_name);
            
            if (!colunasExistentes.includes('strava_id')) {
                await pool.query(`ALTER TABLE corridas ADD COLUMN strava_id BIGINT UNIQUE`);
            }
            if (!colunasExistentes.includes('strava_name')) {
                await pool.query(`ALTER TABLE corridas ADD COLUMN strava_name VARCHAR(255)`);
            }
            if (!colunasExistentes.includes('pace')) {
                await pool.query(`ALTER TABLE corridas ADD COLUMN pace VARCHAR(20)`);
            }
            if (!colunasExistentes.includes('average_speed_kmh')) {
                await pool.query(`ALTER TABLE corridas ADD COLUMN average_speed_kmh DECIMAL(10,2)`);
            }
            if (!colunasExistentes.includes('total_elevation_gain')) {
                await pool.query(`ALTER TABLE corridas ADD COLUMN total_elevation_gain DECIMAL(10,2)`);
            }
        } catch (migErr) {
            console.log('ℹ️  Migração de colunas corridas (pode ser ignorado):', migErr.message);
        }

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
    if (tabelasCriadas || !connectionString) {
        console.log('ℹ️  Inicialização do banco pulada (já criado ou sem connectionString)');
        return;
    }
    
    console.log('🔄 Tentando conectar ao banco de dados...');
    try {
        // Adiciona timeout na conexão
        const connectPromise = pool.connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout na conexão')), 8000);
        });
        
        const client = await Promise.race([connectPromise, timeoutPromise]);
        console.log('✅ Conectado ao DB!');
        await criarTabelas();
        tabelasCriadas = true;
        client.release();
    } catch (err) {
        console.error('❌ Erro ao conectar ao banco:', err.message);
        console.log('ℹ️  Servidor continuará iniciando - banco será conectado quando necessário');
        // Não encerra o processo - permite que o servidor inicie mesmo com erro de conexão
        // A conexão será tentada novamente quando necessário
    }
};

// Inicializa o banco quando o módulo é carregado (não bloqueia)
// Não usa await para não bloquear a inicialização do servidor
// Adiciona timeout para não travar indefinidamente
const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
        console.log('⏱️  Timeout na inicialização do banco - servidor iniciará mesmo assim');
        resolve();
    }, 10000); // 10 segundos de timeout
});

Promise.race([
    inicializarBanco(),
    timeoutPromise
]).catch(err => {
    console.error('Erro na inicialização do banco:', err.message);
});

module.exports = pool;