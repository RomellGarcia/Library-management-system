// ====================== VARIABLES GLOBALES ======================
var DATA = null;
var STATS = null;
var chartInstances = {};
var PALETTE = ['#A02142', '#BC955B', '#7A1832', '#D4AF72', '#C4345A', '#5C3D2E', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100'];

// ====================== CÁLCULOS Y UTILIDADES ======================

// La fórmula de la Ley de Crecimiento y Decaimiento
function proyectar(x0, k, t) {
    return x0 * Math.exp(k * t);
}

// Convertir tasa a porcentaje (Usado para mostrar en UI)
function tasaAPorcentaje(k) {
    return ((Math.exp(k) - 1) * 100).toFixed(1);
}

function colorAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function formatearMes(ym) {
    var partes = ym.split('-');
    var nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var idx = parseInt(partes[1], 10) - 1;
    return nombres[idx] + ' ' + partes[0].substring(2);
}

function destruirChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        chartInstances[id] = null;
    }
}

function obtenerRecomendacion(k) {
    if (k > 0.1) return { texto: 'Adquirir más ejemplares', clase: 'alta' };
    if (k > 0.02) return { texto: 'Mantener acervo', clase: 'media' };
    if (k > -0.02) return { texto: 'Sin cambios', clase: 'media' };
    if (k > -0.1) return { texto: 'Monitorear', clase: 'baja' };
    return { texto: 'Considerar baja', clase: 'critica' };
}

function obtenerTendenciaTexto(k) {
    if (k > 0.05) return 'Crecimiento alto';
    if (k > 0) return 'Crecimiento moderado';
    if (k > -0.05) return 'Decrecimiento leve';
    return 'Decrecimiento marcado';
}

// Configuración de Chart.js
Chart.defaults.font.family = "'Source Sans 3', sans-serif";
Chart.defaults.color = '#6B6B6B';

// ====================== CARGA DE DATOS ======================

function cargarDatos() {
    var urlPrestamos = '/api/reportes/prestamos-por-mes?meses=6';
    var urlStats = '/api/reportes/estadisticas';

    // Usamos fetchConToken como en tu código original
    return Promise.all([
        fetchConToken(urlPrestamos).then(function(r) { return r.json(); }),
        fetchConToken(urlStats).then(function(r) { return r.json(); })
    ])
    .then(function(resultados) {
        var resPrestamos = resultados[0];
        var resStats = resultados[1];

        if (!resPrestamos.success) throw new Error(resPrestamos.message || 'Error al obtener datos');

        DATA = resPrestamos.data;
        STATS = resStats.success ? resStats.data : null;
        return true;
    });
}

// ====================== RENDERIZADO DE SECCIONES ======================

