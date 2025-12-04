/**
 * Script para configurar webhook do Strava via API
 * Execute: node configurar-webhook-strava.js
 */

require('dotenv').config();
const axios = require('axios');

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || '188547';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

// URL do seu webhook no Render
const WEBHOOK_URL = 'https://hobby-tracker-wwkl.onrender.com/webhook/strava';

/**
 * Obtém um novo access token usando o refresh token
 */
async function getAccessToken() {
    if (!STRAVA_REFRESH_TOKEN) {
        throw new Error('STRAVA_REFRESH_TOKEN não configurado no .env');
    }

    try {
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            refresh_token: STRAVA_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        });

        if (response.data && response.data.access_token) {
            return response.data.access_token;
        } else {
            throw new Error('Resposta inválida ao obter access token');
        }
    } catch (error) {
        if (error.response) {
            throw new Error(`Erro ao obter access token: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            throw new Error(`Erro ao obter access token: ${error.message}`);
        }
    }
}

/**
 * Lista webhooks existentes
 */
async function listWebhooks(accessToken) {
    try {
        const response = await axios.get('https://www.strava.com/api/v3/push_subscriptions', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET
            }
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Erro ao listar webhooks: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            throw new Error(`Erro ao listar webhooks: ${error.message}`);
        }
    }
}

/**
 * Cria um novo webhook
 */
async function createWebhook(accessToken) {
    try {
        const response = await axios.post('https://www.strava.com/api/v3/push_subscriptions', {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            callback_url: WEBHOOK_URL,
            verify_token: 'hobby-tracker-verification-token' // Token de verificação
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Erro ao criar webhook: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            throw new Error(`Erro ao criar webhook: ${error.message}`);
        }
    }
}

/**
 * Deleta um webhook existente
 */
async function deleteWebhook(accessToken, subscriptionId) {
    try {
        const response = await axios.delete(`https://www.strava.com/api/v3/push_subscriptions/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET
            }
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Erro ao deletar webhook: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            throw new Error(`Erro ao deletar webhook: ${error.message}`);
        }
    }
}

/**
 * Função principal
 */
async function main() {
    try {
        console.log('🔑 Obtendo access token...');
        const accessToken = await getAccessToken();
        console.log('✅ Access token obtido!\n');

        console.log('📋 Listando webhooks existentes...');
        const existingWebhooks = await listWebhooks(accessToken);
        
        if (existingWebhooks && existingWebhooks.length > 0) {
            console.log(`\n⚠️  Encontrados ${existingWebhooks.length} webhook(s) existente(s):`);
            existingWebhooks.forEach((webhook, index) => {
                console.log(`\n${index + 1}. ID: ${webhook.id}`);
                console.log(`   URL: ${webhook.callback_url}`);
                console.log(`   Criado em: ${webhook.created_at}`);
                
                // Verifica se já existe um webhook com a mesma URL
                if (webhook.callback_url === WEBHOOK_URL) {
                    console.log(`   ✅ Este webhook já está configurado para sua URL!`);
                    return;
                }
            });

            console.log('\n💡 Se quiser criar um novo webhook, você pode deletar os existentes primeiro.');
            console.log('   Para deletar, descomente a linha no código ou execute manualmente.\n');
        } else {
            console.log('✅ Nenhum webhook existente encontrado.\n');
        }

        console.log('🔧 Criando novo webhook...');
        console.log(`   URL: ${WEBHOOK_URL}\n`);
        
        const newWebhook = await createWebhook(accessToken);
        
        console.log('✅ Webhook criado com sucesso!');
        console.log('\n📊 Detalhes do webhook:');
        console.log(`   ID: ${newWebhook.id}`);
        console.log(`   URL: ${newWebhook.callback_url}`);
        console.log(`   Criado em: ${newWebhook.created_at}`);
        
        console.log('\n🎉 Configuração concluída!');
        console.log('\n📝 Próximos passos:');
        console.log('   1. Verifique os logs do Render para confirmar que o webhook foi verificado');
        console.log('   2. Cadastre uma nova corrida no Strava para testar');
        console.log('   3. A corrida deve aparecer automaticamente no seu site!');
        
    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        
        if (error.message.includes('already exists')) {
            console.log('\n💡 O webhook já existe. Isso é bom! Significa que está configurado.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
            console.log('\n💡 Erro de autenticação. Verifique se:');
            console.log('   - STRAVA_CLIENT_ID está correto');
            console.log('   - STRAVA_CLIENT_SECRET está correto');
            console.log('   - STRAVA_REFRESH_TOKEN está correto e válido');
        }
    }
}

// Executa o script
main();

