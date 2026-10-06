const categoriasBase = {
  asiatico: { label: 'Asiático', desc: 'Cocina asiática con ingredientes frescos y especias tradicionales.' },
  oriental: { label: 'Oriental', desc: 'Sabores de Oriente Medio con especias aromáticas y hierbas frescas.' },
  europeo: { label: 'Europeo', desc: 'Recetas clásicas europeas con técnicas tradicionales.' },
  latino: { label: 'Latinoamericano', desc: 'Sabores de Latinoamérica con recetas de tradición familiar.' },
  rapido: { label: 'Rápido', desc: 'Comfort food preparado al momento con salsas caseras.' },
  vegetariano: { label: 'Vegetariano', desc: 'Platos sin carne, llenos de color y sabor.' },
  vegano: { label: 'Vegano', desc: '100% de origen vegetal, sin ningún producto animal.' },
  bebidasAsiaticas: { label: 'Bebidas asiáticas', desc: 'Tés, infusiones y bebidas de Asia.' },
  bebidasAmericanas: { label: 'Bebidas americanas', desc: 'Bebidas refrescantes de América.' },
  bebidasEuropeas: { label: 'Bebidas europeas', desc: 'Bebidas tradicionales de Europa.' },
  bebidasGaseosas: { label: 'Gaseosas y frías', desc: 'Opciones frías y gaseosas para acompañar tu plato.' }
};

const catalogoInicial = [
  ['Sushi roll clásico', 'asiatico', 28000, 0],
  ['Ramen de cerdo', 'asiatico', 30000, 2],
  ['Hummus con pan pita', 'oriental', 18000, 14],
  ['Pasta carbonara', 'europeo', 28000, 29],
  ['Bandeja paisa', 'latino', 35000, 44],
  ['Hamburguesa clásica', 'rapido', 22000, 59],
  ['Ensalada César vegetariana', 'vegetariano', 20000, 74],
  ['Hamburguesa vegana', 'vegano', 24000, 89]
].map(([n, cat, p, index]) => ({ index, n, cat, p }));

let catalogo = [];
let categorias = {};
let pedidos = [];
let inventario = {};
let precios = {};
let perfilesClientes = [];
let usuarioAdminActual = null;

const pedidosIniciales = [
  { id: '#BD-1048', cliente: 'Mariana López', detalle: 'Bowl de quinoa + bebida', total: 32000, estado: 'En preparación', hora: '12:42 p. m.' },
  { id: '#BD-1047', cliente: 'Juan Esteban', detalle: 'Hamburguesa clásica x2', total: 44000, estado: 'Listo para entregar', hora: '12:28 p. m.' },
  { id: '#BD-1046', cliente: 'Laura Gómez', detalle: 'Curry de garbanzos', total: 24000, estado: 'Entregado', hora: '11:56 a. m.' },
  { id: '#BD-1045', cliente: 'Carlos Ruiz', detalle: 'Pizza pepperoni', total: 28000, estado: 'En preparación', hora: '11:41 a. m.' }
];

function esAdministrador() {
  return Boolean(usuarioAdminActual && usuarioAdminActual.admin === true);
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[caracter]));
}

function leerLocal(clave, respaldo) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : respaldo;
  } catch (error) {
    return respaldo;
  }
}

