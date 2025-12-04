# 🔄 Como Configurar Webhook Automático do Strava

Agora seu sistema está pronto para receber corridas automaticamente do Strava! Quando você cadastrar uma nova corrida no Strava, ela será automaticamente adicionada ao seu banco de dados.

## 📋 Passo a Passo

### 1. Obter a URL do Webhook

Depois de fazer o deploy no Render, você terá uma URL como:
```
https://hobby-tracker-wwkl.onrender.com
```

A URL do webhook será:
```
https://hobby-tracker-wwkl.onrender.com/webhook/strava
```

### 2. Configurar no Strava

1. Acesse: https://www.strava.com/settings/api
2. Role até a seção **"Webhooks"**
3. Clique em **"Create Subscription"**
4. Preencha:
   - **Callback URL**: `https://hobby-tracker-wwkl.onrender.com/webhook/strava` (use sua URL do Render)
   - **Verify Token**: Deixe vazio ou coloque qualquer coisa (não é usado)
   - **Subscription**: Selecione apenas **"activity.create"** (criação de atividades)
5. Clique em **"Create"**

### 3. Verificar se Funcionou

Após criar o webhook, o Strava enviará uma requisição de verificação. Você verá nos logs do Render:
```
✅ Webhook do Strava verificado com sucesso
```

### 4. Testar

1. Vá ao Strava e cadastre uma nova corrida
2. A corrida será automaticamente adicionada ao seu banco de dados
3. Você verá nos logs do Render:
```
🔄 Nova atividade detectada no Strava: [ID]
✅ Atividade [ID] sincronizada automaticamente!
```

## ⚠️ Importante

- O webhook só funciona se sua aplicação estiver rodando no Render (ou outro servidor público)
- O webhook não funciona em `localhost` porque o Strava precisa conseguir acessar sua URL
- Certifique-se de que as variáveis de ambiente estão configuradas no Render:
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`
  - `STRAVA_REFRESH_TOKEN`

## 🔍 Verificar Logs

Para ver se o webhook está funcionando, acesse os logs do Render:
1. Vá ao dashboard do Render
2. Clique no seu serviço
3. Vá em "Logs"
4. Procure por mensagens como:
   - `✅ Webhook do Strava verificado com sucesso`
   - `🔄 Nova atividade detectada no Strava`
   - `✅ Atividade sincronizada automaticamente!`

## 🛠️ Troubleshooting

Se o webhook não estiver funcionando:

1. **Verifique se a URL está correta**: A URL deve ser acessível publicamente
2. **Verifique os logs do Render**: Procure por erros
3. **Verifique as variáveis de ambiente**: Certifique-se de que estão configuradas
4. **Teste manualmente**: Use o botão "Sincronizar Strava" para verificar se a conexão está funcionando

