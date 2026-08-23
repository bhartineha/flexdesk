Cypress.Commands.add("loginAs", (email: string, password = "password123") => {
  cy.session([email, password], () => {
    cy.visit("/login");
    cy.get('input[type="email"]').clear().type(email);
    cy.get('input[type="password"]').clear().type(password);
    cy.contains("button", "Sign in").click();
    cy.url().should("include", "/floorplan");
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginAs(email: string, password?: string): Chainable<void>;
    }
  }
}

export {};
