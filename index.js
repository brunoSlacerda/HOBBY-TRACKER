const express = require('express');
const app = express();
const port = process.env.PORT || 8080; 
const db = require('./banco.js');

app.use(express.json());
app.use(express.static('public'));

// --- ROTA 1: Salvar LIVROS ---
app.post('/registrar/livro', async (req, res) => {
    const { titulo, autor, paginas, capa } = req.body;
    try {
        await db.query(
            `INSERT INTO livros (titulo, autor, total_paginas, pagina_atual, capa_url) VALUES ($1, $2, $3, 0, $4)`,
            [titulo, autor, paginas, capa]
        );
        res.json({ mensagem: "Livro salvo!" });
    } catch (err) { res.status(400).json({ erro: err.message }); }
});

// --- ROTA 2: Salvar CORRIDAS ---
app.post('/registrar/corrida', async (req, res) => {
    const { distancia, tempo, tipo, local } = req.body;
    try {
        await db.query(
            `INSERT INTO corridas (distancia_km, tempo_minutos, tipo_treino, local) VALUES ($1, $2, $3, $4)`,
            [distancia, tempo, tipo, local]
        );
        res.json({ mensagem: "Corrida salva!" });
    } catch (err) { res.status(400).json({ erro: err.message }); }
});

// --- ROTA 3: Salvar TREINOS ---
app.post('/registrar/treino', async (req, res) => {
    const { foco, duracao, carga } = req.body;
    try {
        await db.query(
            `INSERT INTO treinos (foco, duracao_min, carga_sensacao) VALUES ($1, $2, $3)`,
            [foco, duracao, carga]
        );
        res.json({ mensagem: "Treino salvo!" });
    } catch (err) { res.status(400).json({ erro: err.message }); }
});

// --- ROTA 4: Salvar TRABALHO ---
app.post('/registrar/trabalho', async (req, res) => {
    const { tarefas, produtividade, obs } = req.body;
    try {
        await db.query(
            `INSERT INTO trabalho (tarefas_concluidas, nivel_produtividade, observacao) VALUES ($1, $2, $3)`,
            [tarefas, produtividade, obs]
        );
        res.json({ mensagem: "Trabalho salvo!" });
    } catch (err) { res.status(400).json({ erro: err.message }); }
});

// --- ROTA GERAL: Resumo de TUDO ---
app.get('/resumo', async (req, res) => {
    try {
        // Fazemos 4 consultas ao mesmo tempo (Promise.all é mais rápido)
        const [livros, corridas, treinos, trabalho] = await Promise.all([
            db.query("SELECT * FROM livros ORDER BY data_atualizacao DESC"),
            db.query("SELECT * FROM corridas ORDER BY data DESC"),
            db.query("SELECT * FROM treinos ORDER BY data DESC"),
            db.query("SELECT * FROM trabalho ORDER BY data DESC")
        ]);

        res.json({
            livros: livros.rows,
            corridas: corridas.rows,
            treinos: treinos.rows,
            trabalho: trabalho.rows
        });
    } catch (err) {
        res.status(400).json({ erro: err.message });
    }
});

    // --- ROTA DELETAR (Serve para qualquer hobby) ---
    // Exemplo de chamada: /remover/livros/1 ou /remover/corridas/5
    app.delete('/remover/:tabela/:id', async (req, res) => {
        const { tabela, id } = req.params;

        // Segurança: Só aceita apagar dessas tabelas
        const tabelasPermitidas = ['livros', 'corridas', 'treinos', 'trabalho'];
        if (!tabelasPermitidas.includes(tabela)) {
            return res.status(400).json({ erro: "Tabela inválida" });
        }

        try {
            await db.query(`DELETE FROM ${tabela} WHERE id = $1`, [id]);
            res.json({ mensagem: "Item deletado!" });
        } catch (err) {
            res.status(400).json({ erro: err.message });
        }
    });

    // --- ROTA ATUALIZAR PÁGINAS (Específica para Livros) ---
    app.put('/atualizar/livro/:id', async (req, res) => {
        const { id } = req.params;
        const { pagina_atual } = req.body;

        try {
            await db.query(
                `UPDATE livros SET pagina_atual = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2`,
                [pagina_atual, id]
            );
            res.json({ mensagem: "Leitura atualizada!" });
        } catch (err) {
            res.status(400).json({ erro: err.message });
        }
    });

    // --- ROTA ESPECIAL: Atualizar Livro (Páginas, Nota, Resumo, Status) ---
    app.put('/atualizar/livro/:id', async (req, res) => {
        const { id } = req.params;
        const { pagina_atual, nota, resumo, status } = req.body;

        // Montamos o SQL dinamicamente (só atualiza o que foi enviado)
        // Se enviou página, atualizamos página. Se enviou resumo, atualizamos resumo.
        try {
            if (pagina_atual !== undefined) {
                await db.query(`UPDATE livros SET pagina_atual = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2`, [pagina_atual, id]);
            }
            
            if (nota !== undefined) {
                await db.query(`UPDATE livros SET nota = $1 WHERE id = $2`, [nota, id]);
            }

            if (resumo !== undefined) {
                await db.query(`UPDATE livros SET resumo = $1 WHERE id = $2`, [resumo, id]);
            }

            if (status !== undefined) {
                await db.query(`UPDATE livros SET status = $1 WHERE id = $2`, [status, id]);
            }

            res.json({ mensagem: "Livro atualizado!" });
        } catch (err) {
            res.status(400).json({ erro: err.message });
        }
    });


app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});