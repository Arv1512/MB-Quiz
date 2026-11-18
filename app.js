/* ============================================================
   LÓGICA DEL JUEGO — Versión 7
   1) Sonido: música relajante + efectos (todo sintetizado)
   2) Efecto de escritura para todos los textos
   3) Bienvenida, mensajes, cuestionarios y finales
   4) Celebración: tortugas y hormigas, serpentinas y fuegos
   5) Botón de la bocina
   ============================================================ */

/* ------------------------------------------------------------
   1. SONIDO
   Dos "buses" separados:
   - gananciaMusica  -> la controla el botón de la bocina
   - gananciaEfectos -> siempre encendido
   ------------------------------------------------------------ */

/* Melodía pentatónica y lenta. El 0 significa silencio (respiro). */
const MELODIA = [
  392.0, 0, 523.25, 0,
  440.0, 0, 587.33, 0,
  349.23, 0, 440.0, 0,
  392.0, 0, 0, 0
];

/* Un bajo suave cada cuatro pasos. */
const BAJOS = [196.0, 220.0, 174.61, 196.0];

const PASO_MUSICA = 900;      // milisegundos entre pasos (tempo lento)
const VOLUMEN_MUSICA = 0.06;

let contextoAudio = null;     // el "motor" de sonido del navegador
let gananciaMusica = null;    // volumen de la música de fondo
let gananciaEfectos = null;   // volumen de hover, clic, teclas...
let musicaSilenciada = false; // ¿el jugador pulsó la bocina?
let musicaActiva = false;     // ¿está sonando el bucle de fondo?
let temporizadorMusica = null;
let posicionMelodia = 0;
let ultimoHover = 0;          // para no repetir el sonido de hover sin parar
let ruidoBlanco = null;       // se usa para el sonido de aplausos

/* Crea el motor de audio. Solo se puede crear tras un toque/clic. */
function crearAudio() {
  if (contextoAudio) return;

  const Constructor = window.AudioContext || window.webkitAudioContext;
  if (!Constructor) return; // navegador muy antiguo: se queda sin sonido

  contextoAudio = new Constructor();

  gananciaMusica = contextoAudio.createGain();
  gananciaMusica.gain.value = musicaSilenciada ? 0 : 1;
  gananciaMusica.connect(contextoAudio.destination);

  gananciaEfectos = contextoAudio.createGain();
  gananciaEfectos.gain.value = 1;
  gananciaEfectos.connect(contextoAudio.destination);
}

/* Toca una nota corta o larga.
   "bus" elige el volumen: "musica" o "efectos".
   "ataque" son los segundos que tarda en alcanzar el volumen. */
function tocarNota(frecuencia, duracion, tipo, volumen, retraso, bus, ataque) {
  if (!contextoAudio) return;

  const inicio = contextoAudio.currentTime + (retraso || 0);
  const oscilador = contextoAudio.createOscillator();
  const ganancia = contextoAudio.createGain();

  oscilador.type = tipo || "sine";
  oscilador.frequency.setValueAtTime(frecuencia, inicio);

  /* Envolvente suave: sube, se mantiene y se apaga sin chasquidos. */
  const subida = ataque || 0.01;
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.linearRampToValueAtTime(volumen, inicio + subida);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);

  oscilador.connect(ganancia);
  ganancia.connect(bus === "musica" ? gananciaMusica : gananciaEfectos);

  oscilador.start(inicio);
  oscilador.stop(inicio + duracion + 0.05);
}

/* Un paso de la música de fondo. */
function pasoMusica() {
  if (!musicaActiva) return;

  const paso = posicionMelodia;
  const nota = MELODIA[paso];

  if (nota > 0) {
    tocarNota(nota, 1.6, "sine", VOLUMEN_MUSICA, 0, "musica", 0.35);
    tocarNota(nota * 2, 1.1, "sine", VOLUMEN_MUSICA * 0.22, 0, "musica", 0.5);
  }

  if (paso % 4 === 0) {
    const bajo = BAJOS[(paso / 4) % BAJOS.length];
    tocarNota(bajo, 2.4, "triangle", VOLUMEN_MUSICA * 0.5, 0, "musica", 0.7);
  }

  posicionMelodia = (paso + 1) % MELODIA.length;
  temporizadorMusica = setTimeout(pasoMusica, PASO_MUSICA);
}

function encenderMusica() {
  if (musicaActiva || musicaSilenciada) return;
  musicaActiva = true;
  pasoMusica();
}

function apagarMusica() {
  musicaActiva = false;
  clearTimeout(temporizadorMusica);
}

/* Efecto al pasar el cursor: blip corto y agudo. */
function sonidoHover() {
  const ahora = Date.now();
  if (ahora - ultimoHover < 70) return; // evita ráfagas de sonido
  ultimoHover = ahora;
  tocarNota(1046.5, 0.06, "square", 0.05, 0, "efectos");
}

/* Efecto al pulsar un botón: arpegio ascendente tipo arcade. */
function sonidoClic(frecuenciaBase) {
  tocarNota(frecuenciaBase, 0.09, "square", 0.12, 0, "efectos");
  tocarNota(frecuenciaBase * 1.5, 0.1, "square", 0.12, 0.07, "efectos");
  tocarNota(frecuenciaBase * 2, 0.16, "square", 0.12, 0.14, "efectos");
}

/* Tecla de la máquina de escribir: chasquido muy corto.
   El tono cambia un poco en cada letra para que no suene monótono. */
function sonidoTecla() {
  const tono = 1400 + Math.random() * 400;
  tocarNota(tono, 0.03, "square", 0.035, 0, "efectos");
}

/* Respuesta correcta: tres notas que suben. */
function sonidoAcierto() {
  tocarNota(523.25, 0.12, "triangle", 0.13, 0, "efectos", 0.01);
  tocarNota(659.25, 0.12, "triangle", 0.13, 0.1, "efectos", 0.01);
  tocarNota(783.99, 0.3, "triangle", 0.13, 0.2, "efectos", 0.01);
}

