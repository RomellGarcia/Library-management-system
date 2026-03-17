// utils.js - Funciones globales
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


// JS/utils.js

/**
 * Ajusta las rutas dependiendo de si el entorno es Local o GitHub Pages
 * @param {string} path - La ruta que empieza con /
 * @returns {string} - La ruta corregida
 */
function obtenerRuta(path) {
    const isGitHub = window.location.hostname.includes('github.io');
    const repoName = '/Api_Biblioteca_uthh';
    
    // Estandarizar: asegurar que empiece con /
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    
    // Si es GitHub, concatenamos el nombre del repo
    return isGitHub ? (repoName + cleanPath) : cleanPath;
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
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    // Verificamos que ambos existan para evitar errores de null
    if (input && icon) {
        if (input.type === "password") {
            input.type = "text";
            // Cambiamos el icono a "ocultar"
            icon.src = "../images/iconos/invisible.png";
        } else {
            input.type = "password";
            // Cambiamos el icono a "ver"
            icon.src = "../images/iconos/ojo.png";
        }
    } else {
        console.error("Error: No se encontró el elemento con ID: " + inputId + " o " + iconId);
    }
}