document.addEventListener("DOMContentLoaded", function () {
    if (document.querySelector('.header-top')) {
        console.log('Headers ya existen en el HTML, saltando generación dinámica');
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
            ...
    <div id="session-button-container">
        <button class="btn-logout-top" onclick="window.location.href=obtenerRuta('/HTML/iniciar_sesion.html')">
            Iniciar Sesión
        </button>
    </div>
    ...
        </header >

        <header class="header-menu">
            <div class="menu-container">
                <nav class="menu">
                    <ul>
                        <li><a href="${obtenerRuta('/index.html')}">Inicio</a></li>
                        <li><a href="${obtenerRuta('/HTML/iniciar_sesion.html')}">Iniciar Sesión</a></li>
                        <li><a href="${obtenerRuta('/HTML/catalogo.html')}">Catálogo</a></li>
                        <li><a href="${obtenerRuta('/HTML/contacto.html')}">Contacto</a></li>
                    </ul>
                </nav>
            </div>
        </header>
    `;

    document.body.insertAdjacentElement('afterbegin', headerContainer);

    // ... (resto de tu lógica de actualización de botón de sesión)
});

function cerrarSesionHeader() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    // Nota: El fetch al logout fallará en GitHub Pages si no usas CONFIG.BASE_URL
    window.location.href = obtenerRuta('/HTML/iniciar_sesion.html');
}