require('dotenv').config();
const axios = require('axios');
const https = require('https');

// Configurações do Strava
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || '188547';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '9e0169288fa496754f4e8c8231ad2b81d545918e';
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;

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
 * Converte segundos para formato MM:SS ou HH:MM:SS
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * Converte velocidade de m/s para pace (min/km)
 * Fórmula: 16.666 / velocidade
 * Retorna no formato "MM:SS/km" como no Strava
 */
function convertSpeedToPace(speedMs) {
    if (!speedMs || speedMs === 0) {
        return null;
    }
    
    // Calcula pace em minutos por km usando a fórmula: 16.666 / velocidade (m/s)
    const paceMinPerKm = 16.666 / speedMs;
    
    // Formata como MM:SS
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.round((paceMinPerKm - minutes) * 60);
    
    // Retorna no formato "MM:SS/km" como no Strava
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}/km`;
}

/**
 * Busca a última atividade do Strava
 * @returns {Promise<Object>} Objeto com dados formatados da última atividade
 */
async function getLatestActivity() {
    try {
        // Passo 1: Obter access token
        const accessToken = await getAccessToken();

        // Passo 2: Buscar última atividade
        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            params: {
                per_page: 1
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.data || response.data.length === 0) {
            throw new Error('Nenhuma atividade encontrada');
        }

        const activity = response.data[0];

        // Passo 3: Processar e formatar os dados
        const formattedData = {
            id: activity.id,
            name: activity.name || 'Sem nome',
            type: activity.type || 'Run',
            distance_km: activity.distance ? parseFloat((activity.distance / 1000).toFixed(2)) : 0,
            moving_time: activity.moving_time ? formatTime(activity.moving_time) : '00:00',
            elapsed_time: activity.elapsed_time ? formatTime(activity.elapsed_time) : '00:00',
            pace: activity.average_speed ? convertSpeedToPace(activity.average_speed) : null,
            average_speed_kmh: activity.average_speed ? parseFloat((activity.average_speed * 3.6).toFixed(2)) : null,
            max_speed_kmh: activity.max_speed ? parseFloat((activity.max_speed * 3.6).toFixed(2)) : null,
            total_elevation_gain: activity.total_elevation_gain ? parseFloat(activity.total_elevation_gain.toFixed(2)) : 0,
            start_date: activity.start_date || null,
            start_date_local: activity.start_date_local || null,
            timezone: activity.timezone || null,
            kudos_count: activity.kudos_count || 0,
            achievement_count: activity.achievement_count || 0
        };

        return formattedData;
    } catch (error) {
        if (error.response) {
            throw new Error(`Erro ao buscar atividade: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            throw new Error(`Erro ao buscar atividade: ${error.message}`);
        }
    }
}

module.exports = {
    getLatestActivity,
    getAccessToken
};

