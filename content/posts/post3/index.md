---
title: "Flickr vs. Instagram: La evolución del self digital"
date: 2024-08-19
draft: false
author: "unlord"
authorLink: "https://unlordl4b.pages.dev/"
description: "Una herramienta para comparar cómo nos retratábamos en Flickr y cómo lo hacemos en Instagram. Y lo que descubrí al intentar construirla: que una de las dos plataformas ya no deja mirar."
images: ["fvsi.jpg"]
resources:
- name: "featured-image"
  src: "fvsi.jpg"

tags: ["metaverso", "self digital", "Flickr", "Instagram", "redes sociales", "evolución digital"]
categories: ["unlord"]

lightgallery: true
---

Hubo un tiempo, no tan lejano, en que subir una foto de un viaje significaba subir **el sitio**. La plaza, la fachada, la luz de las seis de la tarde. Uno volvía de Lisboa con cuarenta fotos de Lisboa.

Hoy uno vuelve de Lisboa con cuarenta fotos de sí mismo en Lisboa.

Esa es la intuición que quería poner a prueba. No como afirmación de sobremesa, sino mirando las imágenes de verdad.

<!--more-->

## Dos plataformas, dos maneras de estar en el mundo

**Flickr** se lanzó en 2004. Nació entre fotógrafos: grupos temáticos, discusiones sobre exposición y encuadre, licencias Creative Commons por defecto. El mérito estaba en la fotografía.

**Instagram** llegó en 2010 con una promesa distinta. Cuadrada, con filtros, pensada para el móvil. El mérito se desplazó de la fotografía a quien aparece en ella.

Entre una y otra no hay solo seis años. Hay un cambio en qué se considera digno de ser mostrado, y ese cambio deja huella en millones de imágenes.

## La herramienta

Escribe una ciudad y compara. A la izquierda, Flickr. A la derecha, Instagram.

{{< self-digital >}}

## Lo que descubrí al construirla

Aquí la cosa se puso interesante, y de una forma que no esperaba.

Empecé por Instagram, dando por hecho que sería lo fácil. No salió. Y no por falta de maña:

- La **API Basic Display** murió el **4 de diciembre de 2024**.
- La **Graph API** que la sustituye exige cuenta de empresa, verificación de negocio y que Meta revise tu aplicación. Superado todo eso, permite **treinta hashtags únicos por semana**. Treinta ciudades semanales para todos los visitantes de esta página.
- Su buscador **exige sesión iniciada**. Sin ella devuelve cero imágenes.
- Y aunque quisieras leerlo por tu cuenta, **el navegador no te deja**: la petición ni sale.

Me consolé pensando que al menos Flickr, la veterana, seguiría siendo la plataforma abierta de siempre. Durante veinte años cualquiera pudo pedirle una clave y construir cosas con sus fotos.

Ya no. **Desde 2025 las claves nuevas son solo para cuentas Pro**, que son de pago.

Al final llego a las fotos de Flickr **por la puerta de atrás**: a través de [Openverse](https://openverse.org), el buscador de contenido libre de WordPress, que indexa lo que tiene licencia abierta. Funciona, es legítimo y no cuesta nada. Pero es un intermediario. Ya no hablo con Flickr: hablo de Flickr con un tercero que tomó apuntes mientras aún se podía.

Así que la comparación quedó coja por los dos lados. Y al mirarla un rato entendí que la cojera *era* el resultado.

## El verdadero hallazgo

Yo quería medir cómo había cambiado la manera de retratarnos. Lo que acabé midiendo es algo más grande: **cómo ha cambiado el derecho a mirar**.

No hay una plataforma abierta y otra cerrada. Hay **dos formas de cerrar**. Instagram levantó un muro de golpe y puso un torno. Flickr está echando la persiana despacio, poniendo precio a lo que antes regalaba.

No es un problema técnico: a ninguna de las dos le falta infraestructura. Es una decisión. El archivo de nuestra vida visual de los últimos veinte años está ahí dentro, y no es nuestro. No se puede estudiar, ni citar, ni contrastar. Solo consumir, de uno en uno, dentro de su aplicación y en el orden que decida su algoritmo.

Lo llamativo no es que Meta cerrara. Es que la plataforma que nació abierta, la que usaban los fotógrafos, la de las licencias libres por defecto, también haya acabado cobrando por la llave.

Por eso la mitad derecha de esta herramienta funciona con publicaciones elegidas **a mano**, una a una. Es lo único que la plataforma permite, y lo digo sin ironía: es exactamente la diferencia entre un archivo y un escaparate.

## Lo que apareció al elegirlas

Empecé por tres ciudades de costa: Lisboa, Barcelona y Nápoles. Y al ir mirando publicaciones una por una, mi intuición de partida se sostuvo peor de lo que esperaba.

Barcelona la confirma sin matices: cuerpos en primer plano, la ciudad detrás y fuera de foco. Nápoles la desmiente entera: lo que encontré fueron callejones engalanados, un balcón azul con el Vesubio al fondo, un atardecer sobre el mar sin nadie dentro. Lisboa se quedó a medias, y su imagen más reveladora no tiene a ninguna persona: es una playa con un rótulo encima que dice *My Favorite Beach*.

Ahí el sitio no ha desaparecido. Se ha convertido en mercancía.

Así que el desplazamiento no va del lugar a la persona, o no solo. Va del lugar **visto** al lugar **presentado**, con alguien delante o sin nadie. Flickr te enseñaba una plaza. Instagram te la vende, y a veces el envoltorio es un cuerpo y a veces es una tipografía encima del mar.

Conviene decir lo obvio: son ocho publicaciones que elegí yo. No es una muestra, es un puñado de ejemplos. Sirven para mirar, no para demostrar.

---

La herramienta seguirá creciendo: iré añadiendo ciudades a la selección de Instagram. Si se te ocurre alguna que ilustre bien el contraste, [escríbeme](mailto:unl4b@proton.me).
