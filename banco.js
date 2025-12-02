// 1. Importamos o sqlite3 (a ferramenta que instalamos)
const sqlite3 = require('sqlite3').verbose();

// 2. Criamos o arquivo do banco (se não existir, ele cria sozinho)
const db = new sqlite3.Database('./hobbies.db', (err) => {
    if (err) {
        console.error('Erro ao conectar no banco:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso!');
    }
});

// 3. Criamos a nossa tabela "registros"
// Ela vai ter: id, tipo (leitura/corrida), valor (paginas/km), e data
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT,
            valor REAL,
            data TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Erro ao criar tabela:', err);
        } else {
            console.log('Tabela "registros" criada (ou já existia)!');
        }
    });
});

// 4. Exportamos esse banco para podermos usar no index.js depois
module.exports = db;