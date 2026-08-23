describe("Team Synchronizer — cluster booking", () => {
  beforeEach(() => {
    cy.loginAs("lead@acme.test");
    cy.visit("/team-sync");
  });

  it("lets a team lead reserve a matching desk cluster", () => {
    cy.contains("h1", "Team Synchronizer").should("be.visible");
    cy.contains("button", "Reserve matching cluster").should("not.be.disabled").click();

    cy.contains("Cluster reserved", { timeout: 10000 }).should("be.visible");
    cy.contains(/desk(s)? booked for/).should("be.visible");
  });

  it("blocks employees from requesting a sync", () => {
    cy.window().then((win) => win.localStorage.clear());
    cy.loginAs("employee1@acme.test");
    cy.visit("/team-sync");
    cy.contains("Only team leads and admins").should("be.visible");
    cy.contains("button", "Reserve matching cluster").should("be.disabled");
  });
});
