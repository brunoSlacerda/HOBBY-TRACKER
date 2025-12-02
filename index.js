const express = require('express');
const app = express();
// O Render define a porta automaticamente na variável process.env.PORT
const port = process.env.PORT || 8080; 

const db = require('./banco.js');

app.use(express.json());
app.use(express.static('public'));

// ROTA POST: Gravar registro
app.post('/registrar', async (req, res) => {
    const { tipo, valor, data } = req.body;

    // No Postgres, usamos $1, $2, $3 em vez de ?
    // "RETURNING id" serve para o banco nos devolver o ID criado
    const sql = `INSERT INTO registros (tipo, valor, data) VALUES ($1, $2, $3) RETURNING id`;

    try {
        const resultado = await db.query(sql, [tipo, valor, data]);
        res.json({ 
            mensagem: "Sucesso!", 
            id: resultado.rows[0].id, // Pega o ID retornado
            registro: { tipo, valor, data } 
        });
    } catch (err) {
        res.status(400).json({ erro: err.message });
    }
});

// ROTA GET: Ler todos
app.get('/resumo', async (req, res) => {
    const sql = "SELECT * FROM registros ORDER BY data DESC";

    try {
        const resultado = await db.query(sql);
        res.json({
            mensagem: "Aqui estão seus hobbies:",
            dados: resultado.rows // No Postgres, os dados ficam dentro de .rows
        });
    } catch (err) {
        res.status(400).json({ erro: err.message });
    }
});

app.listen(port, () => {
  console.log(`Servidor rodando! Acesse: http://localhost:${port}`);
});