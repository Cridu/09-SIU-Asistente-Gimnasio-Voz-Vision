const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const sectionVestuario = document.getElementById('section-vestuario');
    const sectionGym = document.getElementById('section-gym');
    const btnVolver = document.getElementById('btn-volver');

    const moduloVoz = document.getElementById('modulo-voz');
    const moduloOutfit = document.getElementById('modulo-outfit');
    const moduloEjercicios = document.getElementById('modulo-ejercicios');
    const moduloEjecucion = document.getElementById('modulo-ejecucion');
    const moduloRunning = document.getElementById('modulo-running');
    const gymLayout = document.getElementById('gym-layout');
    const puntero = document.getElementById('puntero');

    const ejecucionTitle = document.getElementById('ejecucion-title');
    const ejecucionVideo = document.getElementById('ejecucion-video');
    const ejecucionTiempo = document.getElementById('ejecucion-tiempo');
    const ejecucionReps = document.getElementById('ejecucion-reps');
    const ejecucionSeries = document.getElementById('ejecucion-series');

    const vidMap = {
        'Sentadilla': 'assets/sentadilla.mp4',
        'Flexiones': 'assets/flexiones.mp4',
        'Extensión de Cuádriceps': 'assets/cuadriceps.mp4',
        'Elevaciones Laterales': 'assets/elevaciones.mp4',
        'Curl de Bíceps': 'assets/biceps.mp4'
    };

    let timerInterval = null;
    let secondsElapsed = 0;
    let currentEjercicio = '';
    let seriesRestantes = 0;

    window.seleccionarEjercicio = function(nombre) {
        currentEjercicio = nombre;
        if (moduloEjecucion) {
            if (moduloEjercicios) moduloEjercicios.style.display = 'none';
            moduloEjecucion.style.display = 'flex';
            ejecucionTitle.textContent = nombre;
            ejecucionVideo.src = vidMap[nombre] || '';
            ejecucionVideo.pause();
            ejecucionTiempo.textContent = '00:00';
            ejecucionReps.textContent = '0';
            ejecucionSeries.textContent = '...';
            secondsElapsed = 0;
            clearInterval(timerInterval);
        }

        if (typeof window.hablar === 'function') {
            window.hablar(`Has seleccionado ${nombre}. Colócate frente a la cámara del móvil.`);
        }
        socket.emit('seleccionar-ejercicio', nombre);
    }

    function actualizarBordes() {
        if (seriesRestantes >= 3) {
            document.body.style.border = '15px solid red';
        } else if (seriesRestantes === 2 || seriesRestantes === 1) {
            document.body.style.border = '15px solid yellow';
        } else {
            document.body.style.border = '15px solid green';
        }
    }

    socket.on('series-configuradas', (num) => {
        seriesRestantes = parseInt(num);
        if (ejecucionSeries) ejecucionSeries.textContent = seriesRestantes;
        actualizarBordes();
    });

    socket.on('serie-iniciada', () => {
        clearInterval(timerInterval);
        secondsElapsed = 0;
        if (ejecucionTiempo) ejecucionTiempo.textContent = '00:00';
        if (ejecucionReps) ejecucionReps.textContent = '0';
        
        if (ejecucionVideo) ejecucionVideo.play();

        timerInterval = setInterval(() => {
            secondsElapsed++;
            const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
            const s = String(secondsElapsed % 60).padStart(2, '0');
            if (ejecucionTiempo) ejecucionTiempo.textContent = `${m}:${s}`;
        }, 1000);
    });

    socket.on('rep-actualizada', (repCount) => {
        if (ejecucionReps) ejecucionReps.textContent = repCount;
    });

    socket.on('actualizar-serie', () => {
        seriesRestantes--;
        if (seriesRestantes < 0) seriesRestantes = 0;
        if (ejecucionSeries) ejecucionSeries.textContent = seriesRestantes;
        clearInterval(timerInterval);
        if (ejecucionVideo) ejecucionVideo.pause();
        actualizarBordes();
    });

    socket.on('maquina-terminada', () => {
        seriesRestantes = 0;
        clearInterval(timerInterval);
        document.body.style.border = 'none';
        if(moduloVoz) moduloVoz.style.display = 'none';
        if(moduloEjecucion) moduloEjecucion.style.display = 'none';
        if(moduloRunning) moduloRunning.style.display = 'none';
        if(moduloEjercicios) moduloEjercicios.style.display = 'flex';
    });

    // ---- Tab Gym / Running ----
    window.switchGymTab = function(tab) {
        const tabGymBtn = document.getElementById('tab-gym');
        const tabRunBtn = document.getElementById('tab-running');

        if (tab === 'gym') {
            tabGymBtn.classList.add('active');
            tabRunBtn.classList.remove('active');
            if (moduloRunning) moduloRunning.style.display = 'none';
            if (moduloEjecucion) moduloEjecucion.style.display = 'none';
            if (moduloEjercicios) moduloEjercicios.style.display = 'flex'; // mostrar ejercicios al volver a tab Gym
        } else {
            tabRunBtn.classList.add('active');
            tabGymBtn.classList.remove('active');
            if (moduloEjercicios) moduloEjercicios.style.display = 'none';
            if (moduloEjecucion) moduloEjecucion.style.display = 'none';
            if (moduloRunning) moduloRunning.style.display = 'flex';
        }
    };

    // ---- Lista de ejercicios con series ----
    let listaEjercicios = []; // { id, nombre, series, seriesCompletadas }

    window.addEjercicioLista = function() {
        const inputNombre = document.getElementById('input-nombre-ejercicio');
        const inputSeries = document.getElementById('input-series-ejercicio');
        const nombre = inputNombre.value.trim();
        const series = parseInt(inputSeries.value) || 3;

        if (!nombre) { inputNombre.focus(); return; }

        const id = Date.now();
        listaEjercicios.push({ id, nombre, series, seriesCompletadas: 0 });
        inputNombre.value = '';
        inputSeries.value = 3;
        renderLista();
    };

    // Permitir Enter en el input de nombre
    const inputNombreEl = document.getElementById('input-nombre-ejercicio');
    if (inputNombreEl) {
        inputNombreEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.addEjercicioLista();
        });
    }

    function renderLista() {
        const ul = document.getElementById('lista-ejercicios-ul');
        const emptyMsg = document.getElementById('lista-empty-msg');
        if (!ul) return;

        ul.innerHTML = '';
        if (listaEjercicios.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'flex';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        listaEjercicios.forEach(ej => {
            const li = document.createElement('li');
            li.className = 'lista-item' + (ej.seriesCompletadas >= ej.series ? ' completado' : '');
            li.dataset.id = ej.id;

            // Series bullets
            let seriesBullets = '';
            for (let i = 0; i < ej.series; i++) {
                const done = i < ej.seriesCompletadas;
                seriesBullets += `<button class="serie-bullet ${done ? 'done' : ''}" onclick="window.toggleSerie(${ej.id}, ${i})" title="Serie ${i+1}">&#10003;</button>`;
            }

            li.innerHTML = `
                <div class="lista-item-top">
                    <span class="lista-nombre">${ej.nombre}</span>
                    <button class="btn-eliminar-ejercicio" onclick="window.eliminarEjercicio(${ej.id})" title="Eliminar">&times;</button>
                </div>
                <div class="lista-series-row">
                    <span class="series-label">Series:</span>
                    <div class="series-bullets">${seriesBullets}</div>
                    <span class="series-count">${ej.seriesCompletadas}/${ej.series}</span>
                </div>
            `;
            ul.appendChild(li);
        });
    }

    window.toggleSerie = function(id, idx) {
        const ej = listaEjercicios.find(e => e.id === id);
        if (!ej) return;
        // Si el índice pulsado es el siguiente a completar -> completar; si ya está done -> deshacer
        if (idx < ej.seriesCompletadas) {
            // Deshacer hasta ese índice
            ej.seriesCompletadas = idx;
        } else {
            // Completar hasta ese índice +1
            ej.seriesCompletadas = idx + 1;
        }
        renderLista();
    };

    window.eliminarEjercicio = function(id) {
        listaEjercicios = listaEjercicios.filter(e => e.id !== id);
        renderLista();
    };

    // Auto-tachar series desde el socket cuando se completa una serie del ejercicio en curso
    socket.on('actualizar-serie-lista', () => {
        if (listaEjercicios.length === 0) return;
        // Tachar la siguiente serie del último ejercicio activo sin completar
        const ej = listaEjercicios.find(e => e.seriesCompletadas < e.series);
        if (ej) {
            ej.seriesCompletadas++;
            renderLista();
        }
    });

    // Lógica de click en pantalla principal
    function seleccionarSeccion(seccion) {
        const moduloPulso = document.getElementById('modulo-pulso');

        if (seccion === 'vestuario') {
            if (sectionVestuario.classList.contains('expanded')) return;
            sectionGym.classList.add('collapsed');
            sectionVestuario.classList.add('expanded');
            btnVolver.style.display = 'block';

            if(gymLayout) gymLayout.style.display = 'none';
            if(moduloPulso) moduloPulso.style.display = 'none';
            if(moduloOutfit) moduloOutfit.style.display = 'flex';

        } else if (seccion === 'gym') {
            if (sectionGym.classList.contains('expanded')) return;
            sectionVestuario.classList.add('collapsed');
            sectionGym.classList.add('expanded');
            btnVolver.style.display = 'block';

            if(moduloOutfit) moduloOutfit.style.display = 'none';
            if(gymLayout) gymLayout.style.display = 'flex';

            // Mostrar ejercicios directamente (tab Gym activo por defecto)
            if(moduloEjercicios) moduloEjercicios.style.display = 'flex';
            if(moduloEjecucion) moduloEjecucion.style.display = 'none';
            if(moduloRunning) moduloRunning.style.display = 'none';

            // Resetear tab activo a Gym
            const tabGymBtn = document.getElementById('tab-gym');
            const tabRunBtn = document.getElementById('tab-running');
            if(tabGymBtn) tabGymBtn.classList.add('active');
            if(tabRunBtn) tabRunBtn.classList.remove('active');

            // Mostrar el pulso integrado en la columna derecha
            if(moduloPulso) moduloPulso.style.display = 'flex';
        }
    }

    sectionVestuario.addEventListener('click', () =>seleccionarSeccion('vestuario'));
    sectionGym.addEventListener('click', () => seleccionarSeccion('gym'));

    btnVolver.addEventListener('click', () => {
        const moduloPulso = document.getElementById('modulo-pulso');

        sectionVestuario.classList.remove('collapsed', 'expanded');
        sectionGym.classList.remove('collapsed', 'expanded');
        btnVolver.style.display = 'none';

        if(moduloOutfit) moduloOutfit.style.display = 'none';
        if(moduloEjercicios) moduloEjercicios.style.display = 'none';
        if(moduloEjecucion) moduloEjecucion.style.display = 'none';
        if(moduloRunning) moduloRunning.style.display = 'none';
        if(gymLayout) gymLayout.style.display = 'none';
        if(moduloPulso) moduloPulso.style.display = 'none';

        socket.emit('salir-ejercicio');
        clearInterval(timerInterval);
        document.body.style.border = 'none';
    });

    // Escuchar eventos del puntero móvil
    socket.on('pointer-move', (datos) => {
        // x e y vendrán como porcentajes (0 a 1) para adaptarse a cualquier resolución de pantalla
        const xPos = datos.x * window.innerWidth;
        const yPos = datos.y * window.innerHeight;
        
        // Limitar dentro de la pantalla
        const realX = Math.max(0, Math.min(window.innerWidth, xPos));
        const realY = Math.max(0, Math.min(window.innerHeight, yPos));

        puntero.style.left = `${realX}px`;
        puntero.style.top = `${realY}px`;
        puntero.style.opacity = '1';
    });

    socket.on('pointer-click', () => {
        // Simular el click en el elemento debajo del puntero
        const rect = puntero.getBoundingClientRect();
        // Coger el centro del puntero
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;

        puntero.style.display = 'none'; // ocultar temporalmente para detectar elemento subyacente
        const elementoDestino = document.elementFromPoint(clickX, clickY);
        puntero.style.display = 'block';

        if (elementoDestino) {
            // Se propaga el evento de click al elemento apuntado. Intentamos .click() directo si lo soporta.
            if (typeof elementoDestino.click === 'function') {
                elementoDestino.click();
            } else {
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: clickX,
                    clientY: clickY
                });
                elementoDestino.dispatchEvent(clickEvent);
            }
            console.log("Click simulado en:", elementoDestino);
        }
        puntero.style.opacity = '1';
    });

    socket.on('pointer-center', () => {
        // Centrar el puntero visualmente
        puntero.style.left = `50%`;
        puntero.style.top = `50%`;
        puntero.style.opacity = '1';
    });
});