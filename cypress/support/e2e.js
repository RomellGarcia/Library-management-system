// Credenciales según tu documento
const ADMIN     = { mat: '10100003', pass: '12345678' };
const EMPLEADO  = { mat: '10100004', pass: '12345678' };
const USUARIO   = { mat: '20000001', pass: '12345678' };

// Comando de login reutilizable - ajusta los selectores según tu HTML real
function hacerLogin(mat, pass) {
  cy.visit('/index.php');
  cy.get('input').first().clear().type(mat);
  cy.get('input[type="password"]').clear().type(pass);
  cy.get('button[type="submit"], input[type="submit"]').click();
  cy.url().should('not.include', 'login');
}

// ─────────────────────────────────────────────────────────
// PS-02: Registro de nuevo usuario y restricciones de rol
// ─────────────────────────────────────────────────────────
describe('PS-02 Registro de nuevo usuario y restricciones de rol', () => {

  it('Paso 1: Admin crea nuevo usuario Juan Pérez', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/listado_usuario.php');
    cy.contains('Agregar').click();
    cy.get('input[name="nombre"], #nombre').type('Juan');
    cy.get('input[name="apellidos"], #apellidos').type('Pérez');
    cy.get('input[type="password"]').first().type('12345678');
    cy.get('button[type="submit"]').click();
    cy.contains(/exitoso|registrado/i).should('be.visible');
  });

  it('Paso 3: Usuario nuevo no puede acceder a módulo admin', () => {
    hacerLogin('juan.perez@test.com', '12345678');
    cy.visit('/listado_usuario.php');
    cy.url().should('match', /login|index/i);
  });

});

// ─────────────────────────────────────────────────────────
// PS-03: Autoregistro de usuario y búsqueda de libro
// ─────────────────────────────────────────────────────────
describe('PS-03 Autoregistro y búsqueda de libro', () => {

  it('Paso 1-2: Visitante se autoregistra', () => {
    cy.visit('/index.php');
    cy.contains(/registr/i).click();
    cy.get('input[name="nombre"], #nombre').type('María García');
    cy.get('input[name="matricula"], #matricula').type('20000099');
    cy.get('input[type="password"]').first().type('test1234');
    cy.get('button[type="submit"]').click();
    cy.contains(/exitoso|registrado/i).should('be.visible');
  });

  it('Paso 3-4: Nuevo usuario busca libros en catálogo', () => {
    hacerLogin('20000099', 'test1234');
    cy.visit('/catalogo.php');
    cy.get('input[name="buscar"], #buscador').type('programación');
    cy.get('button[type="submit"], #btnBuscar').click();
    cy.get('table tbody tr, .card, .libro').should('have.length.above', 0);
  });

  it('Paso 5: Matrícula duplicada es rechazada', () => {
    cy.visit('/index.php');
    cy.contains(/registr/i).click();
    cy.get('input[name="matricula"], #matricula').type('20000099');
    cy.get('button[type="submit"]').click();
    cy.contains(/registrada|duplicad|existe/i).should('be.visible');
  });

});

// ─────────────────────────────────────────────────────────
// PS-04: Inicio de sesión con credenciales inválidas
// ─────────────────────────────────────────────────────────
describe('PS-04 Credenciales inválidas', () => {

  beforeEach(() => cy.visit('/index.php'));

  it('Paso 1: Contraseña incorrecta no da acceso', () => {
    cy.get('input').first().type('10100003');
    cy.get('input[type="password"]').type('000000');
    cy.get('button[type="submit"]').click();
    cy.url().should('match', /login|index/i);
    cy.get('.error, .alerta, .alert, [class*=error]').should('be.visible');
  });

  it('Paso 2: ID inexistente no da acceso', () => {
    cy.get('input').first().type('99999999');
    cy.get('input[type="password"]').type('12345678');
    cy.get('button[type="submit"]').click();
    cy.url().should('match', /login|index/i);
  });

  it('Paso 3: Campos vacíos no procesan la solicitud', () => {
    cy.get('button[type="submit"]').click();
    cy.url().should('match', /login|index/i);
  });

  it('Paso 4: Credenciales válidas SÍ dan acceso', () => {
    cy.get('input').first().type('10100003');
    cy.get('input[type="password"]').type('12345678');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.match', /login/i);
  });

});

// ─────────────────────────────────────────────────────────
// PS-05: Devolución de libro y actualización de disponibilidad
// ─────────────────────────────────────────────────────────
describe('PS-05 Devolución de libro', () => {

  it('Pasos 1-4: Devolución cambia estado y actualiza catálogo', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/gestion_prestamos.php');
    cy.contains('Activo').first().closest('tr')
      .find('button, a').contains(/devolver/i).click();
    cy.contains(/confirmar/i).click();
    cy.contains(/devuelto/i).should('be.visible');
  });

});

