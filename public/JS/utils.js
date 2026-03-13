// utils.js - Funciones globales reutilizables

// utils.js - Utilidades globales

// ─────────────────────────────────────────
// FETCH CON TOKEN
// ─────────────────────────────────────────
function fetchConToken(url, opciones = {}) {
    const token = localStorage.getItem('token');

    return fetch(CONFIG.BASE_URL + url, {
        ...opciones,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...opciones.headers
        }
    });
}

// ─────────────────────────────────────────
// OBTENER USUARIO DEL LOCALSTORAGE
// ─────────────────────────────────────────
function obtenerUsuario() {
    try {
        const datos = localStorage.getItem('usuario');
        return datos ? JSON.parse(datos) : null;
    } catch (e) {
        return null;
    }
}

// ─────────────────────────────────────────
// ESCAPE HTML
// ─────────────────────────────────────────
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}


// Mostrar/ocultar contraseña
function togglePassword(inputId, iconId) {
    // Si no se pasan argumentos (como en tu login viejo), usa los por defecto
    const input = document.getElementById(inputId || 'contrasenaLogin');
    const icon = document.getElementById(iconId || 'eyeIcon');

    if (input.type === "password") {
        input.type = "text";
        icon.src = "../images/iconos/invisible.png";
    } else {
        input.type = "password";
        icon.src = "../images/iconos/ojo.png";
    }
}