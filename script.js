// Partículas flotantes que forman la imagen "cuello", con paneo horizontal
// y repulsión del cursor. Requiere puntos.js (PUNTOS, PUNTOS_ANCHO, PUNTOS_ALTO).
(function () {
  // Capa de fondo (imagen) y capa de partículas (encima de los botones)
  var fondoCanvas = document.getElementById('fondo');
  var ctxFondo = fondoCanvas.getContext('2d');
  var canvas = document.getElementById('lienzo');
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0, dpr = 1;    // tamaño de la ventana y densidad de píxeles
  var ZOOM = 1.35;              // imagen ampliada respecto a la altura de la pantalla (menos recorte)
  var escala = 1;               // píxeles de pantalla por cada unidad de la imagen girada
  var camX = 0, camY = 0;       // desplazamiento de la imagen (paneo horizontal)
  var minCamX = 0;              // límite izquierdo del paneo (negativo)
  var primeraVez = true;        // para empezar mostrando la parte derecha
  var fondoSucio = true;        // hay que volver a dibujar la imagen de fondo

  // Cursor
  var raton = { x: -9999, y: -9999 };
  var RADIO = 110;              // distancia de influencia del cursor (px)
  var FUERZA = 2.2;             // intensidad del empuje

  var siluetas = [];            // partículas que forman la imagen
  var polvo = [];               // partículas de fondo que flotan

  // ---- Imagen de fondo (IMG/cuello.png)
  var fondo = new Image();
  var fondoListo = false;
  fondo.onload = function () { fondoListo = true; fondoSucio = true; };
  fondo.src = 'IMG/cuello.png';

  // ---- Diseño: imagen horizontal, ampliada según la altura de la pantalla
  function calcularDiseno() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    // Ajusta el tamaño de ambos canvas a la ventana (con densidad de píxeles)
    [canvas, fondoCanvas].forEach(function (c) {
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxFondo.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Escala: la altura de la imagen girada ocupa ZOOM veces la pantalla
    // Escala: la altura ocupa ZOOM veces la pantalla, y la anchura al menos 1.15 veces
    // la pantalla para que siempre se pueda desplazar (sobre todo en pantallas altas o móviles)
    escala = Math.max((H / PUNTOS_ALTO) * ZOOM, (W * 1.15) / PUNTOS_ANCHO);
    var anchoMundo = PUNTOS_ANCHO * escala;
    var altoMundo = PUNTOS_ALTO * escala;

    camY = (H - altoMundo) / 2;               // centrado vertical (puede recortar arriba y abajo)
    minCamX = Math.min(0, W - anchoMundo);    // lo más a la izquierda que se puede desplazar
    if (primeraVez) {
      camX = minCamX;           // empieza viendo la parte derecha
      primeraVez = false;
    }
    camX = limitarCam(camX);
    fondoSucio = true;

    // Posición de reposo de cada partícula, relativa a la imagen
    for (var i = 0; i < siluetas.length; i++) {
      siluetas[i].hx = siluetas[i].px * escala;
      siluetas[i].hy = siluetas[i].py * escala;
    }
  }

  // Mantiene el paneo entre el límite izquierdo y 0
  function limitarCam(v) {
    return Math.max(minCamX, Math.min(0, v));
  }

  // ---- Crear partículas a partir de PUNTOS (pares x, y)
  function crearSiluetas() {
    siluetas = [];
    for (var i = 0; i < PUNTOS.length; i += 2) {
      siluetas.push({
        px: PUNTOS[i], py: PUNTOS[i + 1],  // posición en la imagen girada
        hx: 0, hy: 0,                      // posición de reposo (relativa a la imagen)
        x: 0, y: 0, vx: 0, vy: 0,          // posición actual y velocidad en pantalla
        fase: Math.random() * Math.PI * 2, // desfase del movimiento flotante
        velFase: 0.6 + Math.random() * 0.8,// velocidad del movimiento flotante
        amp: 1 + Math.random() * 1.8       // amplitud del movimiento flotante (px)
      });
    }
  }

  // ---- Partículas de fondo que flotan por la pantalla
  function crearPolvo() {
    polvo = [];
    var cantidad = Math.min(900, Math.floor((W * H) / 2500));
    for (var i = 0; i < cantidad; i++) {
      polvo.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.6 + Math.random() * 0.9      // tamaño
      });
    }
  }

  // ---- Física: apartarse del cursor
  function empujar(p) {
    var dx = p.x - raton.x;
    var dy = p.y - raton.y;
    var d2 = dx * dx + dy * dy;
    if (d2 < RADIO * RADIO) {
      var d = Math.sqrt(d2) || 0.001;
      var f = (1 - d / RADIO);     // más fuerza cuanto más cerca está el cursor
      f = f * f * FUERZA;
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
    }
  }

  // ---- Mueve las partículas de la imagen: vuelven a su sitio y se apartan del cursor
  function actualizarSiluetas(t) {
    for (var i = 0; i < siluetas.length; i++) {
      var p = siluetas[i];
      // Destino: posición en la imagen con el paneo actual y un ligero movimiento flotante
      var tx = camX + p.hx + Math.sin(t * p.velFase + p.fase) * p.amp;
      var ty = camY + p.hy + Math.cos(t * p.velFase * 0.8 + p.fase) * p.amp;

      empujar(p);

      // Resorte hacia el destino y fricción
      p.vx += (tx - p.x) * 0.02;
      p.vy += (ty - p.y) * 0.02;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  // ---- Mueve las partículas de fondo (deriva lenta y repulsión del cursor)
  function actualizarPolvo() {
    for (var i = 0; i < polvo.length; i++) {
      var p = polvo[i];
      empujar(p);
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx + 0.05;   // deriva lenta hacia la derecha
      p.y += p.vy;
      // Si sale de la pantalla, reaparece por el lado contrario
      if (p.x > W + 5) p.x = -5;
      if (p.x < -5) p.x = W + 5;
      if (p.y > H + 5) p.y = -5;
      if (p.y < -5) p.y = H + 5;
    }
  }

  // ---- Dibujo de la imagen de fondo (capa inferior)
  function dibujarFondo() {
    ctxFondo.fillStyle = '#ffffff';
    ctxFondo.fillRect(0, 0, W, H);
    if (!fondoListo) return;
    // Punto (x, y) de la imagen original -> (camX + (h - y)*s, camY + x*s) tras girarla
    var s = escala;
    var h = fondo.naturalHeight;
    ctxFondo.save();
    ctxFondo.translate(camX + h * s, camY);
    ctxFondo.rotate(Math.PI / 2);     // gira la imagen 90 grados (horizontal)
    ctxFondo.drawImage(fondo, 0, 0, fondo.naturalWidth * s, fondo.naturalHeight * s);
    ctxFondo.restore();
  }

  // ---- Dibujo de las partículas (capa superior, transparente)
  function dibujarParticulas() {
    ctx.clearRect(0, 0, W, H);

    // Partículas de fondo, semitransparentes
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (var i = 0; i < polvo.length; i++) {
      var p = polvo[i];
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }

    // Partículas de la imagen, blancas
    ctx.fillStyle = '#ffffff';
    for (var j = 0; j < siluetas.length; j++) {
      var s = siluetas[j];
      ctx.fillRect(s.x, s.y, 1.6, 1.6);
    }
  }

  // ---- Bucle principal (unos 60 cuadros por segundo)
  var inicio = performance.now();
  function bucle(ahora) {
    var t = (ahora - inicio) / 1000;
    if (fondoSucio) {               // solo redibuja el fondo si cambió (paneo o tamaño)
      dibujarFondo();
      fondoSucio = false;
    }
    actualizarSiluetas(t);
    actualizarPolvo();
    dibujarParticulas();
    requestAnimationFrame(bucle);
  }

  // ---- Paneo horizontal: rueda y flechas
  function panear(delta) {
    var nueva = limitarCam(camX + delta);
    if (nueva !== camX) {
      camX = nueva;
      fondoSucio = true;
    }
  }

  // Rueda del ratón: desplaza la imagen horizontalmente
  window.addEventListener('wheel', function (e) {
    var delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta === 0) return;
    e.preventDefault();
    panear(delta);
  }, { passive: false });

  // Flechas: izquierda/abajo avanzan a la izquierda, derecha/arriba retroceden
  window.addEventListener('keydown', function (e) {
    var paso = W * 0.2;
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'PageDown') {
      panear(paso);
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'PageUp') {
      panear(-paso);
      e.preventDefault();
    }
  });

  // ---- Arrastrar con el dedo o el ratón para desplazar la imagen (iPad, móvil, PC)
  var arrastrando = false;
  var ultimoX = 0;
  window.addEventListener('pointerdown', function (e) {
    // No arrastrar si el toque empieza en un botón de audio
    if (e.target.closest && e.target.closest('.boton')) return;
    arrastrando = true;
    ultimoX = e.clientX;
  });
  window.addEventListener('pointermove', function (e) {
    if (!arrastrando) return;
    panear(e.clientX - ultimoX);   // arrastrar hacia la izquierda mueve la imagen a la izquierda
    ultimoX = e.clientX;
  });
  function terminarArrastre() {
    arrastrando = false;
  }
  window.addEventListener('pointerup', terminarArrastre);
  window.addEventListener('pointercancel', terminarArrastre);

  // ---- Cursor: guarda su posición para apartar las partículas
  window.addEventListener('pointermove', function (e) {
    raton.x = e.clientX;
    raton.y = e.clientY;
  });
  // Al salir de la ventana, el cursor deja de empujar partículas
  document.addEventListener('mouseleave', function () {
    raton.x = -9999;
    raton.y = -9999;
  });

  // ---- Redimensionar: espera 150 ms sin cambios antes de recalcular
  var timerRedimension = null;
  window.addEventListener('resize', function () {
    clearTimeout(timerRedimension);
    timerRedimension = setTimeout(function () {
      calcularDiseno();
      crearPolvo();
    }, 150);
  });

  // ---- Vista de la imagen (la usa audio.js para colocar los botones)
  window.vistaImagen = function () {
    return { camX: camX, camY: camY, escala: escala };
  };

  // ---- Inicio
  crearSiluetas();
  calcularDiseno();
  // Las partículas empiezan en su sitio, sin volar desde el origen
  for (var k = 0; k < siluetas.length; k++) {
    siluetas[k].x = camX + siluetas[k].hx;
    siluetas[k].y = camY + siluetas[k].hy;
  }
  crearPolvo();
  requestAnimationFrame(bucle);
})();
