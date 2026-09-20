# Plan de mejoras — blog unlord l4b

> Auditoría del repo `unlordlab/unlord` (fork de `dillonzq/LoveIt`), rama `master`.
> Fecha: 2026-09-20 · Sitio: https://unlordl4b.pages.dev/
>
> Leyenda: 🤖 = lo puede hacer Claude automáticamente · 🙋 = necesita una decisión o un fichero tuyo

---

## Estado

**Fases 1 y 2 ejecutadas** en la rama `mejoras/fase-1-2` (8 commits). Todo verificado
construyendo el sitio con Hugo y comparando el HTML generado antes y después.

| | Antes | Después |
|---|---|---|
| `<html lang>` | `en` | `es` |
| `<title>` portada | *(vacío)* | `unlord l4b` |
| `<title>` post | `... enemigo. - ` | `... enemigo. - unlord l4b` |
| `og:image` | `/static/favicon.ico` (404) | `/og-default.png` (1200×630) |
| JSON-LD `name` | `""` | `unlord l4b` |
| `robots.txt` | **no existía** | 1060 bytes, con `Sitemap:` |
| UI del tema | `Read More` | `Leer más` |
| Orden de posts | por `weight` (caótico) | por fecha |
| Imágenes en móvil | 4773 KB | 438 KB (**−91 %**) |
| `content/` | 32,3 MB | 22,6 MB |
| Favicons 404 | 2 por carga | 0 |
| Tipografía | system-ui | Sniglet + Departure Mono |
| Fondo claro | `#5e6365` gris medio | `#ffe4f1` rosa Bubblegum |
| Fondo oscuro | `#5a6f68` verde salvia | `#000000` negro |
| Enlaces en texto | invisibles | rojo + subrayado |
| Imágenes en portada | recortadas a franja 10:3 | enteras, y más pequeñas |

### Trabajo de estética (PRs #2 a #5, todos mergeados)

Partía de un problema medible, no de gusto: los dos temas estaban a media
luminancia, así que ni el texto oscuro ni el claro funcionaban sobre ellos.

| Contraste | Antes | Ahora claro | Ahora oscuro |
|---|---|---|---|
| Título y párrafos | 2,82 – 3,07 | 9,41 | 16,64 |
| Enlaces en texto | **1,43** | 4,72 | 7,70 |
| Metadatos | 2,31 – 2,61 | 4,51 | 7,55 |

WCAG AA pide 4,5:1. Antes fallaban todos.

- Paleta clara tomada del tema **Bubblegum** de cyberspace.online
  (`#ffe4f1` / `#6b1a4a`), leyendo sus custom properties en el navegador.
- Paleta oscura tomada de su tema **Dark** (`#000000` / `#efe5c0`).
- Acento rojo en los dos temas: `#c62828` en claro, `#ff6f61` en oscuro.
- Tipografía **Sniglet + Departure Mono**, autoalojadas, SIL OFL.
- Los enlaces del contenido recuperan el subrayado, que el tema eliminaba
  con `text-decoration: none`.
- Imágenes de portada enteras y a 24 rem.
- Título duplicado eliminado en 4 posts, fechas en `02/01/2006`.

### Dos cosas urgentes que aparecieron por el camino

1. **Tu sitio no compila con Hugo moderno.** `content/posts/FVSI.html` lo rompía
   (`security.allowContent` bloquea `text/html` suelto en `content/` desde ~0.145), y
   además el tema usa `.Site.Author` y `.Site.IsMultiLingual`, eliminados en Hugo 0.141.
   Cloudflare debe estar construyendo con una versión antigua: **el día que la actualice,
   tu web deja de desplegarse**. Ver tareas 2.5b y 3.3.

2. **Rango de Hugo verificado** construyendo con cada versión:
   `0.121.2` OK · `0.128.2` OK · `0.135.0` OK · `0.139.4` FALLA · `0.140.2` FALLA · `0.166.0` FALLA

---

## FASE 1 — Bugs en producción (prioridad máxima)

Son fallos que están afectando al sitio ahora mismo. Ninguno es estético.