async function cargarDatos() {
  const guardados = await tuPlatoDb.obtenerConfiguracion([
    'adminCatalogo', 'adminCategorias', 'adminPrecios', 'adminInventario'
  ]);
  catalogo = guardados.adminCatalogo || catalogoInicial;
  const categoriasGuardadas = guardados.adminCategorias || {};
  categorias = Object.fromEntries(Object.entries(categoriasBase).map(([id, datos]) => [id, { ...datos, ...(categoriasGuardadas[id] || {}) }]));
  precios = guardados.adminPrecios || {};
  catalogo = catalogo.map(plato => ({ ...plato, p: Number.isFinite(Number(precios[plato.index])) ? Number(precios[plato.index]) : plato.p }));
  inventario = guardados.adminInventario || {};
  const registros = await tuPlatoDb.obtenerPedidos();
  pedidos = registros.map(registro => ({
    orderNumber: registro.order_number,
    id: `#BD-${String(registro.order_number).padStart(4, '0')}`,
    cliente: registro.customer_name,
    correo: registro.customer_email,
    detalle: registro.detail,
    total: registro.total,
    estado: registro.status,
    hora: new Date(registro.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }));
  perfilesClientes = await tuPlatoDb.obtenerClientes();
}

function renderPrecios() {
  const texto = document.getElementById('buscarPlato').value.toLowerCase().trim();
  const categoria = document.getElementById('filtroCategoria').value;
  const platos = catalogo.filter(plato => (!texto || plato.n.toLowerCase().includes(texto)) && (categoria === 'todas' || plato.cat === categoria));
  document.getElementById('totalPlatos').innerText = catalogo.length;
  document.getElementById('listaPrecios').innerHTML = platos.length ? `
    <table><thead><tr><th>Plato</th><th>Categoría</th><th>Precio</th><th>Stock local</th><th></th></tr></thead><tbody>${platos.map(plato => `
      <tr><td><strong>${escapar(plato.n)}</strong><small>ID ${String(plato.index + 1).padStart(3, '0')}</small></td><td><span class="admin-category-tag">${escapar(categorias[plato.cat]?.label || plato.cat)}</span></td><td><div class="admin-price-input"><span>$</span><input type="number" min="0" step="500" value="${plato.p}" id="precio-${plato.index}" aria-label="Precio de ${escapar(plato.n)}"></div></td><td><input class="admin-stock-input" type="number" min="0" step="1" value="${Number.isFinite(Number(inventario[plato.index])) ? Number(inventario[plato.index]) : ''}" id="stock-${plato.index}" placeholder="Sin dato" aria-label="Stock de ${escapar(plato.n)}"></td><td><button class="admin-save-button" onclick="guardarProducto(${plato.index})">Guardar</button></td></tr>`).join('')}</tbody></table>` : '<div class="admin-empty">No encontramos platos con esos filtros.</div>';
}

function renderCategorias() {
  document.getElementById('listaCategorias').innerHTML = Object.entries(categorias).map(([id, categoria]) => `
    <article class="admin-category-card"><div class="admin-category-card-top"><span class="admin-category-code">${id}</span><span class="admin-status">Visible</span></div><label>Nombre<input id="cat-nombre-${id}" value="${escapar(categoria.label)}"></label><label>Descripción<textarea id="cat-desc-${id}" rows="3">${escapar(categoria.desc)}</textarea></label><button class="admin-save-button" onclick="guardarCategoria('${id}')">Guardar cambios</button></article>`).join('');
}

function renderPedidos() {
  const texto = document.getElementById('buscarPedido').value.toLowerCase().trim();
  const estado = document.getElementById('filtroPedidoEstado').value;
  const lista = pedidos;
  const visibles = lista.filter(pedido => {
    const coincideTexto = !texto || `${pedido.id} ${pedido.cliente} ${pedido.detalle}`.toLowerCase().includes(texto);
    return coincideTexto && (estado === 'todos' || pedido.estado === estado);
  });
  const ventas = lista.reduce((total, pedido) => total + Number(pedido.total || 0), 0);
  document.getElementById('totalPedidos').innerText = lista.length;
  document.getElementById('ventasPedidos').innerText = '$' + ventas.toLocaleString('es-CO');
  document.getElementById('pedidosPreparacion').innerText = lista.filter(pedido => pedido.estado === 'En preparación').length;
  document.getElementById('pedidosEntregados').innerText = lista.filter(pedido => pedido.estado === 'Entregado').length;
  document.getElementById('listaPedidos').innerHTML = visibles.length ? `
    <table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Actualizar</th></tr></thead><tbody>${visibles.map(pedido => `
      <tr><td><strong>${escapar(pedido.id)}</strong><small>${escapar(pedido.hora)}</small></td><td><strong>${escapar(pedido.cliente)}</strong><small>${escapar(pedido.detalle)}</small></td><td class="admin-order-total">$${Number(pedido.total || 0).toLocaleString('es-CO')}</td><td><span class="admin-order-status status-${escapar(pedido.estado.toLowerCase().replaceAll(' ', '-'))}">${escapar(pedido.estado)}</span></td><td><select class="admin-order-select" data-id="${escapar(pedido.id)}" onchange="actualizarPedido(this.dataset.id, this.value)"><option ${pedido.estado === 'Recibido' ? 'selected' : ''}>Recibido</option><option ${pedido.estado === 'En preparación' ? 'selected' : ''}>En preparación</option><option ${pedido.estado === 'Listo para entregar' ? 'selected' : ''}>Listo para entregar</option><option ${pedido.estado === 'Entregado' ? 'selected' : ''}>Entregado</option></select></td></tr>`).join('')}</tbody></table>` : '<div class="admin-empty">No encontramos pedidos con esos filtros.</div>';
}

  function formatearCOP(valor) {
    return '$' + Number(valor || 0).toLocaleString('es-CO');
  }

  function renderResumen() {
    const totalVentas = pedidos.reduce((suma, pedido) => suma + Number(pedido.total || 0), 0);
    const abiertos = pedidos.filter(pedido => pedido.estado !== 'Entregado').length;
    document.getElementById('dashboardVentas').innerText = formatearCOP(totalVentas);
    document.getElementById('dashboardAbiertos').innerText = abiertos;
    document.getElementById('dashboardListos').innerText = pedidos.filter(pedido => pedido.estado === 'Listo para entregar').length;
    document.getElementById('dashboardPlatos').innerText = catalogo.length;

    const recientes = [...pedidos].slice(0, 5);
    document.getElementById('pedidosRecientes').innerHTML = recientes.length ? `<div class="admin-recent-list">${recientes.map(pedido => `
      <div class="admin-recent-row"><div class="admin-recent-main"><strong>${escapar(pedido.id)} · ${escapar(pedido.cliente)}</strong><small>${escapar(pedido.detalle)} · ${escapar(pedido.hora || 'Sin hora')}</small></div><span class="admin-order-status status-${escapar(String(pedido.estado).toLowerCase().replaceAll(' ', '-'))}">${escapar(pedido.estado)}</span></div>`).join('')}</div>` : '<div class="admin-empty">Aún no hay pedidos registrados.</div>';

    const bajoStock = catalogo.filter(plato => Number.isFinite(Number(inventario[plato.index])) && Number(inventario[plato.index]) <= 5);
    document.getElementById('alertasInventario').innerHTML = bajoStock.length ? `<div class="admin-low-stock-list">${bajoStock.slice(0, 6).map(plato => `
      <div class="admin-stock-row"><div class="admin-stock-main"><strong>${escapar(plato.n)}</strong><small>${escapar(categorias[plato.cat]?.label || plato.cat)}</small></div><span class="admin-stock-value">${Number(inventario[plato.index])} unidades</span></div>`).join('')}</div>` : '<div class="admin-empty">No hay alertas. Registra existencias en Catálogo e inventario.</div>';
  }

  function renderClientes() {
    const texto = document.getElementById('buscarCliente').value.toLowerCase().trim();
    const clientes = new Map();
    perfilesClientes.forEach(perfil => {
      const llave = String(perfil.email || perfil.id).toLowerCase();
      clientes.set(llave, { nombre: perfil.full_name || 'Sin nombre', correo: perfil.email || 'Sin correo', pedidos: 0, total: 0, ultimo: '—' });
    });
    pedidos.forEach(pedido => {
      const nombre = String(pedido.cliente || 'Cliente sin nombre');
      const llave = String(pedido.correo || nombre).toLowerCase();
      const cliente = clientes.get(llave) || { nombre, correo: pedido.correo || 'No registrado', pedidos: 0, total: 0, ultimo: '—' };
      cliente.pedidos += 1;
      cliente.total += Number(pedido.total || 0);
      cliente.ultimo = pedido.hora || cliente.ultimo;
      clientes.set(llave, cliente);
    });
    const visibles = [...clientes.values()].filter(cliente => `${cliente.nombre} ${cliente.correo}`.toLowerCase().includes(texto));
    document.getElementById('totalClientes').innerText = clientes.size;
    document.getElementById('listaClientes').innerHTML = visibles.length ? `<table><thead><tr><th>Cliente</th><th>Correo</th><th>Pedidos</th><th>Total comprado</th><th>Último pedido</th></tr></thead><tbody>${visibles.map(cliente => `
      <tr><td><strong>${escapar(cliente.nombre)}</strong></td><td>${escapar(cliente.correo)}</td><td>${cliente.pedidos}</td><td>${formatearCOP(cliente.total)}</td><td>${escapar(cliente.ultimo)}</td></tr>`).join('')}</tbody></table>` : '<div class="admin-empty">No hay clientes que coincidan con la búsqueda.</div>';
  }

async function actualizarPedido(id, estado) {
  const pedido = pedidos.find(item => item.id === id);
  if (!pedido) return;
  try {
    await tuPlatoDb.actualizarEstadoPedido(pedido.orderNumber, estado);
    pedidos = pedidos.map(item => item.id === id ? { ...item, estado } : item);
    mostrarToast(`${id} actualizado a ${estado}.`);
    renderPedidos();
    renderResumen();
    renderClientes();
  } catch (error) {
    mostrarToast(error.message || 'No se pudo actualizar el pedido.');
  }
}

async function guardarProducto(indice) {
  const input = document.getElementById(`precio-${indice}`);
  const precio = Number(input.value);
  if (!Number.isFinite(precio) || precio < 0) { mostrarToast('Ingresa un precio válido.'); return; }
  const stockInput = document.getElementById(`stock-${indice}`);
  const stockTexto = stockInput.value.trim();
  const stock = stockTexto === '' ? null : Number(stockTexto);
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) { mostrarToast('Ingresa existencias como número entero igual o mayor que cero.'); return; }
  const nuevosPrecios = { ...precios, [indice]: precio };
  const nuevoInventario = { ...inventario };
  if (stock === null) delete nuevoInventario[indice];
  else nuevoInventario[indice] = stock;
  try {
    await Promise.all([
      tuPlatoDb.guardarConfiguracion('adminPrecios', nuevosPrecios),
      tuPlatoDb.guardarConfiguracion('adminInventario', nuevoInventario)
    ]);
  } catch (error) {
    mostrarToast(error.message || 'No se pudieron guardar los cambios.');
    return;
  }
  precios = nuevosPrecios;
  inventario = nuevoInventario;
  catalogo = catalogo.map(plato => plato.index === indice ? { ...plato, p: precio } : plato);
  mostrarToast('Precio y existencias guardados en Supabase.');
  renderPrecios();
  renderResumen();
}

