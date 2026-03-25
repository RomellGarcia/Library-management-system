// session_handler.js - Verifica sesión y actualiza interfaz
document.addEventListener('DOMContentLoaded', async function () {
    console.log('session_handler.js cargado');
    await verificarSesion();
});

async function verificarSesion() {
    try {
        const token = localStorage.getItem('token');
        const usuarioGuardado = localStorage.getItem('usuario');

        if (token && usuarioGuardado) {
            const usuario = JSON.parse(usuarioGuardado);
            console.log('Sesión desde localStorage:', usuario);
            actualizarInterfaz(usuario);
            return { logged_in: true, usuario };
        }

        // Si no hay token local, verificar con el servidor
        console.log('Verificando sesión con el servidor...');
        const response = await fetch(CONFIG.BASE_URL + '/api/auth/verificar', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-cache'
        });

        const data = await response.json();

        if (data.logged_in && data.usuario) {
            console.log('Sesión activa en servidor:', data.usuario);
            actualizarInterfaz(data.usuario);
        } else {
            console.log('No hay sesión activa');
        }

        return data;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        return null;
    }
}

function actualizarInterfaz(usuario) {
    actualizarBotonSesion(usuario);
    actualizarMenu(usuario);
}

function actualizarBotonSesion(usuario) {
    const sessionButtonContainer = document.getElementById('session-button-container');
    if (!sessionButtonContainer) return;

    sessionButtonContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: white; font-size: 0.9rem; font-weight: 500;">
                ¡Hola, ${usuario.nombre}!
            </span>
            <button class="btn-logout-top" onclick="cerrarSesion()">Cerrar Sesión</button>
        </div>
    `;
}

function actualizarMenu(usuario) {
    const menuContainer = document.querySelector('.header-menu .menu ul');
    if (!menuContainer) return;

    let menuItems = [];

    switch (parseInt(usuario.idrol)) {
        case 1: // Administrador
            menuItems = [
                { href: '/HTML/perfil.html', texto: 'Perfil' },
                { href: '/HTML/gestion_usuarios.html', texto: 'Gestionar Usuarios' },
                { href: '/HTML/registrar_usuario_rol.html', texto: 'Registrar Usuarios' },
                { href: '/HTML/gestion_libros.html', texto: 'Gestionar Libros' },
                { href: '/HTML/registrar_libros.html', texto: 'Registrar Libros' },
                { href: '/HTML/registrar_prestamo.html', texto: 'Realizar Préstamo' },
                { href: '/HTML/gestion_prestamos.html', texto: 'Consultar Préstamos' },
                { href: '/HTML/visualizar_ar.html', texto: 'Visualizar AR' }
            ];
            break;

        case 2: // Empleado
            menuItems = [
                { href: '/HTML/perfil.html', texto: 'Perfil' },
                { href: '/HTML/gestion_usuarios.html', texto: 'Gestionar Usuarios' },
                { href: '/HTML/gestion_libros.html', texto: 'Gestionar Libros' },
                { href: '/HTML/registrar_libros.html', texto: 'Registrar Libros' },
                { href: '/HTML/registrar_prestamo.html', texto: 'Realizar Préstamo' },
                { href: '/HTML/gestion_prestamos.html', texto: 'Consultar Préstamos' },
                { href: '/HTML/visualizar_ar.html', texto: 'Visualizar AR' }
            ];
            break;

        case 3: // Usuario
            menuItems = [
                { href: '/HTML/index.html', texto: 'Inicio' },
                { href: '/HTML/perfil.html', texto: 'Perfil' },
                { href: '/HTML/catalogo.html', texto: 'Catálogo' },
                { href: '/HTML/mis_prestamos.html', texto: 'Mis Préstamos' },
                { href: '/HTML/contacto.html', texto: 'Contacto' },
                { href: '/HTML/visualizar_ar.html', texto: 'Visualizar AR' }
            ];
            break;

        default:
            console.warn('Rol no reconocido:', usuario.idrol);
            return;
    }

    menuContainer.innerHTML = menuItems.map(item =>
        `<a href="${obtenerRuta(item.href)}">${item.texto}</a>`
    ).join('');
}

async function cerrarSesion() {
    if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) return;

    try {
        // Limpiar localStorage primero
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');

        const response = await fetch(CONFIG.BASE_URL + '/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
         window.location.href = obtenerRuta(data.redirect || '/HTML/iniciar_sesion.html');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Aunque falle el servidor, redirigir igual (el localStorage ya está limpio)
        window.location.href = obtenerRuta('/HTML/iniciar_sesion.html');
    }
}

window.verificarSesion = verificarSesion;
window.cerrarSesion = cerrarSesion;