// perfil.js - Gestión de perfil de usuario

let datosOriginales = {};

document.addEventListener('DOMContentLoaded', async function() {
    // ✅ Proteger página: cualquier usuario logueado (roles 1, 2 y 3)
    const usuario = await protegerPagina([1, 2, 3]);
    if (!usuario) return;

    cargarPerfil();
    configurarEventos();
});

// Cargar datos del perfil
async function cargarPerfil() {
    try {
        const response = await fetchConToken('/api/auth/perfil');
        const data = await response.json();

        if (data.success) {
            mostrarDatosPerfil(data.usuario);
        } else {
            alert('Error al cargar perfil: ' + data.error);
            window.location.href = obtenerRuta('/HTML/index.html');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al cargar perfil');
        window.location.href = obtenerRuta('/HTML/index.html');
    }
}

// Mostrar datos en el formulario
function mostrarDatosPerfil(usuario) {
    datosOriginales = { ...usuario };

    document.getElementById('matricula').value = usuario.intmatricula || '';
    document.getElementById('nombre').value = usuario.vchnombre || '';
    document.getElementById('apaterno').value = usuario.vchapaterno || '';
    document.getElementById('amaterno').value = usuario.vchamaterno || '';
    document.getElementById('telefono').value = usuario.vchtelefono || '';
    document.getElementById('correo').value = usuario.vchcorreo || '';
    document.getElementById('calle').value = usuario.vchcalle || '';
    document.getElementById('colonia').value = usuario.vchcolonia || '';

    document.getElementById('loading-perfil').style.display = 'none';
    document.getElementById('formulario-edicion').style.display = 'block';
}

// Configurar eventos
function configurarEventos() {
    document.getElementById('btn-editar')?.addEventListener('click', habilitarEdicion);
    document.getElementById('btn-cancelar')?.addEventListener('click', cancelarEdicion);
    document.getElementById('formulario-edicion')?.addEventListener('submit', guardarCambios);
}

function habilitarEdicion() {
    document.querySelectorAll('#formulario-edicion input:not([type="hidden"])').forEach(input => {
        if (input.id !== 'matricula') {
            input.removeAttribute('disabled');
            input.style.backgroundColor = '#fff';
            input.style.border = '1px solid #A02142';
        }
    });

    document.getElementById('btn-guardar').style.display = 'inline-block';
    document.getElementById('btn-cancelar').style.display = 'inline-block';
    document.getElementById('btn-editar').style.display = 'none';
}

function cancelarEdicion() {
    document.getElementById('nombre').value = datosOriginales.vchnombre || '';
    document.getElementById('apaterno').value = datosOriginales.vchapaterno || '';
    document.getElementById('amaterno').value = datosOriginales.vchamaterno || '';
    document.getElementById('telefono').value = datosOriginales.vchtelefono || '';
    document.getElementById('correo').value = datosOriginales.vchcorreo || '';
    document.getElementById('calle').value = datosOriginales.vchcalle || '';
    document.getElementById('colonia').value = datosOriginales.vchcolonia || '';
    document.getElementById('password').value = '';

    document.querySelectorAll('#formulario-edicion input:not([type="hidden"])').forEach(input => {
        if (input.id !== 'matricula') {
            input.setAttribute('disabled', 'disabled');
            input.style.backgroundColor = '';
            input.style.border = '';
        }
    });

    document.getElementById('btn-guardar').style.display = 'none';
    document.getElementById('btn-cancelar').style.display = 'none';
    document.getElementById('btn-editar').style.display = 'inline-block';
}

// Guardar cambios
async function guardarCambios(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();

    if (!nombre || !correo) {
        alert('Por favor, complete los campos requeridos (Nombre y Correo)');
        return;
    }

    if (!confirm('¿Guardar los cambios realizados en tu perfil?')) return;

    const datos = {
        vchnombre: nombre,
        vchapaterno: document.getElementById('apaterno').value.trim(),
        vchamaterno: document.getElementById('amaterno').value.trim(),
        vchtelefono: document.getElementById('telefono').value.trim(),
        vchcorreo: correo,
        vchcalle: document.getElementById('calle').value.trim(),
        vchcolonia: document.getElementById('colonia').value.trim(),
        vchpassword: document.getElementById('password').value.trim()
    };

    const btnGuardar = document.getElementById('btn-guardar');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.innerHTML = 'Guardando...';
    btnGuardar.disabled = true;

    try {
        // ✅ fetchConToken en lugar de fetch
        const response = await fetchConToken('/api/auth/perfil', {
            method: 'PUT',
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            alert(data.mensaje);

            // ✅ Actualizar nombre en localStorage si cambió
            const usuarioGuardado = obtenerUsuario();
            if (usuarioGuardado) {
                usuarioGuardado.nombre = nombre;
                localStorage.setItem('usuario', JSON.stringify(usuarioGuardado));
            }

            await cargarPerfil();
            cancelarEdicion();
        } else {
            alert('Error: ' + data.mensaje);
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error de conexión.');
        btnGuardar.innerHTML = textoOriginal;
        btnGuardar.disabled = false;
    }
}