- [x] 🤖 **1.1 · La home no tiene `<title>`**
  `title` está dentro de `[params]`, pero Hugo lee `.Site.Title` del nivel raíz.
  Verificado: `root title: AUSENTE`.
  - Portada: `<title></title>` vacío → Google se inventa el título en los resultados.
  - Posts: salen como `"Título del post - "` con el guion colgando (`layouts/posts/single.html:1`).
  - JSON-LD: emite `"name": ""` (`layouts/partials/head/seo.html:61`).
  - Open Graph: `og:site_name` vacío.
  - **Arreglo:** añadir `title = "unlord l4b"` en la raíz de `config.toml`.
  - **Extra:** quitar los 2 espacios iniciales de `params.title` y `params.header.title.name`.

- [x] 🤖 **1.2 · Tres claves caídas dentro de otra tabla (error de indentación TOML)**
  `paginate`, `googleAnalytics` y `copyright` quedaron dentro de `[params.header.title]`.
  En TOML una tabla se extiende hasta la siguiente cabecera `[...]`, así que se convirtieron
  en `params.header.title.paginate`, etc. Verificado: `paginate dentro de header.title: True`.
  Las tres son claves de nivel raíz y ahora mismo **no hacen nada**.
  - **Arreglo:** moverlas al nivel raíz del fichero.
  - **Nota:** si Hugo es ≥ 0.128, `paginate` está deprecado en favor de `[pagination] pagerSize`.

- [x] 🤖 **1.3 · `<html lang="">` y la interfaz en inglés**
  No hay `languageCode` ni `defaultContentLanguage`. Verificado: ambos ausentes.
  `layouts/_default/baseof.html:4` es `<html lang="{{ .Site.LanguageCode }}">` → sale vacío.
  - Lectores de pantalla pronuncian mal el contenido.
  - Google tiene que adivinar el idioma.
  - Todos los JSON-LD llevan `"inLanguage": ""`.
  - **La UI del tema sale en inglés** ("Read More", "Posted on", "Contents") aunque
    `i18n/es.toml` y `i18n/ca.toml` ya están en el repo sin usar.
  - **Arreglo mínimo:** `languageCode = "es"` + `defaultContentLanguage = "es"`.
  - **Arreglo completo (🙋 decisión):** config multilingüe `[languages.es]` / `[languages.ca]`,
    porque `farrer` y `metavers` están en catalán. Alternativa barata: `language: ca`
    en el front matter de esos dos.

- [x] 🙋 **1.4 · La imagen social (Open Graph) está rota**
  `images = ["/static/favicon.ico"]` — dos fallos:
  1. `static/` no existe en el output de Hugo (se aplana a la raíz) → sería `/favicon.ico`.
  2. Un `.ico` no sirve como tarjeta social.

  **Resultado: al compartir el blog en Mastodon, WhatsApp o LinkedIn no sale imagen.**
  - ✅ **Hecho (provisional):** ruta corregida a `/og-default.png` y generada una tarjeta
    1200×630 en `static/og-default.png` (logo invertido + Space Grotesk sobre fondo oscuro).

- [ ] 🙋 **1.4b · Mejorar la tarjeta Open Graph** ⬅️ *pendiente*
  La actual es funcional pero mejorable. Ideas a decidir:
  - Diseño propio tuyo en vez del generado automáticamente.
  - Usar un color de acento real de tu identidad (ahora hay un naranja puesto a ojo).
  - Valorar **tarjetas por post**: Hugo puede generar una imagen distinta por artículo con
    su título, en vez de la misma para todo el sitio. Es lo que hacen los blogs que se
    comparten bien.
  - Revisar cómo se ve recortada en Mastodon (16:9), WhatsApp (cuadrada) y LinkedIn.

- [x] 🤖 **1.5 · Imagen OG rota en el post `million`**
  `images: ["ceci.mpg"]` — el fichero real es `ceci.jpg`. Ese post se comparte sin imagen.

