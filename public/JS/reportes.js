// VARIABLES GLOBALES
var DATA = null;
var STATS = null;
var chartInstances = {};
var PALETTE = ['#A02142','#BC955B','#7A1832','#D4AF72','#C4345A','#5C3D2E','#2E7D32','#1565C0','#6A1B9A','#E65100'];

// Modelo: x(t) = C · e^(k · t)
function proyectar(C, k, t, t0) {
  return C * Math.exp(k * (t - t0));
}

function redondear(v) {
  return Math.floor(v + 0.5);
}

function tasaAPorcentaje(k) {
  return ((Math.exp(k) - 1) * 100).toFixed(1);
}

function colorAlpha(hex, alpha) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}

function formatearMes(ym) {
  var p = ym.split('-');
  var nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return nombres[parseInt(p[1],10)-1]+' '+p[0].substring(2);
}

function destruirChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); chartInstances[id] = null; }
}

function obtenerRecomendacion(k) {
  if (k > 0.1)   return { texto: 'Adquirir mas ejemplares', clase: 'alta' };
  if (k > 0.02)  return { texto: 'Mantener acervo', clase: 'media' };
  if (k > -0.02) return { texto: 'Sin cambios', clase: 'media' };
  if (k > -0.1)  return { texto: 'Monitorear', clase: 'baja' };
  return { texto: 'Considerar baja', clase: 'critica' };
}

function obtenerTendenciaTexto(k) {
  if (k > 0.05)  return 'Crecimiento alto';
  if (k > 0)     return 'Crecimiento moderado';
  if (k > -0.05) return 'Decrecimiento leve';
  return 'Decrecimiento marcado';
}

function obtenerK(item)  { return item.tasa_k !== undefined ? item.tasa_k : 0; }
function obtenerC(item)  { return item.C      !== undefined ? item.C      : 1; }
function obtenerT0(item) { return item.t0     !== undefined ? item.t0     : 0; }

// Configuracion de Chart.js
Chart.defaults.font.family = "'Source Sans 3', sans-serif";
Chart.defaults.font.size   = 12;
Chart.defaults.color       = '#6B6B6B';

// Carga de datos
function cargarDatos() {
  return Promise.all([
    fetchConToken('/api/reportes/prestamos-por-mes?meses=6').then(function(r){ return r.json(); }),
    fetchConToken('/api/reportes/estadisticas').then(function(r){ return r.json(); })
  ]).then(function(res) {
    if (!res[0].success) throw new Error(res[0].message || 'Error al obtener datos');
    DATA  = res[0].data;
    STATS = res[1].success ? res[1].data : null;
    return true;
  });
}

// Iniciar tabs
function initTabs() {
  var tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
      document.getElementById('sec-'+tab.getAttribute('data-section')).classList.add('active');
    });
  });
}

