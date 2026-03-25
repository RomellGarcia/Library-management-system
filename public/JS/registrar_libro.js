document.addEventListener('DOMContentLoaded', async () => {
    const usuario = await protegerPagina([1, 2]);
    if (!usuario) return;

    await cargarCategorias();

    const params = new URLSearchParams(window.location.search);
    const folio = params.get('folio');

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
        const res = await fetch(`${CONFIG.BASE_URL}/api/libros/categorias`);
        if (!res.ok) {
            // Esto nos dirá qué dice el error 500
            const errorData = await res.json();
            console.error("Detalle del error 500:", errorData);
            throw new Error(`Error ${res.status}: ${errorData.error || 'Error interno'}`);
        }
        const data = await res.json();
        if (!data.success || !data.data) return;

        const select = document.getElementById('intidcategoria');
        select.innerHTML = '<option value="">-- Seleccione una categoría --</option>';

        data.data.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.intidcategoria;
            opt.textContent = cat.vchcategoria || cat.vchnombre || 'Sin nombre';
            select.appendChild(opt);
        });

        console.log("Categorías cargadas correctamente");
    } catch (e) {
        console.error('Error cargando categorías:', e);
    }
}

async function modoEdicion(folio) {
    document.getElementById('tituloFormulario').textContent = 'Editar Libro';
    document.getElementById('btnGuardar').textContent = 'Actualizar Libro';

    try {
        const res = await fetch(`${CONFIG.BASE_URL}/api/libros/detalle?folio=${encodeURIComponent(folio)}`);
        const data = await res.json();
        if (!data.success || !data.data) throw new Error('Libro no encontrado');

        const libro = data.data;

        // Rellenar campos
        const camp = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
        camp('vchfolio', libro.vchfolio);
        camp('vchtitulo', libro.vchtitulo);
        camp('vchautor', libro.vchautor);
        camp('vcheditorial', libro.vcheditorial);
        camp('intanio', libro.intanio);
        camp('vchisbn', libro.vchisbn);
        camp('vchsinopsis', libro.vchsinopsis);
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
        document.getElementById('ayudaImagen').style.display = 'block';
        document.getElementById('imagen').removeAttribute('required');

    } catch (error) {
        console.error('Error cargando libro:', error);
        mostrarMensaje('No se pudo cargar el libro para editar.', 'err');
    }
}

async function manejarEnvio(e) {
    e.preventDefault();

    const btn = document.getElementById('btnGuardar');

    // 1. Captura de valores
    const titulo = document.getElementById('vchtitulo').value.trim();
    const autor = document.getElementById('vchautor').value.trim();
    const anio = document.getElementById('intanio').value;
    const categoria = document.getElementById('intidcategoria').value;
    const folio = document.getElementById('vchfolio').value.trim();
    const isEditar = document.getElementById('vchfolio').readOnly;

    // 2. Validaciones básicas
    if (!folio || !titulo || !autor || !categoria) {
        alert("¡Atención! Todos los campos marcados son obligatorios.");
        return;
    }

    const anioNum = parseInt(anio);
    const anioActual = new Date().getFullYear();
    if (anio && (isNaN(anioNum) || anioNum < 1000 || anioNum > anioActual)) {
        alert(`El año debe ser un número entre 1000 y ${anioActual}`);
        return;
    }

    const archivoImagen = document.getElementById('imagen').files[0];
    if (!isEditar && !archivoImagen) {
        alert("Es obligatorio subir una imagen para registrar un libro nuevo.");
        return;
    }

    // 3. Preparar el envío (Bloqueamos botón y creamos FormData)
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const formData = new FormData();
    formData.append('vchfolio', folio);
    formData.append('vchtitulo', titulo);
    formData.append('vchautor', autor);
    formData.append('vcheditorial', document.getElementById('vcheditorial').value.trim());
    formData.append('intanio', anio);
    formData.append('vchisbn', document.getElementById('vchisbn').value.trim());
    formData.append('vchsinopsis', document.getElementById('vchsinopsis').value.trim());
    formData.append('intidcategoria', categoria);

    // Lógica de imagen: Si hay archivo nuevo se envía, si no y es edición, enviamos la URL actual
    if (archivoImagen) {
        formData.append('imagen', archivoImagen);
    } else if (isEditar) {
        const imagenActual = document.getElementById('imagenActual').src;
        formData.append('vchimagen', imagenActual);
    }

    try {
        const token = localStorage.getItem('token');
        const method = isEditar ? 'PUT' : 'POST';
        const url = isEditar
            ? `${CONFIG.BASE_URL}/api/libros/actualizar/${encodeURIComponent(folio)}`
            : `${CONFIG.BASE_URL}/api/libros/registrar`;

        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        // Leemos la respuesta como texto primero para evitar el error de JSON.parse
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            throw new Error("El servidor no respondió con un formato válido. Revisa Vercel.");
        }

        if (data.success) {
            alert(isEditar ? '¡Éxito! Libro actualizado.' : '¡Éxito! Libro registrado en la Biblioteca UTHH.');
            window.location.href = obtenerRuta('/HTML/listado_libros.html');
        } else {
            // Aquí data ya no es un [object Object], es el error real
            throw new Error(data.error || 'Error en el servidor');
        }
    } catch (error) {
        alert('Hubo un problema: ' + error.message);
        btn.disabled = false;
        btn.textContent = isEditar ? 'Actualizar Libro' : 'Añadir Libro';
    }
}

function mostrarMensaje(texto, tipo) {
    alert(texto);
}

function ocultarMensaje() {
    const el = document.getElementById('msgResultado');
    el.style.display = 'none';
}
