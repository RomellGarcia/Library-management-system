function obtenerRuta(path) {
    const isGitHub = window.location.hostname.includes('github.io');
    // Si estamos en GitHub, añadimos el nombre del repositorio al inicio.
    return isGitHub ? `/Api_Biblioteca_uthh${path}` : path;
}

async function cargarLibrosRecomendados() {
    try {
        const response = await fetch(CONFIG.BASE_URL + '/api/libros/recomendados/aleatorios');

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('librosRecomendados');
            container.innerHTML = '';

            if (data.data.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #666;">No hay libros disponibles</p>';
                return;
            }

            data.data.forEach(libro => {
                const bookCard = document.createElement('article');
                bookCard.className = 'book-card';
                bookCard.style.cursor = 'pointer';

                // CORRECCIÓN DE RUTA PARA DETALLE
                bookCard.onclick = function() {
                    window.location.href = obtenerRuta(`/HTML/detalle_libro.html?folio=${encodeURIComponent(libro.vchfolio)}`);
                };

                const coverDiv = document.createElement('div');
                coverDiv.className = 'book-cover';

                if (libro.imagen && libro.imagen !== null) {
                    coverDiv.style.backgroundImage = `url(${libro.imagen})`;
                    coverDiv.style.backgroundSize = 'cover';
                    coverDiv.style.backgroundPosition = 'center';
                } else {
                    coverDiv.style.backgroundColor = libro.color_fondo || '#667eea';
                    coverDiv.innerHTML = '';
                    coverDiv.style.display = 'flex';
                    coverDiv.style.alignItems = 'center';
                    coverDiv.style.justifyContent = 'center';
                    coverDiv.style.fontSize = '3rem';
                }

                const title = document.createElement('h3');
                title.textContent = libro.vchtitulo;

                const author = document.createElement('p');
                author.textContent = libro.vchautor;

                bookCard.appendChild(coverDiv);
                bookCard.appendChild(title);
                bookCard.appendChild(author);

                container.appendChild(bookCard);
            });
        } else {
            console.error('Error al cargar libros recomendados:', data.error);
            document.getElementById('librosRecomendados').innerHTML =
                '<p style="text-align: center; color: red;">Error al cargar libros</p>';
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        document.getElementById('librosRecomendados').innerHTML =
            `<p style="text-align: center; color: red;">Error: ${error.message}</p>`;
    }
}
async function cargarCategorias() {
    try {
        const response = await fetch(CONFIG.BASE_URL + '/api/libros/categorias');

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('categoriasGrid');
            container.innerHTML = '';

            if (data.data.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No hay categorías disponibles</p>';
                return;
            }

            data.data.forEach(categoria => {
                const categoryCard = document.createElement('article');
                categoryCard.className = 'category-card';
                categoryCard.style.cursor = 'pointer';

                // CORRECCIÓN DE RUTA PARA CATEGORÍA
                categoryCard.onclick = function() {
                    window.location.href = obtenerRuta(`/HTML/libros_categoria.html?id=${categoria.intidcategoria}`);
                };

                const iconContainer = document.createElement('div');
                iconContainer.className = 'category-icon';

                const img = document.createElement('img');
                
                // CORRECCIÓN DE RUTA DE IMAGEN
                // Si la imagen es una URL externa (http), se deja igual.
                // Si es local (como 'images/icon.png'), se procesa con obtenerRuta.
                img.src = (categoria.icono && categoria.icono.startsWith('http')) 
                    ? categoria.icono 
                    : obtenerRuta(`/${categoria.icono}`);

                img.alt = categoria.vchcategoria;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'contain';

                img.onerror = function() {
                    console.warn(`No se pudo cargar la imagen para: ${categoria.vchcategoria}`);
                    iconContainer.innerHTML = '📚'; // Emoji de respaldo
                    iconContainer.style.fontSize = '4rem';
                    iconContainer.style.display = 'flex';
                    iconContainer.style.justifyContent = 'center';
                };

                iconContainer.appendChild(img);

                const title = document.createElement('h3');
                title.textContent = categoria.vchcategoria;

                categoryCard.appendChild(iconContainer);
                categoryCard.appendChild(title);

                container.appendChild(categoryCard);
            });
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    }
}

async function cargarLibrosMasPedidos() {
    try {
        const response = await fetch(CONFIG.BASE_URL + '/api/libros/mas-pedidos');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('librosMasPedidos');
            container.innerHTML = '';

            data.data.forEach(libro => {
                const bookCard = document.createElement('article');
                bookCard.className = 'book-card';
                bookCard.style.cursor = 'pointer';

                // CORRECCIÓN DE RUTA
                bookCard.onclick = function() {
                    window.location.href = obtenerRuta(`/HTML/detalle_libro.html?folio=${encodeURIComponent(libro.vchfolio)}`);
                };

                const coverDiv = document.createElement('div');
                coverDiv.className = 'book-cover';

                if (libro.imagen) {
                    coverDiv.style.backgroundImage = `url(${libro.imagen})`;
                    coverDiv.style.backgroundSize = 'cover';
                    coverDiv.style.backgroundPosition = 'center';
                } else {
                    coverDiv.style.backgroundColor = libro.color_fondo || '#4ECDC4';
                }

                const title = document.createElement('h3');
                title.textContent = libro.vchtitulo;

                const author = document.createElement('p');
                author.textContent = libro.vcheditorial || libro.vchautor;

                bookCard.appendChild(coverDiv);
                bookCard.appendChild(title);
                bookCard.appendChild(author);
                container.appendChild(bookCard);
            });
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    }
}

function configurarBusquedaTiempoReal() {
    const searchBox = document.getElementById('searchBox');
    const searchResults = document.getElementById('searchResults');
    if (!searchBox || !searchResults) return;

    let searchTimeout;

    searchBox.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (query.length === 0) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(CONFIG.BASE_URL + `/api/libros/buscar?q=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (data.success && data.data.length > 0) {
                    searchResults.innerHTML = '';
                    searchResults.classList.add('active');

                    data.data.forEach(libro => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';

                        const portadaHTML = libro.imagen
                            ? `<img src="${libro.imagen}" alt="${escapeHtml(libro.vchtitulo)}">`
                            : `<div class="book-mini-cover-emoji">📖</div>`;

                        resultItem.innerHTML = `
                            <div class="book-mini-cover" style="${!libro.imagen && libro.color_fondo ? 'background: ' + libro.color_fondo : ''}">
                                ${portadaHTML}
                            </div>
                            <div class="book-info">
                                <div class="book-title">${escapeHtml(libro.vchtitulo)}</div>
                                <div class="book-author">Por: ${escapeHtml(libro.vchautor)}</div>
                            </div>
                        `;

                        // CORRECCIÓN DE RUTA EN BÚSQUEDA
                        resultItem.addEventListener('click', () => {
                            window.location.href = obtenerRuta(`/HTML/detalle_libro.html?folio=${encodeURIComponent(libro.vchfolio)}`);
                        });

                        searchResults.appendChild(resultItem);
                    });
                }
            } catch (error) {
                console.error('Error en búsqueda:', error);
            }
        }, 300);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', function() {
    cargarLibrosRecomendados();
    cargarCategorias();
    cargarLibrosMasPedidos();
    configurarBusquedaTiempoReal();
});