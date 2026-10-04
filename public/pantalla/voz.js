
//La intención con este script, es que cuando la cámara de proximidad detecte que estamos cerca de la 'máquina'
//Espere 2 segundos y nos pregunte por voz '¿Cuántas series vas a hacer?'
//Cuando le contestemos, nos reponderá


// voz.js

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocimiento = SpeechRecognition ? new SpeechRecognition() : null;
let locucionSegura = null;

let currentTemperature = null;

function getLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const locEl = document.getElementById("location");
                if (locEl) locEl.innerText = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                getWeather(lat, lon);
            },
            (error) => {
                console.error("Error obteniendo la ubicación: " + error.message);
                const locEl = document.getElementById("location");
                if (locEl) locEl.innerText = "Error";
            }
        );
    } else {
        console.error("Tu navegador no soporta la geolocalización.");
        const locEl = document.getElementById("location");
        if (locEl) locEl.innerText = "No soportado";
    }
}

function getWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Error en la API");
            }
            return response.json();
        })
        .then(data => {
            currentTemperature = data.current_weather.temperature;
            const tempEl = document.getElementById("temperature");
            const windEl = document.getElementById("wind");
            if (tempEl) tempEl.innerText = currentTemperature;
            if (windEl) windEl.innerText = data.current_weather.windspeed;
        })
        .catch(error => {
            console.error("Hubo un error al obtener el clima.", error);
            const tempEl = document.getElementById("temperature");
            if (tempEl) tempEl.innerText = "Error";
        });
}

// --- 1. CONFIGURACIÓN DEL MICRÓFONO Y LA VOZ ---
if (reconocimiento) {
    reconocimiento.lang = 'es-ES';
    reconocimiento.continuous = false;
    reconocimiento.onstart = () => console.log("🎤 Escuchando tu respuesta...");

    reconocimiento.onresult = (evento) => {
        const comando = evento.results[0][0].transcript.toLowerCase();
        console.log("🗣️ Has dicho: " + comando);

        const numeros = {
            "1": 1, "un": 1, "una": 1, "uno": 1,
            "2": 2, "dos": 2,
            "3": 3, "tres": 3,
            "4": 4, "cuatro": 4,
            "5": 5, "cinco": 5,
            "6": 6, "seis": 6,
            "7": 7, "siete": 7,
            "8": 8, "ocho": 8
        };
        let detectado = null;
        for (let n in numeros) { if (comando.includes(n)) detectado = numeros[n]; }

        if (detectado) {
            hablar(`Perfecto. ${detectado} series configuradas. ¡Coloca el móvil y ponte en posición!`);
            if (typeof socket !== 'undefined') {
                socket.emit('configurar-series', detectado);
            }
        } else {
            hablarYEscuchar("No te he entendido el número. ¿Cuántas series?");
        }
    };
}

function hablar(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        locucionSegura = new SpeechSynthesisUtterance(texto);
        locucionSegura.lang = 'es-ES';
        window.speechSynthesis.speak(locucionSegura);
    }
}

function hablarYEscuchar(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        locucionSegura = new SpeechSynthesisUtterance(texto);
        locucionSegura.lang = 'es-ES';
        locucionSegura.onend = () => { if (reconocimiento) reconocimiento.start(); };
        window.speechSynthesis.speak(locucionSegura);
    }
}

// --- 2. RECONOCIMIENTO DE OUTFIT CON TEACHABLE MACHINE ---


const URL_MODELO = "https://teachablemachine.withgoogle.com/models/3HBZ9TeWt/";

let modeloTeachable, webcamOutfit;

async function cargarModeloOutfit() {
    const modelURL = URL_MODELO + "model.json";
    const metadataURL = URL_MODELO + "metadata.json";
    modeloTeachable = await tmImage.load(modelURL, metadataURL);
    console.log("👗 Cerebro de Outfit cargado con éxito.");
}

