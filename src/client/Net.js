import * as PacketReciever from  './PacketReciever.js';
import MSGTYPE from '../MSGTYPE.js'

let socket;
let events;

//Initialize Connection
function connect(_url){
    socket = new WebSocket(_url);
    socket.binaryType = "arraybuffer";    
    socket.onmessage = resolveEvent;
    socket.onclose = ()=>{
        let reload = window.confirm("Lost connection to the game server!\n Try reconnecting?");
        if (reload)
            location.reload();
    }
}

function connected(){
    return socket && (socket.readyState == 1);
}

//Event Handling
events = {};
function on(id,callback){
    events[id] = callback;
}

function resolveEvent(e){
    PacketReciever.setBuffer(e.data);   

    let _event = PacketReciever.readByte();
    if (events[_event])
        events[_event](PacketReciever);
    else
        console.log(`Event "${MSGTYPE.get_key(_event)}" not implemented / registered.`);
};

//Send The packet
function send(buffer){
    socket.send(buffer);
}

export default {
    connect,
    connected,
    on,
    send
}