// categoria.js - Mostrar libros de una categoría específica
// Página PÚBLICA — sin cambios respecto al original
let librosOriginales = [];

document.addEventListener('DOMContentLoaded', function () {
    cargarCategoria();
    configurarBuscador();
});
async function cargarCategoria() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoriaId = urlParams.get('id');

    if (!categoriaId) {
        mostrarError('No se especificó una categoría');
        return;
    }

    try {
        // CAMBIA ESTA LÍNEA:
        // Usa CONFIG.BASE_URL en lugar de window.location.origin
        const response = await fetch(`${CONFIG.BASE_URL}/api/libros/categoria/${categoriaId}`);

        if (!response.ok) {
            throw new Error('Categoría no encontrada');
        }

        const data = await response.json();
        // ... el resto sigue igual

        if (data.success) {
            mostrarCategoria(data.data);
        } else {
            mostrarError(data.error || 'Error al cargar la categoría');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message);
    }
}

function mostrarCategoria(datos) {
    const { categoria, libros } = datos;

    librosOriginales = libros;

    document.title = `${categoria.nombre} - Biblioteca UTHH`;

    const headerContainer = document.getElementById('categoriaHeader');
    headerContainer.innerHTML = `
        <h1>📚 ${escapeHtml(categoria.nombre)}</h1>
        ${categoria.descripcion ? `<p>${escapeHtml(categoria.descripcion)}</p>` : ''}
    `;

    actualizarContador(libros.length);
    mostrarLibros(libros);
}

function mostrarLibros(libros) {
    const container = document.getElementById('librosGrid');

    if (libros.length === 0) {
        container.innerHTML = `
            <div class="sin-libros" style="grid-column: 1 / -1;">
                <div class="sin-libros-icono"></div>
                <h2>No hay libros en esta categoría</h2>
                <p class="sin-libros-texto">Por favor, explora otras categorías o vuelve más tarde.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    libros.forEach(libro => {
        const card = crearTarjetaLibro(libro);
        container.appendChild(card);
    });
}

function crearTarjetaLibro(libro) {
    const ejemplaresDisponibles = libro.ejemplares_disponibles || 0;
    const totalEjemplares = libro.total_ejemplares || 0;
    const esActivo = libro.boolactivo;

    let claseEstado = '';
    let textoEtiqueta = '';
    let claseEtiquetaExtra = '';

    if (esActivo == 0) {
        claseEstado = 'libro-inactivo';
        textoEtiqueta = 'Descontinuado';
        claseEtiquetaExtra = 'etiqueta-roja';
    } else if (totalEjemplares == 0) {
        claseEstado = 'libro-inactivo';
        textoEtiqueta = 'Sin ejemplares';
        claseEtiquetaExtra = 'etiqueta-roja';
    } else if (ejemplaresDisponibles == 0) {
        claseEstado = 'libro-inactivo';
        textoEtiqueta = 'Agotado (Prestados)';
        claseEtiquetaExtra = 'etiqueta-roja';
    } else {
        textoEtiqueta = `${ejemplaresDisponibles} disponible${ejemplaresDisponibles > 1 ? 's' : ''}`;
    }

    const card = document.createElement('a');
    const urlParams = new URLSearchParams(window.location.search);
    const categoriaId = urlParams.get('id');

    card.href = `/HTML/detalle_libro.html?folio=${encodeURIComponent(libro.vchfolio)}&categoria=${categoriaId}`;
    card.className = `libro-card ${claseEstado}`;
    card.dataset.titulo = libro.vchtitulo.toLowerCase();
    card.dataset.autor = libro.vchautor.toLowerCase();
    card.dataset.folio = libro.vchfolio;

    const imagenContainer = document.createElement('div');
    imagenContainer.className = 'libro-imagen-container';

    if (libro.imagen) {
        const img = document.createElement('img');
        img.src = libro.imagen;
        img.alt = libro.vchtitulo;
        img.className = 'libro-imagen';
        img.onerror = function () {
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'libro-imagen-placeholder';
            placeholder.textContent = '';
            imagenContainer.appendChild(placeholder);
        };
        imagenContainer.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'libro-imagen-placeholder';
        placeholder.textContent = '';
        if (libro.color_fondo) {
            placeholder.style.background = libro.color_fondo;
        }
        imagenContainer.appendChild(placeholder);
    }

    const etiqueta = document.createElement('span');
    etiqueta.className = `libro-etiqueta ${claseEtiquetaExtra}`;
    etiqueta.textContent = textoEtiqueta;
    imagenContainer.appendChild(etiqueta);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'libro-info';

    const titulo = document.createElement('h2');
    titulo.className = 'libro-titulo';
    titulo.textContent = libro.vchtitulo;

    const autor = document.createElement('p');
    autor.className = 'libro-autor';
    autor.textContent = `Por: ${libro.vchautor}`;

    infoDiv.appendChild(titulo);
    infoDiv.appendChild(autor);

    if (libro.vcheditorial) {
        const editorial = document.createElement('p');
        editorial.className = 'libro-editorial';
        editorial.textContent = `Editorial: ${libro.vcheditorial}`;
        infoDiv.appendChild(editorial);
    }

    if (libro.intanio) {
        const anio = document.createElement('span');
        anio.className = 'libro-anio';
        anio.textContent = `📅 ${libro.intanio}`;
        infoDiv.appendChild(anio);
    }

    card.appendChild(imagenContainer);
    card.appendChild(infoDiv);

    if (claseEstado !== 'libro-inactivo') {
        card.addEventListener('click', function (e) {
            document.getElementById('loadingOverlay').style.display = 'flex';
        });
    }

    return card;
}

function configurarBuscador() {
    const searchBox = document.getElementById('buscarEnCategoria');

    if (searchBox) {
        searchBox.addEventListener('input', function (e) {
            const termino = e.target.value.toLowerCase().trim();

            if (termino === '') {
                mostrarLibros(librosOriginales);
                actualizarContador(librosOriginales.length);
                return;
            }

            const librosFiltrados = librosOriginales.filter(libro => {
                const titulo = libro.vchtitulo.toLowerCase();
                const autor = libro.vchautor.toLowerCase();
                return titulo.includes(termino) || autor.includes(termino);
            });

            mostrarLibros(librosFiltrados);
            actualizarContador(librosFiltrados.length);
        });
    }
}

function actualizarContador(cantidad) {
    const resultadosInfo = document.getElementById('resultadosInfo');
    if (resultadosInfo) {
        resultadosInfo.textContent = `${cantidad} libro${cantidad !== 1 ? 's' : ''} encontrado${cantidad !== 1 ? 's' : ''}`;
    }
}

function mostrarError(mensaje) {
    const container = document.getElementById('librosGrid');
    container.innerHTML = `
        <div class="sin-libros" style="grid-column: 1 / -1;">
            <div class="sin-libros-icono"></div>
            <h2>${escapeHtml(mensaje)}</h2>
            <p class="sin-libros-texto">La categoría que buscas no existe o ha sido eliminada.</p>
            <button onclick="window.location.href='/HTML/index.html'" 
                    style="margin-top: 20px; padding: 12px 24px; background: #BC955B; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                Volver al Inicio
            </button>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}