/* Respuesta incorrecta: dos notas que bajan. */
function sonidoError() {
  tocarNota(196.0, 0.16, "square", 0.1, 0, "efectos");
  tocarNota(146.83, 0.3, "square", 0.1, 0.14, "efectos");
}

/* Celebración al cerrar el cuestionario: fanfarria corta y cálida. */
function sonidoFanfarria() {
  const notas = [523.25, 659.25, 783.99, 1046.5];

  notas.forEach(function (nota, indice) {
    tocarNota(nota, 0.5, "triangle", 0.12, indice * 0.14, "efectos", 0.02);
    tocarNota(nota * 0.5, 0.6, "sine", 0.06, indice * 0.14, "efectos", 0.04);
  });

  /* Acorde final que deja la fanfarria flotando un momento. */
  [523.25, 659.25, 783.99].forEach(function (nota) {
    tocarNota(nota, 1.1, "triangle", 0.09, 0.62, "efectos", 0.08);
  });
}

/* Aplausos: muchas ráfagas cortas de ruido filtrado, como palmas. */
function sonidoAplausos() {
  if (!contextoAudio) return;

  if (!ruidoBlanco) {
    const segundos = 2;
    const tamano = contextoAudio.sampleRate * segundos;
    ruidoBlanco = contextoAudio.createBuffer(1, tamano, contextoAudio.sampleRate);

    const datos = ruidoBlanco.getChannelData(0);
    for (let i = 0; i < tamano; i++) {
      datos[i] = Math.random() * 2 - 1;
    }
  }

  const inicio = contextoAudio.currentTime;

  for (let i = 0; i < 22; i++) {
    const cuando = inicio + Math.random() * 1.1;

    const fuente = contextoAudio.createBufferSource();
    const filtro = contextoAudio.createBiquadFilter();
    const ganancia = contextoAudio.createGain();

    fuente.buffer = ruidoBlanco;

    filtro.type = "bandpass";
    filtro.frequency.value = 1800 + Math.random() * 1400;
    filtro.Q.value = 0.8;

    ganancia.gain.setValueAtTime(0.0001, cuando);
    ganancia.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.05, cuando + 0.01);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.09 + Math.random() * 0.08);

    fuente.connect(filtro);
    filtro.connect(ganancia);
    ganancia.connect(gananciaEfectos);

    fuente.start(cuando);
    fuente.stop(cuando + 0.25);
  }
}

/* Si la persona cambia de pestaña o bloquea el móvil, la música y la
   celebración se pausan. */
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    apagarMusica();
    pausarFiesta();
  } else {
    if (contextoAudio && contextoAudio.state !== "closed") {
      if (contextoAudio.state === "suspended") {
        contextoAudio.resume();
      }
      encenderMusica();
    }
    reanudarFiesta();
  }
});

/* ------------------------------------------------------------
   2. REFERENCIAS Y TEXTOS
   ------------------------------------------------------------ */

const escenas = {
  toca: document.getElementById("escenaToca"),
  inicio: document.getElementById("inicio"),
  mensaje: document.getElementById("escenaMensaje"),
  mensajeMateo: document.getElementById("escenaMensajeMateo"),
  quiz: document.getElementById("escenaQuiz"),
  final: document.getElementById("escenaFinal"),
  tortugas: document.getElementById("escenaTortugas"),
  hormigas: document.getElementById("escenaHormigas")
};

const bloqueBienvenida = document.getElementById("bloqueBienvenida");
const opcionesInicio = document.getElementById("opcionesInicio");
const mensajeAriel = document.getElementById("mensajeAriel");
const mensajeMateo = document.getElementById("mensajeMateo");
const pensamientoPapa = document.getElementById("pensamientoPapa");
const preguntaQuiz = document.getElementById("preguntaQuiz");
const opcionesQuiz = document.getElementById("opcionesQuiz");
const mensajeFinal = document.getElementById("mensajeFinal");
const botonComenzar = document.getElementById("botonComenzar");
const mensajeTortugas = document.getElementById("mensajeTortugas");
const capaTortugas = document.getElementById("capaTortugas");
const mensajeHormigas = document.getElementById("mensajeHormigas");
const capaHormigas = document.getElementById("capaHormigas");
const lienzoFiesta = document.getElementById("lienzoFiesta");

/* Guardamos los textos tal como están escritos en el HTML. */
const textosBienvenida = Array.from(bloqueBienvenida.querySelectorAll(".linea")).map(
  function (linea) {
    return linea.textContent.trim().replace(/\s+/g, " ");
  }
);

const TEXTO_MENSAJE = mensajeAriel.textContent.trim().replace(/\s+/g, " ");
const TEXTO_FINAL = mensajeFinal.textContent.trim().replace(/\s+/g, " ");
const TEXTO_FINAL_MATEO = "¡Realmente eres Benjamín!";
const TEXTO_MATEO = mensajeMateo.textContent.trim().replace(/\s+/g, " ");
const TEXTO_PENSAMIENTO = pensamientoPapa.textContent.trim().replace(/\s+/g, " ");

/* Vaciamos los textos: se escribirán con el efecto de máquina de escribir. */
Array.from(bloqueBienvenida.querySelectorAll(".linea")).forEach(function (linea) {
  linea.textContent = "";
});
mensajeAriel.textContent = "";
mensajeMateo.textContent = "";
pensamientoPapa.textContent = "";
mensajeFinal.textContent = "";
mensajeTortugas.textContent = "";
mensajeHormigas.textContent = "";

/* Muestra una escena y esconde las demás. */
function mostrarEscena(nombre) {
  Object.keys(escenas).forEach(function (clave) {
    escenas[clave].hidden = clave !== nombre;
  });
}

/* ------------------------------------------------------------
   3. EFECTO DE ESCRITURA
   ------------------------------------------------------------ */

const VELOCIDAD_ESCRITURA = 30; // milisegundos por letra

