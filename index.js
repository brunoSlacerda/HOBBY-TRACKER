// Carrega variáveis de ambiente apenas em desenvolvimento local
// No Render, as variáveis já estão configuradas automaticamente
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const express = require('express');
const app = express();
const port = process.env.PORT || 8080; 
const db = require('./banco.js');
const { getLatestActivity, getActivityById, verifyWebhookSignature } = require('./stravaService');

// Token de verificação do webhook do Strava
const VERIFY_TOKEN = 'STRAVA_VERIFY_TOKEN';

// IMPORTANTE: Registrar webhook ANTES do express.json() para receber body raw
// --- ROTA: Webhook do Strava (Chamado automaticamente quando uma nova atividade é criada) ---

// GET para verificação inicial do Strava (Handshake)
app.get('/webhook/strava', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('🔍 GET recebido do Strava:', { mode, token: token ? '***' : 'vazio', challenge });
    
    // Verifica se o token bate e o mode é 'subscribe'
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
        console.log('✅ Webhook do Strava verificado via GET - Challenge:', challenge);
        // Retorna JSON com hub.challenge (CRÍTICO)
        res.status(200).json({ 'hub.challenge': challenge });
    } else {
        console.warn('⚠️ GET inválido do Strava:', { mode, tokenMatch: token === VERIFY_TOKEN, challenge: challenge ? 'presente' : 'ausente' });
        res.status(403).send('Forbidden');
    }
});

