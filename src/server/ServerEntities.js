const DIRECTIONS = {
    UP : 0b0001,
    RIGHT : 0b0010,
    DOWN : 0b00100,
    LEFT : 0b1000
};
const gravity = 1200;
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
        this.x = data.readInt16();
        this.y = data.readInt16();
        this.grip.instate(data);
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
            World.removeEntity(this.id);
            World.removeTile(this.hitX, this.hitY);
        }
    }
    
    static flags ={
        Collision : true
    }

    onCollide(world,other){
        if (other.type == Player && other.id != this.owner)
            world.ev_die(other.id);
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
    }

    update(dt,World){
        this.ysp += dt * gravity;

        this.xPrev = this.x;
        this.yPrev = this.y;
        this.x += this.xsp*dt;
        this.y += this.ysp*dt;

        let oldxsp = this.xsp;
        let oldysp = this.ysp;

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
            this.ysp = 0;
            this.y = World.height - this.height;
        }

        if (this.x + this.xsp*dt < 0){
            this.xsp = 0;
            this.x = 0;
        }


    }
    
    static flags ={
        Collision : true
    }

    onCollide(world,other){
        // if (other.type == Player && other.id != this.owner)
        //     world.ev_die(other.id);
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


export {Box, Player, ClientCursor, Core}