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
    toPick = (toPick+1) % teams.length;
    teams[toPick].addPlayer(ws);
});let idIncrementer = 0;
let toPick = 0;



// Test Instance
let starterBase = [{"x":0,"y":24,"type":5},{"x":1,"y":24,"type":5},{"x":2,"y":24,"type":5},{"x":3,"y":24,"type":5},{"x":4,"y":24,"type":5},{"x":5,"y":24,"type":5},{"x":6,"y":24,"type":5},{"x":7,"y":24,"type":5},{"x":8,"y":24,"type":5},{"x":9,"y":24,"type":5},{"x":10,"y":24,"type":5},{"x":11,"y":24,"type":5},{"x":12,"y":24,"type":5},{"x":13,"y":24,"type":5},{"x":14,"y":24,"type":5},{"x":15,"y":24,"type":5},{"x":16,"y":24,"type":5},{"x":17,"y":24,"type":5},{"x":18,"y":24,"type":5},{"x":19,"y":24,"type":6},{"x":20,"y":24,"type":6},{"x":21,"y":24,"type":5},{"x":22,"y":24,"type":5},{"x":23,"y":24,"type":5},{"x":24,"y":24,"type":5},{"x":25,"y":24,"type":5},{"x":26,"y":24,"type":5},{"x":27,"y":24,"type":5},{"x":28,"y":24,"type":5},{"x":29,"y":24,"type":5},{"x":30,"y":24,"type":5},{"x":31,"y":24,"type":5},{"x":32,"y":24,"type":5},{"x":33,"y":24,"type":5},{"x":34,"y":24,"type":5},{"x":35,"y":24,"type":5},{"x":36,"y":24,"type":5},{"x":37,"y":24,"type":5},{"x":38,"y":24,"type":5},{"x":39,"y":24,"type":5}];


let baseTemplate = new TileCollection();
for (let i=0; i < starterBase.length; i++){
    let block = starterBase[i];
    baseTemplate.setTile(block.x,block.y,block.type);
}

function createBuildingInstance(name){
    let instance = new ServerInstance(`${name} Home Instance`,640,640,false);
    baseTemplate.stamp(instance.tileCollection,0,0);

    instance.createServerEntity(new EntityRecord("Core",(instance.width/2) - 12,0,0,0));
    return instance;
}


class Team {
    static idGenerator = new IdGenerator();

    constructor(name){
        this.name = name;
        this.size = 0;
        this.sockets = {};
        this.baseInstance = createBuildingInstance(this.name);
        this.currentInstance = this.baseInstance;

        this.id = this.constructor.idGenerator.getId();
        this.enableInstance();
        console.log(`Team | ${this.name} | Created`);
    }

    enableInstance(){
        this.baseInstance.readyState = false;
        enableInstance(this.baseInstance);
    }

    reset(){
        this.baseInstance = createBuildingInstance(this.name);
    }

    addPlayer(socket){
        this.sockets[socket.id] = socket;
        this.size++;
        socket.team = this;
        this.currentInstance.addPlayer(socket);
        this.inform();
    }

    gatherPlayers(){
        for (let id in this.sockets){
            let ws = this.sockets[id];
            if (ws.readyState == 1){
                this.currentInstance.addPlayer(ws);
            } else {
                delete this.sockets[id];
            }
        }
    }

    resolveDisconnect(socket){
        this.removePlayer(socket);
    }

    removePlayer(socket){
        let player = this.sockets[socket.id];
        if (player) {
            delete this.sockets[socket.id];

            if (player)
                this.size--;

            this.inform();
        }
    }

    setInstance(instance){
        this.currentInstance = instance;
    }

    inform(){
        packet.writeByte(MSG.TEAM_INFO);
        packet.writeAscii(this.name);

        let socks = Object.keys(this.sockets);
        let count = socks.length;
        packet.writeByte(count);
        for (let id in this.sockets) {
            packet.writeAscii(this.sockets[id].identity.username);
        }

        this.broadcast(packet.flush());
    }

    broadcast(data){
        for (let id in this.sockets){
            let ws = this.sockets[id];
            if (ws.readyState == 1){
                ws.send(data);
            }
        }
    }
}

let activeInstances = [];
function enableInstance(instance){
    activeInstances.push(instance);
    instance.active = true;
    console.log("Enabled: "+ instance.name);
}

function disableInstance(instance){
    activeInstances = activeInstances.filter((inst)=>inst != instance);
    instance.active = false;
}


let teams = [];
teams.push(new Team("Team A"));
teams.push(new Team("Team B"));

function createCombatInstance(leftTeam, rightTeam){
    let combatInstance = new ServerInstance("Combat 1",1280,640, true);
    leftTeam.setInstance(combatInstance);
    rightTeam.setInstance(combatInstance);

    let leftInstance = leftTeam.baseInstance;
    let rightInstance = rightTeam.baseInstance;

    // Copy Maps
    leftInstance.tileCollection.stamp(combatInstance.tileCollection,0,0);
    rightInstance.tileCollection.stampFlipped(combatInstance.tileCollection,40,0,40);

    let leftEnts = leftInstance.getTeamEntities(false);
    let rightEnts = rightInstance.getTeamEntities(true);

    leftEnts.forEach(element => {
        let ent = combatInstance.createServerEntity(element);
        ent.team = leftTeam;
    
    });

    rightEnts.forEach(element =>{
        let ent = combatInstance.createServerEntity(element);
        ent.team = rightTeam;
    });

    // Combine Players
    let players = leftInstance.purge();
    players.push(...rightInstance.purge());

    for (let i=0; i < players.length; i++){
        combatInstance.addPlayer(players[i]);
    }

    // Set up win condition
    combatInstance.onResult = (winner,loser)=>{
        winner.baseInstance.grantDolla(20);
        winner.setInstance(winner.baseInstance);
        winner.enableInstance();

        loser.reset();
        loser.setInstance(loser.baseInstance);
        loser.enableInstance();
        
        combatInstance.purge();
        disableInstance(combatInstance);
        loser.gatherPlayers();
        winner.gatherPlayers();

        packet.writeByte(MSGTYPE.INCOME_STATEMENT);
        packet.writeByte(1);
        packet.writeAscii("Victory");
        packet.writeByte(20);
        winner.broadcast(packet.flush());
    };
    return combatInstance;
}

const TIMESTEP = 16;
function loop(){
    // Simulation
    let dt = TIMESTEP / 1000.0;
    
    // Run Instances
    for (let i=0; i < activeInstances.length; i++){
        activeInstances[i].run(dt);
    }

    // Matchmaking
    if (activeInstances.length == 2){
        if (activeInstances[0].readyState && activeInstances[1].readyState){
            let left = activeInstances.pop();
            let right = activeInstances.pop();
            let combat =createCombatInstance(teams[0],teams[1]);
            enableInstance(combat);
        }
    }

    setTimeout(loop, TIMESTEP);
}

loop();