// Importamos a biblioteca do Postgres
const { Pool } = require('pg');

// Essa é a mágica. O Render vai injetar a URL certa automaticamente quando estiver no ar.
// Se não tiver (no seu PC), ele tenta usar a string que você colou.
const connectionString = process.env.DATABASE_URL || 'postgresql://hobby_db_jjq6_user:v0OUKloX7Q6Y0rhOmjxbDAdaptGyKm7Z@dpg-d4nha7ndiees73c2ns30-a/hobby_db_jjq6';

// Configuração da conexão
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Necessário para conexões seguras no Render
  },
});

// Teste de conexão ao iniciar
pool.connect((err) => {
    if (err) {
        console.error('Erro ao conectar no PostgreSQL:', err.message);
    } else {
        console.log('Conectado ao PostgreSQL com sucesso!');
        criarTabela();
    }
});

// Função para criar a tabela se não existir
// Nota: No Postgres usamos TEXT e REAL, e SERIAL para id automático
const criarTabela = async () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS registros (
            id SERIAL PRIMARY KEY,
            tipo VARCHAR(50),
            valor REAL,
            data DATE
        )
    `;
    try {
        await pool.query(sql);
        console.log('Tabela "registros" verificada/criada.');
    } catch (err) {
        console.error('Erro ao criar tabela:', err);
    }
};

// Exportamos o objeto "pool" que permite fazer as consultas
module.exports = pool;