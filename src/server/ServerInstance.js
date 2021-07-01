import {EntityDictionary} from "../common/EntityDictionary.js"
import {EntityRecord} from "../common/EntityRecord.js";
import {ActionRecord} from "../common/ActionRecord.js"
import {NetMap} from "../common/NetMap.js"

import TileCollection from "../common/TileCollection.js"

import IdGenerator from "./IdGenerator.js"

import PacketRecieverBuffer from "./PacketRecieverBuffer.js";
import TypedBuffer from "../TypedBuffer.js"

import * as Entities from "./ServerEntities.js"

import MSGTYPE from "../MSGTYPE.js"
import SocketGroup from "./SocketGroup.js"

let packet = new TypedBuffer(50000);

const DIRECTIONS = {
    UP : 0b0001,
    RIGHT : 0b0010,
    DOWN : 0b00100,
    LEFT : 0b1000
};

function BoundingBox(ent1,ent2){
    if (ent1.x < ent2.x + ent2.width &&
        ent1.x + ent1.width > ent2.x &&
        ent1.y < ent2.y + ent2.height &&
        ent1.y + ent1.height > ent2.y)
    return true;
    return false;
}

class ServerInstance {
    constructor(name, width, height, combat){
        this.name = name;
        this.players = new SocketGroup();

        this.idGen = new IdGenerator();
        this.edict = new EntityDictionary();
        this.authority = new Map();
        
        this.networkedEntities = new Map();
        this.serverEntities = new Map();
        this.clientEntities = new Map();

        this.entityTypes = {};
        for (let type in Entities){
            this.entityTypes[type] = {};
        }

        this.combat = combat;

        this.tileCollection = new TileCollection();
        this.active;

        this.width = width;
        this.height = height;

        this.tileWidth = width/16;
        this.tileHeight = height/16;

        this.info = new NetMap();
        this.info.set("budget",10);

        this.players.on(MSGTYPE.FULLSTATE_SUCCESS,this.playerLoaded.bind(this));
        
        this.players.on(MSGTYPE.STATE,this.msg_STATE.bind(this));
        this.players.on(MSGTYPE.TILE_SET,this.msg_TILE_SET.bind(this));
        this.players.on(MSGTYPE.TILE_REMOVE,this.msg_TILE_REMOVE.bind(this));
        this.players.on(MSGTYPE.PURCHASE_ITEM,this.msg_PURCHASE_ITEM.bind(this));

        this.players.on(MSGTYPE.READY,this.msg_READY.bind(this));
        this.players.on(MSGTYPE.UNREADY,this.msg_UNREADY.bind(this));

        this.players.onDisconnect = this.removePlayer.bind(this);
        console.log(`INSTANCE | ${this.name} | Created | ${this.combat ? "Combat" : "Building"}`);
        
        this.onResult = (winner, loser)=>{};
    }

    run(dt){
        this.update(dt);
        
        packet.writeByte(MSGTYPE.STATE);
        this.state(packet);
        this.players.broadcast(packet.flush());
    }

    addPlayer(ws){
        this.players.add(ws);
        packet.writeByte(MSGTYPE.FULLSTATE);
        this.fullstate(packet);
        ws.send(packet.flush());
    }

    removePlayer(ws){
        console.log(`instance | ${this.name} | ${ws.identity.username} removed`);
        this.networkedEntities.forEach((entity)=>{
            if (entity.owner == ws){
                this.removeEntity(entity.id);
            }
        });

        return ws;
    }

    purge(){
        let removed = [];
        this.players.forEach((ws)=>{
            removed.push(ws);
            this.removePlayer(ws);
        })

        this.players.clear();

        return removed;
    }

    playerLoaded(ws,data){
        console.log(`INSTANCE | ${this.name} | Added ${ws.identity.username}`);

        this.trySpawn(ws);
        this.createClientEntity(ws,new EntityRecord("ClientCursor"));
    }

