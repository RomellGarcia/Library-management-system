const CONFIG = {
    //API DE VERCEL
    BASE_URL: 'https://api-biblioteca-uthh.vercel.app',
    
    PATH_PREFIX: window.location.hostname.includes('github.io') 
        ? '/Api_Biblioteca_uthh' 
        : ''
};

/**
 * Función global para construir rutas correctamente en cualquier entorno
 * @param {string} path - La ruta empezando con / (ej: '/HTML/index.html')
 */
function getRoute(path) {
    return `${CONFIG.PATH_PREFIX}${path}`;
}