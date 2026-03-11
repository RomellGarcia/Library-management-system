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