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
        // fetchConToken en las 3 peticiones
        const [resUsuarios, resAdmins, resEmpleados] = await Promise.all([
            fetchConToken('/api/auth/usuarios'),
            fetchConToken('/api/auth/administradores'),
            fetchConToken('/api/auth/empleados'),
        ]);

        const dataUsuarios = resUsuarios.ok ? await resUsuarios.json() : { data: [] };
        const dataAdmins = resAdmins.ok ? await resAdmins.json() : { data: [] };
        const dataEmpleados = resEmpleados.ok ? await resEmpleados.json() : { data: [] };

        const todos = [
            ...(dataUsuarios.data || []),
            ...(dataAdmins.data || []),
            ...(dataEmpleados.data || []),
        ];

        renderizarTabla(todos);

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        mostrarError('No se pudo conectar con el servidor');
    }
}

// ─────────────────────────────────────────
// RENDERIZAR TABLA
// ─────────────────────────────────────────
function renderizarTabla(usuarios) {
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
        const nombreCompleto = `${u.vchnombre} ${u.vchapaterno} ${u.vchamaterno}`.trim();
        const tipo = (u.tipo_usuario || '').toLowerCase();

        const fila = document.createElement('tr');
        fila.dataset.matricula = u.intmatricula;
        fila.dataset.nombre = nombreCompleto.toLowerCase();
        fila.dataset.correo = (u.vchcorreo || '').toLowerCase();
        fila.dataset.telefono = (u.vchtelefono || '').toLowerCase();
        fila.dataset.tipo = tipo;

        fila.innerHTML = `
            <td><strong>${escapeHtml(String(u.intmatricula))}</strong></td>
            <td>${escapeHtml(nombreCompleto)}</td>
            <td>${escapeHtml(u.vchcorreo || '')}</td>
            <td>${escapeHtml(u.vchtelefono || '')}</td>
            <td>${escapeHtml((u.vchcalle || '') + ', ' + (u.vchcolonia || ''))}</td>
            <td><span class="badge-tipo badge-${tipo}">${escapeHtml(u.tipo_usuario || '')}</span></td>
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