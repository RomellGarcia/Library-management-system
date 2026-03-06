//Editar información de un usuario
document.addEventListener('DOMContentLoaded', function() {
    protegerPagina([1]).then(usuario => {
        if (!usuario) return;
        cargarDatosUsuario();
        configurarFormulario();
    });
});

// Tablas permitidas
const TABLAS_PERMITIDAS = ['tblusuarios', 'tbladministrador', 'tblempleados'];

// OBTENER PARÁMETROS DE URL
function obtenerParams() {
    const params    = new URLSearchParams(window.location.search);
    const matricula = parseInt(params.get('matricula')) || 0;
    const tabla     = params.get('tabla') || '';
    return { matricula, tabla };
}

// CARGAR DATOS DEL USUARIO Y ROLES
async function cargarDatosUsuario() {
    const { matricula, tabla } = obtenerParams();

    if (!TABLAS_PERMITIDAS.includes(tabla) || !matricula) {
        window.location.href = '/HTML/ListadoUsuarios.html?error=parametros_invalidos';
        return;
    }

    try {
        const [resUsuario, resRoles] = await Promise.all([
            fetch(`/api/auth/usuarios/${matricula}?tabla=${tabla}`, { credentials: 'include' }),
            fetch('/api/auth/roles', { credentials: 'include' }),
        ]);

        if (!resUsuario.ok) throw new Error('Usuario no encontrado');

        const dataUsuario = await resUsuario.json();
        const dataRoles   = resRoles.ok ? await resRoles.json() : { data: [] };

        if (!dataUsuario.success) {
            window.location.href = '/HTML/ListadoUsuarios.html?error=no_encontrado';
            return;
        }

        renderizarFormulario(dataUsuario.data, dataRoles.data || []);

    } catch (error) {
        console.error('Error al cargar usuario:', error);
        window.location.href = '/HTML/ListadoUsuarios.html?error=consulta';
    }
}

// RENDERIZAR FORMULARIO CON LOS DATOS
function renderizarFormulario(usuario, roles) {
    const { tabla } = obtenerParams();

    // Título y badge
    const tituloEl = document.getElementById('titulo-usuario');
    const badgeEl  = document.getElementById('badge-tipo');

    const rolUsuario  = roles.find(r => r.intidrol == usuario.intidrol);
    const tipoUsuario = rolUsuario ? rolUsuario.vchrol : '';

    if (tituloEl) tituloEl.textContent = `Información de ${usuario.vchnombre} ${usuario.vchapaterno}`;
    if (badgeEl) {
        badgeEl.textContent = tipoUsuario;
        badgeEl.className   = `badge-tipo badge-${tipoUsuario.toLowerCase()}`;
    }

    // Campos ocultos
    document.getElementById('matricula_original').value = usuario.intmatricula;
    document.getElementById('tabla').value              = tabla;

    // Datos personales
    document.getElementById('intmatricula').value = usuario.intmatricula;
    document.getElementById('vchnombre').value    = usuario.vchnombre    || '';
    document.getElementById('vchapaterno').value  = usuario.vchapaterno  || '';
    document.getElementById('vchamaterno').value  = usuario.vchamaterno  || '';

    // Contacto
    document.getElementById('vchtelefono').value = usuario.vchtelefono || '';
    document.getElementById('vchcorreo').value   = usuario.vchcorreo   || '';

    // Dirección
    document.getElementById('vchcalle').value   = usuario.vchcalle   || '';
    document.getElementById('vchcolonia').value = usuario.vchcolonia || '';

    // Select de roles
    const selectRol = document.getElementById('intidrol');
    selectRol.innerHTML = '';
    roles.forEach(rol => {
        const option       = document.createElement('option');
        option.value       = rol.intidrol;
        option.textContent = rol.vchrol;
        if (rol.intidrol == usuario.intidrol) option.selected = true;
        selectRol.appendChild(option);
    });
}

// CONFIGURAR FORMULARIO Y VALIDACIONES

function configurarFormulario() {
    const form = document.getElementById('form-edicion');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const passwordNueva     = document.getElementById('password_nueva').value;
        const passwordConfirmar = document.getElementById('password_confirmar').value;

        if (passwordNueva !== '' || passwordConfirmar !== '') {
            if (passwordNueva !== passwordConfirmar) {
                alert('Las contraseñas no coinciden');
                return;
            }
            if (passwordNueva.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres');
                return;
            }
        }

        await guardarCambios();
    });
}

// GUARDAR CAMBIOS
async function guardarCambios() {
    const datos = {
        matricula_original: document.getElementById('matricula_original').value,
        tabla:              document.getElementById('tabla').value,
        intmatricula:       document.getElementById('intmatricula').value,
        intidrol:           document.getElementById('intidrol').value,
        vchnombre:          document.getElementById('vchnombre').value,
        vchapaterno:        document.getElementById('vchapaterno').value,
        vchamaterno:        document.getElementById('vchamaterno').value,
        vchtelefono:        document.getElementById('vchtelefono').value,
        vchcorreo:          document.getElementById('vchcorreo').value,
        vchcalle:           document.getElementById('vchcalle').value,
        vchcolonia:         document.getElementById('vchcolonia').value,
        password_nueva:     document.getElementById('password_nueva').value,
    };

    try {
        const response = await fetch('/api/auth/usuarios/actualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(datos),
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = '/HTML/ListadoUsuarios.html?success=1&mensaje=' +
                encodeURIComponent('Usuario actualizado correctamente');
        } else {
            alert('Error: ' + (data.error || 'No se pudo guardar los cambios'));
        }

    } catch (error) {
        console.error('Error al guardar cambios:', error);
        alert('No se pudo conectar con el servidor.');
    }
}

// Exportar
window.guardarCambios = guardarCambios;