    //Simulation
    update(dt){
        this.serverEntities.forEach((entity,id)=>{
            entity.update(dt,this);
        });

        this.collisions();
    }

    collisions(){
        let collideables = [];
        this.networkedEntities.forEach((entity,id)=>{
            if (entity.constructor.flags.Collision)
                collideables.push(entity)
        });

        for (let i = 0; i < collideables.length; i++){
            for (let j = i+1; j < collideables.length; j++){
                let ent1 = collideables[i];
                let ent2 = collideables[j];

                let normalX = (ent1.x + ent1.width) - (ent2.x + ent2.width);
                let normalY = (ent1.y + ent1.height) - (ent2.y + ent2.height);

                if (BoundingBox(ent1,ent2)){
                    ent1.onCollide(this,ent2);
                    ent2.onCollide(this,ent1);
                }
            }
        }
    }

    obstruction(rect){
        for (let [id, entity] of this.networkedEntities){
            if (entity.constructor.flags.Collision){
                if (BoundingBox(rect,entity))
                    return true;
            }
        }

    }

    outOfBounds(entity){
        if (entity.x < 0 || entity.x + entity.width > this.width || entity.y < 0 || entity.y + entity.height > this.height)
            return true;
        return false;
    }

    // Misc
    playSound(name){
        packet.writeByte(MSGTYPE.SOUND_PLAY);
        packet.writeAscii(name);
        this.players.broadcast(packet.flush());
    }

    playEffect(record){
        packet.writeByte(MSGTYPE.ENT_EFFECT);
        record.serialize(packet);
        this.players.broadcast(packet.flush());
    }

    // Entity Handling
    createServerEntity(record){
        // Create local copy of  Entity
        let id = this.idGen.getId();
        let type = record[0];
        let args = record.slice(1);

        let entity = new Entities[type](...args);
        entity.type = Entities[type];
        entity.id = id;
        entity.instance = this;
        this.serverEntities.set(id,entity);
        this.networkedEntities.set(id,entity);

        // Add to type map
        this.entityTypes[type][id] = entity;

        // Add record to edict
        this.edict.set(id,record);

        // Broadcast Creation to clients
        packet.writeByte(MSGTYPE.ENT_ADD_SERVERSIDE);
        packet.writeUInt16(id);
        record.serialize(packet);
        this.players.broadcast(packet.flush());

        return entity;
    }

    createTeamEntity(team,record){
        let ent = this.createServerEntity(record);
        ent.team = team;
    }

    createClientEntity(ws,record){
        let id = this.idGen.getId();
        let type = record[0];
        let args = record.slice(1);

        let entity = new Entities[type](...args);
        entity.type = Entities[type];
        entity.id = id;
        entity.owner = ws;
        this.clientEntities.set(id,entity);
        this.networkedEntities.set(id,entity);

        // Authorize the client to control the entity
        this.authority.set(id,ws);

        // Add to type map
        this.entityTypes[type][id] = entity;

        // Add record to edict
        this.edict.set(id,record);

        // Broadcast Creation to other clients
        packet.writeByte(MSGTYPE.ENT_ADD_SERVERSIDE);
        packet.writeUInt16(id);
        record.serialize(packet);
        this.players.broadcastExclude(packet.getData(), ws);
        //Broadcast Creation to owner client
        packet.overwriteHeader(MSGTYPE.ENT_ADD_CLIENTSIDE);
        ws.send(packet.flush());

        return entity;
    }

    removeEntity(id){
        this.edict.delete(id);
        let entity = this.networkedEntities.get(id);
        
        if (entity){
            // Add to type map
            delete this.entityTypes[entity.type.name][entity.id];

            this.clientEntities.delete(id);
            this.serverEntities.delete(id);
            this.networkedEntities.delete(id);

            packet.writeByte(MSGTYPE.ENT_REM);
            packet.writeUInt16(id);
            this.players.broadcast(packet.flush());

            return entity;
        }
    }

