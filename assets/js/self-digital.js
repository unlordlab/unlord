/* Herramienta "El self digital".
 *
 * Flickr, a traves de Openverse. Instagram, corpus curado a mano.
 *
 * Por que Openverse y no la API de Flickr: desde 2025 Flickr solo da claves
 * de API a cuentas Pro, que son de pago. Openverse (el buscador de contenido
 * libre de WordPress) indexa Flickr, responde con CORS, no pide clave y solo
 * devuelve material con licencia libre. Comprobado los tres puntos.
 *
 * Lo que se pierde por el camino: Openverse no expone la fecha de captura ni
 * admite filtrarla, asi que la comparacion entre epocas no es posible. Queda
 * la comparacion entre plataformas, que era la tesis original.
 */
(function () {
  'use strict';

  var raiz = document.querySelector('.sd');
  if (!raiz) return;

  var form = document.getElementById('sd-form');
  var entrada = document.getElementById('sd-ciudad');
  var estado = document.getElementById('sd-estado');
  var resultados = document.getElementById('sd-resultados');

  var corpus = {};
  try {
    corpus = JSON.parse(document.getElementById('sd-corpus').textContent || '{}');
  } catch (e) { corpus = {}; }

  /* Para casar "Berlín" con la clave "berlin" del fichero de datos. */
  function normalizar(s) {
    return s.toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ');
  }

  function aviso(txt) { estado.textContent = txt; }

  /* ----------------------------------------------- Flickr, via Openverse */

  function urlOpenverse(ciudad) {
    var p = {
      q: ciudad,
      source: 'flickr',
      page_size: '12',
      /* Descarta enlaces rotos: sin esto salen huecos */
      filter_dead: 'true',
      category: 'photograph'
    };
    return 'https://api.openverse.org/v1/images/?' +
      Object.keys(p).map(function (k) {
        return k + '=' + encodeURIComponent(p[k]);
      }).join('&');
  }

  function pintarFotos(destino, fotos) {
    destino.innerHTML = '';
    if (!fotos.length) {
      destino.innerHTML = '<p class="sd-vacio">Sin fotos con licencia libre para esta ciudad.</p>';
      return;
    }
    fotos.forEach(function (f) {
      /* La URL directa del CDN de Flickr admite sufijo de tamano: _n son
         320px. Es mas rapida que la miniatura de Openverse, que se genera
         bajo demanda (medido: 205ms frente a 563ms). Si el patron no casa,
         se cae a la miniatura de Openverse. */
      var src = null;
      if (f.url && /_[a-z]?\.jpe?g$/i.test(f.url)) {
        src = f.url.replace(/_[a-z]?\.jpe?g$/i, '_n.jpg');
      }
      src = src || f.thumbnail || f.url;
      if (!src) return;

      var a = document.createElement('a');
      a.className = 'sd-foto';
      a.href = f.foreign_landing_url || '#';
      a.target = '_blank';
      a.rel = 'noopener';
      /* La atribucion no es opcional: las licencias CC la exigen. */
      a.title = (f.title || 'Sin título') + ' — ' + (f.creator || 'autor desconocido') +
        ' (CC ' + (f.license || '').toUpperCase() + ' ' + (f.license_version || '') + ')';

      var img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = f.title || '';
      /* Si la URL directa falla (foto borrada, tamano inexistente) se
         reintenta UNA vez con la miniatura de Openverse. */
      if (f.thumbnail && src !== f.thumbnail) {
        img.addEventListener('error', function reintento() {
          img.removeEventListener('error', reintento);
          img.src = f.thumbnail;
        });
      }
      img.src = src;
      a.appendChild(img);

      var pie = document.createElement('span');
      pie.className = 'sd-foto-pie';
      pie.textContent = (f.creator || 'desconocido') + ' · CC ' + (f.license || '').toUpperCase();
      a.appendChild(pie);

      destino.appendChild(a);
    });
  }

  function buscarFlickr(ciudad) {
    var destino = document.getElementById('sd-flickr');
    destino.innerHTML = '<p class="sd-vacio">Buscando…</p>';
    return fetch(urlOpenverse(ciudad))
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        pintarFotos(destino, d.results || []);
      })
      .catch(function () {
        destino.innerHTML = '<p class="sd-vacio">No se pudo contactar con Openverse. ' +
          'Puede ser un límite temporal de peticiones: prueba en un minuto.</p>';
      });
  }

  /* ------------------------------------------------------------- Instagram */

  /* Fachada: NO se carga nada de Instagram hasta que el lector lo pide.
     Asi nadie le entrega su IP a Meta sin querer. */
  function fachada(codigo) {
    var caja = document.createElement('div');
    caja.className = 'sd-ig';

    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'sd-ig-boton';
    boton.innerHTML = '<span class="sd-ig-icono">▶</span>' +
      '<span>Cargar publicación de Instagram</span>' +
      '<small>Al pulsar, tu navegador se conecta a instagram.com</small>';

    boton.addEventListener('click', function () {
      var ifr = document.createElement('iframe');
      ifr.src = 'https://www.instagram.com/p/' + encodeURIComponent(codigo) + '/embed/';
      ifr.className = 'sd-ig-iframe';
      ifr.loading = 'lazy';
      ifr.setAttribute('scrolling', 'no');
      ifr.setAttribute('frameborder', '0');
      ifr.title = 'Publicación de Instagram';
      caja.replaceChild(ifr, boton);
    });

    caja.appendChild(boton);
    return caja;
  }

  function enlaceBusqueda(ciudad) {
    var p = document.createElement('p');
    p.className = 'sd-ig-enlace';
    var url = 'https://www.instagram.com/explore/search/keyword/?q=' +
      encodeURIComponent('#' + normalizar(ciudad).replace(/\s+/g, ''));
    p.innerHTML = 'Todavía no hay una selección para esta ciudad. ' +
      '<a href="' + url + '" target="_blank" rel="noopener">Buscarla en Instagram</a> ' +
      '<small>(te pedirá iniciar sesión)</small>';
    return p;
  }

  function pintarInstagram(ciudad) {
    var destino = document.getElementById('sd-instagram');
    destino.innerHTML = '';
    var ficha = corpus[normalizar(ciudad)];
    if (ficha && ficha.posts && ficha.posts.length) {
      ficha.posts.forEach(function (codigo) {
        destino.appendChild(fachada(codigo));
      });
    } else {
      destino.appendChild(enlaceBusqueda(ciudad));
    }
  }

  /* ------------------------------------------------------------------ Envio */

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var ciudad = entrada.value.trim();
    if (!ciudad) return;

    resultados.hidden = false;
    aviso('Comparando «' + ciudad + '»…');
    pintarInstagram(ciudad);
    buscarFlickr(ciudad).then(function () {
      aviso('Resultados para «' + ciudad + '».');
    });
  });

})();