/*
  Escribe "texto" dentro de "elemento".
  - La reserva invisible mantiene el hueco del texto final, así nada salta.
  - El texto visible se coloca encima y va creciendo letra a letra.
  - Cada letra (menos los espacios) hace sonar una tecla.
*/
function prepararTexto(elemento, texto) {
  elemento.textContent = "";
  elemento.classList.add("escribiendo");

  const reserva = document.createElement("span");
  reserva.className = "reserva";
  reserva.setAttribute("aria-hidden", "true");
  reserva.textContent = texto;

  const escrito = document.createElement("span");
  escrito.className = "escrito";
  escrito.setAttribute("aria-hidden", "true");

  const lector = document.createElement("span");
  lector.className = "solo-lectores";
  lector.textContent = texto;

  elemento.appendChild(reserva);
  elemento.appendChild(escrito);
  elemento.appendChild(lector);

  return escrito;
}

/* Escribe el texto letra a letra dentro del trozo preparado. */
function escribirEn(escrito, texto, alTerminar) {
  const letras = Array.from(texto); // separa bien tildes y emojis
  let posicion = 0;

  const temporizador = setInterval(function () {
    posicion = posicion + 1;
    escrito.textContent = letras.slice(0, posicion).join("");

    if (letras[posicion - 1] !== " ") {
      sonidoTecla();
    }

    if (posicion >= letras.length) {
      clearInterval(temporizador);
      if (alTerminar) {
        alTerminar();
      }
    }
  }, VELOCIDAD_ESCRITURA);
}

/* Prepara y escribe de una vez (para textos de un solo bloque). */
function escribir(elemento, texto, alTerminar) {
  const escrito = prepararTexto(elemento, texto);
  escribirEn(escrito, texto, alTerminar);
}

/* ------------------------------------------------------------
   4. ARRANQUE Y BIENVENIDA
   ------------------------------------------------------------ */

let yaComenzo = false;

/* El navegador no deja sonar audio antes de un toque: por eso
   la bienvenida empieza con el primer toque y no sola. */
function comenzar() {
  if (yaComenzo) return;
  yaComenzo = true;

  crearAudio();
  if (contextoAudio) {
    if (contextoAudio.state === "suspended") {
      contextoAudio.resume();
    }
    encenderMusica();
  }

  mostrarEscena("inicio");
  escribirBienvenida();
}

function escribirBienvenida() {
  const lineas = Array.from(bloqueBienvenida.querySelectorAll(".linea"));

  /* Preparamos las cuatro líneas a la vez: así el bloque ya ocupa su
     sitio final y nada se mueve mientras se escribe. */
  const escritos = lineas.map(function (linea, indice) {
    return prepararTexto(linea, textosBienvenida[indice]);
  });

  let indice = 0;

  function siguienteLinea() {
    if (indice >= textosBienvenida.length) {
      opcionesInicio.classList.remove("esperando"); // los botones aparecen al terminar
      return;
    }

    escribirEn(escritos[indice], textosBienvenida[indice], function () {
      indice = indice + 1;
      setTimeout(siguienteLinea, 220); // pequeña pausa entre líneas
    });
  }

  siguienteLinea();
}

document.addEventListener("pointerdown", comenzar);
document.addEventListener("keydown", comenzar);
botonComenzar.addEventListener("click", comenzar);

/* ------------------------------------------------------------
   5. BOTONES DEL INICIO
   ------------------------------------------------------------ */

const botonesInicio = document.querySelectorAll(".boton");
let opcionElegida = null;

/* En móvil no existe el cursor, así que el sonido de hover solo
   se activa en pantallas con ratón. */
const hayCursor = window.matchMedia("(hover: hover)").matches;

botonesInicio.forEach(function (boton) {
  if (hayCursor) {
    boton.addEventListener("pointerenter", sonidoHover);
  }

  boton.addEventListener("click", function () {
    botonesInicio.forEach(function (otroBoton) {
      otroBoton.classList.remove("elegido");
    });

    boton.classList.add("elegido");
    opcionElegida = boton.dataset.opcion;

    const frecuenciaBase = opcionElegida === "ariel" ? 659.25 : 523.25;
    sonidoClic(frecuenciaBase);

    console.log("Opción elegida:", opcionElegida);

    if (opcionElegida === "ariel") {
      empezarMensaje();
    } else if (opcionElegida === "mateo") {
      empezarMensajeMateo();
    }
  });
});

/* ------------------------------------------------------------
   6. MENSAJE DE VERIFICACIÓN
   ------------------------------------------------------------ */

const PAUSA_CURSOR = 5000; // el cursor parpadea 5 segundos

function empezarMensaje() {
  mostrarEscena("mensaje");

  escribir(mensajeAriel, TEXTO_MENSAJE, function () {
    mensajeAriel.classList.add("con-cursor");

    setTimeout(function () {
      empezarQuiz("ariel");
    }, PAUSA_CURSOR);
  });
}

/* Benjamín: primero el mensaje formal y luego el pensamiento del papá. */
function empezarMensajeMateo() {
  mostrarEscena("mensajeMateo");

  /* Preparamos los dos párrafos a la vez para que nada se mueva. */
  const escritoMensaje = prepararTexto(mensajeMateo, TEXTO_MATEO);
  const escritoPensamiento = prepararTexto(pensamientoPapa, TEXTO_PENSAMIENTO);

  escribirEn(escritoMensaje, TEXTO_MATEO, function () {
    setTimeout(function () {
      escribirEn(escritoPensamiento, TEXTO_PENSAMIENTO, function () {
        setTimeout(function () {
          empezarQuiz("mateo");
        }, 700);
      });
    }, 500);
  });
}

/* ------------------------------------------------------------
   7. CUESTIONARIOS (Ariel y Benjamín)
   ------------------------------------------------------------ */

const PREGUNTAS_ARIEL = [
  {
    pregunta: "¿Qué comida te gusta más?",
    opciones: ["Hígado frito", "Vainitas", "Tallarines verdes preparados por mí. xD"],
    correcta: 1
  },
  {
    pregunta: "¿Entre tus marcas de nacimiento qué figura tienes?",
    opciones: ["Un ovni", "Una pelota", "Una persona orando"],
    correcta: 2
  },
  {
    pregunta: "¿Cuándo nos matrimoniamos?",
    opciones: ["22 de agosto", "28 de marzo", "19 de agosto"],
    correcta: 1
  }
];

