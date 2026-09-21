/* Herramienta "El self digital".
 *
 * Flickr en vivo (su API responde con CORS y devuelve JSON, comprobado) e
 * Instagram como corpus curado a mano, porque no se puede buscar.
 */
(function () {
  'use strict';

  var raiz = document.querySelector('.sd');
  if (!raiz) return;

  var CLAVE = raiz.getAttribute('data-flickr-key') || '';
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

  /* ---------------------------------------------------------------- Flickr */

  function urlFlickr(ciudad, desde, hasta) {
    var p = {
      method: 'flickr.photos.search',
      api_key: CLAVE,
      text: ciudad,
      /* Licencias Creative Commons y dominio publico. Sin esto estariamos
         mostrando fotos con todos los derechos reservados. */
      license: '1,2,3,4,5,6,7,8,9,10',
      min_taken_date: desde,
      max_taken_date: hasta,
      sort: 'relevance',
      content_type: '1',
      safe_search: '1',
      per_page: '9',
      extras: 'url_m,owner_name,license,date_taken',
      format: 'json',
      nojsoncallback: '1'
    };
    return 'https://api.flickr.com/services/rest/?' +
      Object.keys(p).map(function (k) {
        return k + '=' + encodeURIComponent(p[k]);
      }).join('&');
  }

  function pintarFlickr(destino, fotos) {
    destino.innerHTML = '';
    if (!fotos.length) {
      destino.innerHTML = '<p class="sd-vacio">Sin fotos con licencia libre para esta búsqueda.</p>';
      return;
    }
    fotos.forEach(function (f) {
      if (!f.url_m) return;
      var a = document.createElement('a');
      a.className = 'sd-foto';
      a.href = 'https://www.flickr.com/photos/' + f.owner + '/' + f.id;
      a.target = '_blank';
      a.rel = 'noopener';
      /* La atribucion no es opcional: las licencias CC la exigen. */
      a.title = (f.title || 'Sin título') + ' — © ' + (f.ownername || 'desconocido');

      var img = document.createElement('img');
      img.src = f.url_m;
      img.loading = 'lazy';
      img.alt = f.title || '';
      a.appendChild(img);

      var pie = document.createElement('span');
      pie.className = 'sd-foto-pie';
      pie.textContent = (f.ownername || 'desconocido') +
        (f.datetaken ? ' · ' + f.datetaken.slice(0, 4) : '');
      a.appendChild(pie);

      destino.appendChild(a);
    });
  }

  function buscarFlickr(ciudad) {
    if (!CLAVE) {
      document.getElementById('sd-flickr-viejo').innerHTML =
        '<p class="sd-vacio">Falta la clave de la API.</p>';
      document.getElementById('sd-flickr-nuevo').innerHTML = '';
      return Promise.resolve();
    }
    var epocas = [
      ['sd-flickr-viejo', '2004-01-01 00:00:00', '2010-12-31 23:59:59'],
      ['sd-flickr-nuevo', '2016-01-01 00:00:00', '2030-12-31 23:59:59']
    ];
    return Promise.all(epocas.map(function (e) {
      var destino = document.getElementById(e[0]);
      destino.innerHTML = '<p class="sd-vacio">Buscando…</p>';
      return fetch(urlFlickr(ciudad, e[1], e[2]))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.stat !== 'ok') {
            destino.innerHTML = '<p class="sd-vacio">Flickr respondió: ' +
              (d.message || 'error desconocido') + '</p>';
            return;
          }
          pintarFlickr(destino, (d.photos && d.photos.photo) || []);
        })
        .catch(function () {
          destino.innerHTML = '<p class="sd-vacio">No se pudo contactar con Flickr.</p>';
        });
    }));
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
