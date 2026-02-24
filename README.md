# Autoponto

Automação com Cypress para login e marcação de ponto no sistema LG da e-deploy (login.lg.com.br).

## Pré-requisitos

- **Node.js** 18+
- **pnpm** (gerenciador de pacotes)

## Instalação

```bash
# Instalar dependências
pnpm install
```

## Configuração

### Credenciais

As credenciais de acesso são lidas pelo Cypress a partir do arquivo `cypress.config.js`. **Configure seu usuário e senha** no objeto `env`:

1. Abra o arquivo **`cypress.config.js`** na raiz do projeto.
2. No bloco `e2e.env`, altere os valores de `LOGIN` e `PASSWORD` com suas credenciais:

### Feature flags

Há duas flags implementadas que controlam funcionalidades dentro da aplicação:

1. **KEEP_SCREENSHOTS**: mantém registro em PNG dos pontos batidos para consulta posterior.
2. **KEEP_JSON_RECORDS**: mantém registro em JSON dos horários batidos até o momento no dia atual para verificação segura.

```js
export default defineConfig({
  e2e: {
    // ...
    env: {
      LOGIN: "seu.email@empresa.com.br",
      PASSWORD: "sua_senha_aqui",
      KEEP_SCREENSHOTS: true,
      KEEP_JSON_RECORDS: true
    },
  },
});
```

**Importante:**

- **Não faça commit** de credenciais reais no repositório. Em time compartilhado ou repositório público, prefira variáveis de ambiente (ex.: `process.env.LOGIN` / `process.env.PASSWORD`) e deixe o `cypress.config.js` sem valores sensíveis.
- Os testes usam essas credenciais para fazer login automaticamente na URL configurada no spec.

### Outras opções

- **Viewport:** os testes rodam com resolução 1920×1080 (definida em `viewportWidth` e `viewportHeight` no `cypress.config.js`).

## Como executar

### 🚀 Script automatizado (Recomendado)

```bash
# Executa o ponto e mostra informações da jornada
pnpm run ponto
```

Este script irá:
1. ✅ Executar o teste Cypress automaticamente
2. 📊 Calcular e exibir informações da jornada
3. ⏰ Mostrar quando a jornada de 8h e 10h encerra
4. 🍽️ Calcular horários de retorno do almoço (se aplicável)
5. 🔔 Permitir agendar a próxima execução automática

---

### 🔍 Consultar status do dia

```bash
pnpm run status
```

Exibe um resumo amigável do estado atual da jornada com base nos pontos já registrados, **sem bater um novo ponto**. Útil para verificar rapidamente a situação do dia a qualquer momento.

A mensagem exibida varia conforme o momento:

| Situação | O que é exibido |
|---|---|
| Nenhum ponto registrado | Aviso de que a jornada ainda não foi iniciada |
| Após a entrada | Tempo trabalhado até agora e previsão de encerramento da jornada |
| No intervalo de almoço | Tempo trabalhado pela manhã, tempo no almoço e horários mínimo/máximo de retorno |
| Após o retorno do almoço | Tempo total trabalhado, tempo de intervalo e horário previsto de saída |
| Jornada completa | Tempo total trabalhado e tempo de intervalo |

**Exemplo de saída (durante o almoço):**
```
🔍 STATUS DO DIA

  🕐 Hora atual: 13:05
  ⏰ Pontos registrados:
     1. 08:30 - Entrada
     2. 12:10 - Saída para almoço

  🍽️  Você está no seu horário de almoço!
  ⏱️  Tempo trabalhado pela manhã: 3h40min
  🕐 Tempo no almoço: 55min

  ⏰ Você pode voltar no mínimo às 13:10
  ⏰ Você pode voltar no máximo às 14:10

  📊 Previsões (se voltar no horário mínimo):
     🏁 Jornada de 8h encerra às: 17:30
     🏁 Jornada de 10h encerra às: 19:30
```

---

### ⏰ Agendar uma batida de ponto

```bash
pnpm run agendar -- HH:mm
```

Agenda uma batida de ponto para um horário específico do dia. O script permanece em execução e dispara o Cypress automaticamente no horário informado. Para cancelar, pressione `Ctrl+C`.

Se o horário informado já tiver passado hoje, o agendamento será feito para o mesmo horário no dia seguinte.

**Exemplos:**
```bash
# Agendar para as 17:30
pnpm run agendar -- 17:30

# Agendar para as 08:00
pnpm run agendar -- 08:00
```

**Exemplo de saída:**
```
📋 Agendando batida de ponto para 17:30...

✅ Ponto agendado para 17:30
📅 Data: 24/02/2026

⏰ O script será executado automaticamente no horário agendado.
   Para cancelar, pressione Ctrl+C
```

---

### Cypress manual

```bash
# Abrir o Cypress em modo interativo (recomendado para desenvolvimento)
pnpm run cy:open

# Executar os testes em modo headless (terminal)
pnpm run cy:run
```

## 📊 Informações fornecidas pelo script

### Após o 1º ponto (Entrada)
- 🕐 Horário que a jornada de 8h encerra
- 🕐 Horário que a jornada de 10h encerra

### Após o 2º ponto (Saída para almoço)
- 🍽️ Horário mínimo para retornar (1h de almoço)
- 🍽️ Horário máximo para retornar (2h de almoço)
- 🕐 Quando a jornada de 8h encerra
- 🕐 Quando a jornada de 10h encerra
- **✨ Opção de agendar o retorno do almoço automaticamente**

### Após o 3º ponto (Retorno do almoço)
- ⏱️ Tempo de almoço realizado
- 🕐 Quando a jornada de 8h encerra
- 🕐 Quando a jornada de 10h encerra
- **✨ Opção de agendar a saída automaticamente**

### Após o 4º ponto (Saída)
- ✅ Jornada completa
- ⏱️ Tempo de intervalo realizado
- 💼 Tempo total trabalhado (descontando o intervalo)

## ⏰ Agendamento automático

Quando o script oferecer a opção de agendamento:

1. Digite o horário no formato `HH:MM` (ex: `14:00`)
2. O script ficará em execução e rodará automaticamente no horário agendado
3. Para cancelar, pressione `Ctrl+C`

## Estrutura do projeto

```
autoponto/
├── bater-ponto.ts      # 🚀 Script principal automatizado
├── cypress/
│   ├── e2e/
│   │   └── autoponto.cy.ts  # Teste E2E de marcação de ponto
│   ├── fixtures/       # Dados estáticos para testes
│   └── support/        # e2e.js, commands.js (comandos e imports globais)
├── pontos/             # 📁 Registros de ponto
│   └── YYYY/MM/DD.json # Arquivo JSON por dia
├── cypress.config.ts   # Configuração do Cypress e credenciais (env)
├── tsconfig.json       # Configuração do TypeScript
└── package.json
```

## Observações

- Os testes acessam **https://login.lg.com.br** e, após o login, o fluxo continua em **https://prd-aa1.lg.com.br** (uso de `cy.origin` para mudança de origem).
- Em ambiente corporativo, verifique se VPN ou proxy estão ativos se o sistema exigir.
- Screenshots e vídeos de falhas são gravados pelo Cypress (consulte a pasta `cypress/screenshots` e `cypress/videos` após uma execução).
