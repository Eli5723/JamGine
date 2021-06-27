import * as PIXI from 'pixi.js';
import TypedBuffer from '../TypedBuffer.js'
const packet = TypedBuffer.getInstance();
import Net from './Net.js'
import MSGTYPE from '../MSGTYPE'
import * as Assets from './Assets.js'
console.log(Assets);
import Mouse from "./Mouse.js"

import {ActionRecord} from '../common/ActionRecord.js'

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

class Grip {
    constructor(xOffset,yOffset,angle,entity){
        this.equipment=[];
        this.xOffset = xOffset;
        this.yOffset = yOffset;
        this.entity = entity;
        this.selected = -1;
        this.angle = angle;
        this.sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    }

    pickup(equipment){
        this.equipment.push(equipment);
    }

    drop(equipment){
        this.equipment = this.equipment.filter( (e)=>e != equipment);
        this.selected = this.equipment.length-1;
    }

    equip(index){
        this.unequip();

        if (this.equipment[index]){
            this.selected = index;
            let equipping = this.equipment[index];
            equipping.equip(this);
            let tex = Assets.getTexture(equipping.constructor.Texture);
            this.sprite.texture = tex ? tex : PIXI.Texture.EMPTY;
        }
    }

    unequip(){
        let currentEquip = this.equipment[this.selected];

        if (currentEquip){
            currentEquip.unequip();
        }
    }

    equipNext(equipment){
        this.equip((this.selected + 1) % this.equipment.length);
    }

    equipPrevious(equipment){
        let slot = (this.selected - 1);
        if (slot < 0){
            slot = this.equipment.length - 1;
        }

        this.equip(slot);
    }

    primary(){
        if (this.selected > -1)
            this.equipment[this.selected].primary(this);
    }

    update(dt){
        if (this.selected > -1)
            this.equipment[this.selected].update(dt,this);
    }

    secondary(){
        if (this.selected > -1)
            this.equipment[this.selected].secondary(this);
    }

    get x(){
        return this.entity.x + this.xOffset;
    }

    get y(){
        return this.entity.y + this.yOffset;
    }

    instate(data){
        this.angle = data.readFloat32();

        this.sprite.rotation = this.angle;

        let spriteId = data.readByte();
        if (spriteId != 255)
            this.sprite.texture = Assets.getTextureId(spriteId);
        else
            this.sprite.texture = PIXI.Texture.EMPTY;
    }

    serialize(buffer){
        buffer.writeFloat32(this.angle);

        let held = this.equipment[this.selected];
        if (held){
            buffer.writeByte(this.sprite.texture.id);
        } else {
            buffer.writeByte(0xFF);
        }
    }
}

class Equipment {
    constructor(){
    }

    static Texture = "";

    primary(grip){}
    secondary(grip){}
    reload(grip){}
}

class Tool_Bow {
    constructor(){
        this.lastfired = 0;
        this.fireRate = 500;
    }
    primary(grip){
        if (Date.now() > this.lastfired + this.fireRate){
            const power = 800;
            grip.entity.world.queueAction(new ActionRecord("fire",grip.x, grip.y,Math.cos(grip.angle)*power,Math.sin(grip.angle)*power, grip.entity.id));
            this.lastfired = Date.now();
        }
    }
    secondary(grip){}
    reload(grip){}
    unequip(){}
    equip(){}
    update(dt){}
    static Texture = "./bow.png";
}

class Tool_Flight {
    constructor(){
        this.lastfired = 0;
        this.fireRate = 1000;
    }
    primary(grip){
    }
    secondary(grip){}
    reload(grip){}
    unequip(){}
    equip(){}
    update(dt,grip){
        let entity = grip.entity;
        let dir = Math.atan2((grip.y-Mouse.y),(grip.x-Mouse.x)) + Math.PI;
        let speed = Math.sqrt(entity.xsp*entity.xsp + entity.ysp*entity.ysp);

        let accel = Math.max(speed - 500,500);
        //const accel = 500;

        let dampenFactor = 1-(4*dt);

        grip.entity.xsp += (Math.cos(dir)*accel*dt/dampenFactor);
        grip.entity.ysp += -1200*dt + Math.sin(dir)*accel*dt;
    }
    static Texture = "./arrow.png";
}