const PREGUNTAS_MATEO = [
  {
    pregunta: "¿A las cuántas semanas naciste?",
    opciones: [
      "Nací a la semana 38, porque estaba muy emocionado por conocerlos y de tanto moverme me enredé con el cordón de mamá. 😅",
      "Nací a la semana 42 porque me quedé dormido 😴 y sentía calientito dentro de mamá."
    ],
    correcta: 0
  },
  {
    pregunta: "¿Cuál fue tu pre-nombre durante las primeras semanas dentro de mamá?",
    opciones: ["Zapallito", "Vainitas", "Alverjitas"],
    correcta: 1
  },
  {
    pregunta: "¿Qué deseamos, mamá y papá, para ti?",
    opciones: [
      "Que a los 6 meses ya aprenda a hablar, caminar, escribir y al año me voy para la NASA. 😁",
      "Que sea el proyecto Cristiano Ronaldo, que mi papá me entrene y que mamá me haga barras. ⚽",
      "Que sea un hijo de Dios, que él me cuide y proteja mucho, y que sea muy feliz. 🙂",
      "Todas las anteriores son correctas."
    ],
    correcta: 3,
    /* La última opción se revela después de descartar las tres primeras. */
    ocultarUltima: true
  }
];

const CUESTIONARIOS = {
  ariel: {
    preguntas: PREGUNTAS_ARIEL,
    textoFinal: TEXTO_FINAL
  },
  mateo: {
    preguntas: PREGUNTAS_MATEO,
    textoFinal: TEXTO_FINAL_MATEO
  }
};

let quizActual = "ariel";
let preguntaActual = 0;

function empezarQuiz(cual) {
  quizActual = cual;
  mostrarEscena("quiz");
  preguntaActual = 0;
  mostrarPregunta();
}

function mostrarPregunta() {
  const datos = CUESTIONARIOS[quizActual].preguntas[preguntaActual];

  opcionesQuiz.textContent = "";
  opcionesQuiz.classList.add("esperando");

  /* Creamos las opciones ya: ocupan su sitio, pero siguen invisibles. */
  crearOpciones(datos);

  /* Escribimos la pregunta y, al terminar, mostramos las opciones. */
  escribir(preguntaQuiz, datos.pregunta, function () {
    opcionesQuiz.classList.remove("esperando");
  });
}

function crearOpciones(datos) {
  const botones = [];
  let revelada = false;

  /* Después de descartar todas las opciones visibles, aparece la dorada. */
  function revisarDescarte() {
    if (!datos.ocultarUltima || revelada) return;

    const visibles = botones.slice(0, botones.length - 1);
    const todasDescartadas = visibles.every(function (opcion) {
      return opcion.disabled;
    });

    if (!todasDescartadas) return;

    revelada = true;

    setTimeout(function () {
      /* Las tres primeras se encogen suavemente. */
      visibles.forEach(function (opcion) {
        opcion.classList.add("descartada");
      });

      setTimeout(function () {
        const ultima = botones[botones.length - 1];
        ultima.hidden = false;
        ultima.classList.add("aparece");
      }, 260);
    }, 320);
  }

  datos.opciones.forEach(function (texto, indice) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "opcion";
    boton.textContent = texto;

    const esCorrecta = indice === datos.correcta;
    const esUltimaOculta = datos.ocultarUltima && indice === datos.opciones.length - 1;

    if (esUltimaOculta) {
      boton.classList.add("opcion--dorada");
      boton.hidden = true;
    }

    if (hayCursor) {
      boton.addEventListener("pointerenter", sonidoHover);
    }

    boton.addEventListener("click", function () {
      if (esCorrecta) {
        responderCorrecta(boton, botones);
      } else {
        responderIncorrecta(boton);
        revisarDescarte();
      }
    });

    opcionesQuiz.appendChild(boton);
    botones.push(boton);
  });
}

function responderCorrecta(boton, botones) {
  boton.classList.remove("opcion--dorada", "aparece");
  boton.classList.add("correcta");
  boton.textContent = boton.textContent + " ✔";
  sonidoAcierto();

  botones.forEach(function (opcion) {
    opcion.disabled = true;
  });

  setTimeout(function () {
    preguntaActual = preguntaActual + 1;

    if (preguntaActual < CUESTIONARIOS[quizActual].preguntas.length) {
      mostrarPregunta();
    } else {
      terminarQuiz();
    }
  }, 800);
}

function responderIncorrecta(boton) {
  boton.classList.add("incorrecta");
  boton.textContent = boton.textContent + " ✖";
  boton.disabled = true;
  sonidoError();
}

function terminarQuiz() {
  const cuestionario = CUESTIONARIOS[quizActual];
  const esMateo = quizActual === "mateo";
  const irAlFinal = esMateo ? empezarHormigas : empezarTortugas;

  mostrarEscena("final");

  /* La fanfarria anuncia el cierre del quiz de Benjamín. */
  if (esMateo) {
    sonidoFanfarria();
  }

  function programarCierre() {
    /* Dejamos leer el mensaje y lo despedimos con un fundido suave. */
    setTimeout(function () {
      /* Con menos movimiento no hay fundido que esperar. */
      if (prefiereMenosMovimiento) {
        irAlFinal();
        return;
      }

      mensajeFinal.classList.add("fundido");

      setTimeout(function () {
        irAlFinal();
      }, 720);
    }, 3000);
  }

  if (esMateo) {
    /* Un pequeño respiro para que la fanfarria se escuche antes del tecleo. */
    setTimeout(function () {
      escribir(mensajeFinal, cuestionario.textoFinal, programarCierre);
    }, 420);
  } else {
    escribir(mensajeFinal, cuestionario.textoFinal, programarCierre);
  }
}

/* ------------------------------------------------------------
   8. CELEBRACIÓN: TORTUGAS, HORMIGAS, SERPENTINAS Y FUEGOS
   ------------------------------------------------------------ */

const prefiereMenosMovimiento = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* Dibujo de una tortuga vista desde arriba. Va en SVG para no usar
   ninguna imagen externa y para poder suavizar los colores. */
