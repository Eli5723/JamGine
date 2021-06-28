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
    let instance = toPick++ % activeInstances.length;
    activeInstances[instance].addPlayer(ws);
});let idIncrementer = 0;
let toPick = 0;

// Test Instance
let starterBase = [{"x" : 10,"y":20,"type":5},{"x":10,"y":21,"type":5},{"x":10,"y":22,"type":5},{"x":10,"y":23,"type":5},{"x":10,"y":24,"type":5},{"x":10,"y":25,"type":5},{"x":11,"y":21,"type":5},{"x":11,"y":24,"type":5},{"x":11,"y":25,"type":5},{"x":12,"y":24,"type":5},{"x":12,"y":25,"type":5},{"x":13,"y":24,"type":5},{"x":13,"y":25,"type":5},{"x":14,"y":24,"type":5},{"x":14,"y":25,"type":5},{"x":15,"y":24,"type":5},{"x":15,"y":25,"type":5},{"x":16,"y":24,"type":5},{"x":16,"y":25,"type":5},{"x":17,"y":24,"type":5},{"x":17,"y":25,"type":5},{"x":18,"y":24,"type":5},{"x":18,"y":25,"type":5},{"x":19,"y":24,"type":5},{"x":19,"y":25,"type":5},{"x":20,"y":24,"type":5},{"x":20,"y":25,"type":5},{"x":21,"y":24,"type":5},{"x":21,"y":25,"type":5},{"x":22,"y":24,"type":5},{"x":22,"y":25,"type":5},{"x":23,"y":24,"type":5},{"x":23,"y":25,"type":5},{"x":24,"y":24,"type":5},{"x":24,"y":25,"type":5},{"x":25,"y":24,"type":5},{"x":25,"y":25,"type":5},{"x":26,"y":24,"type":5},{"x":26,"y":25,"type":5},{"x":27,"y":24,"type":5},{"x":27,"y":25,"type":5},{"x":28,"y":21,"type":5},{"x":28,"y":24,"type":5},{"x":28,"y":25,"type":5},{"x":29,"y":20,"type":5},{"x":29,"y":21,"type":5},{"x":29,"y":22,"type":5},{"x":29,"y":23,"type":5},{"x":29,"y":24,"type":5},{"x":29,"y":25,"type":5}];

let activeInstances = [];

activeInstances.push(new ServerInstance("Test",640,640));
activeInstances.push(new ServerInstance("Test 2",640,640));


let inst = activeInstances[0];

for (let i=0; i < starterBase.length; i++){
    let block = starterBase[i];
    inst.setTile(block.x,block.y,block.type);
}

let record = new EntityRecord("Core",inst.width/2 - 12,0,0,0);
inst.createServerEntity(record);

// setTimeout(()=>{
//     let left = activeInstances.pop();
//     let right = activeInstances.pop();
//     let combined = mergeInstances(left,right);
//     activeInstances.push(combined);
// },10000); 

function mergeInstances(leftInstance, rightInstance){
    let newInstance = new ServerInstance("Combat 1",1280,640);

    // Copy Maps
    leftInstance.tileCollection.forEach((x,y,type)=>{
        newInstance.setTile(x,y,type);
    });
    rightInstance.tileCollection.forEach((x,y,type)=>{
        newInstance.setTile(x+40,y,type);
    });

    console.log("Merged!");
    // Combine Players
    let players = leftInstance.purge();
    players.push(...rightInstance.purge());

    for (let i=0; i < players.length; i++){
        newInstance.addPlayer(players[i]);
    }

    return newInstance;
}

const TIMESTEP = 16;
function loop(){
    // Simulation
    let dt = TIMESTEP / 1000.0;
    
    for (let i=0; i < activeInstances.length; i++){
        activeInstances[i].run(dt);
    }

    setTimeout(loop, TIMESTEP);
}

loop();