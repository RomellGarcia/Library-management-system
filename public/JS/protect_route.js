// protect-route.js - Proteger páginas que requieren autenticación
async function protegerPagina(rolesPermitidos = []) {
    try {
        const response = await fetch('/api/auth/verificar', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        // Si no hay sesión, redirigir a login
        if (!data.logged_in) {
            window.location.href = '/HTML/iniciar_sesion.html';
            return false;
        }
        
        // Si se especificaron roles permitidos, verificar
        if (rolesPermitidos.length > 0) {
            if (!rolesPermitidos.includes(data.usuario.idrol)) {
                alert('No tienes permisos para acceder a esta página');
                window.location.href = '/HTML/index.html';
                return false;
            }
        }
        
        return data.usuario;
    } catch (error) {
        console.error('Error al proteger página:', error);
        window.location.href = '/HTML/iniciar_sesion.html';
        return false;
    }
}

// Exportar
window.protegerPagina = protegerPagina;