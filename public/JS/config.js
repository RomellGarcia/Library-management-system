const CONFIG = {
    BASE_URL: 'https://api-biblioteca-uthh.vercel.app',
    IMG_PATH: window.location.hostname.includes('github.io') 
              ? '/Api_Biblioteca_uthh/assets/img' // Ruta para GitHub
              : '../assets/img'                  // Ruta para Local
};