const DIBUJO_TORTUGA =
  '<svg class="tortuga__dibujo" viewBox="0 0 40 40" aria-hidden="true">' +
    '<ellipse cx="12.6" cy="14.4" rx="6" ry="3.2" transform="rotate(-38 12.6 14.4)" fill="#f4e7cf"/>' +
    '<ellipse cx="27.4" cy="14.4" rx="6" ry="3.2" transform="rotate(38 27.4 14.4)" fill="#f4e7cf"/>' +
    '<ellipse cx="13.2" cy="29.8" rx="4.4" ry="2.5" transform="rotate(32 13.2 29.8)" fill="#f4e7cf"/>' +
    '<ellipse cx="26.8" cy="29.8" rx="4.4" ry="2.5" transform="rotate(-32 26.8 29.8)" fill="#f4e7cf"/>' +
    '<path d="M20 32.8 l-2 3.2 q2 1.2 4 0 z" fill="#f4e7cf"/>' +
    '<ellipse cx="20" cy="7.6" rx="4.3" ry="4.5" fill="#f4e7cf"/>' +
    '<circle cx="18.6" cy="6.8" r="0.8" fill="#35584a"/>' +
    '<circle cx="21.4" cy="6.8" r="0.8" fill="#35584a"/>' +
    '<ellipse cx="20" cy="22.4" rx="10.4" ry="11" fill="#8fd2b2" stroke="#5aa989" stroke-width="1.1"/>' +
    '<ellipse cx="20" cy="22.4" rx="5.2" ry="5.6" fill="#b3e6c9"/>' +
    '<path d="M20 12.2 V16.8 M20 28 V32.8 M9.8 22.4 H14.6 M25.4 22.4 H30.2" ' +
      'stroke="#5aa989" stroke-width="0.9" stroke-linecap="round" opacity="0.55" fill="none"/>' +
  '</svg>';

/* Dibujo de una hormiga vista desde arriba. También en SVG, sin imágenes
   externas: cuerpo ámbar cálido, patas finas y antenas. */
const DIBUJO_HORMIGA =
  '<svg class="hormiga__dibujo" viewBox="0 0 24 34" aria-hidden="true">' +
    '<path d="M10.4 4.4 Q8.6 1.8 6.8 2.8 M13.6 4.4 Q15.4 1.8 17.2 2.8" ' +
      'stroke="#6b3a22" stroke-width="1" stroke-linecap="round" fill="none"/>' +
    '<path d="M9 11.4 L4.2 8.4 M9 14 L3.4 14 M9 16.6 L4.2 19.6" ' +
      'stroke="#6b3a22" stroke-width="1.1" stroke-linecap="round" fill="none"/>' +
    '<path d="M15 11.4 L19.8 8.4 M15 14 L20.6 14 M15 16.6 L19.8 19.6" ' +
      'stroke="#6b3a22" stroke-width="1.1" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="12" cy="24.6" rx="5" ry="6.4" fill="#8a4a2a"/>' +
    '<ellipse cx="12" cy="23.4" rx="2.6" ry="3.6" fill="#b9713f" opacity="0.55"/>' +
    '<ellipse cx="12" cy="14.4" rx="3.4" ry="4.2" fill="#a65f38"/>' +
    '<circle cx="12" cy="6.4" r="3.1" fill="#7a3f24"/>' +
    '<circle cx="10.9" cy="5.7" r="0.55" fill="#f4e7cf"/>' +
    '<circle cx="13.1" cy="5.7" r="0.55" fill="#f4e7cf"/>' +
  '</svg>';

/* --- 8.1 Las frases y sus letras --- */

/* Cada línea va por separado para controlar el salto de línea. */
const LINEAS_TORTUGAS = ["FELIZ 1er AÑO", "COMO MAMÁ"];

const LINEAS_HORMIGAS = ["FELIZ 1er AÑO DE VIDA.", "TE AMO MUCHO HIJO 🤗🥲"];

let fraseCompleta = false;

function empezarTortugas() {
  fraseCompleta = false;
  mostrarEscena("tortugas");

  construirLetras(
    mensajeTortugas,
    capaTortugas,
    LINEAS_TORTUGAS,
    DIBUJO_TORTUGA,
    "tortuga",
    function () {
      completarFrase(mensajeTortugas);
    }
  );
}

function empezarHormigas() {
  fraseCompleta = false;
  mostrarEscena("hormigas");

  construirLetras(
    mensajeHormigas,
    capaHormigas,
    LINEAS_HORMIGAS,
    DIBUJO_HORMIGA,
    "hormiga",
    function () {
      completarFrase(mensajeHormigas);
    }
  );
}

/* Una casilla invisible por letra; los espacios son texto normal. */
function construirLetras(contenedor, capa, lineas, dibujo, clase, alCompletar) {
  capa.textContent = "";
  contenedor.classList.remove("completo");
  contenedor.textContent = "";

  /* El texto completo queda disponible para lectores de pantalla. */
  const lector = document.createElement("span");
  lector.className = "solo-lectores";
  lector.textContent = lineas.join(" ");
  contenedor.appendChild(lector);

  const letras = [];

  lineas.forEach(function (linea, indiceLinea) {
    if (indiceLinea > 0) {
      contenedor.appendChild(document.createElement("br"));
    }

    Array.from(linea).forEach(function (caracter) {
      if (caracter === " ") {
        contenedor.appendChild(document.createTextNode(" "));
        return;
      }

      const letra = document.createElement("span");
      letra.className = "letra";
      letra.textContent = caracter;
      letra.setAttribute("aria-hidden", "true");

      contenedor.appendChild(letra);
      letras.push(letra);
    });
  });

  /* Con prefers-reduced-motion no hay vuelo: aparecen todas las letras. */
  if (prefiereMenosMovimiento) {
    letras.forEach(function (letra) {
      letra.classList.add("puesta");
    });
    alCompletar();
    return;
  }

  repartirLetras(letras, {
    capa: capa,
    dibujo: dibujo,
    clase: clase,
    alCompletar: alCompletar
  });
}

