# Un mar al atardecer de felicitaciones

Página de cumpleaños para María Karla, hecha con HTML, CSS y JavaScript puro. No necesita build ni backend y está preparada para GitHub Pages.

## Personalizar

1. Abre `js/data.js`.
2. Edita `amigos`: cada objeto tiene `nombre`, `foto` y la ruta `mensaje` a un archivo de texto. Puedes añadir o quitar objetos y las tarjetas se generan automáticamente.
3. Edita los archivos dentro de `assets/messages/` para cambiar los mensajes largos. Un archivo por amigo mantiene `data.js` limpio.
4. Edita `fotosGrupales` para cambiar la galería. Cada objeto usa `src` y `alt`.
5. Cambia `poemaBienvenida` (cada elemento es un verso) y `dedicatoria`.
6. Sustituye las imágenes dentro de `assets/img/` conservando los nombres, o cambia sus rutas en `data.js`. Se recomiendan JPG/WebP optimizados y una proporción cercana a 4:5 para retratos.
7. Añade tu audio en `assets/audio/cumple.mp3`. El navegador puede bloquear el autoplay, por eso la música comienza después de tocar «Toca para abrir».

Los mensajes se cargan con `fetch()`. Para probar la página localmente usa un servidor, por ejemplo la extensión Live Server de VS Code; abrir `index.html` directamente con `file://` puede bloquear la lectura de archivos `.txt`.

## Publicar en GitHub Pages

1. Crea un repositorio y sube todos los archivos, incluida la carpeta `assets`.
2. En GitHub abre **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**.
4. Selecciona la rama `main` y la carpeta `/ (root)`.
5. Guarda y espera a que GitHub Pages publique la URL.

Todas las rutas del proyecto son relativas. GSAP, ScrollTrigger y canvas-confetti se cargan por CDN de jsDelivr.
