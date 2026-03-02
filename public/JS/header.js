/*document.addEventListener('DOMContentLoaded', function() {
    const headerSearchHTML = `
        <header class="header-search">
            <div class="search-container">
                <input type="search" class="search-box" id="searchBox" placeholder="Buscar libros, autores, categorías..."
                    autocomplete="off">
                <div class="search-results" id="searchResults"></div>
            </div>
        </header>
    `;
    
    // Insertar después del header-menu (el menú de navegación)
    const headerTop = document.querySelector('.header-top');
    if (headerTop) {
        headerTop.insertAdjacentHTML('afterend', headerSearchHTML);
    }
});*/
// header.js - Genera headers dinámicamente
document.addEventListener("DOMContentLoaded", function() {
    // Verificar si ya existe un header (para evitar duplicados)
    if (document.querySelector('.header-top')) {
        console.log('⚠️ Headers ya existen en el HTML, saltando generación dinámica');
        return;
    }

    const headerContainer = document.createElement('div');
    headerContainer.className = "main-header-wrapper";

    headerContainer.innerHTML = `
        <header class="header-top">
            <div class="logo-container">
                <div class="logo"></div>
                <h1 style="color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Biblioteca UTHH</h1>
            </div>
            <div id="session-button-container">
                <a href="/HTML/iniciarsesion.html">
                    <button class="btn-logout-top">Iniciar Sesión</button>
                </a>
            </div>
        </header>

        <header class="header-menu">
            <div class="menu-container">
                <nav class="menu">
                    <ul>
                        <a href="/HTML/index.html">Inicio</a>
                        <a href="/HTML/iniciarsesion.html">Iniciar Sesión</a>
                        <a href="/HTML/catalogo.html">Catálogo</a>
                        <a href="/HTML/contacto.html">Contacto</a>
                    </ul>
                </nav>
            </div>
        </header>
    `;

    // Insertar al principio del body
    document.body.insertAdjacentElement('afterbegin', headerContainer);
    
    console.log('✅ Headers generados dinámicamente');
});