describe("Capacity Monitor — live occupancy", () => {
  beforeEach(() => {
    cy.loginAs("admin@acme.test");
    cy.visit("/capacity");
  });

  it("renders an occupancy gauge with a booked/limit count and a floor breakdown", () => {
    cy.contains("h1", "Capacity Monitor").should("be.visible");
    cy.contains(/\d+ \/ \d+ booked/).should("be.visible");
    cy.contains("Occupancy by floor").should("be.visible");
  });

  it("switches buildings and refreshes the snapshot", () => {
    cy.get("select").first().then(($select) => {
      const options = $select.find("option");
      if (options.length > 1) {
        cy.wrap($select).select(options.eq(1).val() as string);
        cy.contains(/\d+ \/ \d+ booked/).should("be.visible");
      }
    });
  });
});
