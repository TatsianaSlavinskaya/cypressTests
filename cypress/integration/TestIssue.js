describe('testing sections at Albert Heijn', () => {

  let openSectionWithUrlChecking = section => {
    cy.contains("Menu").click();
    cy.contains(section).click();
    cy.url().should('include', section);
  };

  beforeEach(() => {
    cy.visit('/');
  });
  afterEach(() => {
    cy.screenshot();
  });

  it('check section products', () => {
    openSectionWithUrlChecking("producten")
  });

  it('check bonus section', () => {
    openSectionWithUrlChecking("bonus")
  });

  it('check winkels section', () => {
    openSectionWithUrlChecking("winkels")
  });

  it('check acties section', () => {
    openSectionWithUrlChecking("acties")
  });

});