    removeEntityDie(id){
        this.edict.delete(id);
        let entity = this.networkedEntities.get(id);
        
        if (entity) {
            // Add to type map
            delete this.entityTypes[entity.type.name][entity.id];

            this.clientEntities.delete(id);
            this.serverEntities.delete(id);
            this.networkedEntities.delete(id);

            packet.writeByte(MSGTYPE.ENT_DIE);
            packet.writeUInt16(id);
            this.players.broadcast(packet.flush());

            return entity;
        }
    }

    clientActions(){

    }

    getEntityType(type){
        return this.entityTypes[type];
    }

    getEntityTeam(type,team){
        for (let id in this.entityTypes[type]){
            let ent = this.entityTypes[type][id];
            if (ent.team == team)
                return ent;
        }
    }

    getEntityRandom(type){
        let typeMap = this.entityTypes[type];
        let keys = Object.keys(typeMap);

        return typeMap[ keys[ Math.floor( keys.length * Math.random() ) ] ];
    }

    getTeamEntities(flip){
        let teamEntities = [];
        this.networkedEntities.forEach((ent,id)=>{
            if (!flip) {
                switch(ent.type){
                    case Entities.Core:
                        teamEntities.push(new EntityRecord("Core", ent.x,ent.y,0,0));
                    break;
                    case Entities.Cannon:
                        teamEntities.push(new EntityRecord("Cannon",ent.x,ent.y,0,0));
                    break;
                }
            } else {
                switch(ent.type){
                    case Entities.Core:
                        teamEntities.push(new EntityRecord("Core", (this.width*2) - ent.x - ent.width,ent.y,0,0));
                    break;
                    case Entities.Cannon:
                        teamEntities.push(new EntityRecord("Cannon",(this.width*2) - ent.x - ent.width,ent.y,0,0, ent.facing*-1));
                    break;
                }
            }
        });
        return teamEntities;
    }

    // Stage Modification
    setTile(x,y,type){
        packet.writeByte(MSGTYPE.TILE_SET);
        packet.writeByte(x);
        packet.writeByte(y);
        packet.writeByte(type);
        this.players.broadcast(packet.flush());

        this.tileCollection.setTile(x,y,type);
    }

    removeTile(x,y){
        let removed = this.tileCollection.removeTile(x,y);
        if (removed === undefined)
            return;
        
        packet.writeByte(MSGTYPE.INFO_SET);
        this.info.encodeSet(packet, "budget",this.info.get("budget")+1);
        this.players.broadcast(packet.flush());


        packet.writeByte(MSGTYPE.TILE_REMOVE);
        packet.writeByte(x);
        packet.writeByte(y);
        this.players.broadcast(packet.flush());
    }

    // Events
    trySpawn(ws,x = 0,y = 0){
        if (!this.active)
            return;
            
        if (this.combat){
            let spawn = this.getEntityTeam("Core",ws.team);
            if (spawn){
                this.createClientEntity(ws ,new EntityRecord("Player", spawn.x + 4, spawn.y + 4, "Bow", "Dirt", "Hand", "Poke", "Pick"));
            } else {
                // Create a ghost, check if there are any living players
                this.createClientEntity(ws ,new EntityRecord("Ghost", x, y));
                let players = this.entityTypes.Player;
                let survivors = false;
                let id;
                for (id in players){
                    if (players[id].owner.team == ws.team){
                       survivors = true;
                    }
                }
                if (survivors){
                    console.log("There are still survivors");
                } else {
                    
                    let losingTeam = ws.team;
                    let winningTeam = players[id].owner.team; // the winning team still has a survivng player
                    console.log(losingTeam.name + " | " + winningTeam.name);
                    this.end(winningTeam,losingTeam);
                }   
            }
        } else {
            let spawn = this.getEntityRandom("Core");
            if (spawn) {
                this.createClientEntity(ws,new EntityRecord("Player", spawn.x + 4, spawn.y + 4, "Block","Flight","Hand","Poke","Flight","Bow","Pick"));    
            } else {
                this.createClientEntity(ws,new EntityRecord("Player", 0, 0, "Block","Flight","Hand","Poke","Flight","Bow","Pick"));
            }
        }
    }

