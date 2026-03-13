// detalle_libro.js - Mostrar detalle del libro
document.addEventListener('DOMContentLoaded', function() {
    crearBotonRegreso();
    cargarDetalleLibro();
});

function crearBotonRegreso() {
    const container = document.getElementById('boton-regreso-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const referer = document.referrer;
    
    let textoBoton = 'Volver';
    let urlDestino = '/HTML/index.html';

    if (referer.includes('categoria.html')) {
        const categoriaId = urlParams.get('categoria') || '';
        textoBoton = 'Volver a la categoría';
        urlDestino = `/HTML/categoria.html?id=${categoriaId}`;
    } else if (referer.includes('catalogo.html')) {
        textoBoton = 'Volver al catálogo';
        urlDestino = '/HTML/catalogo.html';
    } else {
        textoBoton = 'Volver al inicio';
        urlDestino = '/HTML/index.html';
    }

    container.innerHTML = `
        <a href="${urlDestino}" class="boton-volver-detalle">
            <span>←</span>
            <span>${textoBoton}</span>
        </a>
    `;
}

async function cargarDetalleLibro() {
    const urlParams = new URLSearchParams(window.location.search);
    const folio = urlParams.get('folio');

    if (!folio) {
        mostrarError('No se especificó un libro');
        return;
    }

    try {
       const response = await fetch(`/api/libros/detalle?folio=${encodeURIComponent(folio)}`);

        if (!response.ok) throw new Error('Libro no encontrado');

        const data = await response.json();

        if (data.success) {
            mostrarDetalle(data.data);
        } else {
            mostrarError(data.error || 'Error al cargar el libro');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message);
    }
}

function mostrarDetalle(libro) {
    const container = document.getElementById('detalle-libro');
    
    const totalEjemplares = libro.total_ejemplares || 0;
    const ejemplaresDisponibles = libro.ejemplares_disponibles || 0;
    const ejemplaresPrestados = totalEjemplares - ejemplaresDisponibles;

    container.innerHTML = `
        <!-- Sección Imagen -->
        <section class="seccion-imagen-libro">
            <figure class="portada-libro-detalle">
                ${libro.imagen 
                    ? `<img src="${libro.imagen}" alt="Portada de ${escapeHtml(libro.vchtitulo)}">`
                    : `<div class="icono-libro-placeholder"></div>`
                }
            </figure>

            <div class="panel-disponibilidad">
                <h3 class="titulo-disponibilidad">Estado de Disponibilidad</h3>
                <div class="estadisticas-ejemplares">
                    <div class="stat-item-libro">
                        <span class="stat-label-libro">Total de ejemplares:</span>
                        <span class="stat-numero-libro">${totalEjemplares}</span>
                    </div>
                    <div class="stat-item-libro disponibles">
                        <span class="stat-label-libro">Disponibles:</span>
                        <span class="stat-numero-libro stat-disponibles">${ejemplaresDisponibles}</span>
                    </div>
                    <div class="stat-item-libro prestados">
                        <span class="stat-label-libro">Prestados:</span>
                        <span class="stat-numero-libro stat-prestados">${ejemplaresPrestados}</span>
                    </div>
                </div>
                ${ejemplaresDisponibles > 0 
                    ? `<div class="indicador-disponible">Disponible para préstamo</div>`
                    : `<div class="indicador-no-disponible">No disponible actualmente</div>`
                }
            </div>
        </section>

        <!-- Sección Información -->
        <section class="seccion-info-libro">
            <header class="encabezado-libro-detalle">
                <h1 class="titulo-libro-principal">${escapeHtml(libro.vchtitulo)}</h1>
                <p class="autor-libro-principal">Por ${escapeHtml(libro.vchautor)}</p>
            </header>

            <div class="grid-informacion-libro">
                <div class="item-info-libro">
                    <span class="etiqueta-info-libro">Folio</span>
                    <span class="valor-info-libro">${escapeHtml(libro.vchfolio)}</span>
                </div>

                ${libro.vchisbn ? `
                    <div class="item-info-libro">
                        <span class="etiqueta-info-libro">ISBN</span>
                        <span class="valor-info-libro">${escapeHtml(libro.vchisbn)}</span>
                    </div>
                ` : ''}

                ${libro.vcheditorial ? `
                    <div class="item-info-libro">
                        <span class="etiqueta-info-libro">Editorial</span>
                        <span class="valor-info-libro">${escapeHtml(libro.vcheditorial)}</span>
                    </div>
                ` : ''}

                ${libro.intanio ? `
                    <div class="item-info-libro">
                        <span class="etiqueta-info-libro">Año de Publicación</span>
                        <span class="valor-info-libro">${libro.intanio}</span>
                    </div>
                ` : ''}

                ${libro.vchcategoria ? `
                    <div class="item-info-libro">
                        <span class="etiqueta-info-libro">Categoría</span>
                        <span class="valor-info-libro">${escapeHtml(libro.vchcategoria)}</span>
                    </div>
                ` : ''}

                <div class="item-info-libro">
                    <span class="etiqueta-info-libro">Estado</span>
                    <span class="valor-info-libro">${libro.boolactivo == 1 ? 'Activo' : 'Inactivo'}</span>
                </div>
            </div>

            ${libro.vchsinopsis ? `
                <section class="seccion-sinopsis-libro">
                    <h2 class="titulo-sinopsis-libro">Sinopsis</h2>
                    <p class="texto-sinopsis-libro">${escapeHtml(libro.vchsinopsis).replace(/\n/g, '<br>')}</p>
                </section>
            ` : ''}

            <div class="seccion-etiquetas-libro">
                ${libro.vchcategoria ? `
                    <span class="etiqueta-libro-detalle"># ${escapeHtml(libro.vchcategoria)}</span>
                ` : ''}

                ${ejemplaresDisponibles > 0 
                    ? `<span class="etiqueta-libro-detalle etiqueta-disponible">📚 Con ejemplares</span>`
                    : `<span class="etiqueta-libro-detalle etiqueta-agotado">📚 Sin disponibilidad</span>`
                }
            </div>
        </section>
    `;

    document.title = `${libro.vchtitulo} - Biblioteca UTHH`;
}

function mostrarError(mensaje) {
    const container = document.getElementById('detalle-libro');
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
            <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.5;">⚠️</div>
            <h2 style="color: #666; margin-bottom: 20px;">${escapeHtml(mensaje)}</h2>
            <button onclick="window.location.href='/HTML/index.html'" 
                    style="padding: 12px 24px; background: #BC955B; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
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