- [x] 🤖 **1.6 · El `robots.txt` no se genera**
  Tienes un `layouts/robots.txt` trabajado (bloquea Ahrefs, SISTRIX, MJ12bot…) que termina
  con la directiva `Sitemap:`. Pero Hugo solo lo genera si `enableRobotsTXT = true`,
  y no lo tienes. Verificado: ausente. **Ese fichero no existe en tu web.**
  - **Arreglo:** `enableRobotsTXT = true` en la raíz.
  - ✅ **Hecho:** `enableRobotsTXT = true`. Verificado: `/robots.txt`, 1060 bytes, con
    la directiva `Sitemap: https://unlordl4b.pages.dev/sitemap.xml`.

- [ ] 🙋 **1.6b · Decidir la política sobre crawlers de IA** ⬅️ *pendiente*
  Ahora mismo estás en "todo permitido" para `GPTBot`, `CCBot`, `ClaudeBot`,
  `Google-Extended`, `PerplexityBot`… Tu `robots.txt` bloquea rastreadores de SEO
  (Ahrefs, SISTRIX, MJ12bot) pero no dice nada de estos.
  Escribiendo sobre sesgos algorítmicos, merece una decisión consciente en un sentido o
  en otro — bloquearlos, permitirlos, o permitir solo algunos. Dime cuál y lo aplico.

- [ ] 🙋 **1.7 · El enlace a RSU Terminal es HTTP contra una IP desnuda**
  En `content/posts/rsu/index.md`: `[RSU Terminal](http://178.104.148.117/)`.
  Desde una página HTTPS eso es contenido mixto: el navegador avisa y **parece un enlace
  malicioso**. Además expone tu IP.
  - **Arreglo:** Cloudflare Tunnel (gratis, ya estás en Cloudflare) → `terminal.tudominio.com`
    con HTTPS y sin exponer la IP. Monta el túnel y yo cambio el enlace.

- [x] 🤖 **1.8 · El orden de los posts es impredecible**
  `weight` repetido: 5 posts con `weight: 1`, 2 con `2`, 1 con `3`, 1 con `4`.
  Hugo ordena por `weight` **antes** que por fecha → un post de 2023 puede salir por
  delante de uno de 2026.
  - **Arreglo:** quitar `weight` de los 9 posts. Ordenarán por fecha.

- [x] 🙋 **1.9 · Todas las `description` son copias del título**
  8 de 9 posts tienen `description` idéntica al `title`. Es el `<meta name="Description">`
  que ve Google: duplicar el título desperdicia el único texto que controlas en los resultados.
  El de `l4b` es peor, es un pie de foto: *"Imagen de las primeras páginas web en Geocities"*.
  - **Modelo a seguir** (el único bien hecho, el de `pantallas`):
    > *"Una reflexión sobre cómo el pánico moral hacia las pantallas oculta el verdadero
    > problema: la arquitectura algorítmica y el capitalismo de plataformas."*
  - 140–155 caracteres, que dé ganas de clicar.
  - **Puedo redactarte un borrador de las 8 y tú las revisas.**

---

## FASE 2 — Rendimiento (lo que más te cuesta en visitas reales)

Google mide Core Web Vitals para posicionar. `content/` pesa **32 MB**.

- [ ] 🤖 **2.1 · Comprimir las imágenes**

  | Fichero | Peso |
  |---|---|
  | `content/posts/Línea del tiempo (1).png` | 3,9 MB |
  | `content/posts/linia.png` | 3,9 MB *(duplicado del anterior)* |
  | `content/posts/eurovision/eurovision.png` | 3,0 MB |
  | `content/posts/million/million.pdf` | 2,4 MB |
  | `content/posts/farrer/ferrer.png` | 2,1 MB |
  | `content/posts/million/million dolar baby.png` | 1,9 MB |
  | `content/posts/million/mdb.png` | 1,9 MB *(duplicado)* |
  | `content/posts/metavers/metavers.pdf` | 1,9 MB |
  | `content/posts/l4b/delated.png` | 1,3 MB |

  Un PNG de 3,9 MB pasa a ~200 KB en WebP sin diferencia visible.

  ⚠️ **Parcialmente resuelto por la 2.2.** Lo que descarga el visitante ya está
  arreglado (Hugo genera WebP redimensionados: −91 %). Lo que queda pesado son los
  **ficheros fuente del repo**, que solo afectan al tamaño del repo y al tiempo de
  build. `linia.png` y `Línea del tiempo (1).png` ya se borraron (tarea 2.3).

