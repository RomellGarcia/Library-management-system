document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formularioRegistro');
    const pass1 = document.querySelector('input[name="password"]');
    const pass2 = document.querySelector('input[name="confirmar_password"]');

    // ===== Validación de contraseñas en tiempo real =====
    const verificarCoincidencia = () => {
        if (pass2.value && pass1.value !== pass2.value) {
            pass2.style.borderColor = 'red';
            pass2.setCustomValidity('Las contraseñas no coinciden');
        } else {
            pass2.style.borderColor = '#ddd';
            pass2.setCustomValidity('');
        }
    };

    if (pass1 && pass2) {
        pass1.addEventListener('input', verificarCoincidencia);
        pass2.addEventListener('input', verificarCoincidencia);
    }


    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
        let mensajeError = 'Ocurrió un error durante el registro.';

        switch (error) {
            case 'correo_existente':
                mensajeError = '¡Atención! Este correo electrónico ya se encuentra registrado. Por favor, inicia sesión o usa otro correo.';
                break;
            case 'registro_fallido':
                mensajeError = 'No pudimos completar el registro. Inténtalo de nuevo.';
                break;
            case 'db_fallida':
                mensajeError = 'Error interno del servidor. Por favor, inténtalo más tarde.';
                break;
        }

        alert(mensajeError);
        history.replaceState(null, '', 'registro.html');
    }

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar contraseñas
        if (pass1.value !== pass2.value) {
            alert('Las contraseñas no coinciden. Por favor corrígelas.');
            return;
        }

        const btnSubmit = formulario.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.innerText;

        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Registrando...';

        // Recopilar datos del formulario como JSON
        const datos = {
            vchnombre: document.getElementById('nombre').value.trim(),
            vchapaterno: document.getElementById('apellidoPaterno').value.trim(),
            vchamaterno: document.getElementById('apellidoMaterno').value.trim(),
            vchcorreo: document.getElementById('correoRegistro').value.trim(),
            vchtelefono: document.getElementById('telefono').value.trim(),
            vchcalle: document.getElementById('calle').value.trim(),
            vchcolonia: document.getElementById('colonia').value.trim(),
            vchpassword: pass1.value
        };

        try {
           const respuesta = await fetch(`${CONFIG.BASE_URL}/api/auth/registro-publico`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            const data = await respuesta.json();

            if (data.success) {
                alert('¡Registro Exitoso!\n\nTu matrícula asignada es: ' + data.matricula);
                window.location.href = 'iniciar_sesion.html';
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión con el servidor.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerText = textoOriginal;
        }
    });
});