    end(winner,loser){
        this.onResult(winner,loser);
    }

    ev_die(id){
        let ent = this.removeEntityDie(id);

        if (ent){
            if (ent.type == Entities.Player){      
                if (ent.holding)
                    ent.holding.holder = 0;
                
                let ownerws = this.authority.get(id);
                setTimeout(()=>{
                    this.trySpawn(ownerws,ent.x,ent.y);
                },2000);
            } else if (ent.type == Entities.Core){
                if (!this.combat)
                    this.createServerEntity(new EntityRecord("Core",(this.width/2) - 12,0,0,0));
            } else if (ent.type == Entities.Cannon){
                if ((!this.combat)){
                    packet.writeByte(MSGTYPE.INFO_SET);
                    this.info.encodeSet(packet, "budget",this.info.get("budget")+10);
                    this.players.broadcast(packet.flush());
                }
            }
        }
    }

    // Networking
    fullstate(buffer){
        // Instance parameters
        packet.writeAscii(this.name);
        packet.writeUInt16(this.width);
        packet.writeUInt16(this.height);
        packet.writeByte(this.combat);
        packet.writeByte(this.readyState);

        // Instance State
        this.edict.serialize(buffer); // Edict 
        this.tileCollection.serialize(buffer);
        this.info.serialize(buffer);
        this.state(buffer); // Enttiy State
    }

    state(buffer){
        buffer.writeUInt16(this.networkedEntities.size); // Entity Count 
        
        this.networkedEntities.forEach((entity,id)=>{ 
            buffer.writeUInt16(id); //ID 
            entity.serialize(buffer); // State; includes size information 
        });
    }

    msg_FULLSTATE_SUCCESS(ws,data){
        console.log(`GAME | ${ws.identity.username} | entered game.`);
        this.players.add(ws);

        world.createClientEntity(ws,new EntityRecord("Player",0,0));
        world.createClientEntity(ws,new EntityRecord("ClientCursor"));

        // Send tiles to player
        packet.writeByte(MSGTYPE.MAP_SET);
        world.tileCollection.serialize(packet);
        ws.send(packet.flush());
    }

    msg_STATE(ws,data){
        let count = data.readUInt16();
        for (let i = 0; i < count; i++){
            let id = data.readUInt16();
            let stateSize = data.readByte();
            let entity = this.networkedEntities.get(id);
            if (entity === undefined || this.authority.get(id) != ws) {
                data.advance(stateSize);
                continue;
            }

            entity.instate(data);
        }

        let actionCount = data.readByte();
        for (let i = 0; i < actionCount; i++){
            let action = ActionRecord.From(data);
            this.performAction(action);
        }
        
    }

    performAction(record){
        switch (record[0]){
            case "fire": {
                let x = record[1];
                let y = record[2];
                let xsp = record[3];
                let ysp = record[4];
                let owner = record[5];
                this.createServerEntity(new EntityRecord("Box",x,y,xsp,ysp,owner));
            } break;

            case "slash": {
                this.playEffect(new EntityRecord("Slash",record[1], record[2], record[3]));

            } break;

            case "grab": {
                let ent = this.networkedEntities.get(record[1]);
                if (ent){
                    this.networkedEntities.forEach((toGrab,id)=>{
                        if (toGrab.constructor.flags.Grabbable){
                            if (BoundingBox(ent,toGrab)) {
                                if (ent.holding)
                                ent.holding.holder = 0;

                                toGrab.holder = ent;
                                ent.holding = toGrab;
                                return;
                            }
                        }
                    });
                }
            } break;
            case "drop": {
                let ent = this.networkedEntities.get(record[1]);
                if (ent){
                    this.networkedEntities.forEach((toGrab,id)=>{
                        if (toGrab.constructor.flags.Grabbable && toGrab.holder == ent){
                            toGrab.holder = 0;
                        }
                    });
                }
            } break;

            case "use": {
                let ent = this.networkedEntities.get(record[1]);
                if (ent){
                    this.networkedEntities.forEach((toUse,id)=>{
                        if (toUse.constructor.flags.Useable){
                            if (BoundingBox(ent,toUse))
                                toUse.use(record[2],record[3],record[4]);
                        }
                    });
                }
            } break;

            case "die": {
                this.ev_die(record[1]);
            } break;

            default:
                console.log(`Unknown client action: ${record[0]}`);
            break;
        }
    }

