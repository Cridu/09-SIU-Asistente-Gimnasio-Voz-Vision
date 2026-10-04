import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const btnToggleChat = document.getElementById('btn-toggle-chat');
const chatPanel = document.getElementById('chat-bot-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const chatStatus = document.getElementById('chat-status');

let generator = null;
let isGenerating = false;

// Instruimos a la IA para comportarse
const chatHistory = [
    { role: 'system', content: 'Eres un experto entrenador personal de gimnasio. Das consejos breves, claros y directos en español sobre rutinas y salud.' }
];

// Abrir el chat
btnToggleChat.addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar interactuar con elementos debajo
    if (chatPanel.style.display === 'none' || chatPanel.style.display === '') {
        chatPanel.style.display = 'flex';
        btnToggleChat.style.display = 'none';
        chatInput.focus();
    }
});

// Crear botón dinámico de Cerrar
const btnClose = document.createElement('button');
btnClose.innerText = '✖ Cerrar';
btnClose.style.cssText = "align-self: flex-end; background: none; border: none; font-size: 1rem; color: #8C7B6B; cursor: pointer; margin-bottom: 5px; font-weight: bold;";
chatPanel.insertBefore(btnClose, chatPanel.firstChild);

btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    chatPanel.style.display = 'none';
    btnToggleChat.style.display = 'block';
});

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Pintar burbujas de texto
function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '8px 12px';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.lineHeight = '1.4';
    
    if (isUser) {
        msgDiv.style.alignSelf = 'flex-end';
        msgDiv.style.background = '#A0522D';
        msgDiv.style.color = '#FFF';
        msgDiv.style.borderBottomRightRadius = '2px';
    } else {
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.style.background = '#EAD8C3';
        msgDiv.style.color = '#4A3F35';
        msgDiv.style.borderBottomLeftRadius = '2px';
    }
    
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
}

// Arrancar Transformers.js
async function loadModel() {
    if (generator) return;
    
    chatStatus.innerText = "Descargando IA en tu navegador. Esto puede tardar unos minutos la primera vez...";
    chatStatus.style.color = "#A0522D";
    
    try {
        generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
            progress_callback: (x) => {
                if (x.status === 'downloading' && x.total) { // mostramos progreso si sabemos lo  que falta
                    chatStatus.innerText = `Descargando... ${Math.round((x.loaded / x.total) * 100)}% - No cierres el chat.`;
                }
            }
        });
        chatStatus.innerText = "IA lista. ¡Adelante!";
        chatStatus.style.color = "#3A5A40";
    } catch (e) {
        console.error(e);
        chatStatus.innerText = "Error al descargar o arrancar la IA.";
        chatStatus.style.color = "red";
    }
}

// Proceso de enviar el mensaje, cargar el modelo y recibir la confirmación
async function handleSendMessage() {
    if (isGenerating) return;
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    
    addMessage(text, true);
    chatHistory.push({ role: 'user', content: text });
    
    isGenerating = true;
    btnSendChat.disabled = true;
    chatInput.disabled = true;
    
    if (!generator) {
        await loadModel();
        if (!generator) {
            isGenerating = false;
            btnSendChat.disabled = false;
            chatInput.disabled = false;
            return;
        }
    }

    // Usamos el formato chatML nativo de la familia Qwen (como gpt o tiktoken)
    let prompt = "";
    for (const msg of chatHistory) {
        prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    }
    prompt += `<|im_start|>assistant\n`;

    chatStatus.innerText = "Analizando rutina y pensando respuesta...";

    try {
        const output = await generator(prompt, { 
            max_new_tokens: 200, 
            temperature: 0.7, 
            repetition_penalty: 1.1,
            do_sample: true
        });

        // La salida trae incrustado todo el texto original. Lo cortamos y extraemos lo nuevo
        let fullResponse = output[0].generated_text;
        let responseContent = fullResponse.slice(prompt.length).split('<|im_end|>')[0].trim();
        
        addMessage(responseContent, false);
        chatHistory.push({ role: 'assistant', content: responseContent });
        
        chatStatus.innerText = "IA lista.";
    } catch(e) {
        console.error(e);
        addMessage("Lo siento, tuve un problema interno de IA.", false);
        chatStatus.innerText = "Error.";
    }

    isGenerating = false;
    btnSendChat.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
}

// Asignar los eventos
btnSendChat.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});
