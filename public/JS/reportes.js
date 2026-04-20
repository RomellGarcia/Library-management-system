// VARIABLES GLOBALES
var DATA = null;
var STATS = null;
var chartInstances = {};
var PALETTE = ['#A02142', '#BC955B', '#7A1832', '#D4AF72', '#C4345A', '#5C3D2E', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100'];

// ====================== CALCULOS INTERNOS ======================
// ====================== CÁLCULOS INTERNOS (RESTAURADOS) ======================

function calcularTasa(x0, x1, deltaT) {
    if (x0 <= 0 || x1 <= 0 || deltaT <= 0) return 0;
    return Math.log(x1 / x0) / deltaT;
}

function proyectar(x0, k, t) {
    return x0 * Math.exp(k * t);
}

// Mantenemos esta para compatibilidad con tus filtros actuales
function calcularTasaPromedio(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;
    var primerIndice = prestamos.findIndex(p => p > 0);
    var ultimoIndice = -1;
    for (var i = prestamos.length - 1; i >= 0; i--) {
        if (prestamos[i] > 0) {
            ultimoIndice = i;
            break;
        }
    }
    if (primerIndice === -1 || ultimoIndice === -1 || primerIndice === ultimoIndice) return 0;
    
    var deltaT = ultimoIndice - primerIndice;
    var xStart = prestamos[primerIndice];
    var xEnd = prestamos[ultimoIndice];
    var k = Math.log(xEnd / xStart) / deltaT;

    return isFinite(k) ? k : 0;
}

function tasaAPorcentaje(k) {
    return ((Math.exp(k) - 1) * 100).toFixed(1);
}

// ====================== UTILIDADES DE DISEÑO ======================

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

// CHART.JS DEFAULTS
Chart.defaults.font.family = "'Source Sans 3', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B6B6B';


function cargarDatos() {
    var urlPrestamos = '/api/reportes/prestamos-por-mes?meses=6';
    var urlStats = '/api/reportes/estadisticas';

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

function initTabs() {
    var tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
            document.getElementById('sec-' + tab.getAttribute('data-section')).classList.add('active');
        });
    });
}


