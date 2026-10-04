window.onload = () => {
    // === ESTADO DE LOGIN ===
    const loginArea = document.getElementById('login-area');
    const constrolAreaToHide = document.getElementById('control-area');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const loginMsg = document.getElementById('login-message');

    function tryAuth(endpoint) {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            loginMsg.textContent = 'Rellena ambos campos';
            return;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loginArea.style.display = 'none';
                    constrolAreaToHide.style.display = 'flex';
                    // Mostrar onboarding siempre al registrarse
                    if (endpoint === '/api/register') {
                        console.log('Registro detectado, preparando onboarding...');
                        if (typeof window.showOnboarding === 'function') {
                            setTimeout(() => {
                                console.log('Llamando a showOnboarding(true)');
                                window.showOnboarding(true);
                            }, 300);
                        } else {
                            console.log('Error: window.showOnboarding no está disponible');
                        }
                    }
                } else {
                    loginMsg.textContent = data.error || 'Error';
                }
            })
            .catch(err => {
                console.error(err);
                loginMsg.textContent = 'Error de conexión';
            });
    }

    if (btnLogin && btnRegister) {
        btnLogin.addEventListener('click', () => tryAuth('/api/login'));
        btnRegister.addEventListener('click', () => tryAuth('/api/register'));
    }


    const socket = io();
    const trackpad = document.getElementById('trackpad');
    const btnClick = document.getElementById('btn-click');
    const btnCenter = document.getElementById('btn-center');

    // Estado del puntero relativo para el trackpad (inicia en centro)
    let pointerX = 0.5;
    let pointerY = 0.5;

    // Sensibilidad del trackpad (ajustar si es muy rápido/lento)
    const sensitivity = 0.002;

    let isTouching = false;
    let lastTouchX = 0;
    let lastTouchY = 0;

    // --- MANEJO DEL TRACKPAD ---
    const handleStart = (e) => {
        isTouching = true;
        const input = e.touches ? e.touches[0] : e;
        lastTouchX = input.clientX;
        lastTouchY = input.clientY;
    };

    const handleMove = (e) => {
        if (!isTouching) return;
        e.preventDefault();

        const input = e.touches ? e.touches[0] : e;

        const deltaX = input.clientX - lastTouchX;
        const deltaY = input.clientY - lastTouchY;

        pointerX += deltaX * sensitivity;
        pointerY += deltaY * sensitivity;

        pointerX = Math.max(0, Math.min(1, pointerX));
        pointerY = Math.max(0, Math.min(1, pointerY));

        socket.emit('pointer-move', { x: pointerX, y: pointerY });

        lastTouchX = input.clientX;
        lastTouchY = input.clientY;
    };

    const handleEnd = () => {
        isTouching = false;
    };

    // Eventos táctiles para móviles
    trackpad.addEventListener('touchstart', handleStart, { passive: false });
    trackpad.addEventListener('touchmove', handleMove, { passive: false });
    trackpad.addEventListener('touchend', handleEnd);

    // Eventos de ratón para pruebas en PC
    trackpad.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    /*
        // GIROSCOPIO (DeviceOrientationEvent)
        const GYRO_SENSITIVITY = 0.003;
    
        // Variable para activar/desactivar el modo giroscopio desde fuera si hiciera falta
        let gyroActivo = false;
    
        function habilitarGiroscopio() {
            gyroActivo = true;
    
            window.addEventListener('deviceorientation', (event) => {
                // Si el usuario está tocando el trackpad, el trackpad tiene prioridad
                if (isTouching) return;
    
                // gamma → movimiento horizontal (izquierda/derecha)
                // beta  → movimiento vertical   (arriba/abajo)
                const gamma = event.gamma ?? 0; // rango aprox -90 a 90
                const beta  = event.beta  ?? 0; // rango aprox -180 a 180
    
                // Mapeamos inclinación a desplazamiento del puntero.
                // Dividimos entre 90 para normalizar gamma a [-1, 1].
                // Beta lo acotamos a [-90, 90] antes de normalizar.
                const betaAcotado = Math.max(-90, Math.min(90, beta));
    
                const deltaX = (gamma / 90) * GYRO_SENSITIVITY * 100;
                const deltaY = (betaAcotado / 90) * GYRO_SENSITIVITY * 100;
    
                pointerX += deltaX;
                pointerY += deltaY;
    
                pointerX = Math.max(0, Math.min(1, pointerX));
                pointerY = Math.max(0, Math.min(1, pointerY));
    
                socket.emit('pointer-move', { x: pointerX, y: pointerY });
            });
    
            console.log('[Giroscopio] Habilitado');
        }
    
    
    
        if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS: pedir permiso al primer toque sobre el trackpad
            trackpad.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            habilitarGiroscopio();
                        } else {
                            console.warn('[Giroscopio] Permiso denegado por el usuario');
                        }
                    })
                    .catch(console.error);
            }, { once: true });
        } else if (window.DeviceOrientationEvent) {
            // Android / resto de navegadores: sin permiso explícito
            habilitarGiroscopio();
        } else {
            console.warn('[Giroscopio] DeviceOrientationEvent no disponible en este dispositivo/navegador');
        }
    
        implementacion en el running (futuramente)
        // ACELERÓMETRO (DeviceMotionEvent)
        const SHAKE_THRESHOLD = 20;
        let lastShakeTime = 0;
    
        function habilitarAcelerometro() {
            window.addEventListener('devicemotion', (event) => {
                // Usamos accelerationIncludingGravity porque acceleration (sin gravedad)
                // puede ser null en algunos dispositivos Android
                const acc = event.accelerationIncludingGravity;
                if (!acc) return;
    
                const x = acc.x ?? 0;
                const y = acc.y ?? 0;
                const z = acc.z ?? 0;
    
                // Magnitud total del vector de aceleración (Pitágoras 3D)
                const totalAcc = Math.sqrt(x * x + y * y + z * z);
    
                if (totalAcc > SHAKE_THRESHOLD) {
                    const ahora = Date.now();
    
                    // Debounce: mínimo 500 ms entre detecciones
                    if (ahora - lastShakeTime > 500) {
                        lastShakeTime = ahora;
                        manejarShake();
                    }
                }
            });
    
            console.log('[Acelerómetro] Habilitado');
        }
    
        function manejarShake() {
            console.log('[Acelerómetro] ¡SHAKE detectado!');
    
            // Emitir al servidor para que lo reenvíe a la pantalla
            socket.emit('shake');
    
            // Feedback visual breve en el trackpad
            trackpad.classList.add('shake-detected');
            setTimeout(() => trackpad.classList.remove('shake-detected'), 400);
        }
    
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
    
            trackpad.addEventListener('click', () => {
                DeviceMotionEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            habilitarAcelerometro();
                        } else {
                            console.warn('[Acelerómetro] Permiso denegado por el usuario');
                        }
                    })
                    .catch(console.error);
            }, { once: true });
        } else if (window.DeviceMotionEvent) {
            habilitarAcelerometro();
        } else {
            console.warn('[Acelerómetro] DeviceMotionEvent no disponible');
        }
    */

    // --- BOTONES ---
    btnClick.addEventListener('click', () => {
        socket.emit('pointer-click');
    });

    btnCenter.addEventListener('click', () => {
        pointerX = 0.5;
        pointerY = 0.5;
        socket.emit('pointer-center');
        socket.emit('pointer-move', { x: pointerX, y: pointerY });
    });

    // LÓGICA DE GIMNASIO / CÁMARA / MEDIAPIPE
    const controlArea = document.getElementById('control-area');
    const cameraArea = document.getElementById('camera-area');
    const exerciseTitle = document.getElementById('exercise-title');
    const btnEmpezarSerie = document.getElementById('btn-empezar-serie');
    const btnTerminarSerie = document.getElementById('btn-terminar-serie');
    const btnTerminarMaquina = document.getElementById('btn-terminar-maquina');

    const inputVideo = document.getElementById('input_video');
    const outputCanvas = document.getElementById('output_canvas');
    let canvasCtx = null;
    if (outputCanvas) {
        canvasCtx = outputCanvas.getContext('2d');
    }
    const repCounterEl = document.getElementById('rep-counter');
    const seriesCounterEl = document.getElementById('series-counter');
    const statusMessage = document.getElementById('status-message');

    let isCameraRunning = false;
    let camera = null;
    let pose = null;
    let modelLoaded = false;
    let lastHipY = 0;
    let repCount = 0;
    let goingDown = false;
    let seriesRestantes = 0;
    let usuarioDetectadoTriggered = false;

    socket.on('salir-ejercicio', () => {
        isCameraRunning = false;
        usuarioDetectadoTriggered = false;
        if (camera) camera.stop();
        if (controlArea) controlArea.style.display = 'flex';
        if (cameraArea) cameraArea.style.display = 'none';
        if (btnTerminarSerie) btnTerminarSerie.style.display = 'none';
        if (btnEmpezarSerie) btnEmpezarSerie.style.display = 'block';
    });

    socket.on('ejercicio-seleccionado', (ejercicio) => {
        if (ejercicio === 'Pruebas' || !cameraArea) {
            if (controlArea) controlArea.style.display = 'flex';
            if (cameraArea) cameraArea.style.display = 'none';
        } else {
            controlArea.style.display = 'none';
            cameraArea.style.display = 'flex';
            exerciseTitle.textContent = ejercicio;
            initPose();
        }
    });

    socket.on('series-configuradas', (num) => {
        seriesRestantes = parseInt(num);
        if (seriesCounterEl) seriesCounterEl.textContent = `Series: ${seriesRestantes}`;
    });

    async function initPose() {
        if (modelLoaded) return;
        statusMessage.textContent = 'Descargando modelo de IA...';

        try {
            pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            pose.onResults(onPoseResults);

            camera = new Camera(inputVideo, {
                onFrame: async () => {
                    if (isCameraRunning) {
                        await pose.send({ image: inputVideo });
                    }
                },
                width: 480,
                height: 640
            });

            modelLoaded = true;
            statusMessage.textContent = 'Coloca el móvil y pulsa Empezar Serie';
        } catch (error) {
            console.error('Error inicializando Pose:', error);
            statusMessage.textContent = 'Error al cargar cámara';
        }
    }

    // Índices de landmarks de la CARA que queremos EXCLUIR (0-10)
    const FACE_LANDMARK_INDICES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Conexiones del cuerpo solamente (excluimos cualquier conexión que involucre landmarks de la cara)
    const BODY_CONNECTIONS = POSE_CONNECTIONS.filter(([a, b]) => {
        return !FACE_LANDMARK_INDICES.has(a) && !FACE_LANDMARK_INDICES.has(b);
    });

    function onPoseResults(results) {
        if (!isCameraRunning || !canvasCtx) return;

        // Match canvas dimensions to video
        outputCanvas.width = inputVideo.videoWidth;
        outputCanvas.height = inputVideo.videoHeight;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

        // Draw input image
        canvasCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);

        if (results.poseLandmarks) {
            if (!usuarioDetectadoTriggered) {
                usuarioDetectadoTriggered = true;
                socket.emit('usuario-detectado');
                console.log("¡Cuerpo detectado! Avisando a la voz...");
            }

            // Filtrar solo landmarks del cuerpo (índices 11-32), excluyendo la cara
            const bodyLandmarks = results.poseLandmarks.map((lm, i) => {
                return FACE_LANDMARK_INDICES.has(i) ? { x: 0, y: 0, z: 0, visibility: 0 } : lm;
            });

            // Dibujar solo las conexiones y landmarks del cuerpo
            window.drawConnectors(canvasCtx, bodyLandmarks, BODY_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });

            // Dibujar solo los puntos del cuerpo (sin la cara)
            const bodyOnlyLandmarks = results.poseLandmarks
                .filter((_, i) => !FACE_LANDMARK_INDICES.has(i));
            window.drawLandmarks(canvasCtx, bodyOnlyLandmarks, { color: '#FF0000', lineWidth: 2, radius: 3 });

            // Tracking de repeticiones usando SOLO las caderas (sin la nariz/cara)
            const leftHip = results.poseLandmarks[23];
            const rightHip = results.poseLandmarks[24];

            // Solo usamos el punto medio de las caderas como referencia
            let referencePointY = 0;
            if (leftHip && rightHip && leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
                referencePointY = (leftHip.y + rightHip.y) / 2;
            } else if (leftHip && leftHip.visibility > 0.5) {
                referencePointY = leftHip.y;
            } else if (rightHip && rightHip.visibility > 0.5) {
                referencePointY = rightHip.y;
            }

            if (referencePointY > 0) {
                // Heuristica: Si Y sube de valor (baja el cuerpo en la imagen) un 7%
                if (referencePointY > lastHipY + 0.07) {
                    goingDown = true;
                    lastHipY = referencePointY;
                }
                // Si Y baja de valor (sube el cuerpo en la imagen) un 5% después de bajar
                else if (goingDown && referencePointY < lastHipY - 0.05) {
                    goingDown = false;
                    repCount++;
                    repCounterEl.textContent = `Reps: ${repCount}`;
                    socket.emit('rep-actualizada', repCount);
                    lastHipY = referencePointY;
                } else if (!goingDown && referencePointY < lastHipY) {
                    lastHipY = referencePointY;
                } else if (goingDown && referencePointY > lastHipY) {
                    lastHipY = referencePointY;
                }
            }
        }
        canvasCtx.restore();
    }

    if (btnEmpezarSerie) {
        btnEmpezarSerie.addEventListener('click', () => {
            repCount = 0;
            repCounterEl.textContent = `Reps: ${repCount}`;
            isCameraRunning = true;
            socket.emit('serie-iniciada');
            btnEmpezarSerie.style.display = 'none';
            btnTerminarSerie.style.display = 'block';
            statusMessage.textContent = 'Grabando... ¡A tope!';
            if (camera) camera.start();
        });
    }

    if (btnTerminarSerie) {
        btnTerminarSerie.addEventListener('click', () => {
            isCameraRunning = false;
            btnTerminarSerie.style.display = 'none';
            btnEmpezarSerie.style.display = 'block';

            socket.emit('serie-terminada');

            seriesRestantes--;

            if (seriesRestantes <= 0) {
                seriesRestantes = 0;
                if (seriesCounterEl) seriesCounterEl.textContent = `Series: ${seriesRestantes}`;
                statusMessage.textContent = '¡Rutina finalizada!';

                // Expulsar al usuario al menú principal automáticamente después de terminar
                setTimeout(() => {
                    socket.emit('terminar-maquina');
                    if (camera) camera.stop();
                    if (controlArea) controlArea.style.display = 'flex';
                    if (cameraArea) cameraArea.style.display = 'none';
                }, 2000); // Dar 2 segundos de lectura de feedback antes del kick

            } else {
                if (seriesCounterEl) seriesCounterEl.textContent = `Series: ${seriesRestantes}`;
                statusMessage.textContent = 'Serie Terminada. Respira y prepárate.';
            }
        });
    }

    if (btnTerminarMaquina) {
        btnTerminarMaquina.addEventListener('click', () => {
            isCameraRunning = false;
            usuarioDetectadoTriggered = false;
            socket.emit('terminar-maquina');
            if (camera) camera.stop();
            if (controlArea) controlArea.style.display = 'flex';
            if (cameraArea) cameraArea.style.display = 'none';
            if (btnTerminarSerie) btnTerminarSerie.style.display = 'none';
            if (btnEmpezarSerie) btnEmpezarSerie.style.display = 'block';
        });
    }
};