// Seccion resumen
function renderResumen() {
  if (!DATA || !DATA.meses || DATA.meses.length === 0) return;

  var mesesLabel = DATA.meses.map(formatearMes);
  var totalesMes = DATA.meses.map(function(mes, idx) {
    var total = 0;
    DATA.categorias.forEach(function(c){ total += (c.prestamos[idx] || 0); });
    return total;
  });

  var totalActual      = totalesMes[totalesMes.length-1] || 0;
  var totalAnterior    = totalesMes.length >= 2 ? totalesMes[totalesMes.length-2] : 0;
  var cambio           = totalAnterior > 0 ? ((totalActual-totalAnterior)/totalAnterior*100).toFixed(1) : 0;
  var librosCrec       = DATA.libros.filter(function(l){ return obtenerK(l) > 0; }).length;
  var totalLibros      = STATS ? STATS.total_libros : DATA.libros.length;
  var prestamosActivos = STATS ? STATS.prestamos_activos : 0;

  var html = '';
  html += '<div class="stat-card"><div class="stat-label">Prestamos Este Mes</div><div class="stat-value">'+totalActual+'</div>';
  html += '<div class="stat-change '+(cambio>=0?'up':'down')+'">'+(cambio>=0?'Sube':'Baja')+' '+Math.abs(cambio)+'% vs mes anterior</div></div>';
  html += '<div class="stat-card"><div class="stat-label">Libros en el Acervo</div><div class="stat-value">'+totalLibros+'</div><div class="stat-desc">Titulos disponibles</div></div>';
  html += '<div class="stat-card"><div class="stat-label">Prestamos Activos</div><div class="stat-value">'+prestamosActivos+'</div><div class="stat-desc">Libros actualmente prestados</div></div>';
  html += '<div class="stat-card"><div class="stat-label">Libros con Movimiento</div><div class="stat-value">'+librosCrec+'</div><div class="stat-desc">Titulos con demanda creciente</div></div>';
  document.getElementById('statsGrid').innerHTML = html;

  destruirChart('chartPrestamosMes');
  chartInstances['chartPrestamosMes'] = new Chart(document.getElementById('chartPrestamosMes'), {
    type: 'bar',
    data: { labels: mesesLabel, datasets: [{ label: 'Prestamos', data: totalesMes,
      backgroundColor: totalesMes.map(function(_,i){ return i===totalesMes.length-1?'#A02142':colorAlpha('#A02142',0.55); }),
      borderRadius: 8, borderSkipped: false }] },
    options: { responsive: true, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
  });

  var catActual = DATA.categorias.map(function(c){ return c.prestamos[c.prestamos.length-1]||0; });
  destruirChart('chartCategorias');
  chartInstances['chartCategorias'] = new Chart(document.getElementById('chartCategorias'), {
    type: 'doughnut',
    data: { labels: DATA.categorias.map(function(c){ return c.nombre; }),
      datasets: [{ data: catActual, backgroundColor: DATA.categorias.map(function(_,i){ return PALETTE[i%PALETTE.length]; }), borderWidth: 3, borderColor: '#FFFFFF' }] },
    options: { responsive: true, cutout: '60%',
      plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } } } }
  });

  var catsConTasa = DATA.categorias.map(function(c){ return { nombre: c.nombre, k: obtenerK(c), prestamos: c.prestamos }; });
  catsConTasa.sort(function(a,b){ return b.k-a.k; });

  document.getElementById('categoriasCrecimiento').innerHTML = catsConTasa.filter(function(c){ return c.k>0; }).slice(0,5).map(function(c){
    return '<li><span class="reco-titulo">'+c.nombre+'<small>'+c.prestamos[c.prestamos.length-1]+' prestamos el ultimo mes</small></span><span class="reco-cambio up">+'+tasaAPorcentaje(c.k)+'% / mes</span></li>';
  }).join('') || '<li class="empty">No hay categorias en crecimiento</li>';

  document.getElementById('categoriasDecrecimiento').innerHTML = catsConTasa.filter(function(c){ return c.k<0; }).slice(0,5).map(function(c){
    return '<li><span class="reco-titulo">'+c.nombre+'<small>'+c.prestamos[c.prestamos.length-1]+' prestamos el ultimo mes</small></span><span class="reco-cambio down">'+tasaAPorcentaje(c.k)+'% / mes</span></li>';
  }).join('') || '<li class="empty">No hay categorias en descenso</li>';
}

