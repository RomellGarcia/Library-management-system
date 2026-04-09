// reportes.js - Modulo de Reportes y Estadisticas
// Consume: GET /api/reportes/prestamos-por-mes
//          GET /api/reportes/estadisticas

// ============================================================
// VARIABLES GLOBALES
// ============================================================
var DATA = null;       // { meses: [], libros: [], categorias: [] }
var STATS = null;      // { total_mes_actual, total_mes_anterior, ... }
var chartInstances = {};
var PALETTE = ['#A02142', '#BC955B', '#7A1832', '#D4AF72', '#C4345A', '#5C3D2E', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100'];

// ============================================================
// UTILIDADES MATEMATICAS - LEY DE CRECIMIENTO Y DECRECIMIENTO
// ============================================================

// Calcular constante k: k = ln(x1/x0) / delta_t
function calcularK(x0, x1, deltaT) {
    if (x0 <= 0 || x1 <= 0 || deltaT <= 0) return 0;
    return Math.log(x1 / x0) / deltaT;
}

// Proyeccion: x(t) = x0 * e^(kt)
function proyectar(x0, k, t) {
    return x0 * Math.exp(k * t);
}

// Calcular k promedio de un arreglo de prestamos mes a mes
function calcularKPromedio(prestamos) {
    var suma = 0;
    var count = 0;
    for (var i = 1; i < prestamos.length; i++) {
        if (prestamos[i - 1] > 0 && prestamos[i] > 0) {
            suma += calcularK(prestamos[i - 1], prestamos[i], 1);
            count++;
        }
    }
    return count > 0 ? suma / count : 0;
}

function colorAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// Formatear nombre de mes YYYY-MM a texto corto
function formatearMes(ym) {
    var partes = ym.split('-');
    var nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var idx = parseInt(partes[1], 10) - 1;
    return nombres[idx] + ' ' + partes[0].substring(2);
}

// Destruir chart si existe
function destruirChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        chartInstances[id] = null;
    }
}

// ============================================================
// CHART.JS DEFAULTS
// ============================================================
Chart.defaults.font.family = "'Source Sans 3', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B6B6B';

// ============================================================
// CARGA DE DATOS DESDE API
// ============================================================
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

        if (!resPrestamos.success) {
            throw new Error(resPrestamos.message || 'Error al obtener prestamos');
        }

        DATA = resPrestamos.data;
        STATS = resStats.success ? resStats.data : null;

        return true;
    });
}

// ============================================================
// TABS
// ============================================================
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

