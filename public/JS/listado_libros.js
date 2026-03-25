// listado_libros.js
// Carga el listado de libros desde la API, con búsqueda en cliente y paginación.

const LIBROS_POR_PAGINA = 20;
let todosLosLibros = [];
let librosFiltrados = [];
let paginaActual = 1;

document.addEventListener('DOMContentLoaded', async () => {
    // Solo admins (1) y empleados (2)
    const usuario = await protegerPagina([1, 2]);
    if (!usuario) return;

    await cargarLibros();

    document.getElementById('buscadorLibros').addEventListener('input', function () {
        const termino = this.value.toLowerCase().trim();
        librosFiltrados = termino
            ? todosLosLibros.filter(l =>
                l.vchtitulo?.toLowerCase().includes(termino) ||
                l.vchautor?.toLowerCase().includes(termino) ||
                l.vchfolio?.toLowerCase().includes(termino)
              )
            : [...todosLosLibros];
        paginaActual = 1;
        renderTabla();
    });
});

async function cargarLibros() {
    try {
        const res = await fetchConToken('/api/libros');
        const data = await res.json();

        if (!data.success) throw new Error(data.error || 'Error al cargar libros');

        todosLosLibros  = data.data || [];
        librosFiltrados = [...todosLosLibros];
        renderTabla();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('tablaLibros').innerHTML =
            `<tr><td colspan="6" style="text-align:center;color:#e53e3e;padding:30px;">
                Error al cargar los libros: ${escapeHtml(error.message)}
             </td></tr>`;
    }
}

function renderTabla() {
    const tbody = document.getElementById('tablaLibros');
    const totalPaginas = Math.ceil(librosFiltrados.length / LIBROS_POR_PAGINA);
    const inicio = (paginaActual - 1) * LIBROS_POR_PAGINA;
    const fin    = inicio + LIBROS_POR_PAGINA;
    const pagina = librosFiltrados.slice(inicio, fin);

    if (pagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#718096;">
            No se encontraron libros.
        </td></tr>`;
        document.getElementById('paginacion').style.display = 'none';
        return;
    }

    tbody.innerHTML = pagina.map(libro => {
        const detalleUrl = `${obtenerRuta('/HTML/detalle_libro.html')}?folio=${encodeURIComponent(libro.vchfolio)}`;

        const imgHtml = libro.imagen
            ? `<a href="${detalleUrl}"><img src="${libro.imagen}" alt="Portada" class="libro-thumb" style="cursor:pointer;"></a>`
            : `<div class="thumb-placeholder">Sin img</div>`;

        const folio  = escapeHtml(libro.vchfolio      || '');
        const titulo = escapeHtml(libro.vchtitulo     || '');
        const autor  = escapeHtml(libro.vchautor      || '');
        const cat    = escapeHtml(libro.vchcategoria  || 'N/A');

        return `
        <tr>
            <td style="text-align:center;">${imgHtml}</td>
            <td>${folio}</td>
            <td>
                <a href="${detalleUrl}" style="color:#A02142; font-weight:600; text-decoration:none;"
                   onmouseover="this.style.textDecoration='underline'"
                   onmouseout="this.style.textDecoration='none'">
                    ${titulo}
                </a>
            </td>
            <td>${autor}</td>
            <td>${cat}</td>
            <td>
                <div class="action-buttons">
                    <a href="${obtenerRuta('/HTML/registrar_libro.html')}?folio=${encodeURIComponent(libro.vchfolio)}" class="edit-btn">Editar</a>
                    <a href="${obtenerRuta('/HTML/ejemplares.html')}?folio=${encodeURIComponent(libro.vchfolio)}" class="manage-ejemplares-btn">Ejemplares</a>
                    <button class="delete-btn" onclick="confirmarEliminar('${escapeHtml(libro.vchfolio)}', '${titulo.replace(/'/g,"\\'")}')">Eliminar</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Paginación
    const paginacionEl = document.getElementById('paginacion');
    if (totalPaginas > 1) {
        paginacionEl.style.display = 'flex';
        document.getElementById('infoPagina').textContent =
            `Página ${paginaActual} de ${totalPaginas} (${librosFiltrados.length} libros)`;
        document.getElementById('btnAnterior').disabled = paginaActual <= 1;
        document.getElementById('btnSiguiente').disabled = paginaActual >= totalPaginas;
    } else {
        paginacionEl.style.display = 'none';
    }
}

function cambiarPagina(delta) {
    const totalPaginas = Math.ceil(librosFiltrados.length / LIBROS_POR_PAGINA);
    paginaActual = Math.max(1, Math.min(totalPaginas, paginaActual + delta));
    renderTabla();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function confirmarEliminar(folio, titulo) {
    if (!confirm(`¿Eliminar el libro "${titulo}" y TODOS sus ejemplares?\nEsta acción no se puede deshacer.`)) return;

    try {
        const res = await fetchConToken(`/api/libros/${encodeURIComponent(folio)}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            // Quitar del array local y re-renderizar
            todosLosLibros  = todosLosLibros.filter(l => l.vchfolio !== folio);
            librosFiltrados = librosFiltrados.filter(l => l.vchfolio !== folio);
            if ((paginaActual - 1) * LIBROS_POR_PAGINA >= librosFiltrados.length && paginaActual > 1) {
                paginaActual--;
            }
            renderTabla();
            alert('Libro eliminado correctamente.');
        } else {
            throw new Error(data.error || data.message || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el libro: ' + error.message);
    }
}

// Exponer cambiarPagina al onclick del HTML
window.cambiarPagina   = cambiarPagina;
window.confirmarEliminar = confirmarEliminar;
