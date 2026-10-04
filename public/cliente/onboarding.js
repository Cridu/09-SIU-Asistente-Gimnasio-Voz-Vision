// onboarding.js — Tutorial interactivo para nuevos usuarios

const ONBOARDING_KEY = 'gym_onboarding_done';

const slides = [
    {
        icon: '',
        title: 'Bienvenido al Gym Interactivo',
        desc: 'Esta guía te enseñará cómo usar la aplicación para entrenar de forma inteligente. Usa las flechas para avanzar.',
        visual: 'welcome',
    },
    {
        icon: '',
        title: 'Tu móvil es el mando',
        desc: 'Usa el área central del móvil para mover el puntero en la pantalla del gimnasio. Pulsa CLICK para seleccionar lo que quieras.',
        visual: 'trackpad',
    },
    {
        icon: '',
        title: 'Selección de ejercicios',
        desc: 'Encontrarás una lista de ejercicios disponibles. Al elegir uno, la pantalla te guiará durante todo el proceso.',
        visual: 'gym',
    },
    {
        icon: '',
        title: 'Uso de la cámara',
        desc: 'Al empezar, la cámara de tu móvil detectará tus movimientos automáticamente para contar las repeticiones por ti.',
        visual: 'camera',
    },
    {
        icon: '',
        title: 'Configuración por voz',
        desc: 'Cuando te acerques a una máquina, el sistema te preguntará cuántas series vas a realizar. Responde con el número en voz alta.',
        visual: 'voice',
    },
    {
        icon: '',
        title: 'Sección de Running',
        desc: 'Próximamente podrás registrar tus carreras y ver estadísticas detalladas de tu rendimiento.',
        visual: 'running',
    },
    {
        icon: '',
        title: 'Asistente personal',
        desc: 'En el vestuario dispones de un chat donde puedes resolver dudas sobre rutinas o alimentación.',
        visual: 'chat',
    },
    {
        icon: '',
        title: 'Todo listo',
        desc: 'Ya puedes empezar a entrenar. El móvil controla la pantalla y la cámara hace el seguimiento por ti. ¡A por ello!',
        visual: 'done',
    },
];

const visualHTML = {
    welcome: `
        <div class="ob-visual ob-welcome-anim">
            <div class="ob-logo-text">GYM</div>
            <div class="ob-rings">
                <div class="ob-ring r1"></div>
                <div class="ob-ring r2"></div>
                <div class="ob-ring r3"></div>
            </div>
        </div>`,
    trackpad: `
        <div class="ob-visual">
            <div class="ob-phone-frame">
                <div class="ob-trackpad-demo">
                    <div class="ob-finger-dot"></div>
                    <span>Mando</span>
                </div>
                <div class="ob-btn-row">
                    <div class="ob-mini-btn ob-click">CLICK</div>
                    <div class="ob-mini-btn ob-center">CENTRAR</div>
                </div>
            </div>
        </div>`,
    gym: `
        <div class="ob-visual ob-gym-grid">
            <div class="ob-exercise-card"><span>Sentadilla</span></div>
            <div class="ob-exercise-card"><span>Flexiones</span></div>
            <div class="ob-exercise-card"><span>Piernas</span></div>
            <div class="ob-exercise-card ob-pulse"><span>Más...</span></div>
        </div>`,
    camera: `
        <div class="ob-visual ob-camera-demo">
            <div class="ob-camera-frame">
                <div class="ob-stick-figure">
                    <div class="ob-head"></div>
                    <div class="ob-body"></div>
                    <div class="ob-arms"></div>
                    <div class="ob-legs"></div>
                </div>
            </div>
            <div class="ob-rep-badge">Reps: <span class="ob-counter">0</span></div>
        </div>`,
    voice: `
        <div class="ob-visual ob-voice-demo">
            <div class="ob-mic-wrap">
                <div class="ob-waves-icon">((( )))</div>
                <div class="ob-wave w1"></div>
                <div class="ob-wave w2"></div>
                <div class="ob-wave w3"></div>
            </div>
            <div class="ob-speech-bubble">« Tres series »</div>
        </div>`,
    running: `
        <div class="ob-visual ob-running-demo">
            <div class="ob-running-icon">🏃</div>
            <div class="ob-coming-soon-badge">Próximamente</div>
            <div class="ob-track"></div>
        </div>`,
    chat: `
        <div class="ob-visual ob-chat-demo">
            <div class="ob-chat-msg ob-chat-user">¿Cuántas proteínas necesito?</div>
            <div class="ob-chat-msg ob-chat-bot ob-chat-delay">Depende de tu peso y objetivos.</div>
            <div class="ob-chat-msg ob-chat-user ob-chat-delay2">¿Y para ganar músculo?</div>
        </div>`,
    done: `
        <div class="ob-visual ob-done-anim">
            <div class="ob-check">✓</div>
            <p class="ob-done-text">¡Todo listo!</p>
        </div>`,
};

