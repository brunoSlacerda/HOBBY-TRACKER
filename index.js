const express = require('express');
const app = express();
const port = 8080; // Mantendo a porta que funcionou para você

// MUDANÇA 1: Importamos o banco de dados que você criou
const db = require('./banco.js');

// MUDANÇA 2: Ensinamos o Express a ler JSON (dados que vamos enviar)
app.use(express.json());
app.use(express.static('public'));



// MUDANÇA 3: Criamos uma Rota de "POST" (Gravação)
// Quando alguém enviar dados para /registrar, isso acontece:
app.post('/registrar', (req, res) => {
    // Pegamos os dados que foram enviados
    const { tipo, valor, data } = req.body;

    // Comando SQL para inserir
    const sql = `INSERT INTO registros (tipo, valor, data) VALUES (?, ?, ?)`;

    // Executamos o comando no banco
    db.run(sql, [tipo, valor, data], function(err) {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }
        // Respondemos que deu certo e mandamos o ID do registro novo
        res.json({ 
            mensagem: "Sucesso!", 
            id: this.lastID,
            registro: { tipo, valor, data } 
        });
    });
});

app.listen(port, () => {
  console.log(`Servidor rodando! Acesse: http://localhost:${port}`);
});

// ROTA GET: Ler todos os registros
app.get('/resumo', (req, res) => {
  // Seleciona tudo (*) da tabela registros
  const sql = "SELECT * FROM registros";

  db.all(sql, [], (err, rows) => {
      if (err) {
          return res.status(400).json({ erro: err.message });
      }
      // Devolve as linhas (rows) que encontrou
      res.json({
          mensagem: "Aqui estão seus hobbies:",
          dados: rows
      });
  });
});