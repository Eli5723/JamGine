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
import IdGenerator from './IdGenerator.js';

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
    activeInstances[0].addPlayer(ws);
});let idIncrementer = 0;
let toPick = 0;



// Test Instance
let starterBase = [{"x":0,"y":24,"type":5},{"x":0,"y":25,"type":5},{"x":1,"y":24,"type":5},{"x":1,"y":25,"type":5},{"x":2,"y":24,"type":5},{"x":2,"y":25,"type":5},{"x":3,"y":24,"type":5},{"x":3,"y":25,"type":5},{"x":4,"y":24,"type":5},{"x":4,"y":25,"type":5},{"x":5,"y":24,"type":5},{"x":5,"y":25,"type":5},{"x":6,"y":24,"type":5},{"x":6,"y":25,"type":5},{"x":7,"y":24,"type":5},{"x":7,"y":25,"type":5},{"x":8,"y":24,"type":5},{"x":8,"y":25,"type":5},{"x":9,"y":24,"type":5},{"x":9,"y":25,"type":5},{"x":10,"y":24,"type":5},{"x":10,"y":25,"type":5},{"x":11,"y":24,"type":5},{"x":11,"y":25,"type":5},{"x":12,"y":24,"type":5},{"x":12,"y":25,"type":5},{"x":13,"y":24,"type":5},{"x":13,"y":25,"type":5},{"x":14,"y":24,"type":5},{"x":14,"y":25,"type":5},{"x":15,"y":24,"type":5},{"x":15,"y":25,"type":5},{"x":16,"y":24,"type":5},{"x":16,"y":25,"type":5},{"x":17,"y":24,"type":5},{"x":17,"y":25,"type":5},{"x":18,"y":24,"type":5},{"x":18,"y":25,"type":5},{"x":19,"y":24,"type":6},{"x":19,"y":25,"type":5},{"x":20,"y":24,"type":6},{"x":20,"y":25,"type":5},{"x":21,"y":24,"type":5},{"x":21,"y":25,"type":5},{"x":22,"y":24,"type":5},{"x":22,"y":25,"type":5},{"x":23,"y":24,"type":5},{"x":23,"y":25,"type":5},{"x":24,"y":24,"type":5},{"x":24,"y":25,"type":5},{"x":25,"y":24,"type":5},{"x":25,"y":25,"type":5},{"x":26,"y":24,"type":5},{"x":26,"y":25,"type":5},{"x":27,"y":24,"type":5},{"x":27,"y":25,"type":5},{"x":28,"y":24,"type":5},{"x":28,"y":25,"type":5},{"x":29,"y":24,"type":5},{"x":29,"y":25,"type":5},{"x":30,"y":24,"type":5},{"x":30,"y":25,"type":5},{"x":31,"y":24,"type":5},{"x":31,"y":25,"type":5},{"x":32,"y":24,"type":5},{"x":32,"y":25,"type":5},{"x":33,"y":24,"type":5},{"x":33,"y":25,"type":5},{"x":34,"y":24,"type":5},{"x":34,"y":25,"type":5},{"x":35,"y":24,"type":5},{"x":35,"y":25,"type":5},{"x":36,"y":24,"type":5},{"x":36,"y":25,"type":5},{"x":37,"y":24,"type":5},{"x":37,"y":25,"type":5},{"x":38,"y":24,"type":5},{"x":38,"y":25,"type":5},{"x":39,"y":24,"type":5},{"x":39,"y":25,"type":5}];


let baseTemplate = new TileCollection();
for (let i=0; i < starterBase.length; i++){
    let block = starterBase[i];
    baseTemplate.setTile(block.x,block.y,block.type);
}



class Team {
    static idGenerator = new IdGenerator();

    constructor(name){
        this.name = name;
        this.size = 0;
        this.sockets = {};
        this.baseInstance = new ServerInstance(`${this.name} Home Instance`,640,640);
        baseTemplate.stamp(this.baseInstance.tileCollection,0,0);
        this.id = this.constructor.idGenerator.getId();

        console.log(`Team | ${this.name} | Created`);
    }

    addPlayer(socket){
        this.sockets[socket.id] = socket;
        this.size++;
    }

    removePlayer(socket){
        let player = this.sockets[socket.id];
        delete this.sockets[socket.id];

        if (player)
            this.size--;
    }

    enableInstance(){
        activeInstances.push(this.baseInstance);
    }
}

let activeInstances = [];

let teams = [];
teams.push(new Team("Team A"));
teams.push(new Team("Team B"));

activeInstances.push(teams[0].baseInstance);
activeInstances.push(teams[1].baseInstance);

setTimeout(()=>{
    let left = activeInstances.pop();
    let right = activeInstances.pop();
    let combined = mergeInstances(left,right);
    activeInstances.push(combined);
},10000); 


function mergeInstances(leftInstance, rightInstance){
    let newInstance = new ServerInstance("Combat 1",1280,640);

    // Copy Maps
    leftInstance.tileCollection.stamp(newInstance.tileCollection,0,0);
    rightInstance.tileCollection.stampFlipped(newInstance.tileCollection,40,0,40);

    newInstance.createServerEntity(new EntityRecord("Core",(newInstance.width/4) - 12,0,0,0));
    newInstance.createServerEntity(new EntityRecord("Core",(newInstance.width/4)*3 - 12,0,0,0));

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