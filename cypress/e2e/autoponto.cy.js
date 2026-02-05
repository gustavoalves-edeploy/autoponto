describe("Login e bater ponto", () => {
  const login = Cypress.env("LOGIN");
  const password = Cypress.env("PASSWORD");

  beforeEach(() => {
    cy.visit(
      "https://login.lg.com.br/autenticacao/produtos/SAAA/principal2.aspx?c=bluke_edeploy"
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
      "https://prd-aa1.lg.com.br"
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
      cy.contains("button", "Confirmar").click();
    });
  });
});