- [ ] 🙋 **2.1b · 15,3 MB de ficheros sin referenciar** ⬅️ *pendiente, decisión tuya*
  Comprobado uno a uno: no los enlaza ni el markdown ni el front matter. **No los he
  borrado porque hay contenido tuyo ahí dentro**, no basura:

  | Fichero | Peso | Qué parece |
  |---|---|---|
  | `million/million.pdf` | 2,5 MB | el ensayo en PDF, sin enlazar |
  | `eurovision/eurovision.png` | 3,0 MB | versión antigua de la destacada (ahora `.jpg`) |
  | `farrer/ferrer.png` | 2,1 MB | ídem |
  | `million/million dolar baby.png` + `mdb.png` | 3,9 MB | dos copias de lo mismo |
  | `million/cecivideo.mp4` | 1,2 MB | vídeo sin enlazar |
  | `l4b/the delated cities.pdf` | 904 KB | PDF sin enlazar |
  | `post3/fvsi.webp` | 453 KB | versión antigua de la destacada |
  | resto (`RLHF/rlhfai.png`, `l4b/*.jpg/gif/webp`, `hugo research.txt`…) | ~1,2 MB | |

  Dime cuáles son restos y cuáles quieres conservar (o enlazar desde el post).

- [x] 🤖 **2.2 · El `srcset` es decorativo: se sirve el original a todos los dispositivos**
  `layouts/partials/plugin/img.html` no hace **ningún** procesado de imagen. Genera:

  ```html
  data-srcset="{{ $small }}, {{ $src }} 1.5x, {{ $large }} 2x"
  ```

  Como nunca se pasan `SrcSmall`/`SrcLarge`, **las tres entradas apuntan al mismo fichero**.
  Un móvil se descarga el PNG de 3 MB igual que un escritorio.
  - **Arreglo permanente:** sobreescribir ese partial usando el procesado de imagen de Hugo
    (`.Resize`, `.Process "webp"`) para generar variantes reales de 480/960/1440 px.
    A partir de ahí subes el original y Hugo genera el resto solo.

- [x] 🤖 **2.3 · Borrar ficheros muertos que se están publicando**
  Sueltos dentro de `content/posts/`:
  - 5 versiones del CV: `CV.pdf`, `CV Marc Escriba.pdf`, `CV_Marc_Escriba.pdf`,
    `cvmescribar.pdf`, `Black and White Corporate Resume.pdf`
  - Favicons duplicados: `favicon.ico`, `favicon.svg`, `favicon-96x96.png`,
    `apple-touch-icon.png`, `site.webmanifest`, `web-app-manifest-*.png`
  - `linia.png` + `Línea del tiempo (1).png` → **7,8 MB solo con estos dos**
  - `RSU.jpg`, `gpa.png`, `1.jpeg`, `icono.PNG`
  - Directorio `l4b/` en la raíz: copia entera de `content/posts/l4b/`, incluido un
    `hugo research.txt`

- [ ] 🤖 **2.4 · Renombrar ficheros con espacios, acentos y paréntesis**
  `Línea del tiempo (1).png`, `million dolar baby.png`, `the delated cities.pdf`,
  `dfcqkw-ce874c4c-…(1).jpg` → URLs feas y problemas de codificación.

- [x] 🤖 **2.5 · Documentar la versión de Hugo**
  Comprobado en la documentación de Cloudflare Pages: **no lee ninguna versión de Hugo
  desde el repo** (tampoco `.tool-versions`), solo la variable de entorno `HUGO_VERSION`.
  Un `wrangler.toml` haría que Cloudflare ignorase tu configuración del panel, así que
  no lo he añadido.
  - ✅ Se anota el rango verificado en `[module.hugoVersion]` (`min = 0.128.0`,
    `max = 0.135.0`) y se cambia `paginate` por `[pagination] pagerSize`, porque
    `paginate` es **error** desde Hugo 0.140.
  - ⚠️ Con el tema dentro del repo (y no importado como módulo), Hugo **no impone** ese
    rango: sirve como documentación, no como barrera.

