import IdGenerator from './IdGenerator.js';
import SocketGroup from './SocketGroup.js';
import PacketReciever from './PacketRecieverBuffer.js'

// All Connections
let sockets = {};
let socketCount = 0;
let idGenerator = new IdGenerator();

function register(socket){
    let _id = idGenerator.getId();
    socket.id = _id;
    sockets[_id] = socket;
    socket.connected = true;

    socketCount++;

    //Register Client event handling
    socket.on('message', (e)=>resolveEvent(socket,e));
    socket.on('close', (e)=>resolveDisconnect(socket,e));
}

function get_socket(id){
    return sockets[id];
}

//Message Handling
function resolveEvent(socket,e){
    socket.lastContact = Date.now();
    PacketReciever.setBuffer(e);

    let msgType = PacketReciever.readByte();
    //try {
    socket.group.resolveEvent(socket,msgType,PacketReciever);
    //} catch (e) {
    //}
}

function resolveDisconnect(socket){
    if (socket.identity)
        console.log(`User ${socket.identity.username} has logged out.`);

    delete sockets[socket.id];
    socketCount--;
    socket.group.resolveDisconnect(socket);
}

export {
    register,
    get_socket,
    sockets,
};