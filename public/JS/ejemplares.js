// ejemplares.js
// Gestión completa de ejemplares de un libro.
// Lee ?folio= de la URL, carga el libro padre, los catálogos de estado/ubicación
// y la lista de ejemplares. Permite añadir, editar y eliminar.

let folioActual = '';
let modoEdicionEjemplar = false;

document.addEventListener('DOMContentLoaded', async () => {
    const usuario = await protegerPagina([1, 2]);
    if (!usuario) return;

    const params = new URLSearchParams(window.location.search);
    folioActual  = params.get('folio');

    if (!folioActual) {
        alert('No se especificó un libro.');
        window.location.href = obtenerRuta('/HTML/listado_libros.html');
        return;
    }

    // Cargar en paralelo
    await Promise.all([
        cargarInfoLibro(),
        cargarEstados(),
        cargarUbicaciones()
    ]);

    await cargarEjemplares();

    document.getElementById('formEjemplar').addEventListener('submit', manejarEnvioEjemplar);
});

// ─────────────────────────────────────────
// CARGA DATOS PADRE
// ─────────────────────────────────────────
async function cargarInfoLibro() {
    try {
        const res  = await fetch(`${CONFIG.BASE_URL}/api/libros/detalle?folio=${encodeURIComponent(folioActual)}`);
        const data = await res.json();
        if (!data.success || !data.data) throw new Error('No encontrado');

        document.getElementById('tituloLibro').textContent = data.data.vchtitulo || 'Sin título';
        document.getElementById('folioLibro').textContent  = `Folio: ${folioActual}`;
    } catch {
        document.getElementById('tituloLibro').textContent = 'Libro no encontrado';
    }
    document.getElementById('vchfolio').value = folioActual;
}

async function cargarEstados() {
    try {
        const res  = await fetchConToken('/api/libros/estados');
        const data = await res.json();
        if (!data.success) return;
        const select = document.getElementById('intidestado');
        data.data.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.intidestado;
            opt.textContent = e.vchestadolibro;
            select.appendChild(opt);
        });
    } catch (err) {
        console.warn('No se pudieron cargar estados:', err.message);
    }
}

async function cargarUbicaciones() {
    try {
        const res  = await fetchConToken('/api/libros/ubicaciones');
        const data = await res.json();
        if (!data.success) return;
        const select = document.getElementById('intidubicacion');
        data.data.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.intidubicacion;
            opt.textContent = u.vchubicacion;
            select.appendChild(opt);
        });
    } catch (err) {
        console.warn('No se pudieron cargar ubicaciones:', err.message);
    }
}