- [ ] 🙋 **2.5b · Fijar `HUGO_VERSION` en el panel de Cloudflare** ⬅️ *pendiente, solo tú puedes*
  Es el pin de verdad, y es lo único que impide que tu web deje de desplegarse.
  **Cloudflare Pages → tu proyecto → Settings → Environment variables → añade:**

  ```
  HUGO_VERSION = 0.135.0
  ```

  Sin esto, el día que Cloudflare actualice su imagen de build, el despliegue rompe con
  `can't evaluate field Author in type page.Site`.

- [ ] 🤖 **2.6 · Añadir un `.gitattributes`** ⬅️ *pendiente*
  El repo tiene convenciones mezcladas: `config.toml` está guardado en CRLF (porque lo
  subiste por la web de GitHub, los commits *"Add files via upload"*) y los `.md` en LF.
  Eso hace que cualquier edición desde un editor de Windows amenace con reescribir
  ficheros enteros y dejar diffs ilegibles. Un `.gitattributes` lo fija de una vez.
  No lo he hecho ya porque renormaliza ficheros y prefiero que vaya en su propio PR.

---

## FASE 3 — Estructura: estás viviendo dentro del tema

Este es el problema de fondo. Tu repo **es** el repo de LoveIt, con tu contenido encima.

- [ ] 🙋 **3.1 · Separar el sitio del tema**
  Evidencias: `theme.toml`, `exampleSite/` (11 MB), `src/`, `.circleci/`, `.husky/`,
  `go.mod` con `module github.com/dillonzq/LoveIt`, `README.zh-cn.md`,
  `.github/FUNDING.yml` del autor original, e `images/Alipay.jpg` + `images/Wechat.jpg`
  (sus QR de donaciones).

  Consecuencias:
  - **No puedes actualizar el tema.** Tu copia es de la línea 0.2.x (`package.json: 0.2.0`).
    Upstream va por **v0.3.1 (febrero 2026)** — el tema está vivo, tú estás congelado.
  - Publicas 11 MB de `exampleSite/` y el código fuente del tema.
  - Distribuyes el `LICENSE` y los enlaces de donación de otra persona como si fueran tuyos.
  - Al ser un fork, GitHub lo muestra como *"forked from dillonzq/LoveIt"*.

  **Arreglo:**

  ```bash
  hugo new site unlord-blog
  cd unlord-blog
  hugo mod init github.com/unlordlab/unlord-blog
  ```

  y en `hugo.toml`:

  ```toml
  [module]
    [[module.imports]]
      path = "github.com/dillonzq/LoveIt"
  ```

  Mueves `content/`, `config.toml` y `static/`; tus personalizaciones van a `layouts/` y
  `assets/` de *tu* sitio (Hugo las superpone). Luego `hugo mod get -u` actualiza el tema
  sin tocar nada tuyo.

  ⚠️ **Es un cambio grande.** Implica repo nuevo y reconfigurar Cloudflare Pages.
  Media tarde, y quita el 80 % de la deuda técnica. **Decide tú si lo hacemos.**

- [ ] 🙋 **3.3 · El tema usa APIs de Hugo ya eliminadas** ⬅️ *nuevo, diagnosticado*
  Esto es lo que te bloquea en Hugo ≤ 0.135. Dos llamadas obsoletas:

  | Fichero | Línea | Llamada | Estado en Hugo |
  |---|---|---|---|
  | `layouts/partials/head/seo.html` | 29, 125 | `.Site.Author.name` | deprecada 0.124, **eliminada 0.141** |
  | `layouts/partials/header.html` | 60 | `.Site.IsMultiLingual` | deprecada 0.124, **eliminada 0.141** |

  Se pueden parchear a mano (`.Site.Params.author.name` y `hugo.IsMultilingual`), pero
  **no lo he hecho a propósito**: al separar el sitio del tema (3.1) y actualizar a
  LoveIt v0.3.1 esto viene arreglado de fábrica, y parchear el tema vendorizado sería
  trabajo que luego hay que tirar. Si prefieres el parche rápido mientras tanto, dímelo.