/* Elige un punto fuera de la pantalla, alternando los cuatro lados. */
function puntoDeSalida(indice, ancho, alto) {
  const lado = indice % 4;
  const margen = 70;

  if (lado === 0) {
    return {
      x: -margen - Math.random() * 60,
      y: alto * (0.12 + Math.random() * 0.76)
    };
  }

  if (lado === 1) {
    return {
      x: ancho * (0.1 + Math.random() * 0.8),
      y: -margen - Math.random() * 60
    };
  }

  if (lado === 2) {
    return {
      x: ancho + margen + Math.random() * 60,
      y: alto * (0.12 + Math.random() * 0.76)
    };
  }

  return {
    x: ancho * (0.1 + Math.random() * 0.8),
    y: alto + margen + Math.random() * 60
  };
}

/* Texto de transform para centrar una criatura en un punto y girarla. */
function posicionCriatura(x, y, giro) {
  return (
    "translate3d(" + x + "px, " + y + "px, 0) " +
    "translate(-50%, -50%) rotate(" + giro + "deg)"
  );
}

/* Crea una criatura por letra y la lleva hasta su hueco. */
function repartirLetras(letras, config) {
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  const esHormiga = config.clase === "hormiga";
  let entregadas = 0;

  letras.forEach(function (letra, indice) {
    const caja = letra.getBoundingClientRect();
    const destinoX = caja.left + caja.width / 2;
    const destinoY = caja.top + caja.height / 2;
    const salida = puntoDeSalida(indice, ancho, alto);

    const criatura = document.createElement("span");
    criatura.className = config.clase;

    const cuerpo = document.createElement("span");
    cuerpo.className = config.clase + "__cuerpo";

    const etiqueta = document.createElement("span");
    etiqueta.className = config.clase + "__letra";
    etiqueta.setAttribute("aria-hidden", "true");
    etiqueta.textContent = letra.textContent;

    cuerpo.appendChild(etiqueta);
    cuerpo.insertAdjacentHTML("beforeend", config.dibujo);
    criatura.appendChild(cuerpo);

    /* Colocamos la criatura en su punto de salida antes de animarla. */
    criatura.style.transform = posicionCriatura(salida.x, salida.y, 0);
    config.capa.appendChild(criatura);

    /* Las hormigas caminan un poco más rápido y se escalonan más juntas. */
    const duracion =
      (esHormiga ? 1650 : 1500) + Math.random() * (esHormiga ? 420 : 450);
    const retraso =
      indice * (esHormiga ? 70 : 95) + Math.random() * (esHormiga ? 90 : 120);
    const giroInicio = (Math.random() - 0.5) * (esHormiga ? 14 : 26);
    const curva = esHormiga ? 0.08 : 0.12;

    /* Un punto medio desviado crea una curva suave, no una línea recta. */
    const medioX = (salida.x + destinoX) / 2 + (destinoY - salida.y) * curva;
    const medioY = (salida.y + destinoY) / 2 - (destinoX - salida.x) * curva;

    const animacion = criatura.animate(
      [
        { transform: posicionCriatura(salida.x, salida.y, giroInicio) },
        { transform: posicionCriatura(medioX, medioY, giroInicio * 0.2), offset: 0.55 },
        { transform: posicionCriatura(destinoX, destinoY, 0) }
      ],
      {
        duration: duracion,
        delay: retraso,
        easing: "cubic-bezier(0.35, 0.05, 0.3, 1)",
        fill: "both"
      }
    );

    /* La letra se coloca al terminar el viaje. Usamos un temporizador
       (además del evento "finish") para que nunca se quede a medias. */
    let yaEntrego = false;

    function entregarLetra() {
      if (yaEntrego) return;
      yaEntrego = true;

      /* Fijamos la posición final antes de cancelar la animación. */
      criatura.style.transform = posicionCriatura(destinoX, destinoY, 0);
      animacion.cancel();

      letra.classList.add("puesta");
      criatura.classList.add("entregada");

      setTimeout(function () {
        criatura.remove();
      }, 380);

      entregadas = entregadas + 1;

      if (entregadas === letras.length) {
        config.alCompletar();
      }
    }

    animacion.addEventListener("finish", entregarLetra);
    setTimeout(entregarLetra, retraso + duracion + 40);
  });
}

/* La frase está formada: brilla y empieza la celebración. */
function completarFrase(contenedor) {
  if (fraseCompleta) return;
  fraseCompleta = true;

  contenedor.classList.add("completo");

  /* Con menos movimiento no hay fiesta visual, solo el brillo sereno. */
  if (prefiereMenosMovimiento) {
    sonidoAplausos();
    return;
  }

  setTimeout(iniciarFiesta, 1100);
}

/* --- 8.2 Serpentinas y fuegos artificiales (canvas) --- */

const contextoLienzo = lienzoFiesta.getContext("2d");
const COLORES_FIESTA = ["#f7e8cd", "#b7ffd6", "#f2cf8b", "#f3c9dc", "#cfe6f2"];

const DURACION_FIESTA = 10000;                    // milisegundos de fiesta intensa
const HORARIOS_FUEGOS = [450, 2300, 4200, 6100];  // salida de cada fuego

let anchoLienzo = 0;
let altoLienzo = 0;
let fiestaActiva = false;
let fiestaPausada = false;
let ultimoCuadro = 0;
let ultimaPeticion = 0;
let inicioFiesta = 0;
let indiceFuego = 0;
let faseFinal = false;

let serpentinas = [];
let cohetes = [];
let chispas = [];
let destellos = [];

function elegirColorFiesta() {
  return COLORES_FIESTA[Math.floor(Math.random() * COLORES_FIESTA.length)];
}

