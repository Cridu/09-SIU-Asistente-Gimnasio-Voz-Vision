const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'users.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === SISTEMA DE LOGIN LOCAL BASADO EN TEXTO CLARO ===
function readUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }));
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data).users;
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2), 'utf8');
}

// API Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (user && user.password === password) {
        return res.json({ success: true, message: 'Inicio de sesión exitoso' });
    } else {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
});

// API Register
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

    const users = readUsers();
    const userExists = users.some(u => u.username === username);

    if (userExists) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }

    users.push({ username, password });
    writeUsers(users);

    return res.json({ success: true, message: 'Registro exitoso' });
});

io.on('connection', (socket) => {
    console.log('Alguien se ha conectado: ' + socket.id);

    // Escucha mensajes del cliente y manda a la pantalla
    socket.on('enviar-a-pantalla', (datos) => {
        io.emit('mensaje-para-pantalla', datos);
    });

    socket.on('pointer-move', (datos) => {
        io.emit('pointer-move', datos);
    });

    socket.on('pointer-click', () => {
        io.emit('pointer-click');
    });

    socket.on('pointer-center', () => {
        io.emit('pointer-center');
    });

    // Evento de shake del acelerómetro del móvil → se reenvía a la pantalla
    socket.on('shake', () => {
        io.emit('shake');
    });

    // Nuevos eventos para el modo Gimnasio
    socket.on('seleccionar-ejercicio', (ejercicio) => {
        io.emit('ejercicio-seleccionado', ejercicio);
    });

    socket.on('configurar-series', (num) => {
        io.emit('series-configuradas', num);
    });

    socket.on('serie-terminada', () => {
        io.emit('actualizar-serie');
    });

    socket.on('serie-iniciada', () => {
        io.emit('serie-iniciada');
    });

    socket.on('rep-actualizada', (repCount) => {
        io.emit('rep-actualizada', repCount);
    });

    socket.on('terminar-maquina', () => {
        io.emit('maquina-terminada');
    });

    socket.on('salir-ejercicio', () => {
        io.emit('salir-ejercicio');
    });

    socket.on('usuario-detectado', () => {
        io.emit('usuario-detectado');
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});