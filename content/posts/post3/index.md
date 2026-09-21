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
categories: ["Ensayos"]

lightgallery: true
---

Hubo un tiempo, no tan lejano, en que subir una foto de un viaje significaba subir **el sitio**. La plaza, la fachada, la luz de las seis de la tarde. Uno volvía de Barcelona con cuarenta fotos de Barcelona.

Hoy uno vuelve de Barcelona con cuarenta fotos de sí mismo en Barcelona.

Esa es la intuición que quería poner a prueba. No como afirmación de sobremesa, sino mirando las imágenes de verdad. Y al mirarlas, lo que apareció no fue solo un cambio de tema. Fue un cambio de sitio: el sujeto se ha mudado de un lado de la cámara al otro.

<!--more-->

## Cuando el self estaba detrás de la cámara

Conviene empezar por algo que se olvida enseguida: **la foto de un sitio siempre habló de quien la hacía**. El que fotografiaba una plaza no desaparecía de la imagen, se escondía en ella. Estaba en la hora a la que decidió volver, en el punto donde plantó el trípode, en lo que dejó fuera del encuadre.

Esa era la forma antigua del self en la fotografía: **indirecta, y sostenida por la destreza**. Uno no decía quién era, lo demostraba. Y lo demostraba con una lista concreta de saberes: entender la luz, tener paciencia, componer, revelar, saber qué no fotografiar.

Flickr heredó ese contrato casi intacto. Sus fotos venían con la ficha técnica pegada —apertura, velocidad, ISO, objetivo—, y eso no era un detalle de frikis: era la prueba del oficio, el equivalente a enseñar el proceso y no solo el resultado. En los comentarios se discutía el encuadre y el revelado. El reconocimiento se contaba por foto, no por persona: uno acumulaba **obra**.

De ahí salía una identidad perfectamente reconocible: *yo soy el que sabe esperar la luz*. El sitio era el sujeto de la imagen. El autor, el mérito invisible que la había hecho posible.

## Cómo se desplazó

Entonces la técnica dejó de escasear.

El móvil puso una cámara decente en todos los bolsillos. El filtro hizo en un toque lo que antes era una tarde de revelado. El automatismo resolvió la exposición. Y ahí está el giro, menos glamuroso de lo que parece: **cuando una habilidad se reparte entre todos, deja de servir para distinguir a nadie**.

Si cualquiera saca una foto correcta de la misma plaza, la pericia deja de ser una credencial. Deja de ser un capital. Y una identidad que se sostenía sobre esa pericia se queda, de golpe, sin suelo.

Lo único que un filtro no puede replicar es quién eres tú y dónde estás. Así que el self hizo lo que hace cualquiera cuando su moneda se devalúa: cambió de moneda. Salió de detrás de la cámara y se puso delante.

## Y cómo se reconfiguró

El desplazamiento físico es lo de menos. Lo que importa es lo que cambia al llegar al otro lado.

**El self deja de ser autor y pasa a ser motivo.** Antes era la causa de la foto; ahora es su contenido. Antes se demostraba; ahora se exhibe. Lo que se ganaba con una imagen difícil pasa a reclamarse por presencia.

**Cambia la unidad de cuenta.** Flickr contaba favoritos por fotografía: lo que crecía era la obra. Instagram cuenta seguidores por persona: lo que crece es la audiencia. Y una audiencia no se fideliza con un encuadre, se fideliza con una cara. La métrica no es un accesorio del sistema: es lo que empuja el rostro hacia el centro del cuadro.

**Y el sitio cambia de papel dos veces.** Primero deja de ser el sujeto y pasa a ser decorado. Después deja de ser decorado y pasa a ser **credencial**: ya no se fotografía el lugar, se usa. Certifica que has estado, que has podido pagarlo, que tu vida se parece a la que se supone deseable.

La postal decía «mira qué bonito es esto». El post dice «mira quién soy yo aquí». Y para eso el sitio tiene que ser reconocible en medio segundo, porque si no, no certifica nada. De ahí que los mismos veinte encuadres se repitan un millón de veces: ya no son paisajes, son **sellos**.

Lo que se ha reconfigurado, entonces, no es la afición a salir en las fotos. Es de dónde saca uno la prueba de que vale algo. Antes la daba lo que sabías hacer. Ahora la da dónde has conseguido estar.

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

Elegí tres sitios de costa deliberadamente distintos entre sí. **Barcelona**, una ciudad con siglos de vida propia antes de que existiera la fotografía. **Miami**, un destino levantado en buena medida para ser mirado: art déco, palmeras alineadas, un skyline que hace de fondo. Y **Santorini**, el caso extremo, donde el mismo encuadre lleva tanto tiempo repitiéndose que ya no es un paisaje, es un sello.

Conviene decirlo sin rodeos: los elegí **porque ahí el fenómeno se ve**. Eso no es una muestra, es una selección. Sospecho que con sitios sin postal —un puerto industrial, un pueblo de interior— la mitad derecha se parecería bastante más a la izquierda, pero no lo he comprobado: lo digo como conjetura, no como hallazgo.

Aun así, al ir mirando publicaciones una por una, aparecieron dos cosas que no esperaba.

La primera es que **el desplazamiento no es total**. Incluso en Santorini el buscador devuelve todavía vistas sin nadie dentro: cúpulas al atardecer, una mesa puesta frente a la caldera. La fotografía del sitio no ha desaparecido. Ha pasado a segunda fila.

La segunda es la más interesante de las nueve. En Barcelona apareció una figura **de espaldas** ante la cascada de la Ciutadella. Ocupa el centro del encuadre, la imagen entera, y sin embargo no se le ve la cara y el sitio se reconoce sin esfuerzo. No es la foto del lugar ni es el retrato: es exactamente el punto medio del trayecto, congelado. La persona ya está delante de la cámara, pero todavía no ha reclamado el papel principal.

Eso ayuda a afinar la tesis. El movimiento no va del lugar a la persona sin más. Va del lugar **visto** al lugar **presentado**, y admite grados: el sitio solo, el sitio con alguien dentro, alguien con el sitio detrás, alguien y el sitio ya casi fuera de cuadro.

Dicho lo cual, lo obvio: son nueve publicaciones que elegí yo. Sirven para mirar, no para demostrar.

---

La herramienta seguirá creciendo: iré añadiendo ciudades a la selección de Instagram. Si se te ocurre alguna que ilustre bien el contraste, {{< correo >}}.
