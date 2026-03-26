// ═══════════════════════════════════════════════
//  DATOS — reemplazar con llamada a tu API:
//  const res = await fetch('/api/reportes/prestamos-por-mes');
//  const DATA = await res.json();
// ═══════════════════════════════════════════════

const MESES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const DATA = {
  libros: [
    { nombre: 'Cálculo Diferencial',    prestamos: [12,15,14,18,20,22,21,25,28,30,29,33] },
    { nombre: 'Álgebra Lineal',         prestamos: [20,19,18,17,16,14,13,12,11,10,9,8]   },
    { nombre: 'Programación en Python', prestamos: [8,10,11,14,16,18,22,24,26,28,31,35]  },
    { nombre: 'Bases de Datos',         prestamos: [15,15,16,14,15,15,14,16,15,14,15,16] },
    { nombre: 'Inglés Técnico',         prestamos: [18,17,15,13,12,10,9,8,7,7,6,5]       },
    { nombre: 'Redes y Comunicaciones', prestamos: [6,7,9,10,12,13,15,16,18,20,21,23]    },
  ],
  categorias: [
    { nombre: 'Matemáticas',   prestamos: [45,48,50,55,58,62,60,65,70,74,72,78] },
    { nombre: 'Informática',   prestamos: [30,33,36,40,44,48,54,58,63,68,74,80] },
    { nombre: 'Idiomas',       prestamos: [38,35,32,30,27,25,22,20,18,17,15,13] },
    { nombre: 'Ingeniería',    prestamos: [20,21,20,22,21,23,22,24,23,25,24,26] },
    { nombre: 'Humanidades',   prestamos: [14,13,12,11,10,9,8,7,7,6,5,5]        },
  ]
};

// ═══════════════════════════════════════════════
//  CÁLCULOS — Ley de Crecimiento y Decrecimiento
// ═══════════════════════════════════════════════

const calcK = (x0, x1, t) => Math.log(x1 / x0) / t;

const proyectar = (x0, k, mesesFuturos) =>
  Array.from({ length: mesesFuturos }, (_, t) =>
    Math.round(x0 * Math.exp(k * (t + 1)))
  );

const tendencia = (k) =>
  k > 0.02 ? 'up' : k < -0.02 ? 'down' : 'flat';

const tendenciaLabel = (k) =>
  k > 0.02 ? 'Crecimiento' : k < -0.02 ? 'Decrecimiento' : 'Estable';

// ═══════════════════════════════════════════════
//  ESTADO
// ═══════════════════════════════════════════════

let vista   = 'libros';
let periodo = 12;
let charts  = {};

const setVista = (v) => {
  vista = v;
  document.getElementById('btnLibros').classList.toggle('active', v === 'libros');
  document.getElementById('btnCategorias').classList.toggle('active', v === 'categorias');
  actualizarTodo();
};

const actualizarTodo = () => {
  periodo = parseInt(document.getElementById('selectPeriodo').value);
  const items = DATA[vista].map(item => ({
    ...item,
    prestamos: item.prestamos.slice(-periodo)
  }));
  renderKPIs(items);
  renderTendencia(items);
  renderK(items);
  renderDona(items);
  renderTabla(items);
};

// ═══════════════════════════════════════════════
//  KPIs
// ═══════════════════════════════════════════════