class Tool_Block {
    constructor(){
        this.lastfired = 0;
        this.fireRate = 1000;
        this.selectedType = 5;

        this.ghostblock = new PIXI.Sprite(Assets.getTexture("./brick.png"));
        this.ghostblock.alpha = .5;

    }
    primary(grip){
        let tx = Math.floor(Mouse.x/16);
        let ty = Math.floor(Mouse.y/16);

        if (grip.entity.world.tileCollection.getTile(tx,ty) != this.selectedType && tx > -1 && ty > -1){
            packet.writeByte(MSGTYPE.TILE_SET);
            packet.writeByte(tx);
            packet.writeByte(ty);
            packet.writeByte(this.selectedType);
            
            Net.send(packet.flush());
        }
    }
    secondary(grip){
        let tx = Math.floor(Mouse.x/16);
        let ty = Math.floor(Mouse.y/16);

        if (grip.entity.world.tileCollection.getTile(tx,ty)){
            packet.writeByte(MSGTYPE.TILE_REMOVE);
            packet.writeByte(tx);
            packet.writeByte(ty);
            Net.send(packet.flush());
        }
    }
    reload(grip){

    }

    unequip(){
        console.log("unequip")
        if (this.ghostblock.parent)
            this.ghostblock.parent.removeChild(this.ghostblock);
    }
    equip(grip){
        grip.entity.world.worldContainer.addChild(this.ghostblock);
    }
    update(dt){
        this.ghostblock.x = Math.floor(Mouse.x/16)*16;
        this.ghostblock.y = Math.floor(Mouse.y/16)*16;
    }
    static Texture = "./brick.png";
}

const GRAVITY = 1200;
const DAMPEN = 4;
class Player {
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height =15;    
        this.xsp = 500;
        this.ysp = 20;
        this.coyote =0;
        
        this.grip = new Grip(0,0,0,this);
        this.grip.pickup(new Tool_Block(this));
        this.grip.pickup(new Tool_Bow(this));
        this.grip.pickup(new Tool_Flight(this));
        this.state = [];
    }

    static flags = {
        Collision : 0b1111
    }

    update(dt, World, Mouse, Keyboard){
        
        // Actions
        if (Mouse.down){
            this.grip.primary();
        }

        if (Mouse.right){
            this.grip.secondary();
        }
        this.grip.update(dt);

        this.grip.angle = Math.atan2((this.y-Mouse.y),(this.x-Mouse.x)) + Math.PI;
        this.equipmentSprite.rotation = Math.atan2((this.y-Mouse.y),(this.x-Mouse.x)) + Math.PI;

        if (Keyboard.keys.equipPrevious.pressed)
            this.grip.equipPrevious();

        if (Keyboard.keys.equipNext.pressed)
            this.grip.equipNext();

        const ACCEL = 1200;
        const ACCELREVERSE = 1600;
        const MAXSPEED = 300;

        // Movement Input
        this.coyote -= dt;
        if (Keyboard.keys.right.down && this.xsp < MAXSPEED){

            if (this.xsp >= 0)
                this.xsp += ACCEL * dt
            else
                this.xsp += ACCELREVERSE * dt;
        } 
        if (Keyboard.keys.left.down && this.xsp > -MAXSPEED){
            if (this.xsp < 0)
                this.xsp -= ACCEL * dt
            else
                this.xsp -= ACCELREVERSE * dt;
        }

        if (!Keyboard.keys.right.down && !Keyboard.keys.left.down)
            this.xsp*= 1- (DAMPEN * dt);

        this.ysp += GRAVITY*dt;

        if (Keyboard.keys.jump.pressed && this.coyote > 0){
            this.ysp = -400;
            this.coyote =0;
        }

        if (this.x + this.xsp*dt + 16 > World.width){
            this.xsp = 0;
            this.x = World.width - 16;
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }

        // Apply movement TODO: handle automatically
        this.xPrev = this.x;
        this.yPrev = this.y;
        this.x += this.xsp * dt; World,
        this.y += this.ysp * dt;

        this.collision = 0;
        World.tileCollection.collide(this);
        if (this.y + this.ysp*dt + 16 > World.height){
            this.ysp = 0;
            this.y = World.height - 16;
            this.collision |= DIRECTIONS.DOWN;
        } else if (this.y + this.ysp*dt < 0){
            this.ysp = 0;
            this.y = 0;
            this.collision |= DIRECTIONS.UP;
        }

        if (this.collision & DIRECTIONS.DOWN) {
            this.coyote = .2;
        }

        this.sprite.parent.pivot.x = Math.floor(this.x - window.innerWidth/2);
        this.sprite.parent.pivot.y = Math.floor(this.y - window.innerHeight/2);
    }

    serialize(buffer){
        buffer.writeByte(9); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
        this.grip.serialize(buffer);
    }


    onCollide(world,other){
    }

    instate(data){
        let ox = this.x;
        let oy = this.y;
        this.x = data.readInt16();
        this.y = data.readInt16();
        this.xsp = this.x - ox;
        this.ysp = this.y - oy;
        this.sprite.x = this.x;
        this.sprite.y = this.y;

        this.grip.instate(data);
    }

    initGraphics(worldContainer,uiContainer){
        this.sprite = PIXI.Sprite.from("./cat.png");
        worldContainer.addChild(this.sprite);

        this.equipmentSprite = this.grip.sprite;
        this.equipmentSprite.x = 16;
        this.equipmentSprite.anchor.x = .5;
        this.equipmentSprite.anchor.y = .5;
        this.equipmentSprite.scale.x = 1;
        this.equipmentSprite.scale.y = 1;
        
        this.sprite.addChild(this.equipmentSprite);
    }
}