function ajustarLienzo() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  anchoLienzo = window.innerWidth;
  altoLienzo = window.innerHeight;

  lienzoFiesta.width = Math.round(anchoLienzo * dpr);
  lienzoFiesta.height = Math.round(altoLienzo * dpr);
  lienzoFiesta.style.width = anchoLienzo + "px";
  lienzoFiesta.style.height = altoLienzo + "px";

  contextoLienzo.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function crearSerpentina(ahora, lenta) {
  return {
    x: Math.random() * anchoLienzo,
    y: lenta ? Math.random() * altoLienzo : -20 - Math.random() * 140,
    largo: 13 + Math.random() * 15,
    grosor: 2 + Math.random() * 1.8,
    color: elegirColorFiesta(),
    caida: lenta ? 14 + Math.random() * 8 : 42 + Math.random() * 46,
    balanceo: 8 + Math.random() * 16,
    fase: Math.random() * Math.PI * 2,
    ritmo: 1 + Math.random() * 1.3,
    giro: Math.random() * Math.PI * 2,
    ritmoGiro: (Math.random() - 0.5) * 1.4,
    nacimiento: ahora + (lenta ? 0 : Math.random() * 2800),
    alfa: lenta ? 0.28 + Math.random() * 0.12 : 0.5 + Math.random() * 0.28
  };
}

function iniciarFiesta() {
  if (fiestaActiva || prefiereMenosMovimiento) return;

  lienzoFiesta.hidden = false;
  ajustarLienzo();

  inicioFiesta = performance.now();
  ultimoCuadro = inicioFiesta;
  indiceFuego = 0;
  faseFinal = false;
  cohetes = [];
  chispas = [];
  destellos = [];
  serpentinas = [];

  /* Un poco menos de partículas en pantallas pequeñas. */
  const cantidad = anchoLienzo < 420 ? 24 : 32;

  for (let i = 0; i < cantidad; i++) {
    serpentinas.push(crearSerpentina(inicioFiesta, false));
  }

  fiestaActiva = true;
  fiestaPausada = false;

  /* Los aplausos coinciden con el estallido de los fuegos. */
  sonidoAplausos();

  ultimaPeticion = requestAnimationFrame(cuadroFiesta);
}

function lanzarCohete() {
  cohetes.push({
    x: anchoLienzo * (0.16 + Math.random() * 0.68),
    y: altoLienzo + 12,
    vy: -(altoLienzo * 0.55) * (0.9 + Math.random() * 0.25),
    objetivo: altoLienzo * (0.14 + Math.random() * 0.2),
    color: elegirColorFiesta(),
    estela: []
  });
}

function explotar(cohete) {
  destellos.push({
    x: cohete.x,
    y: cohete.y,
    vida: 0,
    max: 0.4,
    color: cohete.color
  });

  const cantidad = anchoLienzo < 420 ? 20 : 28;

  for (let i = 0; i < cantidad; i++) {
    const angulo = (i / cantidad) * Math.PI * 2 + Math.random() * 0.16;
    const velocidad = 55 + Math.random() * 130;

    chispas.push({
      x: cohete.x,
      y: cohete.y,
      vx: Math.cos(angulo) * velocidad,
      vy: Math.sin(angulo) * velocidad,
      vida: 0,
      max: 1.1 + Math.random() * 0.7,
      color: Math.random() < 0.55 ? cohete.color : elegirColorFiesta(),
      grosor: 0.8 + Math.random() * 0.8
    });
  }
}

function actualizarSerpentinas(ahora, dt) {
  for (let i = serpentinas.length - 1; i >= 0; i--) {
    const cinta = serpentinas[i];

    if (ahora < cinta.nacimiento) continue;

    cinta.y += cinta.caida * dt;
    cinta.fase += cinta.ritmo * dt;
    cinta.giro += cinta.ritmoGiro * dt;

    if (cinta.y > altoLienzo + 40) {
      if (faseFinal) {
        /* Al final quedan pocas cintas lentas que vuelven a empezar arriba. */
        cinta.y = -30 - Math.random() * 60;
        cinta.x = Math.random() * anchoLienzo;
      } else {
        serpentinas.splice(i, 1);
      }
    }
  }
}

function dibujarSerpentinas() {
  serpentinas.forEach(function (cinta) {
    contextoLienzo.save();
    contextoLienzo.globalAlpha = cinta.alfa;
    contextoLienzo.strokeStyle = cinta.color;
    contextoLienzo.lineWidth = cinta.grosor;
    contextoLienzo.lineCap = "round";

    const x = cinta.x + Math.sin(cinta.fase) * cinta.balanceo;

    contextoLienzo.translate(x, cinta.y);
    contextoLienzo.rotate(Math.sin(cinta.giro) * 0.5);

    contextoLienzo.beginPath();
    contextoLienzo.moveTo(0, 0);
    contextoLienzo.quadraticCurveTo(3.5, cinta.largo * 0.5, 0, cinta.largo);
    contextoLienzo.stroke();

    contextoLienzo.restore();
  });
}

function actualizarFuegos(dt) {
  for (let i = cohetes.length - 1; i >= 0; i--) {
    const cohete = cohetes[i];

    cohete.vy += 120 * dt; // la subida se frena poco a poco
    cohete.y += cohete.vy * dt;

    cohete.estela.push({ x: cohete.x, y: cohete.y });
    if (cohete.estela.length > 9) {
      cohete.estela.shift();
    }

    if (cohete.y <= cohete.objetivo || cohete.vy >= 0) {
      explotar(cohete);
      cohetes.splice(i, 1);
    }
  }

  for (let i = chispas.length - 1; i >= 0; i--) {
    const chispa = chispas[i];

    chispa.vida += dt;

    if (chispa.vida >= chispa.max) {
      chispas.splice(i, 1);
      continue;
    }

    chispa.vx *= Math.exp(-1.1 * dt);
    chispa.vy = chispa.vy * Math.exp(-0.6 * dt) + 90 * dt;
    chispa.x += chispa.vx * dt;
    chispa.y += chispa.vy * dt;
  }

  for (let i = destellos.length - 1; i >= 0; i--) {
    destellos[i].vida += dt;
    if (destellos[i].vida >= destellos[i].max) {
      destellos.splice(i, 1);
    }
  }
}