- [ ] 🙋 **3.4 · Hay ediciones tuyas dentro del código del tema**
  Por ejemplo `assets/css/_core/_base.scss:50` tiene un `background-color: #5A6F68`
  escrito a mano (es el fondo verdoso del modo oscuro), introducido en el commit
  `e1e2c45d` de 2023-09-25.
  Eso **se perderá** al hacer la separación de la 3.1. Antes de hacerla hay que
  inventariar todos esos retoques y moverlos a `assets/css/_override.scss` y
  `_custom.scss` de tu sitio, que es donde sobreviven a las actualizaciones.
  *(La tipografía nueva ya está hecha así, por eso no corre peligro.)*

- [x] 🤖 **3.2 · `content/posts/FVSI.html`**
  Página HTML suelta que se salta el tema entero: sin cabecera, sin navegación, sin modo
  oscuro. Tiene `<html lang="ca">` con el texto en castellano y carga
  `fonts/nom-de-la-font.woff2` — un nombre de plantilla que da 404.
  - O se integra como shortcode dentro del post, o mínimo se arregla el `lang` y la fuente.

---

## FASE 4 — Estética y experiencia

**Lo que ya está bien y no hay que tocar:** el `alt` de las 8 imágenes está escrito y es
descriptivo, los `figcaption` aportan contexto real, y el tema es limpio.

- [ ] 🙋 **4.0 · Selector de temas con nombres visibles** ⬅️ *nuevo*
  Sobre lo de "renombrarlo como Bubblegum": LoveIt **no muestra nombres de tema**
  en la interfaz. Solo tiene el conmutador claro/oscuro (el iconito de la esquina),
  sin la lista que ves en cyberspace.online:

  > `Theme: Dark Light LCD C64 VT320 Matrix Poetry Brutalist GRiD Crypt Bubblegum`

  Por eso ahora mismo el nombre "Bubblegum" vive en los comentarios y en la paleta
  del código, no en pantalla.

  Si lo que quieres es un selector con nombres visibles como el suyo, es bastante
  más trabajo y merece su propia tarea:
  - Una plantilla nueva para el selector (partial + su sitio en el layout).
  - Varias paletas conviviendo, en vez de dos. Hoy el tema son variables SCSS
    compiladas; habría que pasarlas a **custom properties de CSS** para poder
    cambiarlas en caliente, que es justo lo que hace Cyberspace con `--cs-bg`,
    `--cs-fg` y `--cs-fg-dim` sobre un `data-theme` en el `<html>`.
  - Persistencia en `localStorage` y evitar el parpadeo al cargar.
  - Decidir qué pasa con las fuentes: en Cyberspace cambian con el tema
    (Bubblegum usa Sniglet, Dark usa JetBrains Mono).

  **Dímelo y lo planteo aparte.**

- [~] 🙋 **4.1 · No tienes página "Sobre mí"** ⬅️ *en curso*
  Todo tu perfil es el subtítulo de la portada. Con CV, TFG y un proyecto como RSU, una
  `/about/` con tu recorrido y cómo contactarte vale más que un PDF en el menú.

- [ ] 🤖 **4.2 · El buscador está apagado**
  `enable = false` con `type = "algolia"` y las claves vacías.
  → `type = "lunr"` + `enable = true`: local, gratis, sin servicios externos.
  Encaja con tu discurso de tecnologías libres.

- [ ] 🙋 **4.3 · Tus categorías no categorizan**
  Los 8 posts con categoría tienen la misma: `"unlord"`. `pantallas` no tiene ninguna.
  - Propuesta: *Educación crítica*, *Cultura digital*, *Tecnopolítica*, *Proyectos*.

- [ ] 🤖 **4.4 · Tags inconsistentes**
  `"Metaverso"` y `"metaverse"` conviven como etiquetas distintas. Mezcla de castellano,
  catalán e inglés. CamelCase (`"SelfDigital"`, `"EvolucionDigital"`) junto a frases con
  espacios (`"salud mental"`, `"comunitats en línia"`).
  → Unificar a minúsculas y un idioma.