// ─────────────────────────────────────────
// LISTADO DE EJEMPLARES
// ─────────────────────────────────────────
async function cargarEjemplares() {
    const tbody = document.getElementById('tablaEjemplares');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#718096;">Cargando...</td></tr>`;

    try {
        const res  = await fetchConToken(`/api/libros/${encodeURIComponent(folioActual)}/ejemplares`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error || 'Error al obtener ejemplares');

        const lista = data.data || [];

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#718096;">
                Este libro aún no tiene ejemplares registrados.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = lista.map(ej => {
            const disp = ej.booldisponible
                ? `<span class="badge-disponible">Sí</span>`
                : `<span class="badge-no-disponible">No</span>`;

            return `
            <tr>
                <td>${ej.intidejemplar}</td>
                <td>${escapeHtml(ej.vchcodigobarras || '')}</td>
                <td>${escapeHtml(ej.vchedicion || '')}</td>
                <td>${escapeHtml(ej.vchestadolibro || 'N/A')}</td>
                <td>${escapeHtml(ej.vchubicacion   || 'N/A')}</td>
                <td>${disp}</td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="prepararEdicion(${ej.intidejemplar})">Editar</button>
                        <button class="delete-btn" onclick="confirmarEliminarEjemplar(${ej.intidejemplar})">Eliminar</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#e53e3e;padding:20px;">
            Error al cargar ejemplares: ${escapeHtml(error.message)}
        </td></tr>`;
    }
}

// ─────────────────────────────────────────
// GUARDAR / ACTUALIZAR EJEMPLAR
// ─────────────────────────────────────────
async function manejarEnvioEjemplar(e) {
    e.preventDefault();
    ocultarMensaje();

    const btn = document.getElementById('btnGuardar');
    btn.disabled    = true;
    btn.textContent = 'Guardando...';

    const body = {
        vchfolio:        folioActual,
        vchcodigobarras: document.getElementById('vchcodigobarras').value.trim(),
        vchedicion:      document.getElementById('vchedicion').value.trim(),
        intidestado:     parseInt(document.getElementById('intidestado').value),
        intidubicacion:  parseInt(document.getElementById('intidubicacion').value),
        booldisponible:  document.getElementById('booldisponible').checked ? 1 : 0
    };

    const idEjemplar = document.getElementById('intidejemplar').value;
    const method     = modoEdicionEjemplar ? 'PUT'  : 'POST';
    const url        = modoEdicionEjemplar
        ? `${CONFIG.BASE_URL}/api/libros/ejemplares/${idEjemplar}`
        : `${CONFIG.BASE_URL}/api/libros/${encodeURIComponent(folioActual)}/ejemplares`;

    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(url, {
            method,
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
            mostrarMensaje(
                modoEdicionEjemplar ? '¡Ejemplar actualizado!' : '¡Ejemplar añadido!',
                'ok'
            );
            limpiarFormulario();
            await cargarEjemplares();
        } else {
            throw new Error(data.error || data.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error: ' + error.message, 'err');
    } finally {
        btn.disabled = false;
        btn.textContent = modoEdicionEjemplar ? 'Actualizar Ejemplar' : 'Añadir Ejemplar';
    }
}

// ─────────────────────────────────────────
// EDITAR EJEMPLAR
// ─────────────────────────────────────────
async function prepararEdicion(idEjemplar) {
    try {
        const res  = await fetchConToken(`/api/libros/ejemplares/${idEjemplar}`);
        const data = await res.json();

        if (!data.success || !data.data) throw new Error('No encontrado');

        const ej = data.data;
        document.getElementById('intidejemplar').value    = ej.intidejemplar;
        document.getElementById('vchcodigobarras').value  = ej.vchcodigobarras || '';
        document.getElementById('vchedicion').value       = ej.vchedicion      || '';
        document.getElementById('intidestado').value      = ej.intidestado     || '';
        document.getElementById('intidubicacion').value   = ej.intidubicacion  || '';
        document.getElementById('booldisponible').checked = !!ej.booldisponible;

        modoEdicionEjemplar = true;
        document.getElementById('tituloFormEjemplar').textContent = 'Editar Ejemplar';
        document.getElementById('btnGuardar').textContent         = 'Actualizar Ejemplar';
        document.getElementById('btnCancelarEdicion').style.display = 'inline-block';

        // Scroll al formulario
        document.getElementById('formEjemplar').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        alert('Error al cargar el ejemplar: ' + error.message);
    }
}

function cancelarEdicion() {
    limpiarFormulario();
}

function limpiarFormulario() {
    document.getElementById('formEjemplar').reset();
    document.getElementById('intidejemplar').value = '';
    document.getElementById('vchfolio').value      = folioActual;
    modoEdicionEjemplar = false;
    document.getElementById('tituloFormEjemplar').textContent     = 'Añadir Nuevo Ejemplar';
    document.getElementById('btnGuardar').textContent             = 'Añadir Ejemplar';
    document.getElementById('btnCancelarEdicion').style.display   = 'none';
    ocultarMensaje();
}

// ─────────────────────────────────────────
// ELIMINAR EJEMPLAR
// ─────────────────────────────────────────
async function confirmarEliminarEjemplar(idEjemplar) {
    if (!confirm(`¿Eliminar el ejemplar #${idEjemplar}?\nEsta acción no se puede deshacer.`)) return;

    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${CONFIG.BASE_URL}/api/libros/ejemplares/${idEjemplar}`, {
            method:  'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            await cargarEjemplares();
            alert('Ejemplar eliminado correctamente.');
        } else {
            throw new Error(data.error || data.message || 'Error al eliminar');
        }
    } catch (error) {
        alert('Error al eliminar: ' + error.message);
    }
}

// ─────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────
function mostrarMensaje(texto, tipo) {
    const el = document.getElementById('msgResultado');
    el.textContent   = texto;
    el.className     = tipo;
    el.style.display = 'block';
}

function ocultarMensaje() {
    document.getElementById('msgResultado').style.display = 'none';
}

// Exponer funciones llamadas desde el HTML
window.prepararEdicion           = prepararEdicion;
window.cancelarEdicion           = cancelarEdicion;
window.confirmarEliminarEjemplar = confirmarEliminarEjemplar;
