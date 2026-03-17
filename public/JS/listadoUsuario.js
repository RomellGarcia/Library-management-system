// listadoUsuario.js - Gestión de usuarios

document.addEventListener('DOMContentLoaded', function () {
    protegerPagina([1, 2]).then(usuario => {
        if (!usuario) return;

        // 1. Carga inicial (siempre que entras a la página)
        cargarUsuarios();
        configurarFiltros();
        configurarEliminar();

        // 2. Respaldo para cuando el usuario regresa desde 'editar_usuario'
        window.addEventListener('pageshow', function (event) {
            if (event.persisted) {
                cargarUsuarios();
            }
        });
    });
});

async function cargarUsuarios() {
   try {
        const resUsuarios = await fetchConToken('/api/auth/usuarios/todos');
        const data = await resUsuarios.json();
        
        if (!resUsuarios.ok) {
            throw new Error(data.error || 'Error al obtener datos');
        }

        renderizarTabla(data.data || [], data.roles || []);
    } catch (error) {
       console.error('Error capturado en cargarUsuarios:', error);
        mostrarError('No se pudieron cargar los datos.');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    cargarUsuarios();
});

// If you have a success param in URL, force reload or show message
const params = new URLSearchParams(window.location.search);
if (params.get('success') === '1') {
    alert(decodeURIComponent(params.get('mensaje') || 'Éxito'));
    cargarUsuarios(); // Redundant if already on load, but ensures fresh data
}
// ─────────────────────────────────────────
// RENDERIZAR TABLA
// ─────────────────────────────────────────
function renderizarTabla(usuarios, roles) {
    const tbody = document.getElementById('tbody-usuarios');
    const tabla = document.getElementById('tabla-usuarios');
    const noResult = document.getElementById('no-resultados');
    const contador = document.getElementById('contador-resultados');

    if (!tbody) return;

    tbody.innerHTML = '';

    // Manejo de caso vacío
    if (!usuarios || usuarios.length === 0) {
        tabla.style.display = 'none';
        noResult.style.display = 'block';
        contador.textContent = '0 resultado(s)';
        return;
    }

    // ÚNICO BUCLE PARA RENDERIZAR
    usuarios.forEach(u => {
        const nombreCompleto = `${u.vchnombre || ''} ${u.vchapaterno || ''} ${u.vchamaterno || ''}`.trim();
        const fila = document.createElement('tr');
        
        // Busca el rol (Asegúrate de que 'roles' contenga datos, si no, usa un valor por defecto)
        const rolEncontrado = (roles && roles.length > 0) ? roles.find(r => r.intidrol == u.intidrol) : null;
        const nombreTipo = rolEncontrado ? rolEncontrado.vchrol : 'Usuario';
        const tipoClase = nombreTipo.toLowerCase().trim();

        fila.dataset.matricula = u.intmatricula;
        fila.dataset.nombre = nombreCompleto.toLowerCase();
        fila.dataset.correo = (u.vchcorreo || '').toLowerCase();
        fila.dataset.telefono = (u.vchtelefono || '').toLowerCase();
        fila.dataset.tipo = tipoClase;

        fila.innerHTML = `
            <td><strong>${escapeHtml(String(u.intmatricula))}</strong></td>
            <td>${escapeHtml(nombreCompleto)}</td>
            <td>${escapeHtml(u.vchcorreo || '')}</td>
            <td>${escapeHtml(u.vchtelefono || '')}</td>
            <td>${escapeHtml((u.vchcalle || '') + ', ' + (u.vchcolonia || ''))}</td>
            <td><span class="badge-tipo badge-${tipoClase}">${escapeHtml(nombreTipo)}</span></td>
            <td class="acciones">
               <a href="${obtenerRuta('/HTML/editar_usuario.html?matricula=' + u.intmatricula + '&tabla=' + u.tabla_origen)}" class="btn-accion btn-editar">Editar</a>
                <button class="btn-accion btn-eliminar"
                        data-matricula="${u.intmatricula}"
                        data-tabla="${escapeHtml(u.tabla_origen || '')}"
                        data-nombre="${escapeHtml(nombreCompleto)}">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });

    tabla.style.display = 'table';
    noResult.style.display = 'none';
    contador.textContent = `${usuarios.length} resultado(s)`;
}

function configurarFiltros() {
    document.getElementById('busqueda')?.addEventListener('input', filtrarUsuarios);
    document.getElementById('filtro')?.addEventListener('change', filtrarUsuarios);
}

function filtrarUsuarios() {
    const tbody = document.getElementById('tbody-usuarios');
    const tabla = document.getElementById('tabla-usuarios');
    const noResult = document.getElementById('no-resultados');
    const contador = document.getElementById('contador-resultados');

    if (!tbody) return;

    const texto = document.getElementById('busqueda').value.toLowerCase().trim();
    const filtro = document.getElementById('filtro').value;
    const filas = tbody.querySelectorAll('tr');
    let visibles = 0;

    filas.forEach(fila => {
        const coincideBusqueda =
            texto === '' ||
            fila.dataset.matricula.includes(texto) ||
            fila.dataset.nombre.includes(texto) ||
            fila.dataset.correo.includes(texto) ||
            fila.dataset.telefono.includes(texto);

        const coincideFiltro =
            filtro === 'todos' ||
            (filtro === 'usuarios' && fila.dataset.tipo === 'usuario') ||
            (filtro === 'administradores' && fila.dataset.tipo === 'administrador') ||
            (filtro === 'empleados' && fila.dataset.tipo === 'empleado');

        const mostrar = coincideBusqueda && coincideFiltro;
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) visibles++;
    });

    contador.textContent = `${visibles} resultado(s)`;
    tabla.style.display = visibles > 0 ? 'table' : 'none';
    noResult.style.display = visibles === 0 ? 'block' : 'none';
}

function configurarEliminar() {
    const tbody = document.getElementById('tbody-usuarios');
    if (!tbody) return;

    tbody.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-eliminar');
        if (!btn) return;
        eliminarUsuario(btn.dataset.matricula, btn.dataset.tabla, btn.dataset.nombre);
    });
}

async function eliminarUsuario(matricula, tabla, nombre) {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;

    try {
        // fetchConToken con método DELETE
        const response = await fetchConToken(
            `/api/auth/usuarios/${matricula}?tabla=${tabla}`,
            { method: 'DELETE' }
        );

        const data = await response.json();

        if (data.success) {
            alert('Usuario eliminado correctamente.');
            cargarUsuarios();
        } else {
            alert('Error: ' + (data.error || 'No se pudo eliminar el usuario'));
        }
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        alert('No se pudo conectar con el servidor.');
    }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function mostrarError(mensaje) {
    const tbody = document.getElementById('tbody-usuarios');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#e53e3e;">${mensaje}</td></tr>`;
    }
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

window.cargarUsuarios = cargarUsuarios;
window.filtrarUsuarios = filtrarUsuarios;
window.eliminarUsuario = eliminarUsuario;