- [ ] 🤖 **4.5 · `defaultTheme = "dark"` forzado** → `"auto"`, respeta la preferencia del sistema.

- [x] 🤖 **4.6 · URLs absolutas hardcodeadas**
  Logo: `https://unlordl4b.pages.dev/posts/icono.PNG`
  Menú CV: `https://unlordl4b.pages.dev/posts/cvmescribar.pdf`
  El día que pongas dominio propio, se rompen las dos.
  → Rutas relativas (`/icono.PNG`) y ficheros en `static/`.

- [ ] 🤖 **4.7 · Botones de compartir mal elegidos**
  Activos: Weibo, Line, HackerNews. **Desactivados: LinkedIn y Mastodon** — justamente
  donde vive tu audiencia y donde tú tienes cuenta.

- [ ] 🙋 **4.8 · Solo dos redes configuradas** (Mastodon y Email).
  Vacíos: `GitHub`, `Linkedin`, `ORCID`, `Researchgate`, `Googlescholar` — los relevantes
  para tu perfil. **Pásame los que quieras poner.**

- [ ] 🙋 **4.9 · Tu email está en texto plano** en `config.toml` y por tanto en el HTML público.
  Los bots de spam lo recolectan. → Formulario o dirección alias.

- [ ] 🙋 **4.10 · `post3` es un stub de 115 palabras** que solo dice "clica aquí".
  → Desarrollarlo o marcarlo `hiddenFromHomePage: true`.

---

## FASE 5 — Comentarios y privacidad

- [ ] 🙋 **5.1 · Valine está registrando IPs de tus visitantes sin aviso**

  ```toml
  [params.page.comment.valine]
    visitor = true
    recordIP = true   # ← verificado: True
  ```

  Con el `appId` y el `appKey` en el repo **público**, sin aviso de privacidad
  (`cookieconsent.enable = false`) y sin base legal declarada. Las IPs son dato personal
  bajo RGPD. Valine además tiene fama de imán de spam y de dejar la base de datos abierta
  si no se configuran bien los ACL de LeanCloud.

  **→ Cambiar a giscus.** El bloque `[params.page.comment.giscus]` ya está en tu config
  listo para rellenar: usa GitHub Discussions, no guarda nada tuyo, no necesita banner de
  cookies, y no hay credenciales que filtrar.
  Para un blog sobre tecnologías libres y sesgos algorítmicos, la coherencia también cuenta.
  *(Necesito que actives Discussions en un repo tuyo y me pases `repoId`/`categoryId`,
  o te guío por giscus.app.)*

- [ ] 🙋 **5.2 · No tienes analítica de ningún tipo** (`analytics.enable = false`).
  Estás publicando a ciegas.
  → **Cloudflare Web Analytics**: gratis, sin cookies, sin banner, y ya estás en Cloudflare.
  Se activa desde el panel sin tocar código. Alternativas autoalojadas: Umami, Plausible.

---

## FASE 6 — Promoción

- [ ] 🙋 **6.1 · Dominio propio** *(lo primero: todo lo demás se apoya en esto)*
  `unlordl4b.pages.dev` no se recuerda, no se cita y no te pertenece.
  Un `.cat`, `.es` o `.org` cuesta 10–15 €/año; en Cloudflare Pages se configura en 5 minutos.

- [ ] 🙋 **6.2 · Tu TFG merece un DOI**
  *"El metavers. Les noves coordenades de la desigualtat"* es un PDF de 1,9 MB enterrado
  en un post de 398 palabras.
  → Subirlo a **Zenodo** (gratis, da DOI, indexado en Google Scholar), vincular **ORCID**,
  y enlazar desde el post. Lo convierte en algo citable en vez de un adjunto.
  Los campos `ORCID`, `Googlescholar` y `Researchgate` ya están en tu config esperando.
  → Lo mismo para el estudio de caso de la Sra. Maria Ferrer: tiene público académico real
  en educación social.

