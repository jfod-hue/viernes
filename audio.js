// Botones de audio: cada botón reproduce su audio y lo coloca sobre la imagen.
// Requiere script.js (window.vistaImagen) y los <audio> del index.html.
(function () {
  var botones = document.querySelectorAll('.boton');
  var actual = null;   // { boton, audio } del audio que está sonando

  // Coloca cada botón sobre su punto de la imagen, siguiendo el paneo y el zoom
  function colocarBotones() {
    if (window.vistaImagen) {
      var v = window.vistaImagen();
      botones.forEach(function (boton) {
        var px = parseFloat(boton.getAttribute('data-px'));  // punto X en la imagen girada
        var py = parseFloat(boton.getAttribute('data-py'));  // punto Y en la imagen girada
        boton.style.left = (v.camX + px * v.escala) + 'px';
        boton.style.top = (v.camY + py * v.escala) + 'px';
      });
    }
    requestAnimationFrame(colocarBotones);
  }
  colocarBotones();

  // Detiene el audio que está sonando y quita su color activo
  function detener() {
    if (!actual) return;
    actual.audio.pause();
    actual.audio.currentTime = 0;
    actual.boton.classList.remove('activo');
    actual = null;
  }

  botones.forEach(function (boton) {
    var audio = document.getElementById(boton.getAttribute('data-audio'));

    // Cuando el audio termina, el botón vuelve a su estado normal
    audio.addEventListener('ended', function () {
      if (actual && actual.audio === audio) detener();
    });

    boton.addEventListener('click', function () {
      // Si pulsas el botón que está sonando, se detiene
      if (actual && actual.audio === audio) {
        detener();
        return;
      }
      // Si suena otro audio, se detiene antes de reproducir este
      detener();
      actual = { boton: boton, audio: audio };
      boton.classList.add('activo');
      audio.play().catch(function () {
        detener();   // si el navegador no puede reproducirlo, se revierte
      });
    });
  });
})();
