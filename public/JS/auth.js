// auth.js - Manejo del formulario de login
document.addEventListener('DOMContentLoaded', function () {
    verificarSesionYRedirigir();

    const formularioLogin = document.getElementById('formularioLogin');

    if (formularioLogin) {
        formularioLogin.addEventListener('submit', async function (e) {
            e.preventDefault();

            const matricula = document.getElementById('correoLogin').value.trim();
            const password = document.getElementById('contrasenaLogin').value;
            const recordar = document.getElementById('recordarme').checked;

            const btnSubmit = formularioLogin.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.textContent;
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Iniciando sesión...';

            try {
                const response = await fetch(CONFIG.BASE_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ matricula, password, recordar })
                });

                const data = await response.json();

                if (data.success) {
                    console.log('data.token:', data.token);
                    console.log('data.usuario:', data.usuario);
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('usuario', JSON.stringify(data.usuario));

                    alert(`¡Bienvenido ${data.usuario.nombre}!`);
                    window.location.href = data.redirect;
                } else {
                    alert(data.message);
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = textoOriginal;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error de conexión. Por favor intenta de nuevo.');
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        });
    }
});

// Verificar si ya hay sesión activa y redirigir
async function verificarSesionYRedirigir() {
    // ✅ NUEVO: Primero revisar localStorage (más rápido)
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    if (token && usuario) {
        window.location.href = '/HTML/index.html';
        return;
    }

    // Si no hay token local, verificar con el servidor
    try {
        const response = await fetch(CONFIG.BASE_URL + '/api/auth/verificar', {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.logged_in) {
            window.location.href = '/HTML/index.html';
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
    }
}
