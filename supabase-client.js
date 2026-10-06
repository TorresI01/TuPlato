(function () {
  const client = window.supabase.createClient(
    'https://dntfjlwwaymsvvnxbdct.supabase.co',
    'sb_publishable_zQs5kR0lHPOWUAtM-2E0Ww_Ry5QpjWX'
  );

  async function exigirOk(resultado) {
    if (resultado.error) throw resultado.error;
    return resultado.data;
  }

  async function obtenerUsuarioActual() {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return null;

    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data.user) return null;

    const perfil = await exigirOk(await client
      .from('profiles')
      .select('id, email, full_name, is_admin')
      .eq('id', data.user.id)
      .single());

    return {
      id: data.user.id,
      nombre: perfil.full_name || data.user.email,
      correo: perfil.email || data.user.email,
      admin: perfil.is_admin === true
    };
  }

  function limpiarDatosLocales() {
    ['usuarioSesion', 'carritoBuffet', 'direccionBuffet', 'favoritosBuffet', 'recetasBuffet']
      .forEach(clave => localStorage.removeItem(clave));
  }

  window.tuPlatoDb = {
    async obtenerUsuarioActual() {
      return obtenerUsuarioActual();
    },
    async registrarse(nombre, correo, password) {
      const { data, error } = await client.auth.signUp({
        email: correo,
        password,
        options: { data: { full_name: nombre } }
      });
      if (error) throw error;
      return data;
    },
    async iniciarSesion(correo, password) {
      const { error } = await client.auth.signInWithPassword({ email: correo, password });
      if (error) throw error;
      return obtenerUsuarioActual();
    },
    async cerrarSesion() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      limpiarDatosLocales();
    },
    async sembrarCatalogoPrecios(catalogo) {
      return exigirOk(await client.rpc('seed_pricing_catalog', { p_catalog: catalogo }));
    },
    limpiarDatosLocales() {
      limpiarDatosLocales();
    },
    async crearPedido(pedido) {
      return exigirOk(await client.rpc('create_order', {
        p_items: pedido.items,
        p_delivery_city: pedido.delivery_city,
        p_delivery_address: pedido.delivery_address,
        p_delivery_zone: pedido.delivery_zone,
        p_payment_method: pedido.payment_method
      }));
    },
    async obtenerPedidos() {
      return exigirOk(await client.from('orders')
        .select('order_number, customer_name, customer_email, detail, total, status, created_at')
        .order('created_at', { ascending: false }));
    },
    async actualizarEstadoPedido(orderNumber, status) {
      return exigirOk(await client.from('orders')
        .update({ status })
        .eq('order_number', orderNumber)
        .select('order_number')
        .single());
    },
    async obtenerClientes() {
      return exigirOk(await client.from('profiles')
        .select('id, email, full_name, is_admin')
        .eq('is_admin', false)
        .order('full_name'));
    },
    async obtenerConfiguracion(claves) {
      const filas = exigirOk(await client.from('app_settings')
        .select('key, value')
        .in('key', claves));
      return filas.then(registros => Object.fromEntries(registros.map(fila => [fila.key, fila.value])));
    },
    async guardarConfiguracion(clave, valor) {
      return exigirOk(await client.from('app_settings')
        .upsert({ key: clave, value: valor }, { onConflict: 'key' })
        .select('key')
        .single());
    }
  };
})();