function renderResumen() {
    if (!DATA || !DATA.meses || DATA.meses.length === 0) return;

    var mesesLabel = DATA.meses.map(formatearMes);

    var totalesMes = DATA.meses.map(function(mes, idx) {
        var total = 0;
        DATA.categorias.forEach(function(c) {
            total += (c.prestamos[idx] || 0);
        });
        return total;
    });

    var totalActual = totalesMes[totalesMes.length - 1] || 0;
    var totalAnterior = totalesMes.length >= 2 ? totalesMes[totalesMes.length - 2] : 0;
    var cambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : 0;

    // Usamos la tasa_k que viene del servidor para el conteo de libros en crecimiento
    var librosCrec = DATA.libros.filter(function(l) { return l.tasa_k > 0; }).length;

    var totalLibros = STATS ? STATS.total_libros : DATA.libros.length;
    var prestamosActivos = STATS ? STATS.prestamos_activos : 0;

    var html = '';
    html += '<div class="stat-card"><div class="stat-label">Préstamos Este Mes</div><div class="stat-value">' + totalActual + '</div>';
    html += '<div class="stat-change ' + (cambio >= 0 ? 'up' : 'down') + '">' + (cambio >= 0 ? 'Sube' : 'Baja') + ' ' + Math.abs(cambio) + '% vs mes anterior</div></div>';

    html += '<div class="stat-card"><div class="stat-label">Libros en el Acervo</div><div class="stat-value">' + totalLibros + '</div>';
    html += '<div class="stat-desc">Títulos disponibles para préstamo</div></div>';

    html += '<div class="stat-card"><div class="stat-label">Préstamos Activos</div><div class="stat-value">' + prestamosActivos + '</div>';
    html += '<div class="stat-desc">Libros actualmente prestados</div></div>';

    html += '<div class="stat-card"><div class="stat-label">Libros con Movimiento</div><div class="stat-value">' + librosCrec + '</div>';
    html += '<div class="stat-desc">Títulos con demanda creciente</div></div>';

    document.getElementById('statsGrid').innerHTML = html;

    // Chart préstamos por mes (Barras)
    destruirChart('chartPrestamosMes');
    chartInstances['chartPrestamosMes'] = new Chart(document.getElementById('chartPrestamosMes'), {
        type: 'bar',
        data: {
            labels: mesesLabel,
            datasets: [{
                label: 'Préstamos',
                data: totalesMes,
                backgroundColor: totalesMes.map(function(_, i) {
                    return i === totalesMes.length - 1 ? '#A02142' : colorAlpha('#A02142', 0.55);
                }),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });

    // Chart categorías (Donut)
    var catActual = DATA.categorias.map(function(c) {
        return c.prestamos[c.prestamos.length - 1] || 0;
    });
    destruirChart('chartCategorias');
    chartInstances['chartCategorias'] = new Chart(document.getElementById('chartCategorias'), {
        type: 'doughnut',
        data: {
            labels: DATA.categorias.map(function(c) { return c.nombre; }),
            datasets: [{
                data: catActual,
                backgroundColor: DATA.categorias.map(function(_, i) { return PALETTE[i % PALETTE.length]; }),
                borderWidth: 3,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } }
        }
    });

    // Listas de Crecimiento y Decrecimiento de Categorías
    var catsSorted = [...DATA.categorias].sort((a, b) => b.tasa_k - a.tasa_k);

    var htmlCrec = '';
    catsSorted.filter(c => c.tasa_k > 0).slice(0, 5).forEach(function(c) {
        var pct = c.porcentaje_mensual.toFixed(1);
        var ultimo = c.prestamos[c.prestamos.length - 1];
        htmlCrec += '<li><span class="reco-titulo">' + c.nombre + '<small>' + ultimo + ' préstamos</small></span>';
        htmlCrec += '<span class="reco-cambio up">+' + pct + '% / mes</span></li>';
    });
    document.getElementById('categoriasCrecimiento').innerHTML = htmlCrec || '<li class="empty">Sin datos</li>';

    var htmlDec = '';
    catsSorted.filter(c => c.tasa_k < 0).reverse().slice(0, 5).forEach(function(c) {
        var pct = c.porcentaje_mensual.toFixed(1);
        var ultimo = c.prestamos[c.prestamos.length - 1];
        htmlDec += '<li><span class="reco-titulo">' + c.nombre + '<small>' + ultimo + ' préstamos</small></span>';
        htmlDec += '<span class="reco-cambio down">' + pct + '% / mes</span></li>';
    });
    document.getElementById('categoriasDecrecimiento').innerHTML = htmlDec || '<li class="empty">Sin datos</li>';
}

/// SECCIÓN: LIBROS
function renderLibros() {
    if (!DATA || DATA.libros.length === 0) return;

    var librosOrdenados = [...DATA.libros].sort(function(a, b) { return b.tasa_k - a.tasa_k; });

    // Listas de Recomendación (Libros)
    var htmlCrec = '';
    librosOrdenados.filter(l => l.tasa_k > 0).slice(0, 6).forEach(function(l) {
        var pct = l.porcentaje_mensual.toFixed(1);
        htmlCrec += '<li><span class="reco-titulo">' + l.nombre + '<small>' + l.categoria + '</small></span>';
        htmlCrec += '<span class="reco-cambio up">+' + pct + '% / mes</span></li>';
    });
    document.getElementById('librosCrecimiento').innerHTML = htmlCrec || '<li class="empty">Sin datos</li>';

    var htmlDec = '';
    librosOrdenados.filter(l => l.tasa_k < 0).reverse().slice(0, 6).forEach(function(l) {
        var pct = l.porcentaje_mensual.toFixed(1);
        htmlDec += '<li><span class="reco-titulo">' + l.nombre + '<small>' + l.categoria + '</small></span>';
        htmlDec += '<span class="reco-cambio down">' + pct + '% / mes</span></li>';
    });
    document.getElementById('librosDecrecimiento').innerHTML = htmlDec || '<li class="empty">Sin datos</li>';

    // Tabla de Libros
    var tbodyHTML = '';
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

    // Chart Top 10 (Barras Horizontales)
    var top10 = librosOrdenados.slice(0, 10);
    destruirChart('chartTopLibros');
    chartInstances['chartTopLibros'] = new Chart(document.getElementById('chartTopLibros'), {
        type: 'bar',
        data: {
            labels: top10.map(l => l.nombre.length > 20 ? l.nombre.substring(0, 20) + '...' : l.nombre),
            datasets: [
                {
                    label: 'Mes anterior',
                    data: top10.map(l => l.prestamos.length >= 2 ? l.prestamos[l.prestamos.length - 2] : 0),
                    backgroundColor: colorAlpha('#BC955B', 0.7),
                    borderRadius: 6
                },
                {
                    label: 'Mes actual',
                    data: top10.map(l => l.prestamos[l.prestamos.length - 1]),
                    backgroundColor: colorAlpha('#A02142', 0.85),
                    borderRadius: 6
                }
            ]
        },
        options: { indexAxis: 'y', responsive: true, scales: { x: { beginAtZero: true } } }
    });
}

// SECCIÓN: CATEGORÍAS
function renderCategorias() {
    if (!DATA || DATA.categorias.length === 0) return;
    var mesesLabel = DATA.meses.map(formatearMes);

    // Gráfico de Líneas (Evolución)
    destruirChart('chartCategoriasLinea');
    chartInstances['chartCategoriasLinea'] = new Chart(document.getElementById('chartCategoriasLinea'), {
        type: 'line',
        data: {
            labels: mesesLabel,
            datasets: DATA.categorias.map((c, i) => ({
                label: c.nombre,
                data: c.prestamos,
                borderColor: PALETTE[i % PALETTE.length],
                tension: 0.35,
                fill: false,
                pointRadius: 4
            }))
        }
    });

    // Tabla de Categorías
    var tbHTML = '';
    DATA.categorias.forEach(function(c) {
        var reco = obtenerRecomendacion(c.tasa_k);
        var tendencia = obtenerTendenciaTexto(c.tasa_k);
        var total = c.prestamos.reduce((a, b) => a + b, 0);
        tbHTML += '<tr>' +
            '<td><strong>' + c.nombre + '</strong></td>' +
            '<td style="text-align:center">' + total + '</td>' +
            '<td style="text-align:center">' + (total / c.prestamos.length).toFixed(1) + '</td>' +
            '<td style="color:' + (c.tasa_k >= 0 ? '#2E7D32' : '#E65100') + ';font-weight:600">' + tendencia + '</td>' +
            '<td><span class="badge ' + reco.clase + '">' + reco.texto + '</span></td>' +
            '</tr>';
    });
    document.getElementById('tablaCategorias').innerHTML = tbHTML;

    // Gráfico Radar
    destruirChart('chartRadar');
    chartInstances['chartRadar'] = new Chart(document.getElementById('chartRadar'), {
        type: 'radar',
        data: {
            labels: DATA.categorias.map(c => c.nombre),
            datasets: [{
                label: 'Mes Actual',
                data: DATA.categorias.map(c => c.prestamos[c.prestamos.length - 1]),
                borderColor: '#A02142',
                backgroundColor: colorAlpha('#A02142', 0.15)
            }, {
                label: 'Estimación Próximo Mes',
                data: DATA.categorias.map(c => Math.round(proyectar(c.prestamos[c.prestamos.length - 1], c.tasa_k, 1))),
                borderColor: '#BC955B',
                borderDash: [5, 5],
                fill: false
            }]
        }
    });
}

// SECCIÓN: PROYECCIÓN (CÁLCULO FINAL)
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

    document.getElementById('resultadoBox').classList.add('visible');
    document.getElementById('resultadoTitulo').textContent = 'Estimación para: ' + item.nombre;
    
    var tendencia = obtenerTendenciaTexto(k);
    document.getElementById('resultadoTexto').innerHTML = 
        'Análisis: Tendencia de <strong>' + (k >= 0 ? '+' : '') + pct + '%</strong> mensual (' + tendencia + '). ' +
        'En ' + periodos + ' meses se esperan <strong>' + proyecciones[periodos-1] + '</strong> préstamos.';

    document.getElementById('resultadoReco').textContent = 'Sugerencia: ' + obtenerRecomendacion(k).texto;

    destruirChart('chartProyeccion');
    chartInstances['chartProyeccion'] = new Chart(document.getElementById('chartProyeccion'), {
        type: 'line',
        data: {
            labels: DATA.meses.map(formatearMes).concat(etiquetasFuturas),
            datasets: [
                {
                    label: 'Datos Reales',
                    data: item.prestamos.concat(new Array(periodos).fill(null)),
                    borderColor: '#A02142',
                    backgroundColor: colorAlpha('#A02142', 0.1),
                    fill: true, tension: 0.3
                },
                {
                    label: 'Proyección Matemática',
                    data: new Array(item.prestamos.length - 1).fill(null).concat([x0]).concat(proyecciones),
                    borderColor: '#BC955B',
                    borderDash: [8, 4],
                    fill: false, tension: 0.3, pointStyle: 'triangle', pointRadius: 6
                }
            ]
        }
    });
}

// INICIALIZACIÓN FINAL
(function() {
    initTabs();
    cargarDatos().then(() => {
        renderResumen();
        renderLibros();
        renderCategorias();
        llenarSeleccion();
        document.getElementById('projTipo').addEventListener('change', llenarSeleccion);
        document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);
        document.getElementById('loadingOverlay').classList.add('hidden');
    }).catch(err => {
        console.error(err);
        document.getElementById('loadingOverlay').classList.add('hidden');
    });
})();