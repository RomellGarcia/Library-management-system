// perfil.js - Gestión de perfil de usuario

let datosOriginales = {}; // Para cancelar cambios

document.addEventListener('DOMContentLoaded', function() {
    cargarPerfil();
    configurarEventos();
});

// Cargar datos del perfil
async function cargarPerfil() {
    try {
        const response = await fetch(`${window.location.origin}/api/auth/perfil`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            mostrarDatosPerfil(data.usuario);
        } else {
            alert('Error al cargar perfil: ' + data.error);
            window.location.href = '/HTML/index.html';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al cargar perfil');
        window.location.href = '/HTML/index.html';
    }
}

// Mostrar datos en el formulario
function mostrarDatosPerfil(usuario) {
    // Guardar datos originales para poder cancelar
    datosOriginales = { ...usuario };

    // Llenar formulario
    document.getElementById('matricula').value = usuario.intmatricula || '';
    document.getElementById('nombre').value = usuario.vchnombre || '';
    document.getElementById('apaterno').value = usuario.vchapaterno || '';
    document.getElementById('amaterno').value = usuario.vchamaterno || '';
    document.getElementById('telefono').value = usuario.vchtelefono || '';
    document.getElementById('correo').value = usuario.vchcorreo || '';
    document.getElementById('calle').value = usuario.vchcalle || '';
    document.getElementById('colonia').value = usuario.vchcolonia || '';

    // Ocultar loading y mostrar formulario
    document.getElementById('loading-perfil').style.display = 'none';
    document.getElementById('formulario-edicion').style.display = 'block';
}

// Configurar eventos
function configurarEventos() {
    // Botón editar
    const btnEditar = document.getElementById('btn-editar');
    if (btnEditar) {
        btnEditar.addEventListener('click', habilitarEdicion);
    }

    // Botón cancelar
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicion);
    }

    // Submit del formulario
    const form = document.getElementById('formulario-edicion');
    if (form) {
        form.addEventListener('submit', guardarCambios);
    }
}

// Habilitar edición
function habilitarEdicion() {
    const inputs = document.querySelectorAll('#formulario-edicion input:not([type="hidden"])');
    
    inputs.forEach(input => {
        // No permitimos editar la matrícula
        if (input.id !== 'matricula') {
            input.removeAttribute('disabled');
            input.style.backgroundColor = '#fff';
            input.style.border = '1px solid #A02142';
        }
    });

    // Mostrar/ocultar botones
    document.getElementById('btn-guardar').style.display = 'inline-block';
    document.getElementById('btn-cancelar').style.display = 'inline-block';
    document.getElementById('btn-editar').style.display = 'none';
}

// Cancelar edición
function cancelarEdicion() {
    // Restaurar valores originales
    document.getElementById('nombre').value = datosOriginales.vchnombre || '';
    document.getElementById('apaterno').value = datosOriginales.vchapaterno || '';
    document.getElementById('amaterno').value = datosOriginales.vchamaterno || '';
    document.getElementById('telefono').value = datosOriginales.vchtelefono || '';
    document.getElementById('correo').value = datosOriginales.vchcorreo || '';
    document.getElementById('calle').value = datosOriginales.vchcalle || '';
    document.getElementById('colonia').value = datosOriginales.vchcolonia || '';
    document.getElementById('password').value = '';

    // Deshabilitar inputs
    const inputs = document.querySelectorAll('#formulario-edicion input:not([type="hidden"])');
    inputs.forEach(input => {
        if (input.id !== 'matricula') {
            input.setAttribute('disabled', 'disabled');
            input.style.backgroundColor = '';
            input.style.border = '';
        }
    });

    // Mostrar/ocultar botones
    document.getElementById('btn-guardar').style.display = 'none';
    document.getElementById('btn-cancelar').style.display = 'none';
    document.getElementById('btn-editar').style.display = 'inline-block';
}

// Guardar cambios
async function guardarCambios(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();

    // Validaciones
    if (!nombre || !correo) {
        alert('Por favor, complete los campos requeridos (Nombre y Correo)');
        return;
    }

    // Confirmación
    if (!confirm('¿Guardar los cambios realizados en tu perfil?')) {
        return;
    }

    // Preparar datos
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
        const response = await fetch(`${window.location.origin}/api/auth/perfil`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            alert(data.mensaje);
            
            // Recargar perfil para ver cambios
            await cargarPerfil();
            
            // Deshabilitar edición
            cancelarEdicion();
        } else {
            alert('Error: ' + data.mensaje);
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error de conexión. Revisa la consola para más detalles.');
        btnGuardar.innerHTML = textoOriginal;
        btnGuardar.disabled = false;
    }
}