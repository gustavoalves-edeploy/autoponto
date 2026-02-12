interface Ponto {
  horario: string;
  timestamp: Date;
}

describe("Login e bater ponto", () => {
  const login = Cypress.env("LOGIN") as string;
  const password = Cypress.env("PASSWORD") as string;

  beforeEach(() => {
    cy.visit(
      "https://login.lg.com.br/autenticacao/produtos/SAAA/principal2.aspx?c=bluke_edeploy",
    );
  });

  it("Login e bater ponto", () => {
    // Login to the system
    cy.get('input[name="Login"]', { timeout: 10000 }).type(login);
    cy.contains("button", "Continuar").click();
    cy.get('input[name="Senha"]', { timeout: 10000 }).type(password);
    cy.contains("button", "Continuar").click();

    cy.location("origin", { timeout: 60000 }).should(
      "eq",
      "https://prd-aa1.lg.com.br",
    );

    cy.origin("https://prd-aa1.lg.com.br", () => {
      cy.contains("Marcação do Ponto", { timeout: 30000 }).should("be.visible");

      cy.window().then((w) => {
        w.location.href =
          "/Autoatendimento/Produtos/Infraestrutura/IntegracaoPonto?urlFuncionalidade=/Login/Index/MPAMarcacaoDoPonto";
      });
    });

    cy.origin("https://prd-pt1.lg.com.br", () => {
      cy.contains("button", "Marcar Ponto", { timeout: 30000 }).click();
      cy.wait(500);
      cy.contains("button", "Confirmar").click();

      cy.contains("Marcação realizada com sucesso.", { timeout: 2000 }).should(
        "be.visible",
      );

      cy.contains("button", /ok/i).click();

      cy.contains("Marcação realizada com sucesso.", { timeout: 2000 }).should(
        "not.be.visible",
      );

      // Clica no botão "Mostrar todas marcações" se existir
      cy.get('body').then(($body) => {
        const $btn = $body.find('i[title="Mostrar todas marcações"]');
        if ($btn.length > 0 && $btn.is(':visible')) {
          cy.wrap($btn).click();
        }
      });

      cy.get("div[class='marcacoes ng-scope']>div", {
        timeout: 3000,
      }).then((marcacoes) => {
        const pontos: Ponto[] = marcacoes.toArray().map((marcacao) => {
          const horario = marcacao.querySelector("span")?.textContent || "";
          const [horas, minutos] = horario.split(":").map(Number);

          const timestamp = new Date();
          timestamp.setHours(horas, minutos, 0, 0);

          return { horario, timestamp };
        });

        const ano = pontos[0].timestamp.getFullYear();
        const mes = pontos[0].timestamp.getMonth() + 1;
        const dia = pontos[0].timestamp.getDate();
        const currentDateFolder = `${ano}/${mes}/${dia}`;

        if (Cypress.env("KEEP_JSON_RECORDS")) {
          cy.writeFile(`pontos/${currentDateFolder}.json`, pontos, {
            timeout: 1000,
          });
        }
        if (Cypress.env("KEEP_SCREENSHOTS")) {
          cy.screenshot(currentDateFolder);
        }
      });
    });
  });
});
