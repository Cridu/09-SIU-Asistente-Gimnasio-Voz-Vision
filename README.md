# Asistente de Gimnasio Interactivo — Control por Voz y Visión

Sistemas Interactivos y Ubicuos — UC3M

## Descripción

Sistema de **pantalla interactiva + mando remoto** para un gimnasio, pensado para funcionar en dos dispositivos sincronizados en tiempo real mediante **Socket.IO**:

- **Pantalla** (`/pantalla`) — se muestra en un monitor/TV del gimnasio. Detecta la llegada del usuario a una máquina, interactúa por voz, muestra el chat asistente y el módulo de "vestuario" (comprobación del outfit mediante cámara).
- **Cliente / mando** (`/cliente`) — se usa desde el móvil del usuario como mando a distancia: controla el puntero de la pantalla, cuenta las repeticiones de cada ejercicio mediante la cámara del móvil y detecta gestos (shake del acelerómetro).

Este proyecto utilizamos Design Thinking para llegar a una solución a un problema dado 

## Funcionalidades principales

- **Login/registro** de usuarios (API REST simple sobre `users.json`).
- **Control remoto de la pantalla** desde el móvil (movimiento de puntero, clicks, "shake" del acelerómetro) vía Socket.IO.
- **Modo Gimnasio**: selección de máquina/ejercicio, configuración del número de series, seguimiento de repeticiones y progreso de la sesión en tiempo real entre el mando y la pantalla.
- **Conteo de repeticiones por visión artificial**: en el cliente se usa **[MediaPipe Pose](https://developers.google.com/mediapipe)** sobre la cámara del móvil para detectar la postura y contar repeticiones del ejercicio seleccionado.
- **Asistencia por voz**: la pantalla usa la Web Speech API (`SpeechRecognition`/`SpeechSynthesis`) para preguntar cuántas series se van a hacer y responder por voz, simulando la detección por proximidad al llegar a una máquina.
- **Chat asistente**: un modelo conversacional (familia **Qwen**, formato ChatML) ejecutado **enteramente en el navegador** mediante [`@xenova/transformers`](https://github.com/xenova/transformers.js) (transformers.js), sin llamadas a ningún servidor externo.
- **Módulo de vestuario**: activa la cámara de la pantalla y, apoyándose en **[Teachable Machine](https://teachablemachine.withgoogle.com/)** + **TensorFlow.js**, informa por voz si el usuario lleva ropa deportiva adecuada.
- **Clima y ubicación**: geolocalización del navegador + [Open-Meteo API](https://open-meteo.com/) para mostrar temperatura y viento en la pantalla.

## Estructura del repositorio

```
.
├── server.js              # Servidor Express + Socket.IO, API de login/registro
├── users.json.example     # Plantilla de usuarios (users.json real NO se versiona)
├── package.json
└── public/
    ├── pantalla/           # Interfaz de la pantalla del gimnasio
    │   ├── index.html
    │   ├── script.js       # Navegación entre secciones (Gym, Vestuario, Chat...)
    │   ├── voz.js           # Reconocimiento/síntesis de voz, clima, cámara de outfit
    │   ├── chat.js           # Chat asistente con modelo Qwen vía transformers.js
    │   ├── style.css
    │   └── assets/          # Vídeos e imágenes demostrativas de cada ejercicio
    └── cliente/            # Interfaz del mando (móvil)
        ├── index.html
        ├── script.js        # Puntero remoto, conteo de reps con MediaPipe Pose
        ├── onboarding.js    # Tutorial de bienvenida
        └── style.css
```

## Instalación y ejecución

```bash
npm install
cp users.json.example users.json   # crea tu propio fichero de usuarios local
node server.js
```

Con Google Chrome, y con el servidor corriendo en `http://localhost:3000`:

- **Pantalla:** abrir [http://localhost:3000/pantalla/index.html](http://localhost:3000/pantalla/index.html)
- **Mando (móvil):** abrir [http://localhost:3000/cliente/index.html](http://localhost:3000/cliente/index.html) (usando el cable con DevTools/remote debugging, o accediendo desde el móvil a la IP local del servidor)

### Probar el modo Gimnasio y Vestuario sin el mando

Desde la propia pantalla, en la sección **Gym**, el botón `Simular llegada a máquina` simula la detección por proximidad y activa la pregunta por voz sobre el número de series (responder, por ejemplo, "4 series"). En la sección **Vestuario**, el botón `Comprobar mi outfit` activa la cámara y valora el atuendo del usuario por voz.

## ⚠️ Nota de seguridad

El sistema de login original almacena las contraseñas **en texto claro** en `users.json` y no debe usarse en producción tal cual. Antes de subir el repositorio se ha sustituido el fichero real de usuarios por `users.json.example`; genera tu propio `users.json` local (ignorado por Git) para pruebas.

## Tecnologías

- Node.js, Express, Socket.IO
- MediaPipe Pose (conteo de repeticiones por visión)
- TensorFlow.js + Teachable Machine (reconocimiento de outfit)
- transformers.js (`@xenova/transformers`) — modelo Qwen ejecutado en el navegador (Si se piensa seguir en el proyecto, lo recomendable es cambiar esta libreria por llamada a una API por velocidad de carga)
- Web Speech API (reconocimiento y síntesis de voz)
- Open-Meteo API (clima) + Geolocation API