// Seccion Libros
function renderLibros() {
  if (!DATA || DATA.libros.length === 0) return;

  var librosConTasa = DATA.libros.map(function(l) {
    var k = obtenerK(l); var C = obtenerC(l); var t0 = obtenerT0(l);
    var tFinal = l.prestamos.length-1;
    var actual   = l.prestamos[tFinal] || 0;
    var anterior = tFinal >= 1 ? l.prestamos[tFinal-1] : 0;
    var proy = l.datos_suficientes ? redondear(proyectar(C, k, tFinal+1, t0)) : actual;
    return { nombre: l.nombre, categoria: l.categoria||'Sin categoria', anterior, actual, k, proyeccion: proy, prestamos: l.prestamos, datos_suficientes: l.datos_suficientes };
  });
  librosConTasa.sort(function(a,b){ return b.k-a.k; });

  document.getElementById('librosCrecimiento').innerHTML = librosConTasa.filter(function(l){ return l.k>0&&l.datos_suficientes; }).slice(0,6).map(function(l){
    return '<li><span class="reco-titulo">'+l.nombre+'<small>'+l.categoria+' - '+l.actual+' prestamos el ultimo mes</small></span><span class="reco-cambio up">+'+tasaAPorcentaje(l.k)+'% / mes</span></li>';
  }).join('') || '<li class="empty">No hay libros en crecimiento</li>';

  document.getElementById('librosDecrecimiento').innerHTML = librosConTasa.filter(function(l){ return l.k<0&&l.datos_suficientes; }).slice(0,6).map(function(l){
    return '<li><span class="reco-titulo">'+l.nombre+'<small>'+l.categoria+' - '+l.actual+' prestamos el ultimo mes</small></span><span class="reco-cambio down">'+tasaAPorcentaje(l.k)+'% / mes</span></li>';
  }).join('') || '<li class="empty">No hay libros en descenso</li>';

  document.getElementById('tablaLibros').innerHTML = librosConTasa.map(function(libro) {
    var reco = obtenerRecomendacion(libro.k);
    var proyDisplay = libro.datos_suficientes ? libro.proyeccion : '—';
    var colorProy   = libro.datos_suficientes ? (libro.k >= 0 ? '#2E7D32' : '#E65100') : '#999';
    return '<tr><td><strong>'+libro.nombre+'</strong></td><td>'+libro.categoria+'</td>'+
      '<td style="text-align:center">'+libro.anterior+'</td>'+
      '<td style="text-align:center"><strong>'+libro.actual+'</strong></td>'+
      '<td style="text-align:center;color:'+colorProy+';font-weight:600">'+proyDisplay+'</td>'+
      '<td><span class="badge '+reco.clase+'">'+reco.texto+'</span></td></tr>';
  }).join('');

  var top10 = librosConTasa.slice(0,10);
  destruirChart('chartTopLibros');
  chartInstances['chartTopLibros'] = new Chart(document.getElementById('chartTopLibros'), {
    type: 'bar',
    data: { labels: top10.map(function(l){ return l.nombre; }),
      datasets: [
        { label: 'Mes anterior', data: top10.map(function(l){ return l.anterior; }), backgroundColor: colorAlpha('#BC955B',0.7), borderRadius: 6, borderSkipped: false },
        { label: 'Mes actual',   data: top10.map(function(l){ return l.actual; }),   backgroundColor: colorAlpha('#A02142',0.85), borderRadius: 6, borderSkipped: false }
      ] },
    options: { responsive: true, indexAxis: 'y',
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle' } } },
      scales: { x: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } }, y: { grid: { display: false } } } }
  });
}