async function comprobarOutfit() {
    if (!modeloTeachable) {
        hablar("Un segundo, estoy encendiendo el espejo mágico...");
        await cargarModeloOutfit();
    }

    if (!webcamOutfit) {
        webcamOutfit = new tmImage.Webcam(200, 200, true);
        await webcamOutfit.setup();
        await webcamOutfit.play();
        document.getElementById("camara-outfit").appendChild(webcamOutfit.canvas);
        window.requestAnimationFrame(actualizarCamara);
    }

    webcamOutfit.update();
    const predicciones = await modeloTeachable.predict(webcamOutfit.canvas);

    let mejorPrediccion = predicciones[0];
    for (let i = 1; i < predicciones.length; i++) {
        if (predicciones[i].probability > mejorPrediccion.probability) {
            mejorPrediccion = predicciones[i];
        }
    }

    console.log(`🧠 La IA cree que es: ${mejorPrediccion.className} (${Math.round(mejorPrediccion.probability * 100)}%)`);

    // Comprueba las clases exactas que pusiste en Teachable Machine
    if (mejorPrediccion.className === "Deporte" && mejorPrediccion.probability > 0.80) {
        if (currentTemperature !== null) {
            let haceFrio = currentTemperature < 18; // Consideramos frío si baja de 18 grados

            if (haceFrio) {
                // Simulamos que detecta manga corta, por lo que le sugerimos abrigarse si hace frío
                hablar("Veo ropa deportiva de manga corta, pero fuera hace un poco de frío. Te recomiendo usar manga larga o sudadera para no resfriarte.");
            } else {
                // Simulamos que detecta manga corta, y al hacer buen tiempo es válida
                hablar("Veo ropa deportiva de manga corta. El tiempo está excelente, así que es un outfit muy válido y perfecto para entrenar hoy. ¡A darle duro!");
            }
        } else {
            hablar("Llevas ropa deportiva. Es el outfit perfecto para entrenar ¡A darle duro!.");
        }
    } else if (mejorPrediccion.className === "Calle" && mejorPrediccion.probability > 0.80) {
        hablar("Veo que llevas ropa de calle. Te recomiendo ponerte algo más elástico para entrenar cómodo.");
    } else {
        hablar("No veo bien tu ropa, por favor, ponte un poco más cerca de la cámara.");
    }
}

function actualizarCamara() {
    if (webcamOutfit) {
        webcamOutfit.update();
        window.requestAnimationFrame(actualizarCamara);
    }
}


// --- 3. EL FLUJO DE LA PRESENTACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    // Pedir ubicación y clima al cargar
    getLocation();

    // PASO 1: Despertar el sistema Boton Azul -PARA PERMISOS
    const btnEmpezar = document.getElementById('btn-escuchar');
    if (btnEmpezar) {
        btnEmpezar.addEventListener('click', () => {
            hablar("Sistema iniciado. Esperando usuario.");
        });
    }

    // PASO OUTFIT: Comprobar la ropa Btn Morado
    const btnOutfit = document.getElementById('btn-outfit');
    if (btnOutfit) {
        btnOutfit.addEventListener('click', () => {
            comprobarOutfit();
        });
    }

    // PASO 2: LOGICA DE SOCKET (Máquina del Gym)
    if (typeof socket !== 'undefined') {
        socket.on('usuario-detectado', () => {
            console.log("📸 Socket: Usuario detectado por la cámara de MediaPipe");
            setTimeout(() => {
                hablarYEscuchar("Te veo en posición. ¿Cuántas series vas a hacer?");
            }, 2000);
        });
    }

    // BOTÓN NARANJA (Plan B para proximidad)
    const btnProximidad = document.getElementById('btn-proximidad');
    if (btnProximidad) {
        btnProximidad.addEventListener('click', () => {
            setTimeout(() => {
                hablarYEscuchar("Bienvenida. La máquina es tuya. ¿Cuántas series vas a hacer?");
            }, 2000);
        });
    }
});

// --- 4. SIMULADOR DE RITMO CARDÍACO ---

document.addEventListener('DOMContentLoaded', () => {
    const sliderPulso = document.getElementById('slider-pulso');
    const valorPulso = document.getElementById('valor-pulso');
    const alertaPulso = document.getElementById('alerta-pulso');

    // Nuestro seguro anti-spam
    let avisoPulsacionesDado = false;

    if (sliderPulso) {
        sliderPulso.addEventListener('input', (evento) => {
            const latidos = evento.target.value;
            valorPulso.textContent = latidos; // Actualizamos el número en pantalla

            // Si las pulsaciones son peligrosas (> 150)
            if (latidos > 150) {
                alertaPulso.style.display = 'block'; // Mostramos el texto rojo

                // Si aún no hemos avisado, hablamos
                if (!avisoPulsacionesDado) {
                    hablar(`Tu ritmo cardíaco está en ${latidos} pulsaciones por minuto. Te recomiendo descansar un poco para evitar sobrecargas.`);
                    avisoPulsacionesDado = true; // Activamos el seguro anti-spam
                }
            }
            // Si nos hemos relajado (< 120)
            else if (latidos < 120) {
                alertaPulso.style.display = 'none'; // Ocultamos el texto rojo
                avisoPulsacionesDado = false; // Reseteamos el seguro para que pueda volver a avisar en el futuro
            }
        });
    }
});