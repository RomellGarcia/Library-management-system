// utils.js - Funciones globales reutilizables

// Fetch con token automático para endpoints protegidos
function fetchConToken(url, opciones = {}) {
    const token = localStorage.getItem('token');
    return fetch(url, {
        ...opciones,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...opciones.headers
        }
    });
}

// Obtener usuario desde localStorage
function obtenerUsuario() {
    const data = localStorage.getItem('usuario');
    return data ? JSON.parse(data) : null;
}

// Escapar HTML para evitar XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

window.fetchConToken = fetchConToken;
window.obtenerUsuario = obtenerUsuario;
window.escapeHtml = escapeHtml;