function createOnboardingOverlay(force = false) {
    // Si ya hay uno sospechoso lo quitamos para evitar duplicados
    const old = document.getElementById('ob-overlay');
    if (old) old.remove();

    // Si ya se vio, no mostrar (salvo que sea forzado)
    if (!force && localStorage.getItem(ONBOARDING_KEY) === '1') return;

    let currentSlide = 0;

    const overlay = document.createElement('div');
    overlay.id = 'ob-overlay';
    overlay.innerHTML = `
        <div id="ob-modal">
            <button id="ob-skip">Saltar guía ×</button>
            <div id="ob-progress-bar"><div id="ob-progress-fill"></div></div>

            <div id="ob-slide-wrap"></div>

            <div id="ob-slide-counter"></div>

            <div id="ob-nav">
                <button id="ob-prev" class="ob-nav-btn">&#8592;</button>
                <div id="ob-dots"></div>
                <button id="ob-next" class="ob-nav-btn">Siguiente &#8594;</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const slideWrap = overlay.querySelector('#ob-slide-wrap');
    const dotsWrap = overlay.querySelector('#ob-dots');
    const progressFill = overlay.querySelector('#ob-progress-fill');
    const counterEl = overlay.querySelector('#ob-slide-counter');
    const btnPrev = overlay.querySelector('#ob-prev');
    const btnNext = overlay.querySelector('#ob-next');
    const btnSkip = overlay.querySelector('#ob-skip');

    // Crear dots
    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'ob-dot';
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
    });

    function renderSlide(idx, dir = 1) {
        const s = slides[idx];
        const entering = document.createElement('div');
        entering.className = 'ob-slide';
        entering.innerHTML = `
            ${visualHTML[s.visual] || ''}
            <div class="ob-slide-icon">${s.icon}</div>
            <h2 class="ob-slide-title">${s.title}</h2>
            <p class="ob-slide-desc">${s.desc}</p>
        `;

        // Salida de todos los slides actuales (evita solapamiento si se navega rápido)
        slideWrap.querySelectorAll('.ob-slide').forEach(existing => {
            existing.classList.add(dir > 0 ? 'ob-exit-left' : 'ob-exit-right');
            setTimeout(() => existing.remove(), 350);
        });

        // Entrada del nuevo
        entering.classList.add(dir > 0 ? 'ob-enter-right' : 'ob-enter-left');
        slideWrap.appendChild(entering);
        setTimeout(() => entering.classList.remove('ob-enter-right', 'ob-enter-left'), 20);

        // Actualizar dots
        dotsWrap.querySelectorAll('.ob-dot').forEach((d, i) => {
            d.classList.toggle('ob-dot-active', i === idx);
        });

        // Progreso
        const pct = ((idx + 1) / slides.length) * 100;
        progressFill.style.width = pct + '%';

        // Contador
        counterEl.textContent = `${idx + 1} / ${slides.length}`;

        // Botones
        btnPrev.style.visibility = idx > 0 ? 'visible' : 'hidden';
        btnNext.textContent = idx === slides.length - 1 ? '¡Empezar! 🚀' : 'Siguiente →';

        // Animación contadora de reps
        if (s.visual === 'camera') startRepCounter(entering);
    }

    function goTo(idx) {
        const dir = idx > currentSlide ? 1 : -1;
        currentSlide = Math.max(0, Math.min(slides.length - 1, idx));
        renderSlide(currentSlide, dir);
    }

    btnNext.addEventListener('click', () => {
        if (currentSlide === slides.length - 1) {
            closeOnboarding();
        } else {
            goTo(currentSlide + 1);
        }
    });

    btnPrev.addEventListener('click', () => goTo(currentSlide - 1));
    btnSkip.addEventListener('click', closeOnboarding);

    // Swipe en móvil
    let touchStartX = 0;
    overlay.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    overlay.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) goTo(currentSlide + (dx < 0 ? 1 : -1));
    });

    function closeOnboarding() {
        localStorage.setItem(ONBOARDING_KEY, '1');
        overlay.classList.add('ob-fade-out');
        setTimeout(() => overlay.remove(), 400);
    }

    renderSlide(0);

    // Animación de entrada del modal
    requestAnimationFrame(() => {
        overlay.querySelector('#ob-modal').classList.add('ob-modal-in');
    });
}

// Animación contadora de reps
function startRepCounter(slide) {
    const el = slide.querySelector('.ob-counter');
    if (!el) return;
    let n = 0;
    const iv = setInterval(() => {
        if (!document.contains(el)) { clearInterval(iv); return; }
        n++;
        el.textContent = n;
        if (n >= 8) clearInterval(iv);
    }, 600);
}

// Exportar para que script.js lo llame tras registro
window.showOnboarding = createOnboardingOverlay;