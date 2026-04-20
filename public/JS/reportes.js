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
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
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
    return { texto: 'Monitorear / Baja', clase: 'critica' };
}

// ====================== RENDERIZADO ======================

function renderResumen() {
    if (!DATA) return;
    var mesesLabel = DATA.meses.map(formatearMes);
    
    // Totales por mes
    var totalesMes = DATA.meses.map(function(_, idx) {
        return DATA.categorias.reduce(function(acc, c) { return acc + (c.prestamos[idx] || 0); }, 0);
    });

    var totalActual = totalesMes[totalesMes.length - 1] || 0;
    var totalAnterior = totalesMes[totalesMes.length - 2] || 0;
    var cambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : 0;

    // Tarjetas
    var html = '<div class="stat-card"><div class="stat-label">Préstamos Este Mes</div><div class="stat-value">' + totalActual + '</div>' +
               '<div class="stat-change ' + (cambio >= 0 ? 'up' : 'down') + '">' + (cambio >= 0 ? '↑' : '↓') + ' ' + Math.abs(cambio) + '%</div></div>';
    // ... (repetir para otras tarjetas usando STATS)
    document.getElementById('statsGrid').innerHTML = html;

    // Categorías Crecimiento (Usando el porcentaje que ya calculó el API)
    var htmlCrec = '';
    DATA.categorias.filter(c => c.tasa_k > 0).slice(0,5).forEach(function(c) {
        htmlCrec += '<li><span class="reco-titulo">' + c.nombre + '</span><span class="reco-cambio up">+' + c.porcentaje_mensual.toFixed(1) + '% / mes</span></li>';
    });
    document.getElementById('categoriasCrecimiento').innerHTML = htmlCrec;
    
    // Gráfica de Barras Principal
    destruirChart('chartPrestamosMes');
    chartInstances['chartPrestamosMes'] = new Chart(document.getElementById('chartPrestamosMes'), {
        type: 'bar',
        data: {
            labels: mesesLabel,
            datasets: [{ label: 'Préstamos', data: totalesMes, backgroundColor: '#A02142', borderRadius: 5 }]
        }
    });
}

function renderLibros() {
    if (!DATA) return;
    var tbodyHTML = '';
    
    DATA.libros.forEach(function(l) {
        var x0 = l.prestamos[l.prestamos.length - 1];
        var proy = Math.round(proyectar(x0, l.tasa_k, 1));
        var reco = obtenerRecomendacion(l.tasa_k);

        tbodyHTML += '<tr>' +
            '<td><strong>' + l.nombre + '</strong></td>' +
            '<td>' + l.categoria + '</td>' +
            '<td style="text-align:center">' + x0 + '</td>' +
            '<td style="text-align:center; color:#2E7D32"><strong>' + proy + '</strong></td>' +
            '<td><span class="badge ' + reco.clase + '">' + reco.texto + '</span></td>' +
            '</tr>';
    });
    document.getElementById('tablaLibros').innerHTML = tbodyHTML;
}

function calcularProyeccion() {
    var tipo = document.getElementById('projTipo').value;
    var seleccion = document.getElementById('projSeleccion').value;
    var periodos = parseInt(document.getElementById('projPeriodos').value) || 3;

    var items = (tipo === 'libro' ? DATA.libros : DATA.categorias);
    var item = items.find(i => i.nombre === seleccion);
    if (!item) return;

    var x0 = item.prestamos[item.prestamos.length - 1];
    var k = item.tasa_k;
    var pct = item.porcentaje_mensual.toFixed(2);

    var proyeccionFinal = Math.round(proyectar(x0, k, periodos));

    document.getElementById('resultadoBox').classList.add('visible');
    document.getElementById('resultadoTexto').innerHTML = 
        'El análisis muestra una tasa del <strong>' + pct + '% mensual</strong>. ' +
        'En ' + periodos + ' meses se estiman <strong>' + proyeccionFinal + ' préstamos</strong>.';
    
    // Aquí llamarías a la función de la gráfica de proyecciones usando k e item.prestamos
}

// ====================== INIT ======================
(function() {
    document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);
    document.getElementById('projTipo').addEventListener('change', llenarSeleccion);

    cargarDatos().then(() => {
        renderResumen();
        renderLibros();
        renderCategorias();
        llenarSeleccion();
        document.getElementById('loadingOverlay').classList.add('hidden');
    });
})();