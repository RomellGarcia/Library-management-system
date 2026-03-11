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
        // Assuming you fetch all users (combined or per-table). Adjust endpoint if needed.
        const resUsuarios = await fetchConToken('/api/auth/usuarios/todos'); // Or separate fetches for each TABLAS_PERMITIDAS
        const resRoles = await fetchConToken('/api/auth/roles');

        if (!resUsuarios.ok || !resRoles.ok) throw new Error('Error fetching data');

        const dataUsuarios = await resUsuarios.json();
        const dataRoles = await resRoles.json();

        renderizarTabla(dataUsuarios.data || [], dataRoles.data || []);

        const usuarios = dataUsuarios.data || []; // Array of all users
        const roles = dataRoles.data || []; // Array of roles

        const tablaBody = document.querySelector('#tabla-usuarios tbody'); // Adjust selector to your table
        tablaBody.innerHTML = ''; // Clear existing rows

        usuarios.forEach(usuario => {
            const rolUsuario = roles.find(r => r.intidrol == usuario.intidrol);
            const tipoUsuario = rolUsuario ? rolUsuario.vchrol.toUpperCase() : 'DESCONOCIDO'; // Use vchrol here!

            const row = document.createElement('tr');
            row.innerHTML = `
                    <td>${usuario.intmatricula}</td>
                    <td>${usuario.vchnombre} ${usuario.vchapaterno} ${usuario.vchamaterno || ''}</td>
                    <td>${usuario.vchcorreo}</td>
                    <td>${usuario.vchtelefono}</td>
                    <td>${usuario.vchcalle}, ${usuario.vchcolonia}</td>
                    <td><span class="badge badge-$$   {tipoUsuario.toLowerCase()}">   $${tipoUsuario}</span></td> // Dynamic based on vchrol
                    <td>
                        <button onclick="editar($$   {usuario.intmatricula}, '   $${usuario.tabla || 'tblusuarios'}')">Editar</button> // Pass tabla if needed
                        <button onclick="eliminar($$   {usuario.intmatricula}, '   $${usuario.tabla || 'tblusuarios'}')">Eliminar</button>
                    </td>
                `;
            tablaBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        // Show error message
    }
}

// Call this on page load and after any success redirect
document.addEventListener('DOMContentLoaded', () => {
    // ... other init
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

    if (usuarios.length === 0) {
        tabla.style.display = 'none';
        noResult.style.display = 'block';
        contador.textContent = '0 resultado(s)';
        return;
    }

    usuarios.forEach(u => {
        // BUSCA EL NOMBRE DEL ROL BASADO EN EL ID
        const rolEncontrado = roles.find(r => r.intidrol == u.intidrol);
        const nombreTipo = rolEncontrado ? rolEncontrado.vchrol : 'Usuario';
        const tipoClase = nombreTipo.toLowerCase();
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
                    <a href="/HTML/editar_usuario.html?matricula=${u.intmatricula}&tabla=${u.tabla_origen}"
                    class="btn-accion btn-editar">Editar</a>
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