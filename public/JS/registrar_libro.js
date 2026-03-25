// registrar_libro.js
// Maneja el formulario de registro / edición de libros.
// Modo edición: detecta ?folio= en la URL y precarga los datos.
// Imagen: se envía como URL (Cloudinary ya la procesa en la API).

document.addEventListener('DOMContentLoaded', async () => {
    const usuario = await protegerPagina([1, 2]);
    if (!usuario) return;

    await cargarCategorias();

    const params = new URLSearchParams(window.location.search);
    const folio  = params.get('folio');

    if (folio) {
        await modoEdicion(folio);
    }

    // Vista previa de imagen seleccionada
    document.getElementById('imagen').addEventListener('change', function () {
        const archivo = this.files[0];
        if (!archivo) {
            document.getElementById('previewNuevaImagen').style.display = 'none';
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            const prev = document.getElementById('previewNuevaImagen');
            prev.src = e.target.result;
            prev.style.display = 'block';
        };
        reader.readAsDataURL(archivo);
    });

    document.getElementById('formLibro').addEventListener('submit', manejarEnvio);
});

async function cargarCategorias() {
    try {
        const res  = await fetch(CONFIG.BASE_URL + '/api/libros/categorias');
        const data = await res.json();
        if (!data.success) return;

        const select = document.getElementById('intidcategoria');
        data.data.forEach(cat => {
            const opt = document.createElement('option');
            opt.value       = cat.intidcategoria;
            opt.textContent = cat.vchcategoria;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error cargando categorías:', e);
    }
}

async function modoEdicion(folio) {
    document.getElementById('tituloFormulario').textContent = 'Editar Libro';
    document.getElementById('btnGuardar').textContent       = 'Actualizar Libro';

    try {
        const res  = await fetch(`${CONFIG.BASE_URL}/api/libros/detalle?folio=${encodeURIComponent(folio)}`);
        const data = await res.json();
        if (!data.success || !data.data) throw new Error('Libro no encontrado');

        const libro = data.data;

        // Rellenar campos
        const camp = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
        camp('vchfolio',       libro.vchfolio);
        camp('vchtitulo',      libro.vchtitulo);
        camp('vchautor',       libro.vchautor);
        camp('vcheditorial',   libro.vcheditorial);
        camp('intanio',        libro.intanio);
        camp('vchisbn',        libro.vchisbn);
        camp('vchsinopsis',    libro.vchsinopsis);
        camp('intidcategoria', libro.intidcategoria);

        // Folio no editable
        document.getElementById('vchfolio').readOnly = true;

        // Mostrar imagen actual si existe
        if (libro.imagen) {
            document.getElementById('imagenActual').src = libro.imagen;
            document.getElementById('contenedorImagenActual').style.display = 'block';
        }

        // Imagen no obligatoria en edición
        document.getElementById('asteriscoImagen').style.display = 'none';
        document.getElementById('ayudaImagen').style.display     = 'block';
        document.getElementById('imagen').removeAttribute('required');

    } catch (error) {
        console.error('Error cargando libro:', error);
        mostrarMensaje('No se pudo cargar el libro para editar.', 'err');
    }
}

async function manejarEnvio(e) {
    e.preventDefault();

    const btn = document.getElementById('btnGuardar');
    btn.disabled   = true;
    btn.textContent = 'Guardando...';
    ocultarMensaje();

    const folio    = document.getElementById('vchfolio').value.trim();
    const isEditar = document.getElementById('vchfolio').readOnly;

    // Construir FormData para poder enviar archivo
    const formData = new FormData();
    formData.append('vchfolio',       folio);
    formData.append('vchtitulo',      document.getElementById('vchtitulo').value.trim());
    formData.append('vchautor',       document.getElementById('vchautor').value.trim());
    formData.append('vcheditorial',   document.getElementById('vcheditorial').value.trim());
    formData.append('intanio',        document.getElementById('intanio').value);
    formData.append('vchisbn',        document.getElementById('vchisbn').value.trim());
    formData.append('vchsinopsis',    document.getElementById('vchsinopsis').value.trim());
    formData.append('intidcategoria', document.getElementById('intidcategoria').value);

    const archivoImagen = document.getElementById('imagen').files[0];
    if (archivoImagen) {
        formData.append('imagen', archivoImagen);
    } else if (!isEditar) {
        mostrarMensaje('Debes seleccionar una imagen para el libro.', 'err');
        btn.disabled    = false;
        btn.textContent = 'Añadir Libro';
        return;
    }

    try {
        const token  = localStorage.getItem('token');
        const method = isEditar ? 'PUT' : 'POST';
        const url    = isEditar
            ? `${CONFIG.BASE_URL}/api/libros/${encodeURIComponent(folio)}`
            : `${CONFIG.BASE_URL}/api/libros`;

        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            // NO ponemos Content-Type: el navegador lo fija solo con el boundary de FormData
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            mostrarMensaje(
                isEditar ? 'Libro actualizado correctamente.' : 'Libro registrado correctamente.',
                'ok'
            );
            setTimeout(() => {
                window.location.href = obtenerRuta('/HTML/listado_libros.html');
            }, 1200);
        } else {
            throw new Error(data.error || data.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al guardar: ' + error.message, 'err');
        btn.disabled    = false;
        btn.textContent = isEditar ? 'Actualizar Libro' : 'Añadir Libro';
    }
}

function mostrarMensaje(texto, tipo) {
    const el = document.getElementById('msgResultado');
    el.textContent  = texto;
    el.className    = tipo;
    el.style.display = 'block';
}

function ocultarMensaje() {
    const el = document.getElementById('msgResultado');
    el.style.display = 'none';
}