// Seccion categorias
function renderCategorias() {
  if (!DATA || DATA.categorias.length === 0) return;

  var mesesLabel = DATA.meses.map(formatearMes);
  destruirChart('chartCategoriasLinea');
  chartInstances['chartCategoriasLinea'] = new Chart(document.getElementById('chartCategoriasLinea'), {
    type: 'line',
    data: { labels: mesesLabel, datasets: DATA.categorias.map(function(c,i) {
      var color = PALETTE[i%PALETTE.length];
      return { label: c.nombre, data: c.prestamos, borderColor: color, backgroundColor: colorAlpha(color,0.1),
        borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: color };
    }) },
    options: { responsive: true,
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } },
      scales: { y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
  });

  var catsConTasa = DATA.categorias.map(function(c) {
    var k = obtenerK(c); var total = c.prestamos.reduce(function(s,v){ return s+v; }, 0);
    return { nombre: c.nombre, total, promedio: (total/c.prestamos.length).toFixed(1),
      k, reco: obtenerRecomendacion(k), tendencia: obtenerTendenciaTexto(k), prestamos: c.prestamos };
  });
  catsConTasa.sort(function(a,b){ return b.k-a.k; });

  document.getElementById('tablaCategorias').innerHTML = catsConTasa.map(function(c) {
    var color = c.k >= 0 ? '#2E7D32' : '#E65100';
    return '<tr><td><strong>'+c.nombre+'</strong></td><td style="text-align:center">'+c.total+'</td>'+
      '<td style="text-align:center">'+c.promedio+'</td>'+
      '<td style="color:'+color+';font-weight:600">'+c.tendencia+'</td>'+
      '<td><span class="badge '+c.reco.clase+'">'+c.reco.texto+'</span></td></tr>';
  }).join('');

  destruirChart('chartRadar');
  chartInstances['chartRadar'] = new Chart(document.getElementById('chartRadar'), {
    type: 'radar',
    data: { labels: DATA.categorias.map(function(c){ return c.nombre; }),
      datasets: [
        { label: 'Mes actual', data: DATA.categorias.map(function(c){ return c.prestamos[c.prestamos.length-1]||0; }),
          borderColor: '#A02142', backgroundColor: colorAlpha('#A02142',0.15), borderWidth: 2, pointBackgroundColor: '#A02142' },
        { label: 'Estimacion proximo mes', data: DATA.categorias.map(function(c) {
            var k=obtenerK(c); var C=obtenerC(c); var t0=obtenerT0(c); var tF=c.prestamos.length-1;
            return c.datos_suficientes ? redondear(proyectar(C,k,tF+1,t0)) : 0;
          }), borderColor: '#BC955B', backgroundColor: colorAlpha('#BC955B',0.1),
          borderWidth: 2, pointBackgroundColor: '#BC955B', borderDash: [5,5] }
      ] },
    options: { responsive: true,
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle' } } },
      scales: { r: { beginAtZero: true, grid: { color: '#E0D8D0' }, angleLines: { color: '#E0D8D0' }, ticks: { precision: 0 } } } }
  });

  destruirChart('chartKCategorias');
  chartInstances['chartKCategorias'] = new Chart(document.getElementById('chartKCategorias'), {
    type: 'bar',
    data: { labels: catsConTasa.map(function(c){ return c.nombre; }),
      datasets: [{ label: 'Cambio mensual %',
        data: catsConTasa.map(function(c){ return parseFloat(tasaAPorcentaje(c.k)); }),
        backgroundColor: catsConTasa.map(function(c){ return c.k>=0?colorAlpha('#2E7D32',0.7):colorAlpha('#E65100',0.7); }),
        borderRadius: 8, borderSkipped: false }] },
    options: { responsive: true, indexAxis: 'y',
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: function(ctx){ var v=ctx.parsed.x; return (v>=0?'+':'')+v+'% por mes'; } } } },
      scales: { x: { grid: { color: '#E0D8D0' }, ticks: { callback: function(v){ return (v>=0?'+':'')+v+'%'; } } }, y: { grid: { display: false } } } }
  });
}

