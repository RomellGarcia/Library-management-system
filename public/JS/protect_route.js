// protect_route.js - Proteger páginas que requieren autenticación
async function protegerPagina(rolesPermitidos = []) {
    // ✅ NUEVO: Verificar token en localStorage primero (instantáneo)
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');

    if (!token || !usuarioGuardado) {
        // No hay sesión local, verificar con el servidor por si acaso
        return await verificarConServidor(rolesPermitidos);
    }

    const usuario = JSON.parse(usuarioGuardado);

    // Verificar rol si se especificaron roles permitidos
    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(parseInt(usuario.idrol))) {
        alert('No tienes permisos para acceder a esta página');
        window.location.href = '/HTML/index.html';
        return false;
    }

    return usuario;
}

// Fallback: verificar sesión con el servidor
async function verificarConServidor(rolesPermitidos = []) {
    try {
        const response = await fetch(CONFIG.BASE_URL + '/api/auth/verificar', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!data.logged_in) {
            window.location.href = '/HTML/iniciar_sesion.html';
            return false;
        }
        
        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(parseInt(data.usuario.idrol))) {
            alert('No tienes permisos para acceder a esta página');
            window.location.href = '/HTML/index.html';
            return false;
        }
        
        return data.usuario;
    } catch (error) {
        console.error('Error al proteger página:', error);
        window.location.href = '/HTML/iniciar_sesion.html';
        return false;
    }
}

window.protegerPagina = protegerPagina;