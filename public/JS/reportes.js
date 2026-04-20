// VARIABLES GLOBALES
var DATA = null;
var STATS = null;
var chartInstances = {};
var PALETTE = ['#A02142', '#BC955B', '#7A1832', '#D4AF72', '#C4345A', '#5C3D2E', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100'];

// ====================== UTILIDADES ======================

function proyectar(x0, k, t) {
    return x0 * Math.exp(k * t);
}

function colorAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function formatearMes(ym) {
    var nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var partes = ym.split('-');
    return nombres[parseInt(partes[1], 10) - 1] + ' ' + partes[0].substring(2);
}

function destruirChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); chartInstances[id] = null; }
}

function obtenerRecomendacion(k) {
    if (k > 0.1) return { texto: 'Adquirir más ejemplares', clase: 'alta' };
    if (k > 0.02) return { texto: 'Mantener acervo', clase: 'media' };
    if (k > -0.02) return { texto: 'Sin cambios', clase: 'media' };
    return { texto: 'Considerar baja / Monitorear', clase: 'critica' };
}

// ====================== CARGA DE DATOS ======================

function cargarDatos() {
    var urlPrestamos = '/api/reportes/prestamos-por-mes?meses=6';
    var urlStats = '/api/reportes/estadisticas';

    return Promise.all([
        fetch(urlPrestamos).then(r => r.json()),
        fetch(urlStats).then(r => r.json())
    ])
    .then(resultados => {
        DATA = resultados[0].data;
        STATS = resultados[1].data;
        return true;
    });
}

// ====================== RENDERIZADO ======================

function renderResumen() {
    if (!DATA) return;
    
    var mesesLabel = DATA.meses.map(formatearMes);
    var totalesMes = DATA.meses.map(function(_, idx) {
        return DATA.categorias.reduce((sum, c) => sum + (c.prestamos[idx] || 0), 0);
    });

    var actual = totalesMes[totalesMes.length - 1];
    var anterior = totalesMes[totalesMes.length - 2] || 0;
    var cambio = anterior > 0 ? ((actual - anterior) / anterior * 100).toFixed(1) : 0;

    // Tarjetas de estadísticas
    var html = `
        <div class="stat-card">
            <div class="stat-label">Préstamos Este Mes</div>
            <div class="stat-value">${actual}</div>
            <div class="stat-change ${cambio >= 0 ? 'up' : 'down'}">
                ${cambio >= 0 ? 'Sube' : 'Baja'} ${Math.abs(cambio)}% vs mes anterior
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Libros en Acervo</div>
            <div class="stat-value">${STATS.total_libros}</div>
        </div>
    `;
    document.getElementById('statsGrid').innerHTML = html;

    // Categorías Crecimiento
    var htmlCrec = '';
    DATA.categorias.filter(c => c.tasa_k > 0).slice(0, 5).forEach(c => {
        htmlCrec += `<li><span class="reco-titulo">${c.nombre}</span>
                     <span class="reco-cambio up">+${c.porcentaje_mensual.toFixed(1)}% / mes</span></li>`;
    });
    document.getElementById('categoriasCrecimiento').innerHTML = htmlCrec;
}

function renderLibros() {
    var tbodyHTML = '';
    DATA.libros.forEach(l => {
        var x0 = l.prestamos[l.prestamos.length - 1];
        var proy = Math.round(proyectar(x0, l.tasa_k, 1));
        var reco = obtenerRecomendacion(l.tasa_k);

        tbodyHTML += `<tr>
            <td><strong>${l.nombre}</strong></td>
            <td>${l.categoria}</td>
            <td style="text-align:center">${x0}</td>
            <td style="text-align:center; color:#A02142"><strong>${proy}</strong></td>
            <td><span class="badge ${reco.clase}">${reco.texto}</span></td>
        </tr>`;
    });
    document.getElementById('tablaLibros').innerHTML = tbodyHTML;
}

// ====================== SECCIÓN PROYECCIÓN ======================

function llenarSeleccion() {
    var tipo = document.getElementById('projTipo').value;
    var sel = document.getElementById('projSeleccion');
    sel.innerHTML = '';
    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    items.forEach(i => {
        var opt = document.createElement('option');
        opt.value = i.nombre;
        opt.textContent = i.nombre;
        sel.appendChild(opt);
    });
}

function calcularProyeccion() {
    var tipo = document.getElementById('projTipo').value;
    var seleccion = document.getElementById('projSeleccion').value;
    var periodos = parseInt(document.getElementById('projPeriodos').value) || 3;

    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    var item = items.find(i => i.nombre === seleccion);
    if (!item) return;

    var x0 = item.prestamos[item.prestamos.length - 1];
    var k = item.tasa_k;
    var pct = item.porcentaje_mensual.toFixed(2);

    // Calculamos los meses futuros
    var proyecciones = [];
    for (var i = 1; i <= periodos; i++) {
        proyecciones.push(Math.round(proyectar(x0, k, i)));
    }

    document.getElementById('resultadoBox').classList.add('visible');
    document.getElementById('resultadoTexto').innerHTML = 
        `Este material tiene una tasa de <strong>${pct}% mensual</strong>. 
        En ${periodos} meses se estiman <strong>${proyecciones[periodos-1]} préstamos</strong>.`;
    
    // Aquí actualizarías tu gráfica de líneas de proyección con 'proyecciones'
}

// ====================== INICIALIZACIÓN ======================
(function() {
    cargarDatos().then(() => {
        renderResumen();
        renderLibros();
        llenarSeleccion();
        
        document.getElementById('projTipo').addEventListener('change', llenarSeleccion);
        document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);
        document.getElementById('loadingOverlay').classList.add('hidden');
    });
})();