async function guardarCategoria(id) {
  const label = document.getElementById(`cat-nombre-${id}`).value.trim();
  const desc = document.getElementById(`cat-desc-${id}`).value.trim();
  if (!label) { mostrarToast('El nombre no puede estar vacío.'); return; }
  const guardadas = Object.fromEntries(Object.entries(categorias).map(([clave, valor]) => [clave, { label: valor.label, desc: valor.desc }]));
  guardadas[id] = { label, desc };
  try {
    await tuPlatoDb.guardarConfiguracion('adminCategorias', guardadas);
  } catch (error) {
    mostrarToast(error.message || 'No se pudo guardar la categoría.');
    return;
  }
  categorias[id] = { ...categorias[id], label, desc };
  actualizarFiltroCategoria();
  mostrarToast('Categoría actualizada en Supabase.');
  renderPrecios();
  renderCategorias();
}

function actualizarFiltroCategoria() {
  const filtro = document.getElementById('filtroCategoria');
  if (!filtro) return;
  const seleccionActual = filtro.value || 'todas';
  filtro.innerHTML = `<option value="todas">Todas</option>${Object.entries(categorias).map(([id, categoria]) => `<option value="${escapar(id)}">${escapar(categoria.label)}</option>`).join('')}`;
  filtro.value = categorias[seleccionActual] ? seleccionActual : 'todas';
}

