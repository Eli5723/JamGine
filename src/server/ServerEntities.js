import {EntityRecord} from "../common/EntityRecord.js"

const DIRECTIONS = {
    UP : 0b0001,
    RIGHT : 0b0010,
    DOWN : 0b00100,
    LEFT : 0b1000
};
const gravity = 1200;
const terminalVelocity = 999;
class Player {
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.xsp = 64;
        this.ysp = 20;
        this.aimAngle = 0;
        this.grip = new Grip();
        this.holding = 0;
    }

    update(dt){
        this.ysp += dt * gravity;

        this.x += this.xsp*dt;
        this.y += this.ysp*dt;

        if (this.y + 16 > 600) {
            this.y = 600-16;
            this.ysp = -300;
        }
        
        if (this.x < 0){
            this.x = 0;
            this.xsp = this.xsp*-1;
        }

        if (this.x + 16 > 600) {
            this.x = 600 - 16;
            this.xsp = this.xsp*-1;
        }
    }
    
    static flags ={
        Collision : true
    }

    onCollide(world,other){
        //world.removeEntity(this.id);
    }

    serialize(buffer){
        buffer.writeByte(9); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
        this.grip.serialize(buffer);
    }

    instate(data){
        let ox = this.x;
        let oy = this.y;

        this.x = data.readInt16();
        this.y = data.readInt16();
        
        this.xsp = this.x - ox;
        this.ysp = this.y - oy;

        this.grip.instate(data);
    }
}

class Ghost {
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.xsp = 0;
        this.ysp = 0;
    }

    update(dt){
        this.x += this.xsp*dt;
        this.y += this.ysp*dt;
    }
    
    static flags ={
    }

    onCollide(world,other){
        //world.removeEntity(this.id);
    }

    serialize(buffer){
        buffer.writeByte(4); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
    }

    instate(data){
        let ox = this.x;
        let oy = this.y;

        this.x = data.readInt16();
        this.y = data.readInt16();
        
        this.xsp = this.x - ox;
        this.ysp = this.y - oy;
    }
}


class Grip {
    constructor(){
        this.angle = 0;
        this.spriteId = 0;
    }

    instate(data){
        this.angle = data.readFloat32();
        this.spriteId = data.readByte();
    }

    serialize(buffer){
        buffer.writeFloat32(this.angle);
        buffer.writeByte(this.spriteId);
    }
}

class Box {
    constructor(x,y,xsp,ysp,owner){
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 4;
        this.xsp = xsp;
        this.ysp = ysp;
        this.owner = owner;
        this.collision = 0;
    }

    update(dt,World){
        this.ysp += dt * gravity;

        this.xPrev = this.x;
        this.yPrev = this.y;
        this.x += this.xsp*dt;
        this.y += this.ysp*dt;

        if (World.outOfBounds(this))
            World.removeEntity(this.id);

        let oldxsp = this.xsp;
        let oldysp = this.ysp;

        this.collision = 0;
        World.tileCollection.collide(this);

        if (this.collision){
            World.removeEntityDie(this.id);

            if (World.combat) {
                let tile = World.tileCollection.getTile(this.hitX,this.hitY);
                if (tile < 6){
                    // World.removeTile(this.hitX, this.hitY);
                    if (tile > 1) {
                        // World.removeTile(this.hitX, this.hitY);
                        World.setTile(this.hitX,this.hitY, tile - 1);
                    } else {
                        World.removeTile(this.hitX, this.hitY);
                    }
                }
            }
        }
    }
    
    static flags ={
        Collision : true
    }

    onCollide(world,other){
        if (other.id == this.owner)
            return;

        if (other.type == Player){
            world.ev_die(other.id);
            world.removeEntity(this.id);
        } else if (other.type == Core || other.type == Cannon) {
            world.playSound("./sounds/clink.ogg");
            world.removeEntity(this.id);
            other.holder = 0;
            other.xsp += this.xsp;
        }
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
}

class Core {
    constructor(x,y,xsp,ysp){
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.xsp = xsp;
        this.ysp = ysp;
        this.collision = 0;
        this.holder;
        this.useRate = 500;
        this.lastUsed = 0;
    }

