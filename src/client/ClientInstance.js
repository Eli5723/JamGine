
import * as PIXI from 'pixi.js'
import * as PIXI_Filters from 'pixi-filters'

import {EntityDictionary} from "../common/EntityDictionary.js"
import {EntityRecord} from "../common/EntityRecord";
import {ActionRecord} from "../common/ActionRecord"
import {NetMap} from "../common/NetMap.js"
import TileCollectionRendered from "../common/TileCollectionRendered.js"

import * as Assets from './Assets.js'

import TypedBuffer from '../TypedBuffer'
import MSG from '../MSGTYPE'
import Net from './Net'
import IdGenerator from '../server/IdGenerator.js';

import * as Entities from './ClientEntities.js'

let packet = TypedBuffer.getInstance();

function BoundingBox(ent1,ent2){
    if (ent1.x < ent2.x + ent2.width &&
        ent1.x + ent1.width > ent2.x &&
        ent1.y < ent2.y + ent2.height &&
        ent1.y + ent1.height > ent2.y)
    return true;

    return false;
} 

class Background extends PIXI.Graphics {
    setSize(width,height){
        this.clear();
        this.beginFill(0x000000);
        this.lineStyle(1, 0xFFFFFF);
        this.drawRect(0, 0, width, height);
    }
}

class ClientInstance {
    constructor(name, width, height, combat,readyState){
        this.name = name;
        this.width = width;
        this.height = height;
        this.combat = combat;
        this.readyState = readyState;

        this.tileCollection = new TileCollectionRendered();

        this.stage = new PIXI.Container();
        this.worldContainer = new PIXI.Container();
        this.worldContainer.sortableChildren=true;
        this.uiContainer = new PIXI.Container();

        this.background = new Background();
        this.background.setSize(this.width,this.height);
        this.worldContainer.addChild(this.background);
        this.worldContainer.addChild(this.tileCollection.container);
       

        this.bottom = new PIXI.TilingSprite(Assets.getTexture("warning"), this.width,11);
        this.bottom.y = this.height;
        this.worldContainer.addChild(this.bottom);

        this.stage.addChild(this.worldContainer);
        this.stage.addChild(this.uiContainer);
        
        //Networked Objects
        this.edict = new EntityDictionary();

        this.networkedEntities = new Map();
        this.clientEntities = new Map();
        this.serverEntities = new Map();

        this.actionQueue = [];

        // Local
        this.effectEntities = new Map();
        this.effectIdGenerator = new IdGenerator();

        if (!this.combat) {
            this.addEffect(["Label",window.innerWidth/2,0,["You have "," dolla bill$ remaining."],["budget"]]);

            let fightSign = new PIXI.Sprite(Assets.getTexture("fight"));
            fightSign.x = width;
            fightSign.y = height/2 -80;
            this.worldContainer.addChild(fightSign);
        }

        this.info = new NetMap();
    }

    static From(data){
         // Instance parameters
        let name = data.readAscii();
        let width = data.readUint16();
        let height = data.readUint16();
        let combat = data.readByte();
        let readyState = data.readByte();
        console.log(`Instance: ${name} | ${width}, ${height} | ${combat}`);

        console.log("Loading Edict");
        let world = new ClientInstance(name, width, height, combat,readyState);
        world.edict.decode(data);
        world.edict.print();

        world.edict.forEach((record,id)=>{
            world.addServerEntity(id,record);
        });

        console.log("Loading Stage");
        world.tileCollection.load(data);
        
        console.log("Loading Info");
        world.info.load(data);

        console.log("Adding State");
        // world.consumeState(data);

        return world;
    }

    serialize(buffer){

        // Continuous State
        buffer.writeUInt16(this.clientEntities.size); // Entity Count 
        this.clientEntities.forEach((entity,id)=>{
            buffer.writeUInt16(id); //ID 
            entity.serialize(buffer); // State; includes size information 
        });

        // Discrete Actions
        buffer.writeByte(this.actionQueue.length);
        for (let i=0;i< this.actionQueue.length; i++){
            this.actionQueue[i].serialize(buffer);
        }
        this.actionQueue = [];
    }

    consumeState(data){
        let count = data.readUint16();
        for (let i = 0; i < count; i++){
            let id = data.readUint16();
            let stateSize = data.readByte();
            let entity = this.serverEntities.get(id);

            // Ignore state updates if we think we own an entity
            if (this.clientEntities.get(id) || entity === undefined) {
                data.advance(stateSize); // Advance by the state size header
            } else {
                entity.instate(data);
            }
        }
    }

    // Actions
    queueAction(record){
        this.actionQueue.push(record);
    }

    // Entities
    addClientEntity(id, record){
        this.edict.set(id, record);
        
        let type = record[0];
        let args = record.slice(1);
        console.log(type);
        let entity = new Entities[type](...args);
        entity.type = Entities[type];
        entity.id = id;
        entity.world = this;

        this.clientEntities.set(id, entity);
        this.networkedEntities.set(id,entity);

        entity.initGraphics(this.worldContainer,this.uiContainer);    
    }

    addServerEntity(id, record){
        if (this.serverEntities.get(id)){
            console.log("ignored duplicate entity");
            return;
        }

        this.edict.set(id, record);
        
        let type = record[0];
        let args = record.slice(1);

        let entity = new Entities[type](...args);
        entity.type = Entities[type];
        entity.id = id;
        entity.world = this;

        this.serverEntities.set(id,entity);
        this.networkedEntities.set(id,entity);

        entity.initGraphics(this.worldContainer,this.uiContainer);        
    }

    removeEntity(id){
        this.edict.delete(id);
        let entity = this.networkedEntities.get(id);

        this.clientEntities.delete(id);
        this.serverEntities.delete(id);
        this.networkedEntities.delete(id);

        if (entity){
            if (entity.sprite);
                entity.sprite.parent.removeChild(entity.sprite);

            return entity;
        }
    }

    addEffect(record){
        let id = this.effectIdGenerator.getId();
        let type = record[0];
        let args = record.slice(1);

        let entity = new Entities[type](...args);
        entity.id = id;

        this.effectEntities.set(id,entity);
        entity.initGraphics(this.worldContainer,this.uiContainer);
    }

    removeEffect(id){
        let entity = this.effectEntities.get(id);
        this.effectEntities.delete(id);
        if (entity){
            if (entity.sprite){
                entity.sprite.parent.removeChild(entity.sprite);
            }
        }
    }

    update(dt, Mouse, Keyboard){
        // Update
        this.clientEntities.forEach((entity,id)=>{
            entity.update(dt,this, Mouse, Keyboard);
        });


        // Collide
        this.collisions();
        this.networkedEntities.forEach((entity,id)=>{
            entity.sprite.x = Math.floor(entity.x);
            entity.sprite.y = Math.floor(entity.y);
        });



        this.effectEntities.forEach((entity)=>{
            entity.update(dt,this);
        });
    }

    collisions(){
        let collideables = [];
        this.networkedEntities.forEach((entity,id)=>{
            if (entity.constructor.flags.Collision)
                collideables.push(entity);
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

    // Debug
    print(){
        this.edict.print();
    }
}

export {ClientInstance};