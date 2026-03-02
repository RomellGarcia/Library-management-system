// auth.js - Manejo del formulario de login
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya hay sesión activa
    verificarSesionYRedirigir();
    
    const formularioLogin = document.getElementById('formularioLogin');
    
    if (formularioLogin) {
        formularioLogin.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const matricula = document.getElementById('correoLogin').value.trim();
            const password = document.getElementById('contrasenaLogin').value;
            const recordar = document.getElementById('recordarme').checked;
            
            // Deshabilitar botón para evitar doble clic
            const btnSubmit = formularioLogin.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.textContent;
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Iniciando sesión...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        matricula,
                        password,
                        recordar
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Login exitoso
                    console.log('✅ Login exitoso:', data.usuario);
                    
                    // Mostrar mensaje de bienvenida con alert
                    alert(`¡Bienvenido ${data.usuario.nombre}!`);
                    
                    // Redirigir
                    window.location.href = data.redirect;
                } else {
                    // Login fallido - Mostrar el mensaje específico del servidor
                    alert(data.message);
                    
                    // Rehabilitar botón
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = textoOriginal;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error de conexión. Por favor intenta de nuevo.');
                
                // Rehabilitar botón
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        });
    }
});

// Verificar si ya hay sesión activa y redirigir
async function verificarSesionYRedirigir() {
    try {
        const response = await fetch('/api/auth/verificar', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.logged_in) {
            // Ya hay sesión activa, redirigir al index
            console.log('Sesión activa detectada, redirigiendo...');
            window.location.href = '/HTML/index.html';
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
    }
}

// Funcionalidad para mostrar/ocultar contraseña
function togglePassword() {
    const passwordInput = document.getElementById('contrasenaLogin');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        // Mostrar contraseña
        passwordInput.type = 'text';
        eyeIcon.src = '../images/iconos/invisible.png';
        eyeIcon.alt = 'Ocultar contraseña';
    } else {
        // Ocultar contraseña
        passwordInput.type = 'password';
        eyeIcon.src = '../images/iconos/ojo.png';
        eyeIcon.alt = 'Mostrar contraseña';
    }
}