    update(dt,World){
        if (this.holder){
            this.x = this.holder.x;
            this.y = this.holder.y - this.height/2;
            this.xsp = this.holder.xsp;
            this.ysp = this.holder.ysp;
            this.collision = 0;
            return;
        }

        this.ysp += dt * gravity;
        this.ysp = Math.min(this.ysp, terminalVelocity);

        this.xPrev = this.x;
        this.yPrev = this.y;
        this.x += this.xsp*dt;
        this.y += this.ysp*dt;
        this.xsp *= 1 - (25*dt);
        let wasColliding = this.collision;
        this.collision = 0;
        World.tileCollection.collide(this);

        if (this.x + this.xsp*dt + this.width > World.width){
            this.xsp = 0;
            this.x = World.width - this.width;
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }

        if (this.y + this.ysp*dt + this.height > World.height){
            World.ev_die(this.id);
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }

        if (wasColliding != this.collision)
            World.playSound("./sounds/clink.ogg");
    }
    
    static flags ={
        Collision : true,
        Useable : true
    }

    onCollide(world,other){
        if (other.type == Core && !this.holder) {
            if (this.x > other.x+other.width/2)
            this.x = other.x + other.width;
            else {
                this.x = other.x - this.width;
            }
        }
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

    use(x,y){
        if (Date.now() > this.lastUsed + this.useRate){
            const power = 500;
            let diff = (x - this.x);
            if (diff < 0) {
                this.xsp -= power;
            } else {
                this.xsp += power;
            }
            this.instance.playSound("./sounds/clink.ogg");
            this.lastUsed = Date.now();
        }
    }
}

class Cannon {
    constructor(x,y,xsp,ysp, facing = 1){
        this.x = x;
        this.y = y;
        this.width = 38;
        this.height = 21;
        this.xsp = xsp;
        this.ysp = ysp;
        this.collision = 0;
        this.holder;
        this.facing = facing;

        this.lastfired = 0;
        this.fireRate = 200;
    }

    update(dt,World){
        if (this.holder){
            this.x = this.holder.x;
            this.y = this.holder.y - this.height;
            this.xsp = this.holder.xsp;
            this.ysp = this.holder.ysp;
            if (this.xsp > 0) {
                this.facing = 1;
            } else if (this.xsp < 0) {
                this.facing = -1;
            }


            this.collision = 0;
            return;
        }

        this.ysp += dt * gravity;
        this.ysp = Math.min(this.ysp, terminalVelocity);

        this.xPrev = this.x;
        this.yPrev = this.y;
        this.x += this.xsp*dt;
        this.y += this.ysp*dt;

            this.xsp *= 1 - (25*dt);
        let wasColliding = this.collision;
        this.collision = 0;
        World.tileCollection.collide(this);

        if (this.x + this.xsp*dt + this.width > World.width){
            this.xsp = 0;
            this.x = World.width - this.width;
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }

        if (this.y + this.ysp*dt + this.height > World.height){
            World.ev_die(this.id);
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }

        if (wasColliding != this.collision)
            World.playSound("./sounds/clink.ogg");
    }
    
    static flags ={
        Grabbable : true,
        Useable : true,
        Collision : true
    }

    use(x,y){
        if (Date.now() > this.lastfired + this.fireRate){
            const power = 800;
            let angle = Math.atan2((this.y-y),(this.x-x)) + Math.PI;
            let xsp = power*Math.cos(angle);
            let ysp = power*Math.sin(angle);

            if (this.facing == 1) {
                this.instance.createServerEntity(new EntityRecord("Box",this.x+36,this.y+3,xsp,ysp,this.id));
            } else {
                this.instance.createServerEntity(new EntityRecord("Box",this.x,this.y+3,xsp,ysp,this.id));
            }
            this.lastfired = Date.now();
        }
    }

