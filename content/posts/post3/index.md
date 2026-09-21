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

Escribe una ciudad y compara. A la izquierda, Flickr en dos épocas: sus primeros años frente a hoy. A la derecha, Instagram.

{{< self-digital >}}

## Lo que descubrí al construirla

Aquí la cosa se puso interesante, y de una forma que no esperaba.

La mitad de Flickr salió sola. Su API sigue abierta: cualquiera puede consultarla desde un navegador, sin permisos especiales, filtrando por fecha y por licencia. Una plataforma de 2004 que sigue tratando a su público como gente capaz de construir cosas.

La mitad de Instagram no salió. Y no por falta de maña:

- La **API Basic Display** murió el **4 de diciembre de 2024**.
- La **Graph API** que la sustituye exige cuenta de empresa, verificación de negocio y que Meta revise tu aplicación. Superado todo eso, permite **treinta hashtags únicos por semana**. Treinta ciudades semanales para todos los visitantes de esta página.
- Su buscador **exige sesión iniciada**. Sin ella devuelve cero imágenes.
- Y aunque quisieras leerlo por tu cuenta, **el navegador no te deja**: la petición ni sale.

Así que la comparación quedó coja. Pero al mirarla un rato entendí que la cojera *era* el resultado.

## El verdadero hallazgo

Yo quería medir cómo había cambiado la manera de retratarnos. Lo que acabé midiendo es algo más grande: **cómo ha cambiado el derecho a mirar**.

Flickr, con veinte años encima, permite que un desconocido consulte su archivo y saque conclusiones. Instagram, más joven y con mil veces más imágenes, ha construido un muro y ha puesto un torno.

No es un problema técnico. Meta tiene infraestructura de sobra. Es una decisión: el archivo de nuestra vida visual de los últimos quince años está ahí dentro, y no es nuestro. No se puede estudiar, ni citar, ni contrastar. Solo consumir, de uno en uno, dentro de su aplicación y en el orden que decida su algoritmo.

Por eso la mitad derecha de esta herramienta funciona con publicaciones elegidas **a mano**, una a una. Es lo único que la plataforma permite, y lo digo sin ironía: es exactamente la diferencia entre un archivo y un escaparate.

---

La herramienta seguirá creciendo: iré añadiendo ciudades a la selección de Instagram. Si se te ocurre alguna que ilustre bien el contraste, [escríbeme](mailto:unl4b@proton.me).