function cambiarPestana(tab) {
  document.querySelectorAll('.admin-tab').forEach(elemento => elemento.classList.toggle('active', elemento.dataset.tab === tab));
  document.querySelectorAll('.admin-view').forEach(elemento => elemento.classList.toggle('active', elemento.id === `tab${tab[0].toUpperCase()}${tab.slice(1)}`));
  const actualizar = { resumen:renderResumen, pedidos:renderPedidos, precios:renderPrecios, categorias:renderCategorias, clientes:renderClientes };
  if (actualizar[tab]) actualizar[tab]();
}

function aplicarTemaAdmin(modo) {
  const oscuro = modo === 'oscuro';
  document.body.classList.toggle('admin-dark', oscuro);
  const boton = document.getElementById('adminThemeButton');
  if (boton) {
    boton.innerText = oscuro ? '☀' : '☾';
    boton.title = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  }
  localStorage.setItem('tema', modo);
}

function alternarTemaAdmin() {
  aplicarTemaAdmin(document.body.classList.contains('admin-dark') ? 'claro' : 'oscuro');
}

function temaInicialAdmin() {
  const guardado = localStorage.getItem('tema');
  return guardado || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
}

function mostrarToast(mensaje) {
  const toast = document.getElementById('adminToast');
  toast.innerText = mensaje;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

function volverATienda() { window.location.href = '../index.html'; }
async function cerrarSesionAdmin() {
  await tuPlatoDb.cerrarSesion();
  localStorage.removeItem('usuarioSesion');
  volverATienda();
}

window.onload = async function() {
  aplicarTemaAdmin(temaInicialAdmin());
  try {
    usuarioAdminActual = await tuPlatoDb.obtenerUsuarioActual();
  } catch (error) {
    usuarioAdminActual = null;
  }
  if (!esAdministrador()) { window.location.href = '../index.html'; return; }
  document.getElementById('adminUserName').innerText = usuarioAdminActual.nombre;
  try {
    await cargarDatos();
    actualizarFiltroCategoria();
    renderPrecios();
    renderCategorias();
    renderPedidos();
    renderResumen();
    renderClientes();
  } catch (error) {
    mostrarToast(error.message || 'No se pudieron cargar los datos de Supabase.');
  }
};
