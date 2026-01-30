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

```js
export default defineConfig({
  e2e: {
    // ...
    env: {
      LOGIN: "seu.email@empresa.com.br",
      PASSWORD: "sua_senha_aqui",
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

```bash
# Abrir o Cypress em modo interativo (recomendado para desenvolvimento)
pnpm run cy:open

# Executar os testes em modo headless (terminal)
pnpm run cy:run
```

## Estrutura do projeto

```
autoponto/
├── cypress/
│   ├── e2e/           # Testes E2E (ex.: autoponto.cy.js)
│   ├── fixtures/      # Dados estáticos para testes
│   └── support/       # e2e.js, commands.js (comandos e imports globais)
├── cypress.config.js  # Configuração do Cypress e credenciais (env)
└── package.json
```

## Observações

- Os testes acessam **https://login.lg.com.br** e, após o login, o fluxo continua em **https://prd-aa1.lg.com.br** (uso de `cy.origin` para mudança de origem).
- Em ambiente corporativo, verifique se VPN ou proxy estão ativos se o sistema exigir.
- Screenshots e vídeos de falhas são gravados pelo Cypress (consulte a pasta `cypress/screenshots` e `cypress/videos` após uma execução).
