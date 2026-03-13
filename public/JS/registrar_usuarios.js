// registrar_usuarios.js

document.addEventListener('DOMContentLoaded', async function () {
    const usuario = await protegerPagina([1, 2]);
    if (!usuario) return;

    const formulario = document.getElementById('formulario-registro');
    const confirmarPassword = document.getElementById('confirmar-password');
    const password = document.getElementById('vchpassword');

    // Validar que las contraseñas coincidan
    confirmarPassword.addEventListener('input', function () {
        if (password.value !== confirmarPassword.value) {
            confirmarPassword.setCustomValidity('Las contraseñas no coinciden');
        } else {
            confirmarPassword.setCustomValidity('');
        }
    });

    password.addEventListener('input', function () {
        if (confirmarPassword.value && password.value !== confirmarPassword.value) {
            confirmarPassword.setCustomValidity('Las contraseñas no coinciden');
        } else {
            confirmarPassword.setCustomValidity('');
        }
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();

        const telefono = document.getElementById('vchtelefono').value;
        if (telefono.length !== 10 || isNaN(telefono)) {
            alert('El teléfono debe tener exactamente 10 dígitos');
            return;
        }

        if (password.value !== confirmarPassword.value) {
            alert('Las contraseñas no coinciden');
            return;
        }

        const datos = {
            vchnombre: document.getElementById('vchnombre').value.trim(),
            vchapaterno: document.getElementById('vchapaterno').value.trim(),
            vchamaterno: document.getElementById('vchamaterno').value.trim(),
            vchtelefono: telefono,
            vchcorreo: document.getElementById('vchcorreo').value.trim(),
            vchcalle: document.getElementById('vchcalle').value.trim(),
            vchcolonia: document.getElementById('vchcolonia').value.trim(),
            intidrol: document.getElementById('intidrol').value,
            vchpassword: password.value
        };

        const btnSubmit = formulario.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Registrando...';

        try {
            const response = await fetchConToken('/api/auth/registro', {
                method: 'POST',
                body: JSON.stringify(datos)
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('matricula-asignada').textContent = data.matricula;
                document.getElementById('mensaje-exito').style.display = 'block';
                document.getElementById('formulario-registro').style.display = 'none';
            } else {
                alert('Error: ' + data.message);
                btnSubmit.disabled = false;
                btnSubmit.textContent = textoOriginal;
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión al registrar usuario');
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
        }
    });
});

function ocultarMensajeExito() {
    document.getElementById('mensaje-exito').style.display = 'none';
    document.getElementById('formulario-registro').style.display = 'block';
    document.querySelector('.contenedor-perfil').style.minHeight = 'auto';
    document.getElementById('formulario-registro').reset();
}

window.ocultarMensajeExito = ocultarMensajeExito;