const renderKPIs = (items) => {
  const total      = items.reduce((s, i) => s + i.prestamos.reduce((a, b) => a + b, 0), 0);
  const kVals      = items.map(i => calcK(i.prestamos[0], i.prestamos[i.prestamos.length - 1], i.prestamos.length - 1));
  const enCrecim   = kVals.filter(k => k > 0.02).length;
  const enDecrecim = kVals.filter(k => k < -0.02).length;
  const maxItem    = items[kVals.indexOf(Math.max(...kVals))];
  const kMax       = calcK(maxItem.prestamos[0], maxItem.prestamos[maxItem.prestamos.length - 1], maxItem.prestamos.length - 1);

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Total Préstamos</div>
      <div class="kpi-value">${total.toLocaleString()}</div>
      <div class="kpi-sub">en los últimos ${periodo} meses</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">En Crecimiento</div>
      <div class="kpi-value" style="color:#4caf7d">${enCrecim}</div>
      <div class="kpi-sub">${vista === 'libros' ? 'títulos' : 'categorías'} con k &gt; 0</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">En Decrecimiento</div>
      <div class="kpi-value" style="color:#e05c5c">${enDecrecim}</div>
      <div class="kpi-sub">${vista === 'libros' ? 'títulos' : 'categorías'} con k &lt; 0</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Mayor Crecimiento</div>
      <div class="kpi-value" style="font-size:1.1rem;line-height:1.3">${maxItem.nombre}</div>
      <div class="kpi-sub">k = ${kMax.toFixed(4)}</div>
    </div>
  `;
};

// ═══════════════════════════════════════════════
//  CHART: Tendencia + Proyección
// ═══════════════════════════════════════════════

const COLORES = ['#A02142','#BC955B','#4caf7d','#5b9bd4','#e08c3a','#9b6bbf'];

const renderTendencia = (items) => {
  if (charts.tendencia) charts.tendencia.destroy();

  const labels          = MESES_LABELS.slice(-periodo);
  const mesesProyeccion = 3;
  const labelsProyec    = Array.from({ length: mesesProyeccion }, (_, i) => `+${i + 1}m`);
  const datasets        = [];

  items.forEach((item, idx) => {
    const color  = COLORES[idx % COLORES.length];
    const x0     = item.prestamos[0];
    const x1     = item.prestamos[item.prestamos.length - 1];
    const k      = calcK(x0, x1, item.prestamos.length - 1);
    const proyec = proyectar(x1, k, mesesProyeccion);

    datasets.push({
      label: item.nombre,
      data: [...item.prestamos, null, null, null],
      borderColor: color,
      backgroundColor: color + '18',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.35,
      fill: false,
    });

    datasets.push({
      label: item.nombre + ' (proyección)',
      data: [...Array(periodo).fill(null), ...proyec],
      borderColor: color,
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 3,
      pointStyle: 'triangle',
      tension: 0.35,
      fill: false,
    });
  });

  charts.tendencia = new Chart(document.getElementById('chartTendencia'), {
    type: 'line',
    data: { labels: [...labels, ...labelsProyec], datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#8a7a72',
            font: { size: 11 },
            filter: (item) => !item.text.includes('proyección')
          }
        },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { color: '#8a7a72', font: { size: 11 } }, grid: { color: '#2e2428' } },
        y: { ticks: { color: '#8a7a72', font: { size: 11 } }, grid: { color: '#2e2428' } }
      }
    }
  });
};

// ═══════════════════════════════════════════════
//  CHART: Ranking K
// ═══════════════════════════════════════════════

const renderK = (items) => {
  if (charts.k) charts.k.destroy();

  const kVals = items.map(i =>
    parseFloat(calcK(i.prestamos[0], i.prestamos[i.prestamos.length - 1], i.prestamos.length - 1).toFixed(4))
  );
  const sorted = items
    .map((i, idx) => ({ nombre: i.nombre, k: kVals[idx] }))
    .sort((a, b) => b.k - a.k);

  charts.k = new Chart(document.getElementById('chartK'), {
    type: 'bar',
    data: {
      labels: sorted.map(i => i.nombre),
      datasets: [{
        label: 'Constante k',
        data: sorted.map(i => i.k),
        backgroundColor: sorted.map(i => i.k >= 0 ? 'rgba(76,175,125,.7)' : 'rgba(224,92,92,.7)'),
        borderColor:     sorted.map(i => i.k >= 0 ? '#4caf7d' : '#e05c5c'),
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8a7a72', font: { size: 11 } }, grid: { color: '#2e2428' } },
        y: { ticks: { color: '#f0e8e0', font: { size: 11 } }, grid: { color: '#2e2428' } }
      }
    }
  });
};

// ═══════════════════════════════════════════════
//  CHART: Dona
// ═══════════════════════════════════════════════

const renderDona = (items) => {
  if (charts.dona) charts.dona.destroy();

  const totales = items.map(i => i.prestamos.reduce((a, b) => a + b, 0));

  charts.dona = new Chart(document.getElementById('chartDona'), {
    type: 'doughnut',
    data: {
      labels: items.map(i => i.nombre),
      datasets: [{
        data: totales,
        backgroundColor: COLORES.map(c => c + 'cc'),
        borderColor: COLORES,
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { color: '#8a7a72', font: { size: 11 }, boxWidth: 12 } }
      }
    }
  });
};

// ═══════════════════════════════════════════════
//  TABLA
// ═══════════════════════════════════════════════

const renderTabla = (items) => {
  const rows = items.map(item => {
    const x0    = item.prestamos[0];
    const x1    = item.prestamos[item.prestamos.length - 1];
    const t     = item.prestamos.length - 1;
    const k     = calcK(x0, x1, t);
    const tend  = tendencia(k);
    const label = tendenciaLabel(k);
    const total = item.prestamos.reduce((a, b) => a + b, 0);
    const proyec = proyectar(x1, k, 1)[0];

    return `
      <tr>
        <td>${item.nombre}</td>
        <td>${x0}</td>
        <td>${x1}</td>
        <td class="k-val ${tend}">${k.toFixed(4)}</td>
        <td><span class="badge ${tend}">${tend === 'up' ? '↑' : tend === 'down' ? '↓' : '→'} ${label}</span></td>
        <td>${total}</td>
        <td>${proyec}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('tablaWrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>${vista === 'libros' ? 'Título' : 'Categoría'}</th>
          <th>Inicio (x₀)</th>
          <th>Último mes (x₁)</th>
          <th>Constante k</th>
          <th>Tendencia</th>
          <th>Total préstamos</th>
          <th>Proyección próx. mes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════

actualizarTodo();