// ============================================================
// SECCION: RESUMEN GENERAL
// ============================================================
function renderResumen() {
    if (!DATA || !DATA.meses || DATA.meses.length === 0) return;

    var mesesLabel = DATA.meses.map(formatearMes);

    // Totales por mes
    var totalesMes = DATA.meses.map(function(mes, idx) {
        var total = 0;
        DATA.categorias.forEach(function(c) {
            total += (c.prestamos[idx] || 0);
        });
        return total;
    });

    // Stats cards
    var totalActual = totalesMes[totalesMes.length - 1] || 0;
    var totalAnterior = totalesMes.length >= 2 ? totalesMes[totalesMes.length - 2] : 0;
    var cambio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1) : 0;
    var kGlobal = calcularKPromedio(totalesMes);

    var librosCrec = DATA.libros.filter(function(l) { return calcularKPromedio(l.prestamos) > 0; }).length;
    var librosDec = DATA.libros.length - librosCrec;

    var totalLibros = STATS ? STATS.total_libros : DATA.libros.length;
    var prestamosActivos = STATS ? STATS.prestamos_activos : '—';

    var html = '';
    html += '<div class="stat-card"><div class="stat-label">Prestamos (Ultimo Mes)</div><div class="stat-value">' + totalActual + '</div>';
    html += '<div class="stat-change ' + (cambio >= 0 ? 'up' : 'down') + '">' + (cambio >= 0 ? 'Arriba' : 'Abajo') + ' ' + Math.abs(cambio) + '% vs mes anterior</div></div>';

    html += '<div class="stat-card"><div class="stat-label">Libros en Acervo</div><div class="stat-value">' + totalLibros + '</div>';
    html += '<div class="stat-change up">Activos en circulacion</div></div>';

    html += '<div class="stat-card"><div class="stat-label">Constante k Global</div><div class="stat-value">' + (kGlobal >= 0 ? '+' : '') + kGlobal.toFixed(4) + '</div>';
    html += '<div class="stat-change ' + (kGlobal >= 0 ? 'up' : 'down') + '">' + (kGlobal >= 0 ? 'Crecimiento' : 'Decrecimiento') + '</div></div>';

    html += '<div class="stat-card"><div class="stat-label">Tendencia de Libros</div><div class="stat-value">' + librosCrec + ' / ' + librosDec + '</div>';
    html += '<div class="stat-change up">' + librosCrec + ' crecen, ' + librosDec + ' decrecen</div></div>';

    document.getElementById('statsGrid').innerHTML = html;

    // Chart prestamos por mes
    destruirChart('chartPrestamosMes');
    chartInstances['chartPrestamosMes'] = new Chart(document.getElementById('chartPrestamosMes'), {
        type: 'bar',
        data: {
            labels: mesesLabel,
            datasets: [{
                label: 'Prestamos totales',
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
                y: { beginAtZero: true, grid: { color: '#E0D8D0' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Chart categorias donut
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
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } }
            }
        }
    });

    // Interpretacion
    if (DATA.categorias.length > 0) {
        var catMayor = DATA.categorias.reduce(function(max, c) {
            return calcularKPromedio(c.prestamos) > calcularKPromedio(max.prestamos) ? c : max;
        });
        var catMenor = DATA.categorias.reduce(function(min, c) {
            return calcularKPromedio(c.prestamos) < calcularKPromedio(min.prestamos) ? c : min;
        });
        document.getElementById('interpretacionGeneral').innerHTML =
            'Aplicando la Ley de Crecimiento y Decrecimiento a los datos de la biblioteca, la <strong>constante k global es ' + (kGlobal >= 0 ? '+' : '') + kGlobal.toFixed(4) + '</strong>, lo que indica una tendencia general de <strong>' + (kGlobal >= 0 ? 'crecimiento' : 'decrecimiento') + '</strong> en los prestamos. ' +
            'La categoria con mayor crecimiento es <strong class="k-positive">' + catMayor.nombre + '</strong> (k = ' + calcularKPromedio(catMayor.prestamos).toFixed(4) + '), ' +
            'mientras que <strong class="k-negative">' + catMenor.nombre + '</strong> muestra la mayor caida (k = ' + calcularKPromedio(catMenor.prestamos).toFixed(4) + '). ' +
            'Esto sugiere que conviene adquirir mas titulos de <strong>' + catMayor.nombre + '</strong> y evaluar la relevancia del acervo de <strong>' + catMenor.nombre + '</strong>.';
    }
}

