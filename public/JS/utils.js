// utils.js - Funciones globales reutilizables

// utils.js - Utilidades globales

// ─────────────────────────────────────────
// FETCH CON TOKEN
// ─────────────────────────────────────────
async function fetchConToken(url, options = {}) {
    const token = localStorage.getItem('token'); // Asegúrate de que este nombre sea correcto
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <--- ESTO ES LO MÁS IMPORTANTE
    };

    return await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
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