// Seccion de proyeccion
function llenarSeleccion() {
  if (!DATA) return;
  var tipo = document.getElementById('projTipo').value;
  var sel  = document.getElementById('projSeleccion');
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

  var tipo      = document.getElementById('projTipo').value;
  var seleccion = document.getElementById('projSeleccion').value;
  // Siempre 4 meses fijos
  var periodos  = 4;
  var items     = tipo === 'libro' ? DATA.libros : DATA.categorias;
  var item      = items.find(function(i){ return i.nombre === seleccion; });
  if (!item) return;

  var prestamos     = item.prestamos;
  var k             = obtenerK(item);
  var C             = obtenerC(item);
  var t0            = obtenerT0(item);
  var mesesConDatos = prestamos.filter(function(v){ return v > 0; }).length;

  var box = document.getElementById('resultadoBox');
  box.classList.add('visible');
  document.getElementById('resultadoTitulo').textContent = 'Estimacion para: ' + item.nombre;

  // Sin datos suficientes — necesita al menos 2 meses con prestamos
  if (!item.datos_suficientes || mesesConDatos < 2) {
    document.getElementById('resultadoTexto').innerHTML =
      '<span style="color:#A02142;font-weight:600">&#9888; Proyeccion no valida.</span> ' +
      'Este ' + (tipo==='libro'?'libro':'categoria') +
      ' solo tiene prestamos registrados en <strong>' + mesesConDatos + ' mes(es)</strong>. ' +
      'Para aplicar la Ley de Crecimiento y Decrecimiento se necesitan al menos ' +
      '<strong>2 meses con prestamos</strong> para poder calcular la constante k.';
    document.getElementById('resultadoReco').textContent = '';
    if (document.getElementById('tablaModelo')) document.getElementById('tablaModelo').innerHTML = '';
    destruirChart('chartProyeccion');
    return;
  }

  // Filtrar solo meses desde enero 2026 en adelante para la grafica
  var idxDesdeEnero = 0;
  for (var mi = 0; mi < DATA.meses.length; mi++) {
    if (DATA.meses[mi] >= '2026-01') { idxDesdeEnero = mi; break; }
    idxDesdeEnero = DATA.meses.length; // si no hay ninguno desde enero, muestra todo
  }
  var mesesGrafica    = DATA.meses.slice(idxDesdeEnero);
  var prestamosGrafica = prestamos.slice(idxDesdeEnero);
  // tFinal relativo al array original (para la formula) y al slice (para la grafica)
  var tFinal       = prestamos.length - 1;
  var tFinalSlice  = prestamosGrafica.length - 1;
  var x0           = prestamos[tFinal] || 0;

  // Calcular proyecciones (siempre 4 meses fijos en grafica, periodos controla la tabla)
  var proyecciones  = [];  // redondeados para tabla
  var exactos       = [];  // sin redondear para tabla
  var proyGrafica   = [];  // para la linea de la grafica (4 meses fijos)
  var mesesFuturos  = [];
  var partes = DATA.meses[DATA.meses.length-1].split('-');
  var anio = parseInt(partes[0],10);
  var mes  = parseInt(partes[1],10);

  for (var i = 1; i <= 4; i++) {
    var tAbs        = tFinal + i;
    var valorExacto = proyectar(C, k, tAbs, t0);
    exactos.push(valorExacto);
    proyecciones.push(redondear(valorExacto));
    proyGrafica.push(valorExacto); // sin redondear en la grafica
    mes++;
    if (mes > 12) { mes = 1; anio++; }
    mesesFuturos.push(anio + '-' + (mes < 10 ? '0'+mes : ''+mes));
  }

  var ultimaProy = proyecciones[periodos - 1];
  var diferencia = ultimaProy - x0;

  // Tabla del modelo
  if (document.getElementById('tablaModelo')) {
    var puntosReales = prestamos.map(function(v, t) {
      return { v: v, t: t };
    }).filter(function(p){ return p.v > 0; });

    var p0 = puntosReales.length >= 2 ? puntosReales[puntosReales.length - 2] : null;
    var p1 = puntosReales.length >= 1 ? puntosReales[puntosReales.length - 1] : null;
    var deltaT = p0 && p1 ? p1.t - p0.t : 1;

    var filasPuntos = '';
    if (p0) filasPuntos += '<tr><td>t='+p0.t+' ('+formatearMes(DATA.meses[p0.t])+')</td><td>'+p0.v+'</td></tr>';
    if (p1) filasPuntos += '<tr><td>t='+p1.t+' ('+formatearMes(DATA.meses[p1.t])+')</td><td>'+p1.v+'</td></tr>';

    document.getElementById('tablaModelo').innerHTML =
      '<p style="font-weight:600;margin-bottom:6px">Puntos usados para calcular k:</p>' +
      '<table class="tabla-modelo" style="margin-bottom:14px">' +
      '<thead><tr><th>Punto</th><th>Préstamos (x)</th></tr></thead>' +
      '<tbody>' + filasPuntos + '</tbody>' +
      '</table>' +

      '<p style="font-weight:600;margin-bottom:6px">Cálculo de k:</p>' +
      '<p style="margin-bottom:4px">C = x(t='+(p0?p0.t:0)+') = <strong>'+C+'</strong></p>' +
      '<p style="margin-bottom:4px">k = ln(x₁ / C) / ΔT = ln('+(p1?p1.v:0)+' / '+C+') / '+deltaT+' = <strong>'+k+'</strong></p>' +
      '<p style="margin-bottom:12px;font-size:0.87rem;color:#555">Fórmula: x(t) = '+C+' · e^('+k+' · (t − '+t0+'))</p>' +

      '<p style="font-weight:600;margin-bottom:6px">Proyecciones ('+periodos+' mes(es)):</p>' +
      '<table class="tabla-modelo">' +
      '<thead><tr><th>t</th><th>Mes</th><th>x(t) exacto</th><th>x(t) redondeado</th></tr></thead>' +
      '<tbody>' +
      exactos.slice(0, periodos).map(function(exacto, idx) {
        return '<tr>' +
          '<td>t='+(tFinal+idx+1)+'</td>' +
          '<td>'+formatearMes(mesesFuturos[idx])+'</td>' +
          '<td>'+exacto+'</td>' +
          '<td><strong>'+proyecciones[idx]+'</strong></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  // Texto resultado
  var pctMensual  = item.porcentaje_mensual !== undefined ? parseFloat(item.porcentaje_mensual).toFixed(1) : tasaAPorcentaje(k);
  var textoCambio = k>0.05?'esta creciendo de manera notable':k>0?'esta creciendo de forma moderada':k>-0.05?'esta disminuyendo levemente':'esta disminuyendo de manera marcada';

  document.getElementById('resultadoTexto').innerHTML =
    'Usando los <strong>últimos 2 meses con datos</strong>, este '+(tipo==='libro'?'libro':'categoria')+
    ' tiene <strong>'+x0+' prestamos</strong> en el ultimo mes y '+
    textoCambio+' a un ritmo de <strong>'+(k>=0?'+':'')+pctMensual+'% mensual</strong>. '+
    'En <strong>'+periodos+' mes(es)</strong> se esperan cerca de <strong>'+ultimaProy+' prestamos</strong> ('+
    (diferencia>=0?'aumento':'reduccion')+' de '+Math.abs(diferencia)+' respecto al mes actual).';

  document.getElementById('resultadoReco').textContent =
    k > 0.1   ? 'Recomendacion: Conviene adquirir mas ejemplares lo antes posible.' :
    k > 0.02  ? 'Recomendacion: La demanda es estable y creciente. Mantener el acervo actual.' :
    k > -0.02 ? 'Recomendacion: La demanda esta estable. No se requiere accion inmediata.' :
    k > -0.1  ? 'Recomendacion: Vigilar la tendencia. Evaluar si el material sigue siendo relevante.' :
                'Recomendacion: Considerar dar de baja este material o reasignar el espacio.';

  // Grafica: historico solo desde enero 2026 + 4 meses futuros fijos
  var labelsAll       = mesesGrafica.map(formatearMes).concat(mesesFuturos.map(formatearMes));
  var datosReal       = prestamosGrafica.slice().concat(new Array(4).fill(null));
  var datosProyeccion = new Array(tFinalSlice).fill(null);
  datosProyeccion.push(x0); // punto de empalme
  proyGrafica.forEach(function(v){ datosProyeccion.push(v); });

  // Plugin: muestra k exacto y x(t) exacto + redondeado encima de cada punto proyectado
  var kCapturado = k;
  var CCapturado = C;
  var t0Capturado = t0;
  var tFinalCapturado = tFinal;
  var tFinalSliceCapturado = tFinalSlice;

  var pluginKLabels = {
    id: 'kLabels',
    afterDatasetsDraw: function(chart) {
      var ctx2    = chart.ctx;
      var meta    = chart.getDatasetMeta(1);
      var dataset = chart.data.datasets[1];

      meta.data.forEach(function(point, index) {
        if (dataset.data[index] === null) return;
        // Saltar el punto de empalme (x0), solo etiquetar los futuros
        if (index <= tFinalSliceCapturado) return;

        var pasoFuturo  = index - tFinalSliceCapturado; // 1, 2, 3, 4
        var tAbs        = tFinalCapturado + pasoFuturo;
        var valorExacto = proyectar(CCapturado, kCapturado, tAbs, t0Capturado);
        var valorRedondeado = redondear(valorExacto);

        ctx2.save();
        ctx2.textAlign = 'center';
        ctx2.font      = 'bold 10px sans-serif';
        ctx2.fillStyle = '#7A1832';
        ctx2.fillText('k=' + kCapturado, point.x, point.y - 36);
        ctx2.fillStyle = '#BC955B';
        ctx2.fillText('x(t)=' + valorExacto, point.x, point.y - 24);
        ctx2.fillStyle = '#5C3D2E';
        ctx2.fillText('≈' + valorRedondeado, point.x, point.y - 12);
        ctx2.restore();
      });
    }
  };

  destruirChart('chartProyeccion');
  chartInstances['chartProyeccion'] = new Chart(document.getElementById('chartProyeccion'), {
    type: 'line',
    plugins: [pluginKLabels],
    data: { labels: labelsAll, datasets: [
      { label: 'Prestamos reales', data: datosReal,
        borderColor: '#A02142', backgroundColor: colorAlpha('#A02142',0.1),
        borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 5,
        pointBackgroundColor: '#A02142', spanGaps: false },
      { label: 'Proyeccion x(t) = C·e^(k·t)', data: datosProyeccion,
        borderColor: '#BC955B', backgroundColor: colorAlpha('#BC955B',0.08),
        borderWidth: 2.5, borderDash: [8,4], fill: true, tension: 0.3,
        pointRadius: 5, pointBackgroundColor: '#BC955B', pointStyle: 'triangle', spanGaps: false }
    ] },
    options: { responsive: true,
      layout: { padding: { top: 55 } },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
        tooltip: { callbacks: { label: function(ctx){
          if (ctx.parsed.y === null) return null;
          var etiqueta = ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(4) + ' (exacto)';
          if (ctx.datasetIndex === 1) etiqueta += ' ≈ ' + redondear(ctx.parsed.y) + ' (redondeado)';
          return etiqueta;
        } } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: '#E0D8D0' }, ticks: { precision: 0 },
          title: { display: true, text: 'x(t)', font: { weight: 600 } } },
        x: { grid: { display: false },
          title: { display: true, text: 'Mes', font: { weight: 600 } } }
      }
    }
  });
}

// Init
(function() {
  initTabs();
  cargarDatos()
    .then(function() {
      renderResumen();
      renderLibros();
      renderCategorias();
      llenarSeleccion();
      document.getElementById('projTipo').addEventListener('change', llenarSeleccion);
      document.getElementById('btnCalcular').addEventListener('click', calcularProyeccion);
      setTimeout(function(){ document.getElementById('loadingOverlay').classList.add('hidden'); }, 400);
    })
    .catch(function(error) {
      console.error('Error cargando reportes:', error);
      document.getElementById('loadingOverlay').classList.add('hidden');
      document.getElementById('errorMsg').style.display = 'block';
      document.getElementById('errorText').textContent = error.message || 'No se pudieron obtener los datos.';
    });
})();