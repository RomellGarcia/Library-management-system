
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

                bookCard.onclick = function () {
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

            data.data.forEach(categoria => {
                const categoryCard = document.createElement('article');
                categoryCard.className = 'category-card';
                categoryCard.style.cursor = 'pointer';
                categoryCard.onclick = function () {
                    const destino = `/HTML/libros_categoria.html?id=${categoria.intidcategoria}`;
                    window.location.href = obtenerRuta(destino);
                };

                const iconContainer = document.createElement('div');
                iconContainer.className = 'category-icon';

                const img = document.createElement('img');
                if (categoria.icono && categoria.icono.startsWith('http')) {
                    img.src = categoria.icono;
                } else {
                    img.src = obtenerRuta('/images/categorias/default.png');
                }

                img.alt = categoria.vchcategoria;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'contain';

                img.onerror = function () {
                    this.onerror = null; // Evitar loop infinito
                    this.style.display = 'none';
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
        console.error('Error:', error);
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

                bookCard.onclick = function () {
                    window.location.href = obtenerRuta(`/HTML/detalle_libro.html?folio=${encodeURIComponent(libro.vchfolio)}`);
                };

                const coverDiv = document.createElement('div');
                coverDiv.className = 'book-cover';

                if (libro.imagen && libro.imagen !== null) {
                    coverDiv.style.backgroundImage = `url(${libro.imagen})`;
                    coverDiv.style.backgroundSize = 'cover';
                    coverDiv.style.backgroundPosition = 'center';
                } else {
                    coverDiv.style.backgroundColor = libro.color_fondo || '#4ECDC4';
                    coverDiv.innerHTML = '';
                    coverDiv.style.display = 'flex';
                    coverDiv.style.alignItems = 'center';
                    coverDiv.style.justifyContent = 'center';
                    coverDiv.style.fontSize = '3rem';
                }

                const title = document.createElement('h3');
                title.textContent = libro.vchtitulo;

                const author = document.createElement('p');
                author.textContent = libro.vcheditorial || libro.vchautor;

                if (libro.total_prestamos > 0) {
                    const prestamos = document.createElement('span');
                    prestamos.style.fontSize = '0.8rem';
                    prestamos.style.color = '#ff6b6b';
                    prestamos.style.fontWeight = 'bold';
                    bookCard.appendChild(prestamos);
                }

                bookCard.appendChild(coverDiv);
                bookCard.appendChild(title);
                bookCard.appendChild(author);

                container.appendChild(bookCard);
            });
        } else {
            console.error('Error al cargar libros más pedidos:', data.error);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        document.getElementById('librosMasPedidos').innerHTML =
            `<p style="text-align: center; color: red;">Error: ${error.message}</p>`;
    }
}

function configurarBusquedaTiempoReal() {
    const searchBox = document.getElementById('searchBox');
    const searchResults = document.getElementById('searchResults');

    if (!searchBox || !searchResults) return;

    let searchTimeout;

    searchBox.addEventListener('input', function (e) {
        const query = e.target.value.trim();

        clearTimeout(searchTimeout);

        if (query.length === 0) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }

        searchResults.innerHTML = `
            <div class="search-loading">
                <div class="search-loading-spinner"></div>
                <p>Buscando...</p>
            </div>
        `;
        searchResults.classList.add('active');

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
                            : `<div class="book-mini-cover-emoji"></div>`;

                        const disponible = libro.ejemplares_disponibles > 0;
                        const badgeClass = disponible ? 'available' : 'unavailable';
                        const badgeIcon = disponible ? '✓' : '✗';
                        const badgeText = disponible ? 'Disponible' : 'No disponible';

                        resultItem.innerHTML = `
                            <div class="book-mini-cover" style="${!libro.imagen && libro.color_fondo ? 'background: ' + libro.color_fondo : ''}">
                                ${portadaHTML}
                            </div>
                            <div class="book-info">
                                <div class="book-title">${escapeHtml(libro.vchtitulo)}</div>
                                <div class="book-author">Por: ${escapeHtml(libro.vchautor)}</div>
                                <span class="book-category">${escapeHtml(libro.vchcategoria || 'Sin categoría')}</span>
                            </div>
                            <div class="book-availability">
                                <span class="availability-badge ${badgeClass}">${badgeIcon} ${badgeText}</span>
                                ${disponible ? `<small style="color: #666; font-size: 0.75rem;">${libro.ejemplares_disponibles} ejemplar(es)</small>` : ''}
                            </div>
                        `;

                        resultItem.addEventListener('click', () => {
                            window.location.href = obtenerRuta(`/HTML/detalle_libro.html?folio=${encodeURIComponent(libro.vchfolio)}`);
                        });

                        searchResults.appendChild(resultItem);
                    });
                } else {
                    searchResults.innerHTML = `
                        <div class="search-no-results">
                            <div class="search-no-results-icon">🔍</div>
                            <p class="search-no-results-text">No se encontraron resultados para "${escapeHtml(query)}"</p>
                        </div>
                    `;
                    searchResults.classList.add('active');
                }
            } catch (error) {
                console.error('Error en la búsqueda:', error);
                searchResults.innerHTML = `
                    <div class="search-no-results">
                        <div class="search-no-results-icon"></div>
                        <p class="search-no-results-text">Error al realizar la búsqueda</p>
                    </div>
                `;
                searchResults.classList.add('active');
            }
        }, 300);
    });

    document.addEventListener('click', function (e) {
        if (!searchBox.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    searchBox.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            searchBox.value = '';
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            searchBox.blur();
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', function () {
    cargarLibrosRecomendados();
    cargarCategorias();
    cargarLibrosMasPedidos();
    configurarBusquedaTiempoReal();
});