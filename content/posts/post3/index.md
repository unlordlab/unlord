---
weight: 4
title: "El Metavers. Les noves coordenades de la desigualtat."
date: 2024-8-19T21:40:32+08:00
lastmod: 2024-08-19T21:40:32+08:00
draft: false
author: "unlord"
authorLink: "https://unlordl4b.pages.dev/"
description: "Metavers"
images: ["dfcqkw-ce874c4c-7232-46e9-8e2c-07fdfa30e212 (1).jpg"]
resources:
- name: "featured-image"
  src: "dfcqkw-ce874c4c-7232-46e9-8e2c-07fdfa30e212 (1).jpg"

tags: ["TFG","Metaverse",]
categories: ["unlord"]

lightgallery: true
---

<b>Flickr VS Instagram. </b>

<content/posts/FVSI.html>

</head>
<body>
    <h1>El metavers. Les noves coordenades de la desigualtat.</h1>
    <input type="text" id="search" placeholder="Escriu una ciutat del món">
    <div>
        <button onclick="searchFlickr()">Buscar en Flickr</button>
        <button onclick="searchInstagram()">Buscar en Instagram</button>
    </div>

    <script>
        function searchFlickr() {
            const query = document.getElementById('search').value.trim();
            if (!query) {
                alert('Por favor, escribe una palabra clave.');
                return;
            }
            // Construir URL de búsqueda en Flickr
            const flickrURL = `https://www.flickr.com/search/?text=${encodeURIComponent(query)}`;
            window.open(flickrURL, '_blank');
        }

        function searchInstagram() {
            const query = document.getElementById('search').value.trim();
            if (!query) {
                alert('Por favor, escribe una palabra clave.');
                return;
            }
            // Para Instagram, no hay una búsqueda pública directa. Este es un truco:
            const instagramURL = `https://www.instagram.com/explore/tags/${encodeURIComponent(query)}/`;
            window.open(instagramURL, '_blank');
        }
    </script>
</body>
</html>


<!--more-->