class Box {
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.xsp = 0;
        this.ysp = 0;
        this.width = 16;
        this.height = 16;
    }

    static flags = {
        Collision : true
    }

    serialize(buffer){
        buffer.writeByte(4); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
    }

    onCollide(world,other){
    }

    instate(data){
        let ox = this.x;
        let oy = this.y;

        this.x = data.readInt16();
        this.y = data.readInt16();
        
        this.xsp = this.x - ox;
        this.ysp = this.y - oy;

        this.sprite.x = this.x;
        this.sprite.y = this.y;

        let rot = Math.atan2(this.ysp*100,this.xsp*100);// - Math.PI*5/4;
        this.sprite.rotation = rot ? rot : 0;
    }

    initGraphics(worldContainer,uiContainer){
        this.sprite = PIXI.Sprite.from("./bowarrow.png");
        this.sprite.pivot.x = 29;
        this.sprite.pivot.y = 7;
        worldContainer.addChild(this.sprite);
    }
}

class ClientCursor {
    constructor(){
        this.x = 0;
        this.y = 0;
        this.selectedType = 5;
    }

    static flags = {
        // None
    }

    update(dt, World, Mouse, Keyboard){
        this.x = Mouse.x;
        this.y = Mouse.y;
    }

    serialize(buffer){
        buffer.writeByte(4); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
    }

    instate(data){
        this.x = data.readInt16();
        this.y = data.readInt16();
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }

    initGraphics(worldContainer,uiContainer){
        this.sprite = PIXI.Sprite.from("./cursor.png");
        this.sprite.zIndex = 55;
        worldContainer.addChild(this.sprite);
        this.sprite.scale.x = .5;
        this.sprite.scale.y = .5;
    }
}

// Effects
class TileShard{
    constructor(x,y,sprite){
        this.x = x;
        this.y = y;
        this.sprite = sprite;
        this.x+=8;
        this.y+=8;
        this.sprite.pivot.x = 8;
        this.sprite.pivot.y = 8;
        this.xsp = Math.random()*160 - 80;
        this.ysp = -100;
    }

    update(dt, World){
        this.ysp += 600*dt;

        this.x += this.xsp*dt;
        this.y += this.ysp*dt;

        this.sprite.x=this.x;
        this.sprite.y=this.y;
        this.sprite.angle += 720*dt;

        if (this.y > 1500)
            World.removeEffect(this.id);
    }
    initGraphics(worldContainer,uiContainer){
        worldContainer.addChild(this.sprite);

    }
}

class Label {
    constructor(x,y,template,keys){
        this.x = x;
        this.y = y;
        this.template = template;
        this.keys = keys;
        this.sprite = new PIXI.Text(this.template[0],{fill:"white",align:"center"});
        this.sprite.anchor.set(.5,0);
    }

    update(dt, World){
        this.sprite.x=this.x;
        this.sprite.y=this.y;

        let str = this.template[0];
        for (let i = 1; i < this.template.length; i++){
            str += World.info.get(this.keys[i-1]);
            str += this.template[i];
        }

        this.sprite.text = str;
    }
    initGraphics(worldContainer,uiContainer){
        uiContainer.addChild(this.sprite);
    }
}

export {
    Player,
    Box,
    ClientCursor,
    TileShard,
    Label
};
