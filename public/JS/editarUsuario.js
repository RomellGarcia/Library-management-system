// editarUsuario.js - Editar información de un usuario

document.addEventListener('DOMContentLoaded', function() {
    protegerPagina([1]).then(usuario => {
        if (!usuario) return;
        cargarDatosUsuario();
        configurarFormulario();
    });
});

const TABLAS_PERMITIDAS = ['tblusuarios', 'tbladministrador', 'tblempleados'];

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
        window.location.href = obtenerRuta('/HTML/gestion_usuarios.html?error=parametros_invalidos');
        return;
    }

    try {
        // fetchConToken en ambas peticiones
        const [resUsuario, resRoles] = await Promise.all([
            fetchConToken(`/api/auth/usuarios/${matricula}?tabla=${tabla}`),
            fetchConToken('/api/auth/roles'),
        ]);

        if (!resUsuario.ok) throw new Error('Usuario no encontrado');

        const dataUsuario = await resUsuario.json();
        const dataRoles   = resRoles.ok ? await resRoles.json() : { data: [] };

        if (!dataUsuario.success) {
            window.location.href = obtenerRuta('/HTML/gestion_usuarios.html?error=no_encontrado');
            return;
        }

        renderizarFormulario(dataUsuario.data, dataRoles.data || []);

    } catch (error) {
        console.error('Error al cargar usuario:', error);
        window.location.href = obtenerRuta('/HTML/gestion_usuarios.html?error=consulta');
    }
}

// RENDERIZAR FORMULARIO
function renderizarFormulario(usuario, roles) {
    const { tabla } = obtenerParams();

    const rolUsuario  = roles.find(r => r.intidrol == usuario.intidrol);
    const tipoUsuario = rolUsuario ? rolUsuario.vchrol : '';

    const tituloEl = document.getElementById('titulo-usuario');
    const badgeEl  = document.getElementById('badge-tipo');

    if (tituloEl) tituloEl.textContent = `Información de ${usuario.vchnombre} ${usuario.vchapaterno}`;
    if (badgeEl) {
        badgeEl.textContent = tipoUsuario;
        badgeEl.className   = `badge-tipo badge-${tipoUsuario.toLowerCase()}`;
    }

    document.getElementById('matricula_original').value = usuario.intmatricula;
    document.getElementById('tabla').value              = tabla;
    document.getElementById('intmatricula').value       = usuario.intmatricula;
    document.getElementById('vchnombre').value          = usuario.vchnombre    || '';
    document.getElementById('vchapaterno').value        = usuario.vchapaterno  || '';
    document.getElementById('vchamaterno').value        = usuario.vchamaterno  || '';
    document.getElementById('vchtelefono').value        = usuario.vchtelefono  || '';
    document.getElementById('vchcorreo').value          = usuario.vchcorreo    || '';
    document.getElementById('vchcalle').value           = usuario.vchcalle     || '';
    document.getElementById('vchcolonia').value         = usuario.vchcolonia   || '';

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

// CONFIGURAR FORMULARIO
function configurarFormulario() {
    const form = document.getElementById('form-edicion');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // --- INICIO DE LA ALERTA DE CONFIRMACIÓN ---
        const confirmado = confirm("¿Estás seguro de que deseas guardar los cambios realizados?");
        if (!confirmado) {
            return; // Si el usuario presiona "Cancelar", no hacemos nada
        }
        // --- FIN DE LA ALERTA ---

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
        // fetchConToken
        const response = await fetchConToken('/api/auth/usuarios/actualizar', {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = obtenerRuta('/HTML/gestion_usuarios.html?success=1&mensaje=') +
                encodeURIComponent('Usuario actualizado correctamente');
        } else {
            alert('Error: ' + (data.error || 'No se pudo guardar los cambios'));
        }
    } catch (error) {
        console.error('Error al guardar cambios:', error);
        alert('No se pudo conectar con el servidor.');
    }
}

window.guardarCambios = guardarCambios;