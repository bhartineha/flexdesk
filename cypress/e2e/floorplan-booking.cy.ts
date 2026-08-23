const API_URL = Cypress.env("apiUrl");

function apiLogin(email: string) {
  return cy
    .request("POST", `${API_URL}/api/auth/login`, { email, password: "password123" })
    .then((res) => res.body.token as string);
}

describe("Floorplan Matrix — instant desk booking", () => {
  beforeEach(() => {
    cy.loginAs("employee2@acme.test");
  });

  it("books a desk, checks in, then releases it", () => {
    cy.on("window:confirm", () => true);
    cy.visit("/floorplan");

    cy.get('[data-cy="desk-tile"][data-status="AVAILABLE"]').first().as("desk");

    cy.get("@desk")
      .invoke("attr", "title")
      .then((title) => {
        const label = title?.split(" — ")[0]!;

        // Book it.
        cy.get("@desk").click();
        cy.contains(`Booked ${label}`, { timeout: 10000 }).should("be.visible");
        cy.contains('[data-cy="desk-tile"][data-mine="true"]', label).as("myDesk");
        cy.get("@myDesk").should("have.attr", "data-status", "PENDING_CHECKIN");

        // First click on your own pending booking checks you in.
        cy.get("@myDesk").click();
        cy.contains(`Checked in at ${label}`, { timeout: 10000 }).should("be.visible");
        cy.contains('[data-cy="desk-tile"][data-mine="true"]', label).should("have.attr", "data-status", "CHECKED_IN");

        // Second click on a checked-in booking releases it (after confirm).
        cy.contains('[data-cy="desk-tile"][data-mine="true"]', label).click();
        cy.contains(`Released ${label}`, { timeout: 10000 }).should("be.visible");
      });
  });

  it("prevents double-booking a desk someone else already holds", () => {
    // Seed the conflict directly through the API so this test doesn't
    // depend on leftover state from any other spec or test run.
    const today = new Date().toISOString().slice(0, 10);

    apiLogin("employee4@acme.test").then((token) => {
      cy.request({
        method: "GET",
        url: `${API_URL}/api/buildings`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((buildingsRes) => {
        const berlin = buildingsRes.body.find((b: any) => b.name.includes("Berlin"));
        cy.request({
          method: "GET",
          url: `${API_URL}/api/buildings/${berlin.id}/floors`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((floorsRes) => {
          const floorId = floorsRes.body[0].id;
          cy.request({
            method: "GET",
            url: `${API_URL}/api/floors/${floorId}/layout?date=${today}&slot=FULL_DAY`,
            headers: { Authorization: `Bearer ${token}` },
          }).then((layoutRes) => {
            const targetDesk = layoutRes.body.desks.find(
              (d: any) => d.status === "AVAILABLE" && d.type === "DESK"
            );

            cy.request({
              method: "POST",
              url: `${API_URL}/api/bookings`,
              headers: { Authorization: `Bearer ${token}` },
              body: { deskId: targetDesk.id, date: today, slot: "FULL_DAY" },
            }).then(() => {
              cy.visit("/floorplan");
              cy.contains('[data-cy="desk-tile"]', targetDesk.label)
                .should("have.attr", "data-status", "PENDING_CHECKIN")
                .and("have.attr", "data-mine", "false")
                .and("be.disabled");
            });
          });
        });
      });
    });
  });
});
