// catalogo.js - Cargar y mostrar el catálogo de libros
document.addEventListener('DOMContentLoaded', function () {
    cargarCatalogo();
    configurarBuscador();
});

async function cargarCatalogo() {
    const container = document.getElementById('catalogoGrid');

    try {
        // Endpoint público — se quitó credentials: 'include'
        const response = await fetch(CONFIG.BASE_URL + '/api/libros', { method: 'GET' });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            container.innerHTML = '';

            if (data.data.length === 0) {
                container.innerHTML = `
                    <div class="sin-libros">
                        <div class="sin-libros-icono"></div>
                        <p class="sin-libros-texto">No hay libros registrados en el catálogo</p>
                    </div>
                `;
                return;
            }

            data.data.forEach(libro => {
                const card = crearTarjetaLibro(libro);
                container.appendChild(card);
            });

            console.log(`${data.total} libros cargados en el catálogo`);
        } else {
            throw new Error(data.error || 'Error al cargar el catálogo');
        }
    } catch (error) {
        console.error('Error al cargar catálogo:', error);
        container.innerHTML = `
            <div class="sin-libros">
                <div class="sin-libros-icono"></div>
                <p class="sin-libros-texto">Error al cargar el catálogo</p>
                <button onclick="cargarCatalogo()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
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
    card.href = `../HTML/detalle_libro.html?folio=${encodeURIComponent(libro.vchfolio)}`;
    card.className = `libro-card ${claseEstado}`;
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

    card.addEventListener('click', function (e) {
        document.getElementById('loadingOverlay').style.display = 'flex';
    });

    return card;
}

function configurarBuscador() {
    const searchBox = document.getElementById('searchBox');

    if (searchBox) {
        searchBox.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            const catalogoGrid = document.getElementById('catalogoGrid');
            const libros = catalogoGrid.querySelectorAll('.libro-card');
            let resultadosEncontrados = 0;

            const mensajeAnterior = catalogoGrid.querySelector('.sin-resultados-busqueda');
            if (mensajeAnterior) {
                mensajeAnterior.remove();
            }

            libros.forEach(libro => {
                const titulo = libro.querySelector('.libro-titulo')?.textContent.toLowerCase() || '';
                const autor = libro.querySelector('.libro-autor')?.textContent.toLowerCase() || '';
                const editorial = libro.querySelector('.libro-editorial')?.textContent.toLowerCase() || '';

                if (titulo.includes(searchTerm) || autor.includes(searchTerm) || editorial.includes(searchTerm)) {
                    libro.style.display = 'block';
                    resultadosEncontrados++;
                } else {
                    libro.style.display = 'none';
                }
            });

            if (resultadosEncontrados === 0 && searchTerm.length > 0) {
                const mensajeSinResultados = document.createElement('div');
                mensajeSinResultados.className = 'sin-resultados-busqueda';
                mensajeSinResultados.innerHTML = `
                    <div class="sin-libros-icono"></div>
                    <p class="sin-libros-texto">No se encontraron resultados para "${escapeHtml(searchTerm)}"</p>
                `;
                catalogoGrid.appendChild(mensajeSinResultados);
            }
        });
    }
}

function limpiarBusqueda() {
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.value = '';
        searchBox.dispatchEvent(new Event('input'));
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

window.cargarCatalogo = cargarCatalogo;
window.limpiarBusqueda = limpiarBusqueda;