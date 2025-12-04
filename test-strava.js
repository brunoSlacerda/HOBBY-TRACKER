/**
 * Script de teste para o stravaService
 * Execute: node test-strava.js
 */

const { getLatestActivity } = require('./stravaService');

async function test() {
    try {
        console.log('🚴 Buscando última atividade do Strava...\n');
        
        const activity = await getLatestActivity();
        
        console.log('✅ Atividade encontrada!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('   DADOS DA ÚLTIMA ATIVIDADE');
        console.log('═══════════════════════════════════════════════════════');
        console.log(JSON.stringify(activity, null, 2));
        console.log('═══════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

test();