function dibujarFuegos() {
  contextoLienzo.save();
  contextoLienzo.globalCompositeOperation = "lighter";

  destellos.forEach(function (destello) {
    const avance = destello.vida / destello.max;
    const radio = 18 + avance * 34;
    const gradiente = contextoLienzo.createRadialGradient(
      destello.x, destello.y, 0,
      destello.x, destello.y, radio
    );

    gradiente.addColorStop(0, destello.color);
    gradiente.addColorStop(1, "rgba(0, 0, 0, 0)");

    contextoLienzo.globalAlpha = 0.35 * (1 - avance);
    contextoLienzo.fillStyle = gradiente;
    contextoLienzo.beginPath();
    contextoLienzo.arc(destello.x, destello.y, radio, 0, Math.PI * 2);
    contextoLienzo.fill();
  });

  cohetes.forEach(function (cohete) {
    contextoLienzo.globalAlpha = 0.8;
    contextoLienzo.strokeStyle = cohete.color;
    contextoLienzo.lineWidth = 1.2;
    contextoLienzo.beginPath();

    cohete.estela.forEach(function (punto, indice) {
      if (indice === 0) {
        contextoLienzo.moveTo(punto.x, punto.y);
      } else {
        contextoLienzo.lineTo(punto.x, punto.y);
      }
    });

    contextoLienzo.stroke();

    contextoLienzo.globalAlpha = 1;
    contextoLienzo.fillStyle = cohete.color;
    contextoLienzo.beginPath();
    contextoLienzo.arc(cohete.x, cohete.y, 1.8, 0, Math.PI * 2);
    contextoLienzo.fill();
  });

  chispas.forEach(function (chispa) {
    const avance = chispa.vida / chispa.max;

    contextoLienzo.globalAlpha = Math.max(0, 1 - avance) * 0.9;
    contextoLienzo.strokeStyle = chispa.color;
    contextoLienzo.lineWidth = chispa.grosor;
    contextoLienzo.beginPath();
    contextoLienzo.moveTo(chispa.x, chispa.y);
    contextoLienzo.lineTo(
      chispa.x - chispa.vx * 0.028,
      chispa.y - chispa.vy * 0.028
    );
    contextoLienzo.stroke();
  });

  contextoLienzo.restore();
}

/* Al acabar la fiesta quedan solo unas cintas muy lentas de fondo. */
function pasarAFaseFinal() {
  faseFinal = true;
  cohetes = [];
  chispas = [];
  destellos = [];

  serpentinas = serpentinas.slice(0, 6);

  /* Si ya habían caído algunas, completamos hasta seis cintas lentas. */
  while (serpentinas.length < 6) {
    serpentinas.push(crearSerpentina(performance.now(), true));
  }

  serpentinas.forEach(function (cinta) {
    cinta.caida = 13 + Math.random() * 8;
    cinta.alfa = 0.26 + Math.random() * 0.12;
    cinta.largo = 12 + Math.random() * 12;
    cinta.y = Math.random() * altoLienzo * 0.7 - 20;
    cinta.x = Math.random() * anchoLienzo;
  });
}

function cuadroFiesta(ahora) {
  if (!fiestaActiva) return;

  const dt = Math.min((ahora - ultimoCuadro) / 1000, 0.05);
  ultimoCuadro = ahora;

  const transcurrido = ahora - inicioFiesta;

  if (!faseFinal && transcurrido >= DURACION_FIESTA) {
    pasarAFaseFinal();
  }

  if (
    !faseFinal &&
    indiceFuego < HORARIOS_FUEGOS.length &&
    transcurrido >= HORARIOS_FUEGOS[indiceFuego]
  ) {
    lanzarCohete();
    indiceFuego = indiceFuego + 1;
  }

  contextoLienzo.clearRect(0, 0, anchoLienzo, altoLienzo);

  actualizarSerpentinas(ahora, dt);
  dibujarSerpentinas();

  if (!faseFinal) {
    actualizarFuegos(dt);
    dibujarFuegos();
  }

  ultimaPeticion = requestAnimationFrame(cuadroFiesta);
}

/* Pausa la fiesta si la persona cambia de pestaña o bloquea el móvil. */
function pausarFiesta() {
  if (!fiestaActiva) return;
  cancelAnimationFrame(ultimaPeticion);
  fiestaPausada = true;
}

function reanudarFiesta() {
  if (!fiestaActiva || !fiestaPausada || document.hidden) return;
  fiestaPausada = false;
  ultimoCuadro = performance.now();
  ultimaPeticion = requestAnimationFrame(cuadroFiesta);
}

/* Si cambia el tamaño de la ventana, el lienzo se adapta. */
window.addEventListener("resize", function () {
  if (!fiestaActiva) return;
  ajustarLienzo();
});

/* ------------------------------------------------------------
   9. BOTÓN DE LA BOCINA (solo música)
   ------------------------------------------------------------ */

const botonSonido = document.getElementById("botonSonido");
const iconoSonido = document.getElementById("iconoSonido");

/* Recordamos la preferencia entre visitas.
   localStorage puede estar bloqueado en algunos navegadores con
   file://, por eso todo va dentro de try/catch. */
function guardarSilencio(valor) {
  try {
    localStorage.setItem("quiz-silencio", valor ? "1" : "0");
  } catch (error) {
    /* Sin memoria: la página funciona igual. */
  }
}

function leerSilencio() {
  try {
    return localStorage.getItem("quiz-silencio") === "1";
  } catch (error) {
    return false;
  }
}

function mostrarEstadoSonido() {
  iconoSonido.textContent = musicaSilenciada ? "🔇" : "🔊";
  botonSonido.setAttribute("aria-pressed", musicaSilenciada ? "true" : "false");
  botonSonido.setAttribute(
    "aria-label",
    musicaSilenciada ? "Activar música" : "Silenciar música"
  );
}

botonSonido.addEventListener("click", function () {
  musicaSilenciada = !musicaSilenciada;

  if (contextoAudio) {
    gananciaMusica.gain.setTargetAtTime(
      musicaSilenciada ? 0 : 1,
      contextoAudio.currentTime,
      0.05
    );
  }

  if (musicaSilenciada) {
    apagarMusica();
  } else {
    crearAudio();
    if (contextoAudio && contextoAudio.state === "suspended") {
      contextoAudio.resume();
    }
    encenderMusica();
  }

  guardarSilencio(musicaSilenciada);
  mostrarEstadoSonido();
});

musicaSilenciada = leerSilencio();
mostrarEstadoSonido();