// ============================================================
// SECCION: ANALISIS POR LIBROS
// ============================================================
function renderLibros() {
    if (!DATA || DATA.libros.length === 0) return;

    var librosConK = DATA.libros.map(function(l) {
        var k = calcularKPromedio(l.prestamos);
        var x0 = l.prestamos[l.prestamos.length - 1] || 0;
        var anterior = l.prestamos.length >= 2 ? l.prestamos[l.prestamos.length - 2] : 0;
        var proy = x0 > 0 ? Math.round(proyectar(x0, k, 1)) : 0;
        return {
            nombre: l.nombre,
            categoria: l.categoria || 'Sin categoria',
            anterior: anterior,
            actual: x0,
            k: k,
            proyeccion: proy,
            prestamos: l.prestamos
        };
    });

    librosConK.sort(function(a, b) { return b.k - a.k; });

    // Tabla
    var tbodyHTML = '';
    librosConK.forEach(function(libro) {
        var trend = libro.k >= 0 ? 'growth' : 'decay';
        var trendText = libro.k >= 0 ? 'Crecimiento' : 'Decrecimiento';
        tbodyHTML += '<tr>' +
            '<td><strong>' + libro.nombre + '</strong></td>' +
            '<td>' + libro.categoria + '</td>' +
            '<td style="text-align:center">' + libro.anterior + '</td>' +
            '<td style="text-align:center">' + libro.actual + '</td>' +
            '<td style="text-align:center;font-weight:700;color:' + (libro.k >= 0 ? '#2E7D32' : '#E65100') + '">' + (libro.k >= 0 ? '+' : '') + libro.k.toFixed(4) + '</td>' +
            '<td><span class="trend-badge ' + trend + '">' + (libro.k >= 0 ? 'Arriba ' : 'Abajo ') + trendText + '</span></td>' +
            '<td style="text-align:center;font-weight:600">' + libro.proyeccion + '</td>' +
            '</tr>';
    });
    document.getElementById('tablaLibros').innerHTML = tbodyHTML;

    // Top 10
    var top10 = librosConK.slice(0, 10);
    destruirChart('chartTopLibros');
    chartInstances['chartTopLibros'] = new Chart(document.getElementById('chartTopLibros'), {
        type: 'bar',
        data: {
            labels: top10.map(function(l) { return l.nombre; }),
            datasets: [
                {
                    label: 'Periodo Anterior',
                    data: top10.map(function(l) { return l.anterior; }),
                    backgroundColor: colorAlpha('#BC955B', 0.7),
                    borderRadius: 6, borderSkipped: false
                },
                {
                    label: 'Periodo Actual',
                    data: top10.map(function(l) { return l.actual; }),
                    backgroundColor: colorAlpha('#A02142', 0.85),
                    borderRadius: 6, borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#E0D8D0' } },
                y: { grid: { display: false } }
            }
        }
    });

    // Crecimiento / Decrecimiento
    var crec = librosConK.filter(function(l) { return l.k > 0; }).slice(0, 6);
    var dec = librosConK.filter(function(l) { return l.k < 0; }).reverse().slice(0, 6);

    destruirChart('chartLibrosCrecimiento');
    chartInstances['chartLibrosCrecimiento'] = new Chart(document.getElementById('chartLibrosCrecimiento'), {
        type: 'bar',
        data: {
            labels: crec.map(function(l) { return l.nombre; }),
            datasets: [{
                label: 'Constante k',
                data: crec.map(function(l) { return l.k; }),
                backgroundColor: colorAlpha('#2E7D32', 0.7),
                borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' } },
                x: { grid: { display: false }, ticks: { maxRotation: 45 } }
            }
        }
    });

    destruirChart('chartLibrosDecrecimiento');
    chartInstances['chartLibrosDecrecimiento'] = new Chart(document.getElementById('chartLibrosDecrecimiento'), {
        type: 'bar',
        data: {
            labels: dec.map(function(l) { return l.nombre; }),
            datasets: [{
                label: 'Constante k',
                data: dec.map(function(l) { return l.k; }),
                backgroundColor: colorAlpha('#E65100', 0.7),
                borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#E0D8D0' } },
                x: { grid: { display: false }, ticks: { maxRotation: 45 } }
            }
        }
    });
}

// ============================================================
// SECCION: ANALISIS POR CATEGORIAS
// ============================================================
function renderCategorias() {
    if (!DATA || DATA.categorias.length === 0) return;

    var mesesLabel = DATA.meses.map(formatearMes);

    // Linea temporal
    destruirChart('chartCategoriasLinea');
    chartInstances['chartCategoriasLinea'] = new Chart(document.getElementById('chartCategoriasLinea'), {
        type: 'line',
        data: {
            labels: mesesLabel,
            datasets: DATA.categorias.map(function(c, i) {
                var color = PALETTE[i % PALETTE.length];
                return {
                    label: c.nombre,
                    data: c.prestamos,
                    borderColor: color,
                    backgroundColor: colorAlpha(color, 0.1),
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: color
                };
            })
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Tabla categorias
    var catsConK = DATA.categorias.map(function(c) {
        var k = calcularKPromedio(c.prestamos);
        var total = c.prestamos.reduce(function(s, v) { return s + v; }, 0);
        var prom = (total / c.prestamos.length).toFixed(1);
        var recomendacion = k > 0.05 ? 'Adquirir mas titulos' : (k > 0 ? 'Mantener acervo' : (k > -0.05 ? 'Monitorear tendencia' : 'Reducir adquisiciones'));
        return { nombre: c.nombre, total: total, promedio: prom, k: k, recomendacion: recomendacion, prestamos: c.prestamos };
    });

    catsConK.sort(function(a, b) { return b.k - a.k; });

    var tbHTML = '';
    catsConK.forEach(function(c) {
        var trend = c.k >= 0 ? 'growth' : 'decay';
        var trendText = c.k >= 0 ? 'Crecimiento' : 'Decrecimiento';
        tbHTML += '<tr>' +
            '<td><strong>' + c.nombre + '</strong></td>' +
            '<td style="text-align:center">' + c.total + '</td>' +
            '<td style="text-align:center">' + c.promedio + '</td>' +
            '<td style="text-align:center;font-weight:700;color:' + (c.k >= 0 ? '#2E7D32' : '#E65100') + '">' + (c.k >= 0 ? '+' : '') + c.k.toFixed(4) + '</td>' +
            '<td><span class="trend-badge ' + trend + '">' + trendText + '</span></td>' +
            '<td>' + c.recomendacion + '</td>' +
            '</tr>';
    });
    document.getElementById('tablaCategorias').innerHTML = tbHTML;

    // Radar
    destruirChart('chartRadar');
    chartInstances['chartRadar'] = new Chart(document.getElementById('chartRadar'), {
        type: 'radar',
        data: {
            labels: DATA.categorias.map(function(c) { return c.nombre; }),
            datasets: [{
                label: 'Prestamos Actuales',
                data: DATA.categorias.map(function(c) { return c.prestamos[c.prestamos.length - 1] || 0; }),
                borderColor: '#A02142',
                backgroundColor: colorAlpha('#A02142', 0.15),
                borderWidth: 2,
                pointBackgroundColor: '#A02142'
            }, {
                label: 'Proyeccion +1 mes',
                data: DATA.categorias.map(function(c) {
                    var k = calcularKPromedio(c.prestamos);
                    var x0 = c.prestamos[c.prestamos.length - 1] || 0;
                    return Math.round(proyectar(x0, k, 1));
                }),
                borderColor: '#BC955B',
                backgroundColor: colorAlpha('#BC955B', 0.1),
                borderWidth: 2,
                pointBackgroundColor: '#BC955B',
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle' } } },
            scales: { r: { beginAtZero: true, grid: { color: '#E0D8D0' }, angleLines: { color: '#E0D8D0' } } }
        }
    });

    // K por categoria
    destruirChart('chartKCategorias');
    chartInstances['chartKCategorias'] = new Chart(document.getElementById('chartKCategorias'), {
        type: 'bar',
        data: {
            labels: catsConK.map(function(c) { return c.nombre; }),
            datasets: [{
                label: 'Constante k',
                data: catsConK.map(function(c) { return c.k; }),
                backgroundColor: catsConK.map(function(c) {
                    return c.k >= 0 ? colorAlpha('#2E7D32', 0.7) : colorAlpha('#E65100', 0.7);
                }),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#E0D8D0' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Interpretacion
    var catCrec = catsConK.filter(function(c) { return c.k > 0; }).map(function(c) { return c.nombre; });
    var catDec = catsConK.filter(function(c) { return c.k < 0; }).map(function(c) { return c.nombre; });
    document.getElementById('interpretacionCategorias').innerHTML =
        'Las categorias con tendencia de <strong class="k-positive">crecimiento</strong> son: <strong>' + (catCrec.length > 0 ? catCrec.join(', ') : 'Ninguna') + '</strong>. ' +
        'Se recomienda ampliar el acervo en estas areas. ' +
        'Las categorias en <strong class="k-negative">decrecimiento</strong> son: <strong>' + (catDec.length > 0 ? catDec.join(', ') : 'Ninguna') + '</strong>. ' +
        'Para estas, conviene evaluar si los titulos estan desactualizados o si el interes de los usuarios ha cambiado.';
}

// ============================================================
// SECCION: PROYECCION DE DEMANDA
// ============================================================
function llenarSeleccion() {
    if (!DATA) return;
    var tipo = document.getElementById('projTipo').value;
    var sel = document.getElementById('projSeleccion');
    sel.innerHTML = '';

    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    items.forEach(function(item) {
        var opt = document.createElement('option');
        opt.value = item.nombre;
        opt.textContent = item.nombre;
        sel.appendChild(opt);
    });
}

function calcularProyeccion() {
    if (!DATA) return;
    var tipo = document.getElementById('projTipo').value;
    var seleccion = document.getElementById('projSeleccion').value;
    var periodos = parseInt(document.getElementById('projPeriodos').value) || 3;

    var items = tipo === 'libro' ? DATA.libros : DATA.categorias;
    var item = items.find(function(i) { return i.nombre === seleccion; });
    if (!item) return;

    var prestamos = item.prestamos;
    var k = calcularKPromedio(prestamos);
    var x0 = prestamos[prestamos.length - 1] || 0;

    // Generar proyecciones
    var proyecciones = [];
    var mesesFuturos = [];
    // Calcular meses futuros basados en el ultimo mes de DATA.meses
    var ultimoMes = DATA.meses[DATA.meses.length - 1];
    var partesUltimo = ultimoMes.split('-');
    var anio = parseInt(partesUltimo[0], 10);
    var mes = parseInt(partesUltimo[1], 10);

    for (var i = 1; i <= periodos; i++) {
        var valor = proyectar(x0, k, i);
        proyecciones.push(Math.round(valor));
        mes++;
        if (mes > 12) { mes = 1; anio++; }
        var mesStr = anio + '-' + (mes < 10 ? '0' + mes : '' + mes);
        mesesFuturos.push(mesStr);
    }

    // Resultado box
    var box = document.getElementById('resultadoBox');
    box.classList.add('visible');
    document.getElementById('resultadoTitulo').textContent = 'Proyeccion para: ' + item.nombre;

    var tendencia = k >= 0 ? 'crecimiento' : 'decrecimiento';
    var ultimaProy = proyecciones[proyecciones.length - 1];
    document.getElementById('resultadoTexto').innerHTML =
        'Con una constante <strong>k = ' + (k >= 0 ? '+' : '') + k.toFixed(4) + '</strong> (' + tendencia + '), ' +
        'partiendo de <strong>' + x0 + ' prestamos</strong> en el mes actual, la proyeccion indica que en <strong>' + periodos + ' mes(es)</strong> ' +
        'la demanda sera de aproximadamente <strong>' + ultimaProy + ' prestamos</strong>. ' +
        (k > 0 ? 'Se recomienda considerar la adquisicion de mas ejemplares.' : 'Se sugiere evaluar si es conveniente reducir copias y reasignar presupuesto.');

    document.getElementById('resultadoFormula').textContent =
        'Formula aplicada: x(t) = ' + x0 + ' * e^(' + k.toFixed(4) + ' * t)  =>  x(' + periodos + ') = ' + x0 + ' * e^(' + (k * periodos).toFixed(4) + ') = ' + ultimaProy;

    // Chart
    var labelsHistoricos = DATA.meses.map(formatearMes);
    var labelsFuturos = mesesFuturos.map(formatearMes);
    var labelsAll = labelsHistoricos.concat(labelsFuturos);

    var datosHistCompleto = prestamos.slice().concat(new Array(periodos).fill(null));
    var datosProyectados = new Array(prestamos.length - 1).fill(null);
    datosProyectados.push(prestamos[prestamos.length - 1]);
    datosProyectados = datosProyectados.concat(proyecciones);

    destruirChart('chartProyeccion');
    chartInstances['chartProyeccion'] = new Chart(document.getElementById('chartProyeccion'), {
        type: 'line',
        data: {
            labels: labelsAll,
            datasets: [
                {
                    label: 'Datos Historicos',
                    data: datosHistCompleto,
                    borderColor: '#A02142',
                    backgroundColor: colorAlpha('#A02142', 0.1),
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#A02142'
                },
                {
                    label: 'Proyeccion x(t) = x0*e^(kt)',
                    data: datosProyectados,
                    borderColor: '#BC955B',
                    backgroundColor: colorAlpha('#BC955B', 0.1),
                    borderWidth: 2.5,
                    borderDash: [8, 4],
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#BC955B',
                    pointStyle: 'triangle'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + ctx.parsed.y + ' prestamos';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#E0D8D0' }, title: { display: true, text: 'Prestamos', font: { weight: 600 } } },
                x: { grid: { display: false }, title: { display: true, text: 'Mes', font: { weight: 600 } } }
            }
        }
    });
}

// ============================================================
// INIT
// ============================================================
(function() {
    initTabs();

    cargarDatos()
        .then(function() {
            renderResumen();
            renderLibros();
            renderCategorias();

            // Proyeccion
            llenarSeleccion();
            document.getElementById('projTipo').addEventListener('change', llenarSeleccion);
            document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);

            // Ocultar loading
            setTimeout(function() {
                document.getElementById('loadingOverlay').classList.add('hidden');
            }, 400);
        })
        .catch(function(error) {
            console.error('Error cargando reportes:', error);
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('errorMsg').style.display = 'block';
            document.getElementById('errorText').textContent = error.message || 'No se pudieron obtener los datos.';
        });
})();