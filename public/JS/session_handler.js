// session-handler.js - Verifica sesión y actualiza SOLO si hay sesión activa
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔍 session-handler.js cargado');
    await verificarSesion();
});

async function verificarSesion() {
    try {
        console.log('Verificando sesión...');
        
        const response = await fetch('/api/auth/verificar', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-cache'
        });
        
        const data = await response.json();
        console.log('Datos de sesión:', data);
        
        if (data.logged_in && data.usuario) {
            console.log('Usuario logueado:', data.usuario);
            // SOLO actualizar si hay sesión activa
            actualizarInterfaz(data.usuario);
        } else {
            console.log('No hay sesión activa - Mostrando interfaz por defecto');
            // NO hacer nada, dejar el HTML por defecto
        }
        
        return data;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        // En caso de error, también dejar el HTML por defecto
        return null;
    }
}

function actualizarInterfaz(usuario) {
    // Actualizar botón de sesión en header-top
    actualizarBotonSesion(usuario);
    
    // Actualizar menú según rol
    actualizarMenu(usuario);
}

function actualizarBotonSesion(usuario) {
    const sessionButtonContainer = document.getElementById('session-button-container');
    if (!sessionButtonContainer) {
        console.log('session-button-container no encontrado');
        return;
    }
    
    // REEMPLAZAR el contenido por defecto con el de sesión activa
    sessionButtonContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: white; font-size: 0.9rem; font-weight: 500;">
                ¡Hola, ${usuario.nombre}!
            </span>
            <button class="btn-logout-top" onclick="cerrarSesion()">Cerrar Sesión</button>
        </div>
    `;
    
    console.log('Botón de sesión actualizado a "Cerrar Sesión"');
}

function actualizarMenu(usuario) {
    const menuContainer = document.querySelector('.header-menu .menu ul');
    if (!menuContainer) {
        console.log('Menú no encontrado en esta página');
        return;
    }
    
    let menuItems = [];
    
    // Menús según rol
    switch(parseInt(usuario.idrol)) {
        case 1: // Administrador
            console.log('Cargando menú de Administrador');
            menuItems = [
                { href: '/HTML/index.html', texto: 'Inicio' },
                { href: '/HTML/perfil.html', texto: 'Perfil' },
                { href: '/HTML/catalogo.html', texto: 'Catálogo' },
                { href: '/HTML/gestion_usuarios.html', texto: 'Gestionar Usuarios' },
                { href: '/HTML/registrar_usuarios.html', texto: 'Registrar Usuarios' },
                { href: '/HTML/gestionar_libros.html', texto: 'Gestionar Libros' },
                { href: '/HTML/registrar_libros.html', texto: 'Registrar Libros' },
                { href: '/HTML/registrar_prestamo.html', texto: 'Realizar Préstamo' },
                { href: '/HTML/gestion_prestamos.html', texto: 'Consultar Préstamos' },
                { href: '/HTML/visualizar_ar.html', texto: 'Visualizar AR' }
            ];
            break;
            
        case 2: // Empleado
            console.log('Cargando menú de Empleado');
            menuItems = [
                { href: '/HTML/index.html', texto: 'Inicio' },
                { href: '/HTML/perfil.html', texto: 'Perfil' },
                { href: '/HTML/catalogo.html', texto: 'Catálogo' },
                { href: '/HTML/gestion_usuarios.html', texto: 'Gestionar Usuarios' },
                { href: '/HTML/gestionar_libros.html', texto: 'Gestionar Libros' },
                { href: '/HTML/registrar_libros.html', texto: 'Registrar Libros' },
                { href: '/HTML/registrar_prestamo.html', texto: 'Realizar Préstamo' },
                { href: '/HTML/gestion_prestamos.html', texto: 'Consultar Préstamos' },
                { href: '/HTML/visualizar_ar.html', texto: 'Visualizar AR' }
            ];
            break;
            
        case 3: // Usuario
            console.log('Cargando menú de Usuario');
            menuItems = [
                { href: '/HTML/index.html', texto: 'Inicio' },
                { href: '/HTML/perfil.html', texto: 'Perfil' },
                { href: '/HTML/catalogo.html', texto: 'Catálogo' },
                { href: '/HTML/misprestamos.html', texto: 'Mis Préstamos' },
                { href: '/HTML/contacto.html', texto: 'Contacto' },
                { href: '/HTML/visualizar_ar.html', texto: 'Visualizar AR' }
            ];
            break;
            
        default:
            console.warn('Rol no reconocido:', usuario.idrol);
            // No hacer nada, dejar menú por defecto
            return;
    }
    
    // REEMPLAZAR el menú por defecto con el menú según rol
    menuContainer.innerHTML = menuItems.map(item => 
        `<a href="${item.href}">${item.texto}</a>`
    ).join('');
    
    console.log('Menú actualizado para rol:', usuario.rol);
}

// Función para cerrar sesión
async function cerrarSesion() {
    if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Sesión cerrada correctamente');
            window.location.href = data.redirect;
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión. Intenta de nuevo.');
    }
}

// Exportar funciones globalmente
window.verificarSesion = verificarSesion;
window.cerrarSesion = cerrarSesion;