- [ ] 🙋 **6.3 · Dónde difundir, por tipo de post**
  - *Pantallas, RLHF, Metaverso* → Mastodon (`#EducacióDigital`, `#Tecnopolítica`),
    Menéame, comunidades de educación social en Telegram/Mastodon.
  - *Los catalanes* (`farrer`, `metavers`) → red educativa catalana (XarxaTIC y similares),
    donde el catalán es ventaja y no obstáculo.
  - *RSU Terminal* → Rankia y comunidades de finanzas cuantitativas.
    ⚠️ **Primero arregla el HTTPS (tarea 1.7)** o te tomarán por spam.
  - *L4b / Flickr vs Instagram* → Hacker News y Lobsters funcionan bien con nostalgia de
    internet temprano, aunque en inglés.

- [ ] 🤖 **6.4 · Tu RSS existe pero está escondido**
  No está en el menú y `RSS = ""` en `[params.social]`. Tu audiencia (fediverso, gente
  crítica con las plataformas) es precisamente la que usa lectores RSS.
  → Ponerlo visible. Y valorar `rssFullText = true` para que te lean en el lector.

- [ ] 🤖 **6.5 · Atribución en el fediverso**
  Mastodon 4.3+ lee `<meta name="fediverse:creator" content="@marcescriba@mastodon.social">`
  y muestra tu cuenta en las tarjetas de enlace. Una línea en
  `layouts/partials/head/custom.html` y compartir tu blog te acredita a ti.

- [ ] 🙋 **6.6 · El CV como página, no como PDF**
  Una `/cv/` en HTML se indexa, se lee en móvil y se enlaza. El PDF queda como descarga
  desde ahí.

- [ ] 🙋 **6.7 · Enlaza entre tus propios posts**
  Solo hay **2 enlaces internos** en todo el blog.
  - *Pantallas* y *RLHF* hablan de lo mismo desde ángulos distintos.
  - *Metaverso* y *Flickr vs Instagram* también.

  Enlazarlos retiene lectores y ayuda al posicionamiento.

- [ ] 🤖 **6.8 · Rellenar `[params.page.seo.publisher]`**
  `name` y `logoUrl` están vacíos y salen así en el JSON-LD.

---

## Qué toca ahora

**Solo tú puedes hacerlo (5 min, y es lo más urgente):**

1. **2.5b** — `HUGO_VERSION = 0.135.0` en Cloudflare Pages → Settings → Environment
   variables. Sin esto tu web puede dejar de desplegarse sin previo aviso.

**Decisiones que espero de ti para seguir:**

2. **1.4b** — ¿la tarjeta Open Graph te sirve o la rehacemos?
3. **1.6b** — política sobre crawlers de IA
4. **2.1b** — cuáles de los 15,3 MB sin referenciar son restos y cuáles contenido
5. **1.9** — revisa las 8 descripciones nuevas en el PR y cambia lo que no suene a ti
6. **4.3 / 4.8** — categorías reales, y qué redes quieres enlazar

**Cuando tengas un rato tú (fuera del código):**

7. **6.1** — dominio propio *(todo lo demás se apoya en esto)*
8. **1.7** — Cloudflare Tunnel para RSU Terminal, y te cambio el enlace
9. **5.2** — activar Cloudflare Web Analytics (es un clic en el panel)

**Cuando tengas una tarde:**

10. **3.1 + 3.3 + 3.4** — separar el sitio del tema. Arregla de una vez la
    incompatibilidad con Hugo moderno y te devuelve la capacidad de actualizar.

**Progresivo:** el resto de las fases 4, 5 y 6, sin prisa.

---

## Lo que quedó en `config.toml` tras la fase 1

```toml
baseURL = "https://unlordl4b.pages.dev/"   # ← cambiar al poner dominio propio

title = "unlord l4b"                        # OJO: nivel raíz, no [params]
languageCode = "es"
defaultContentLanguage = "es"
enableRobotsTXT = true
copyright = "CC BY-SA 4.0 - Marc Escriba"

[pagination]
  pagerSize = 12                            # paginate es ERROR desde Hugo 0.140

[module]
  [module.hugoVersion]
    extended = true
    min = "0.128.0"
    max = "0.135.0"
```