    // Ready state
    readyUp() {
        this.readyState = true;
        packet.writeByte(MSGTYPE.READY);
        this.players.broadcast(packet.flush());
    }

    unready(){
        this.readyState = false;
        packet.writeByte(MSGTYPE.UNREADY);
        this.players.broadcast(packet.flush());
        console.log("unready");
    }

    spendDolla(value){
        packet.writeByte(MSGTYPE.INFO_SET);
        this.info.encodeSet(packet, "budget",this.info.get("budget") - value);
        this.players.broadcast(packet.flush());

        this.unready();
    }

    grantDolla(value){
        packet.writeByte(MSGTYPE.INFO_SET);
        this.info.encodeSet(packet, "budget",this.info.get("budget") + value);
        this.players.broadcast(packet.flush());

        this.unready();
    }

    // Build hphase specific
    msg_TILE_SET(ws,data){
        let x = data.readByte();
        let y = data.readByte();
        let type = data.readByte();

        if (x < 0 || y < 0|| x >= this.tileWidth || y >= this.tileHeight)
            return;
        let existing = this.tileCollection.getTile(x,y);
        if (existing == 6 || existing !== undefined)
            return;
        if (this.obstruction({x:x*16,y:y*16, width:16, height:16}))
            return;
    
        this.spendDolla(1);

        this.setTile(x,y,type);
    
        let bounds = this.tileCollection.bounds();
    }

    msg_TILE_REMOVE(ws,data){
        let x = data.readByte();
        let y = data.readByte();
        

        if (!this.combat) { // Build mode
            if (x < 0 || y < 0|| x >= this.tileWidth || y >= this.tileHeight)
            return;
            if (this.tileCollection.getTile(x,y) == 6)
            return;
        
            let removed = this.tileCollection.removeTile(x,y);
            if (removed === undefined)
                return;
            
            this.grantDolla(1);

            packet.writeByte(MSGTYPE.TILE_REMOVE);
            packet.writeByte(x);
            packet.writeByte(y);
            this.players.broadcast(packet.flush());
        } else {
            if (x < 0 || y < 0|| x >= this.tileWidth || y >= this.tileHeight)
            return;
            let existing = this.tileCollection.getTile(x,y);
            if (existing == 6)
                return;
        
            let removed = this.tileCollection.removeTile(x,y);
            if (removed === undefined)
                return;

            packet.writeByte(MSGTYPE.TILE_REMOVE);
            packet.writeByte(x);
            packet.writeByte(y);
            this.players.broadcast(packet.flush());
        }
    }

    msg_PURCHASE_ITEM(ws,data){
        this.createServerEntity(new EntityRecord("Cannon",this.width/2 - 18,0,0,0));
        this.playSound("./sounds/kaching.ogg");

        packet.writeByte(MSGTYPE.INFO_SET);
        this.info.encodeSet(packet, "budget",this.info.get("budget")-10);
        this.players.broadcast(packet.flush());
    }

    msg_READY(ws,data){
        if (this.info.get("budget") >= 0) {
            this.readyUp();
        }
    }

    msg_UNREADY(ws,data){
        this.unready();
    }
}

export {ServerInstance}; 