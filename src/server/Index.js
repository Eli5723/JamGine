import WebSocket from 'ws';
import * as Connections from './Connections.js';

import TypedBuffer from "../TypedBuffer.js";
import MSGTYPE from "../MSGTYPE.js";
import MSG from '../MSGTYPE.js';
import SocketGroup from './SocketGroup.js';

// Test Includes
import {ServerInstance} from "./ServerInstance.js"
import {EntityRecord} from "../common/EntityRecord.js";
import TileCollection from "../common/TileCollection.js"

let packet = new TypedBuffer(50000);

// Server Creation
var wss = new WebSocket.Server({port: 8080});
wss.on('listening',function(){
    let details = wss.address();
    console.log(`SERVER |  Listening on "${details.address}:${details.port}"`);
});

// Client Connection Flow
wss.on('connection',function(ws){
    Connections.register(ws);
    authenticating.add(ws);
});

// Authentication
let authenticating = new SocketGroup();

authenticating.onAdd = (ws)=>{
    packet.writeByte(MSG.AUTH_BEGIN);
    ws.send(packet.flush());
};

authenticating.on(MSG.AUTH_TOKEN,(ws,data)=>{
    // TODO: reimplement JWT
    let username = data.readAscii();

    //Check if a user is already using that name
    for (let id in Connections.sockets){
        let otherSocket = Connections.sockets[id];
        if (otherSocket.id != ws.id && otherSocket.identity &&otherSocket.identity.username === username){
            console.log("AUTH | Rejected a duplicate login.");
            packet.writeByte(MSGTYPE.AUTH_REJECT);
            packet.writeAscii("A user with that name already exists.");
            ws.send(packet.flush());
            return;
        }
    }
    
    // Successful Login
    let identity = {
        username : username,
        id : idIncrementer++
    };
    ws.identity = identity;
    
    packet.writeByte(MSG.AUTH_SUCCESS);
    ws.send(packet.flush());
    console.log(`AUTH | ${identity.username} | logged in.`);
    authenticating.remove(ws);

    // Send Full state to client
    instance.addPlayer(ws);
});let idIncrementer = 0;

// // Client load success
// Connections.loading.on(MSG.FULLSTATE_SUCCESS, (ws,data)=>{
//     // Add client to the match
//     console.log(`GAME | ${ws.identity.username} | entered game.`);
//     Connections.set_group(ws,"playing");

//     world.createClientEntity(ws,new EntityRecord("Player",0,0));
//     world.createClientEntity(ws,new EntityRecord("ClientCursor"));

//     // Send tiles to player
//     packet.writeByte(MSG.MAP_SET);
//     world.tileCollection.serialize(packet);
//     ws.send(packet.flush());
// });

// Connections.playing.onDisconnect = (socket)=>{
//     // Remove entities owned by the disconnecting client
//     console.log(`GAME | ${socket.identity.username} | clean entities`);
//     world.networkedEntities.forEach((entity)=>{
//         if (entity.owner == socket){
//             world.removeEntity(entity.id);
//         }
//     });
// };

// Game server
let instance = new ServerInstance("Test");
const TIMESTEP = 16;
function loop(){
    // Simulation
    let dt = TIMESTEP / 1000.0;
    instance.run(dt);

    setTimeout(loop, TIMESTEP);
}

let timeout;
instance.players.on(MSG.TILE_SET,(ws,data)=>{
    let x = data.readByte();
    let y = data.readByte();
    let type = data.readByte();


    instance.tileCollection.setTile(x,y,type);

    packet.writeByte(MSG.TILE_SET);
    packet.writeByte(x);
    packet.writeByte(y);
    packet.writeByte(type);

    instance.players.broadcast(packet.flush());

    let bounds = instance.tileCollection.bounds();
});

instance.players.on(MSG.TILE_REMOVE,(ws,data)=>{

    let x = data.readByte();
    let y = data.readByte();
    instance.tileCollection.removeTile(x,y);


    packet.writeByte(MSG.TILE_REMOVE);
    packet.writeByte(x);
    packet.writeByte(y);
    instance.players.broadcast(packet.flush());
});

// setInterval(() => {
//     let testRecord = new EntityRecord();
//     testRecord[0] = "Box";
//     testRecord[1] = Math.floor(Math.random()*500)+84;
//     testRecord[2] = 0;

//     world.createServerEntity(testRecord);
// }, 50);

loop();