function renderResumen() {
    if (!DATA) return;
    var mesesLabel = DATA.meses.map(formatearMes);

    var totalesMes = DATA.meses.map(function(_, idx) {
        return DATA.categorias.reduce(function(acc, c) { return acc + (c.prestamos[idx] || 0); }, 0);
    });

    var totalActual = totalesMes[totalesMes.length - 1] || 0;
    var totalAnterior = totalesMes.length >= 2 ? totalesMes[totalesMes.length - 2] : 0;
    var cambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : 0;

    // Tarjetas de estadísticas superiores
    var html = '';
    html += '<div class="stat-card"><div class="stat-label">Préstamos Este Mes</div><div class="stat-value">' + totalActual + '</div>';
    html += '<div class="stat-change ' + (cambio >= 0 ? 'up' : 'down') + '">' + (cambio >= 0 ? 'Sube' : 'Baja') + ' ' + Math.abs(cambio) + '% vs mes anterior</div></div>';
    
    html += '<div class="stat-card"><div class="stat-label">Libros en Acervo</div><div class="stat-value">' + (STATS ? STATS.total_libros : DATA.libros.length) + '</div><div class="stat-desc">Títulos disponibles</div></div>';
    html += '<div class="stat-card"><div class="stat-label">Préstamos Activos</div><div class="stat-value">' + (STATS ? STATS.prestamos_activos : 0) + '</div><div class="stat-desc">En manos de usuarios</div></div>';
    
    var librosCrec = DATA.libros.filter(l => l.tasa_k > 0).length;
    html += '<div class="stat-card"><div class="stat-label">Títulos en Crecimiento</div><div class="stat-value">' + librosCrec + '</div><div class="stat-desc">Con demanda al alza</div></div>';
    
    document.getElementById('statsGrid').innerHTML = html;

    // Chart de barras principal
    destruirChart('chartPrestamosMes');
    chartInstances['chartPrestamosMes'] = new Chart(document.getElementById('chartPrestamosMes'), {
        type: 'bar',
        data: {
            labels: mesesLabel,
            datasets: [{
                label: 'Préstamos',
                data: totalesMes,
                backgroundColor: totalesMes.map((_, i) => i === totalesMes.length -1 ? '#A02142' : colorAlpha('#A02142', 0.5)),
                borderRadius: 8
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    // Donut de Categorías (Distribución Actual)
    destruirChart('chartCategorias');
    chartInstances['chartCategorias'] = new Chart(document.getElementById('chartCategorias'), {
        type: 'doughnut',
        data: {
            labels: DATA.categorias.map(c => c.nombre),
            datasets: [{
                data: DATA.categorias.map(c => c.prestamos[c.prestamos.length - 1] || 0),
                backgroundColor: PALETTE,
                borderWidth: 2
            }]
        },
        options: { responsive: true, cutout: '65%' }
    });

    // Listas de Recomendación (Categorías)
    var catOrdenadas = [...DATA.categorias].sort((a, b) => b.tasa_k - a.tasa_k);
    
    var htmlCrec = '';
    catOrdenadas.filter(c => c.tasa_k > 0).slice(0, 5).forEach(c => {
        htmlCrec += '<li><span class="reco-titulo">' + c.nombre + '</span><span class="reco-cambio up">+' + c.porcentaje_mensual.toFixed(1) + '%/mes</span></li>';
    });
    document.getElementById('categoriasCrecimiento').innerHTML = htmlCrec || '<li>Sin datos suficientes</li>';

    var htmlDec = '';
    catOrdenadas.filter(c => c.tasa_k < 0).reverse().slice(0, 5).forEach(c => {
        htmlDec += '<li><span class="reco-titulo">' + c.nombre + '</span><span class="reco-cambio down">' + c.porcentaje_mensual.toFixed(1) + '%/mes</span></li>';
    });
    document.getElementById('categoriasDecrecimiento').innerHTML = htmlDec || '<li>Sin datos suficientes</li>';
}

function renderLibros() {
    if (!DATA) return;
    
    // Tabla de Libros
    var tbodyHTML = '';
    var librosOrdenados = [...DATA.libros].sort((a, b) => b.tasa_k - a.tasa_k);
    
    librosOrdenados.forEach(function(l) {
        var x0 = l.prestamos[l.prestamos.length - 1] || 0;
        var anterior = l.prestamos.length >= 2 ? l.prestamos[l.prestamos.length - 2] : 0;
        var proy = Math.round(proyectar(x0, l.tasa_k, 1));
        var reco = obtenerRecomendacion(l.tasa_k);

        tbodyHTML += '<tr>' +
            '<td><strong>' + l.nombre + '</strong></td>' +
            '<td>' + l.categoria + '</td>' +
            '<td style="text-align:center">' + anterior + '</td>' +
            '<td style="text-align:center"><strong>' + x0 + '</strong></td>' +
            '<td style="text-align:center;color:' + (l.tasa_k >= 0 ? '#2E7D32' : '#E65100') + ';font-weight:600">' + proy + '</td>' +
            '<td><span class="badge ' + reco.clase + '">' + reco.texto + '</span></td>' +
            '</tr>';
    });
    document.getElementById('tablaLibros').innerHTML = tbodyHTML;

    // Chart Top 10 Horizontal
    var top10 = librosOrdenados.slice(0, 10);
    destruirChart('chartTopLibros');
    chartInstances['chartTopLibros'] = new Chart(document.getElementById('chartTopLibros'), {
        type: 'bar',
        data: {
            labels: top10.map(l => l.nombre.substring(0, 20) + '...'),
            datasets: [{
                label: 'Mes Actual',
                data: top10.map(l => l.prestamos[l.prestamos.length - 1]),
                backgroundColor: '#A02142'
            }]
        },
        options: { indexAxis: 'y', responsive: true }
    });
}

function renderCategorias() {
    if (!DATA) return;
    var mesesLabel = DATA.meses.map(formatearMes);

    // Gráfico de líneas (Evolución de Categorías)
    destruirChart('chartCategoriasLinea');
    chartInstances['chartCategoriasLinea'] = new Chart(document.getElementById('chartCategoriasLinea'), {
        type: 'line',
        data: {
            labels: mesesLabel,
            datasets: DATA.categorias.map((c, i) => ({
                label: c.nombre,
                data: c.prestamos,
                borderColor: PALETTE[i % PALETTE.length],
                tension: 0.3,
                fill: false
            }))
        },
        options: { responsive: true }
    });

    // Gráfico Radar (Comparativa de Crecimiento)
    destruirChart('chartRadar');
    chartInstances['chartRadar'] = new Chart(document.getElementById('chartRadar'), {
        type: 'radar',
        data: {
            labels: DATA.categorias.map(c => c.nombre),
            datasets: [{
                label: 'Mes Actual',
                data: DATA.categorias.map(c => c.prestamos[c.prestamos.length - 1]),
                borderColor: '#A02142',
                backgroundColor: colorAlpha('#A02142', 0.2)
            }]
        }
    });
}

// ====================== SECCIÓN PROYECCIÓN ======================

function calcularProyeccion() {
    var tipo = document.getElementById('projTipo').value;
    var seleccion = document.getElementById('projSeleccion').value;
    var periodos = parseInt(document.getElementById('projPeriodos').value) || 3;

    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    var item = items.find(i => i.nombre === seleccion);
    if (!item) return;

    var x0 = item.prestamos[item.prestamos.length - 1] || 0;
    var k = item.tasa_k;
    var pct = item.porcentaje_mensual.toFixed(1);

    var proyecciones = [];
    var etiquetasFuturas = [];
    for (var i = 1; i <= periodos; i++) {
        proyecciones.push(Math.round(proyectar(x0, k, i)));
        etiquetasFuturas.push("Mes +" + i);
    }

    // Actualizar Panel de Resultados
    document.getElementById('resultadoBox').classList.add('visible');
    var recomendacion = obtenerRecomendacion(k);
    
    document.getElementById('resultadoTexto').innerHTML = 
        'Análisis: Tendencia de <strong>' + (k >= 0 ? '+' : '') + pct + '%</strong> mensual. ' +
        'Se estiman <strong>' + proyecciones[periodos-1] + '</strong> préstamos en ' + periodos + ' meses.';
    
    document.getElementById('resultadoReco').textContent = 'Sugerencia: ' + recomendacion.texto;

    // Chart de Proyección
    destruirChart('chartProyeccion');
    chartInstances['chartProyeccion'] = new Chart(document.getElementById('chartProyeccion'), {
        type: 'line',
        data: {
            labels: DATA.meses.map(formatearMes).concat(etiquetasFuturas),
            datasets: [
                {
                    label: 'Histórico',
                    data: item.prestamos.concat(new Array(periodos).fill(null)),
                    borderColor: '#A02142',
                    fill: false,
                    pointRadius: 5
                },
                {
                    label: 'Proyección',
                    data: new Array(item.prestamos.length - 1).fill(null).concat([x0]).concat(proyecciones),
                    borderColor: '#BC955B',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 5
                }
            ]
        }
    });
}

// ====================== INICIALIZACIÓN ======================

function initTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.nav-tab, .section').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('sec-' + tab.dataset.section).classList.add('active');
        });
    });
}

function llenarSeleccion() {
    var tipo = document.getElementById('projTipo').value;
    var sel = document.getElementById('projSeleccion');
    sel.innerHTML = '';
    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    items.forEach(item => {
        var opt = document.createElement('option');
        opt.value = item.nombre;
        opt.textContent = item.nombre;
        sel.appendChild(opt);
    });
}

(function() {
    initTabs();
    cargarDatos()
        .then(() => {
            renderResumen();
            renderLibros();
            renderCategorias();
            llenarSeleccion();

            document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);
            document.getElementById('projTipo').addEventListener('change', llenarSeleccion);
            document.getElementById('loadingOverlay').classList.add('hidden');
        })
        .catch(err => {
            console.error(err);
            document.getElementById('loadingOverlay').classList.add('hidden');
            // Aquí podrías mostrar el mensaje de error en la UI si tienes el elemento
        });
})();