// registrar_usuarios.js

document.addEventListener('DOMContentLoaded', async function() {
    const usuario = await protegerPagina([1]);
    if (!usuario) return;

    document.getElementById('formulario-registro').addEventListener('submit', async function(e) {
        e.preventDefault();

        const password = document.getElementById('vchpassword').value;
        const confirmar = document.getElementById('confirmar').value;

        if (password !== confirmar) {
            alert('Las contraseñas no coinciden');
            return;
        }

        if (document.getElementById('vchtelefono').value.length !== 10) {
            alert('El teléfono debe tener 10 dígitos');
            return;
        }

        const datos = {
            vchnombre:   document.getElementById('vchnombre').value.trim(),
            vchapaterno: document.getElementById('vchapaterno').value.trim(),
            vchamaterno: document.getElementById('vchamaterno').value.trim(),
            vchtelefono: document.getElementById('vchtelefono').value.trim(),
            vchcorreo:   document.getElementById('vchcorreo').value.trim(),
            vchcalle:    document.getElementById('vchcalle').value.trim(),
            vchcolonia:  document.getElementById('vchcolonia').value.trim(),
            intidrol:    parseInt(document.getElementById('intidrol').value),
            vchpassword: password
        };

        const btn = this.querySelector('button[type="submit"]');
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Registrando...';

        try {
            const response = await fetchConToken('/api/auth/registro', {
                method: 'POST',
                body: JSON.stringify(datos)
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('matricula-asignada').textContent = data.matricula;
                document.getElementById('mensaje-exito').style.display = 'block';
                document.getElementById('formulario-registro').reset();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        } finally {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    });
});