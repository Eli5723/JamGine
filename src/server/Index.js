import WebSocket from 'ws';
import * as Connections from './Connections.js';

import TypedBuffer from "../TypedBuffer.js";
import MSGTYPE from "../MSGTYPE.js";
import MSG from '../MSGTYPE.js';
import SocketGroup from './SocketGroup.js';

// Test Includes
import {ServerWorld} from "../common/ServerWorld.js"
import {EntityRecord} from "../common/EntityRecord.js";

let packet = new TypedBuffer(1400);

// Server Creation
var wss = new WebSocket.Server({port: 8080});
wss.on('listening',function(){
    let details = wss.address();
    console.log(`SERVER |  Listening on "${details.address}:${details.port}"`);
});

// Client Connection Flow - Client begins authenticating automatically
wss.on('connection',function(ws){
    Connections.register(ws);
    Connections.set_group(ws,"authenticating");
    
    packet.writeByte(MSG.AUTH_BEGIN);
    ws.send(packet.flush());
});

let idIncrementer = 0;
Connections.authenticating.on(MSG.AUTH_TOKEN,(ws,data)=>{
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
    
    console.log(`AUTH | ${identity.username} | logged in.`);
    ws.identity = identity;
    
    // Inform client of auth success
    Connections.set_group(ws,"loading");
    packet.writeByte(MSG.AUTH_SUCCESS);
    ws.send(packet.flush());

    // Send Full state to client
    packet.writeByte(MSGTYPE.FULLSTATE);
    world.fullstate(packet);
    ws.send(packet.flush());
});

// Client load success
Connections.loading.on(MSG.FULLSTATE_SUCCESS, (ws,data)=>{
    // Add client to the match
    console.log(`GAME | ${ws.identity.username} | entered game.`);
    Connections.set_group(ws,"playing");
});

// Game server
const TIMESTEP = 16;
function loop(){
    // Simulation
    let dt = TIMESTEP / 1000.0;
    world.update(dt);

    // Send State to all clients
    packet.writeByte(MSG.STATE);
    world.state(packet);
    Connections.playing.broadcast(packet.flush());

    setTimeout(loop, TIMESTEP);
}

let world = new ServerWorld();

let testRecord = new EntityRecord();
testRecord[0] = "Player";
testRecord[1] = 23;
testRecord[2] = 62;

world.edict.set(23,testRecord);