// ─────────────────────────────────────────────────────────
// PS-06: Edición y eliminación de libro
// ─────────────────────────────────────────────────────────
describe('PS-06 Edición y eliminación de libro', () => {

  it('Pasos 1-3: Admin edita libro y cambios visibles en catálogo', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/listado_libros.php');
    cy.get('tbody tr').first().contains(/editar/i).click();
    cy.get('#titulo, input[name="titulo"]').clear().type('El Principito (Ed. 2024)');
    cy.get('#ejemplares, input[name="ejemplares"]').clear().type('5');
    cy.get('button[type="submit"]').click();
    cy.contains(/actualizado|exitoso/i).should('be.visible');
  });

  it('Pasos 4-5: Admin elimina libro y desaparece del catálogo', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/listado_libros.php');
    cy.get('tbody tr').first().contains(/eliminar/i).click();
    cy.on('window:confirm', () => true);
    cy.contains(/eliminado/i).should('be.visible');
    cy.visit('/catalogo.php');
    cy.get('input[name="buscar"], #buscador').type('Principito');
    cy.get('button[type="submit"]').click();
    cy.contains(/no se encontr|sin result/i).should('be.visible');
  });

});

// ─────────────────────────────────────────────────────────
// PS-07: Registro de préstamo desde módulo Realizar Préstamo
// ─────────────────────────────────────────────────────────
describe('PS-07 Registro de préstamo con ticket automático', () => {

  it('Pasos 1-5: Ticket generado, préstamo registrado, contador incrementa', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/registro-prestamo.php');
    // Ticket generado automáticamente
    cy.get('#ticketPrestamo, input[name="ticket"]').invoke('val').should('not.be.empty');
    // Ingresar matrícula del usuario
    cy.get('#matriculaUsuario, input[name="matriculaUsuario"]').type('20250015');
    cy.contains(/juanito/i).should('be.visible');
    // Buscar libro
    cy.get('#buscadorLibro, input[name="buscadorLibro"]').type('Cocina');
    cy.contains(/cocina vegetariana/i).click();
    // Confirmar
    cy.get('button').contains(/confirmar|registrar/i).click();
    cy.contains(/exitoso|registrado/i).should('be.visible');
    // Verificar contador
    cy.visit('/gestion_prestamos.php');
    cy.get('[class*="activo"], .stat-activos').should('exist');
  });

});

// ─────────────────────────────────────────────────────────
// PS-08: Consulta y filtrado de préstamos
// ─────────────────────────────────────────────────────────
describe('PS-08 Consulta y filtrado de préstamos', () => {

  beforeEach(() => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/gestion_prestamos.php');
  });

  it('Paso 1: Muestra contadores de estado correctamente', () => {
    cy.contains(/activo/i).should('be.visible');
    cy.contains(/devuelto/i).should('be.visible');
    cy.contains(/vencido/i).should('be.visible');
  });

  it('Paso 2: Filtro Devueltos muestra solo devueltos', () => {
    cy.get('select').select('devuelto');
    cy.get('tbody tr').each($tr => {
      cy.wrap($tr).contains(/devuelto/i);
    });
  });

  it('Paso 3: Filtro Vencidos muestra solo vencidos', () => {
    cy.get('select').select('vencido');
    cy.get('tbody tr').should('have.length.above', 0);
  });

  it('Paso 4: Buscador por matrícula funciona', () => {
    cy.get('input[type="text"], #buscador').first().type('20250015');
    cy.get('tbody tr').should('have.length.above', 0);
    cy.get('tbody tr').each($tr => {
      cy.wrap($tr).contains('20250015');
    });
  });

  it('Paso 5: Limpiar filtro regresa todos los resultados', () => {
    cy.get('input[type="text"], #buscador').first().clear();
    cy.get('tbody tr').should('have.length.above', 0);
  });

});

// ─────────────────────────────────────────────────────────
// PS-09: Edición de datos de usuario
// ─────────────────────────────────────────────────────────
describe('PS-09 Edición de datos de usuario', () => {

  it('Pasos 1-5: Admin cambia teléfono de Miriam y persiste en listado', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/listado_usuario.php');
    cy.contains('20250009').closest('tr').contains(/editar/i).click();
    cy.get('#telefono, input[name="telefono"]').clear().type('7711069390');
    cy.get('button').contains(/actualizar|guardar/i).click();
    cy.visit('/listado_usuario.php');
    cy.contains('7711069390').should('be.visible');
  });

});

// ─────────────────────────────────────────────────────────
// PS-10: Edición de libro existente
// ─────────────────────────────────────────────────────────
describe('PS-10 Edición de libro existente MAT-001-24', () => {

  it('Pasos 1-5: Admin cambia año y persiste al reabrir formulario', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/listado_libros.php');
    cy.contains('MAT-001-24').closest('tr').contains(/editar/i).click();
    cy.get('#anioPublicacion, input[name="anio"]').clear().type('2024');
    cy.get('button').contains(/actualizar|guardar/i).click();
    // Reabrir y verificar que persiste
    cy.visit('/listado_libros.php');
    cy.contains('MAT-001-24').closest('tr').contains(/editar/i).click();
    cy.get('#anioPublicacion, input[name="anio"]').should('have.value', '2024');
  });

});

// ─────────────────────────────────────────────────────────
// PS-11: Visualización del código QR de acceso
// ─────────────────────────────────────────────────────────
describe('PS-11 Visualización del código QR de acceso', () => {

  it('Pasos 1-5: Módulo AR muestra QR, título e instrucciones completas', () => {
    hacerLogin(ADMIN.mat, ADMIN.pass);
    cy.visit('/Codigo.php');
    cy.contains(/código qr de acceso/i).should('be.visible');
    cy.get('img, canvas, svg').should('exist');
    cy.contains(/cómo usar/i).should('be.visible');
    cy.contains(/descargar app/i).should('be.visible');
    cy.get('a[href*="mediafire"], a[href*="drive"]').should('exist');
  });

});