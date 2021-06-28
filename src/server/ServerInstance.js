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

function BoundingBox(ent1,ent2){
    if (ent1.x < ent2.x + ent2.width &&
        ent1.x + ent1.width > ent2.x &&
        ent1.y < ent2.y + ent2.height &&
        ent1.y + ent1.height > ent2.y)
    return true;

    return false;
}

class ServerInstance {
    constructor(name, width, height){
        this.name = name;
        this.players = new SocketGroup();

        this.idGen = new IdGenerator();
        this.edict = new EntityDictionary();
        this.authority = new Map();
        
        this.networkedEntities = new Map();
        this.serverEntities = new Map();
        this.clientEntities = new Map();

        this.tileCollection = new TileCollection();

        this.width = width;
        this.height = height;

        this.tileWidth = width/16;
        this.tileHeight = height/16;

        this.info = new NetMap();
        this.info.set("budget",50);

        this.players.on(MSGTYPE.FULLSTATE_SUCCESS,this.playerLoaded.bind(this));
        
        this.players.on(MSGTYPE.STATE,this.msg_STATE.bind(this));
        this.players.on(MSGTYPE.TILE_SET,this.msg_TILE_SET.bind(this));
        this.players.on(MSGTYPE.TILE_REMOVE,this.msg_TILE_REMOVE.bind(this));

        this.players.onDisconnect = this.removePlayer.bind(this);
        console.log(`INSTANCE | ${this.name} | Created`);
        
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

        return removed;
    }

    playerLoaded(ws,data){
        console.log(`INSTANCE | ${this.name} | Added ${ws.identity.username}`);
        this.createClientEntity(ws,new EntityRecord("Player",0,0));
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


                if (BoundingBox(ent1,ent2)){
                    ent1.onCollide(this,ent2);
                    ent2.onCollide(this,ent1);
                }
            }
        }
    }

    outOfBounds(entity){
        if (entity.x < 0 || entity.x + entity.width > this.width || entity.y < 0 || entity.y + entity.height > this.height)
            return true;
        return false;
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
        this.serverEntities.set(id,entity);
        this.networkedEntities.set(id,entity);

        // Add record to edict
        this.edict.set(id,record);

        // Broadcast Creation to clients
        packet.writeByte(MSGTYPE.ENT_ADD_SERVERSIDE);
        packet.writeUInt16(id);
        record.serialize(packet);
        this.players.broadcast(packet.flush());
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
    }

    removeEntity(id){
        this.edict.delete(id);
        let entity = this.networkedEntities.get(id);

        this.clientEntities.delete(id);
        this.serverEntities.delete(id);
        this.networkedEntities.delete(id);

        packet.writeByte(MSGTYPE.ENT_REM);
        packet.writeUInt16(id);
        this.players.broadcast(packet.flush());
    }

    clientActions(){

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
        if (!removed)
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
    ev_die(id){
        let ownerws = this.authority.get(id);
        this.removeEntity(id);

        if (ownerws){
            this.createClientEntity(ownerws,new EntityRecord("Player",0,0));
        }
        
    }

    // Networking
    fullstate(buffer){
        // Instance parameters
        packet.writeAscii(this.name);
        packet.writeUInt16(this.width);
        packet.writeUInt16(this.height);

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
            let x = action[1];
            let y = action[2];
            let xsp = action[3];
            let ysp = action[4];
            let owner = action[5];
            this.createServerEntity(new EntityRecord("Box",x,y,xsp,ysp,owner));
        }
        
    }

    msg_TILE_SET(ws,data){
        let x = data.readByte();
        let y = data.readByte();
        let type = data.readByte();

        if (x < 0 || y < 0|| x >= this.tileWidth || y >= this.tileHeight)
        return;
    
        packet.writeByte(MSGTYPE.INFO_SET);
        this.info.encodeSet(packet, "budget",this.info.get("budget")-1);
        this.players.broadcast(packet.flush());

        this.setTile(x,y,type);
    
        let bounds = this.tileCollection.bounds();
    }

    msg_TILE_REMOVE(ws,data){
        let x = data.readByte();
        let y = data.readByte();
        let removed = this.tileCollection.removeTile(x,y);
        if (!removed)
            return;
        
        packet.writeByte(MSGTYPE.INFO_SET);
        this.info.encodeSet(packet, "budget",this.info.get("budget")+1);
        this.players.broadcast(packet.flush());


        packet.writeByte(MSGTYPE.TILE_REMOVE);
        packet.writeByte(x);
        packet.writeByte(y);
        this.players.broadcast(packet.flush());
    }
}

export {ServerInstance}; 