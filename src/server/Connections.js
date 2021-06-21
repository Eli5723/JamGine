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

// Connection Groups
function set_group(socket,groupId){
    // Remove socket from its old group
    if (socket.group){
        socket.group.remove(socket);
    }

    let newGroup = groups[groupId];
  
    if (typeof newGroup == 'undefined')
        console.warn("Attempted to set an invalid group.");

    newGroup.add(socket);
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

// const TIMEOUT = 5000;
// function checkDisconnected(){
//     let now = Date.now();
//     let socket, socketId;
//     for (socketId in sockets){
//         let socket = sockets[socketId];
//         if (now - socket.lastContact > TIMEOUT){
//             socket.terminate();
//         }
//     }
// }
// setInterval(checkDisconnected,TIMEOUT);

function resolveDisconnect(socket){
    if (socket.identity)
        console.log(`User ${socket.identity.username} has logged out.`);

    delete sockets[socket.id];
    socketCount--;
    socket.group.resolveDisconnect(socket);
}

// Exports

let authenticating = new SocketGroup();
let loading = new SocketGroup();
let playing = new SocketGroup();
let groups = {authenticating,loading,playing};

export {
    register,
    get_socket,
    sockets,

    set_group,

    groups,
    authenticating,
    loading,
    playing,
};