// POST para receber eventos do Strava
app.post('/webhook/strava', express.raw({ type: 'application/json' }), async (req, res) => {
    // IMPORTANTE: Responder com 200 OK imediatamente, senão o Strava reenvia o evento
    res.status(200).json({ received: true });
    
    try {
        const bodyString = req.body.toString();
        const event = JSON.parse(bodyString);
        
        // Para outros eventos, verifica a assinatura do webhook para segurança
        const signature = req.headers['x-hub-signature-256'];
        if (signature && !verifyWebhookSignature(signature, bodyString)) {
            console.warn('⚠️ Webhook do Strava rejeitado: assinatura inválida');
            return;
        }

        // Processa apenas eventos de criação de atividade
        if (event.object_type === 'activity' && event.aspect_type === 'create') {
            const activityId = event.object_id;
            console.log(`Nova atividade recebida! ID: ${activityId}`);

            // Busca os dados completos da atividade
            const activity = await getActivityById(activityId);

            // Verifica se já existe no banco
            const existe = await db.query(
                'SELECT id FROM corridas WHERE strava_id = $1',
                [activity.id]
            );

            if (existe.rows.length > 0) {
                console.log(`ℹ️ Atividade ${activityId} já existe no banco`);
                return res.status(200).json({ mensagem: 'Atividade já sincronizada' });
            }

            // Converte tempo do formato "MM:SS" ou "HH:MM:SS" para minutos
            const tempoStr = activity.moving_time;
            const tempoParts = tempoStr.split(':');
            let tempoMinutos = 0;
            if (tempoParts.length === 2) {
                tempoMinutos = parseInt(tempoParts[0]) + (parseInt(tempoParts[1]) / 60);
            } else if (tempoParts.length === 3) {
                tempoMinutos = (parseInt(tempoParts[0]) * 60) + parseInt(tempoParts[1]) + (parseInt(tempoParts[2]) / 60);
            }

            // Determina tipo de treino baseado no pace
            let tipoTreino = 'Rodagem';
            if (activity.pace) {
                const paceStr = activity.pace.replace('/km', '');
                const paceParts = paceStr.split(':');
                if (paceParts.length === 2) {
                    const paceMin = parseFloat(paceParts[0]) + (parseFloat(paceParts[1]) / 60);
                    if (paceMin < 4.5) tipoTreino = 'Tiro';
                    else if (paceMin < 5.5) tipoTreino = 'Longo';
                }
            }

            // Salva no banco
            await db.query(
                `INSERT INTO corridas (
                    distancia_km, 
                    tempo_minutos, 
                    tipo_treino, 
                    local, 
                    strava_id, 
                    strava_name, 
                    pace, 
                    average_speed_kmh, 
                    total_elevation_gain,
                    data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    activity.distance_km,
                    Math.round(tempoMinutos),
                    tipoTreino,
                    activity.timezone || 'Strava',
                    activity.id,
                    activity.name,
                    activity.pace,
                    activity.average_speed_kmh,
                    activity.total_elevation_gain,
                    activity.start_date_local ? new Date(activity.start_date_local) : new Date()
                ]
            );

            console.log(`✅ Atividade ${activityId} sincronizada automaticamente!`);
            return res.status(200).json({ mensagem: 'Atividade sincronizada automaticamente', atividade: activity });
        }

        // Responde para outros tipos de eventos (mas não processa)
        res.status(200).json({ mensagem: 'Evento recebido' });
    } catch (err) {
        console.error('❌ Erro ao processar webhook do Strava:', err);
        res.status(500).json({ erro: err.message });
    }
});

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

// --- ROTA DELETAR ---
app.delete('/remover/:tabela/:id', async (req, res) => {
    const { tabela, id } = req.params;
    const tabelasPermitidas = ['livros', 'corridas', 'treinos', 'trabalho'];
    
    if (!tabelasPermitidas.includes(tabela)) return res.status(400).json({ erro: "Tabela inválida" });

    try {
        await db.query(`DELETE FROM ${tabela} WHERE id = $1`, [id]);
        res.json({ mensagem: "Item deletado!" });
    } catch (err) { res.status(400).json({ erro: err.message }); }
});

// --- ROTA ESPECIAL: Atualizar Livro (Páginas, Nota, Resumo, Status) ---
app.put('/atualizar/livro/:id', async (req, res) => {
    const { id } = req.params;
    const { pagina_atual, nota, resumo, status } = req.body;

    try {
        if (pagina_atual !== undefined) {
            await db.query(`UPDATE livros SET pagina_atual = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2`, [pagina_atual, id]);
        }
        
        // AQUI ESTAVA FALTANDO ou estava antigo:
        if (status !== undefined) {
            await db.query(`UPDATE livros SET status = $1 WHERE id = $2`, [status, id]);
        }

        if (nota !== undefined && nota !== null && nota !== '') {
            const notaNum = parseInt(nota);
            if (!isNaN(notaNum) && notaNum >= 1 && notaNum <= 10) {
                await db.query(`UPDATE livros SET nota = $1 WHERE id = $2`, [notaNum, id]);
            }
        }

        if (resumo !== undefined) {
            await db.query(`UPDATE livros SET resumo = $1 WHERE id = $2`, [resumo, id]);
        }

        res.json({ mensagem: "Livro atualizado!" });
    } catch (err) {
        res.status(400).json({ erro: err.message });
    }
});

// --- ROTA: Sincronizar Corridas do Strava (Manual) ---
app.post('/sincronizar/strava', async (req, res) => {
    try {
        // Busca última atividade do Strava
        const activity = await getLatestActivity();

        // Verifica se a corrida já existe (pelo strava_id)
        const existe = await db.query(
            'SELECT id FROM corridas WHERE strava_id = $1',
            [activity.id]
        );

        if (existe.rows.length > 0) {
            return res.json({ 
                mensagem: "Corrida já sincronizada!",
                corrida: existe.rows[0]
            });
        }

        // Converte tempo do formato "MM:SS" ou "HH:MM:SS" para minutos
        const tempoStr = activity.moving_time;
        const tempoParts = tempoStr.split(':');
        let tempoMinutos = 0;
        if (tempoParts.length === 2) {
            // MM:SS
            tempoMinutos = parseInt(tempoParts[0]) + (parseInt(tempoParts[1]) / 60);
        } else if (tempoParts.length === 3) {
            // HH:MM:SS
            tempoMinutos = (parseInt(tempoParts[0]) * 60) + parseInt(tempoParts[1]) + (parseInt(tempoParts[2]) / 60);
        }

        // Determina tipo de treino baseado no pace (opcional, pode melhorar)
        let tipoTreino = 'Rodagem';
        if (activity.pace) {
            // Remove "/km" se existir
            const paceStr = activity.pace.replace('/km', '');
            const paceParts = paceStr.split(':');
            if (paceParts.length === 2) {
                const paceMin = parseFloat(paceParts[0]) + (parseFloat(paceParts[1]) / 60);
                if (paceMin < 4.5) tipoTreino = 'Tiro';
                else if (paceMin < 5.5) tipoTreino = 'Longo';
            }
        }

        // Salva no banco
        const resultado = await db.query(
            `INSERT INTO corridas (
                distancia_km, 
                tempo_minutos, 
                tipo_treino, 
                local, 
                strava_id, 
                strava_name, 
                pace, 
                average_speed_kmh, 
                total_elevation_gain,
                data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                activity.distance_km,
                Math.round(tempoMinutos),
                tipoTreino,
                activity.timezone || 'Strava',
                activity.id,
                activity.name,
                activity.pace,
                activity.average_speed_kmh,
                activity.total_elevation_gain,
                activity.start_date_local || new Date()
            ]
        );

        res.json({ 
            mensagem: "Corrida sincronizada do Strava!",
            corrida: resultado.rows[0]
        });
    } catch (err) {
        console.error('Erro ao sincronizar Strava:', err);
        res.status(400).json({ erro: err.message });
    }
});

// --- ROTA GERAL: Resumo ---
app.get('/resumo', async (req, res) => {
    try {
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
    } catch (err) { res.status(400).json({ erro: err.message }); }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});