    onCollide(world,other){
        if (other.type != Player) {
            let diff = this.x + this.width/2 > other.x+other.width/2;
            if (diff >0)
                this.xsp = 200;
            else if (diff < 0)
                this.xsp = -200;
            else if (diff==0) {
                this.x-=1;
            }

            // if (this.x > other.x+other.width/2) {
            //     this.x = other.x + other.width;
            // } else {
            //     this.x = other.x - this.width;
            // }
        }
    }

    serialize(buffer){
        buffer.writeByte(5); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
        buffer.writeByte(this.facing);
    }

    instate(data){
        this.x = data.readInt16();
        this.y = data.readInt16();
        this.facing = data.readByte();
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }
}

class Slingshot {
    constructor(x,y,xsp,ysp, facing = 1){
        this.x = x;
        this.y = y;
        this.width = 38;
        this.height = 21;
        this.xsp = xsp;
        this.ysp = ysp;
        this.collision = 0;
        this.holder;
        this.facing = facing;

        this.lastfired = 0;
        this.fireRate = 200;
    }

    update(dt,World){
        if (this.holder){
            this.x = this.holder.x;
            this.y = this.holder.y - this.height;
            this.xsp = this.holder.xsp;
            this.ysp = this.holder.ysp;
            if (this.xsp > 0) {
                this.facing = 1;
            } else if (this.xsp < 0) {
                this.facing = -1;
            }


            this.collision = 0;
            return;
        }

        this.ysp += dt * gravity;
        this.ysp = Math.min(this.ysp, terminalVelocity);

        this.xPrev = this.x;
        this.yPrev = this.y;
        this.x += this.xsp*dt;
        this.y += this.ysp*dt;

            this.xsp *= 1 - (25*dt);
        let wasColliding = this.collision;
        this.collision = 0;
        World.tileCollection.collide(this);

        if (this.x + this.xsp*dt + this.width > World.width){
            this.xsp = 0;
            this.x = World.width - this.width;
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }

        if (this.y + this.ysp*dt + this.height > World.height){
            World.ev_die(this.id);
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }

        if (wasColliding != this.collision)
            World.playSound("./sounds/clink.ogg");
    }
    
    static flags ={
        Grabbable : true,
        Useable : true,
        Collision : true
    }

    use(x, y, id){
        if (Date.now() > this.lastfired + this.fireRate){
            const power = 800;
            let angle = Math.atan2((this.y-y),(this.x-x)) + Math.PI;
            let xsp = power*Math.cos(angle);
            let ysp = power*Math.sin(angle);

            if (this.facing == 1) {
                this.instance.createServerEntity(new EntityRecord("Box",this.x+36,this.y+3,xsp,ysp,this.id));
            } else {
                this.instance.createServerEntity(new EntityRecord("Box",this.x,this.y+3,xsp,ysp,this.id));
            }
            this.lastfired = Date.now();
        }
    }

    onCollide(world,other){
        if (other.type != Player) {
            let diff = this.x + this.width/2 > other.x+other.width/2;
            if (diff >0)
                this.xsp = 200;
            else if (diff < 0)
                this.xsp = -200;
            else if (diff==0) {
                this.x-=1;
            }

            // if (this.x > other.x+other.width/2) {
            //     this.x = other.x + other.width;
            // } else {
            //     this.x = other.x - this.width;
            // }
        }
    }

    serialize(buffer){
        buffer.writeByte(5); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
        buffer.writeByte(this.facing);
    }

    instate(data){
        this.x = data.readInt16();
        this.y = data.readInt16();
        this.facing = data.readByte();
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }
}


class ClientCursor {
    constructor(){
        this.x = 0;
        this.y = 0;
    }
        
    static flags ={
    }

    onCollide(world,other){
        //world.removeEntity(this.id);
    }

    serialize(buffer){
        buffer.writeByte(4); // Size header is required
        buffer.writeInt16(this.x);
        buffer.writeInt16(this.y);
    }

    instate(data){
        this.x = data.readInt16();
        this.y = data.readInt16();
    }
}


export {Box, Player, ClientCursor, Core, Cannon, Ghost}