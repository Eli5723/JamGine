const TILESIZE = 16;
const NORMAL_OFFSET = .001;
const DIRECTIONS = {
    UP : 0b0001,
    RIGHT : 0b0010,
    DOWN : 0b00100,
    LEFT : 0b1000
};


class TileCollection {
    constructor(){
        this.columns = {};
        this.count = 0;
    }

    // Modification
    getTile(x,y){
        let column = this.columns[x];
        if (column){
            return column[y];
        }
    }

    setTile(x,y,type){
        let removed;
        let column = this.columns[x];
        if (!column){
            this.columns[x] = {};
        } else {
            removed = this.getTile(x,y);
        }

        if (!this.columns[x][y])
            this.count++;
        this.columns[x][y] = type;
        return removed;
    }

    removeTile(x,y){
        let removed = this.getTile(x,y);
        delete this.columns[x][y];
        if (removed)
            this.count--;

        return removed;
    }


    // Collision
    // Object is presumed to have xsp, ysp, xprev, yprev
    collide(object){
        let row, column, value;
        column = Math.floor(object.x / TILESIZE);
        row    = Math.floor(object.y / TILESIZE);
        value  = this.getTile(column, row);
        if (value !== undefined) this.blockCollide(object,column,row);

        //Top Right
        row    = Math.floor(object.y / TILESIZE);
        column = Math.floor((object.x+object.width) / TILESIZE);
        value = this.getTile(column, row);
        if (value !== undefined) this.blockCollide(object,column,row);

        //Bottom Left
        column = Math.floor((object.x) / TILESIZE);
        row    = Math.floor((object.y + object.height) / TILESIZE);
        value  = this.getTile(column, row);
        if (value !== undefined) this.blockCollide(object,column,row);

        //Bottom Right
        row    = Math.floor((object.y + object.height) / TILESIZE);
        column = Math.floor((object.x + object.width) / TILESIZE);
        
        value = this.getTile(column, row);
        if (value !== undefined) this.blockCollide(object,column,row);
    }

    blockCollide(object, column, row){
        if (this.collideTop(object,row) ||
        this.collideLeft(object,column) ||
        this.collideRight(object,column) ||
        this.collideBottom(object,row)) {
            object.hitX = column;
            object.hitY = row;
        }
    }

    collideBottom(object,row,yOff=TILESIZE){
        let bottom = row*TILESIZE+yOff;
        
        if (object.y < bottom && object.yPrev>=bottom){
            object.ysp = 0;
            object.y = bottom + NORMAL_OFFSET;
            object.collision = object.collision |  DIRECTIONS.UP;
            return true;
        } return false;
    }

    collideTop(object,row,yOff=0){
        let top = (row*TILESIZE)+yOff;
        if (object.y + object.height > top && object.yPrev+object.height <=top){
            object.ysp = Math.min(0,object.ysp);
            object.y = top - object.height - NORMAL_OFFSET;
            object.collision = object.collision | DIRECTIONS.DOWN;
            return true;
        }
        return false;
    }

    collideRight(object,column){

        let right = column*TILESIZE + TILESIZE;
        
        if (object.x < right && object.xPrev >= right){
            object.xsp = 0;
            object.x = right;
            
            object.collision = object.collision | DIRECTIONS.LEFT;
            return true;
        } return false;
    }

    collideLeft(object,column){

        let left = column*TILESIZE;
        
        if (object.x + object.width > left && object.xPrev + object.width <= left){
            
            object.xsp = 0;
            object.x = left - object.width - NORMAL_OFFSET;
            object.collision = object.collision | DIRECTIONS.RIGHT;
            return true;

        } return false;
    }

    collideSlopeTop(object,row,column, slope, y_offset){
        let origin_x = column * TILESIZE,
            origin_y = row * TILESIZE + y_offset,
            current_x = (slope < 0) ? object.x + object.width - origin_x : object.x - origin_x,
            current_y = object.y + object.height - origin_y,
            old_x = (slope < 0) ? object.xPrev +object.width - origin_x : object.xPrev - origin_x,
            old_y = object.yPrev + object.height - origin_y,
            current_cross_product = current_x * slope - current_y,
            old_cross_product = old_x * slope - old_y,
            top = (slope < 0) ? row * TILESIZE + TILESIZE + y_offset * slope : row * TILESIZE + y_offset;

        if ((current_x < 0 || current_x > TILESIZE) && (object.y + object.height > top && object.yPrev + object.height <= top || current_cross_product < 1 && old_cross_product >-1)) {
            object.ysp=Math.min(object.ysp,0);
            object.y = top - object.height - NORMAL_OFFSET;
            object.collision = object.collision | DIRECTIONS.DOWN;
            
            return true;
        } else if (current_cross_product < 1 && old_cross_product > -1) {
            object.ysp = 0;
            object.y = row * TILESIZE + slope * current_x + y_offset - object.height - NORMAL_OFFSET;
            object.collision = object.collision | DIRECTIONS.DOWN;

            return true;
        } return false;
        
    }

    // Storage and Utility
    bounds(){
        let random = Object.keys(this.columns);
        let valid = false;
        let minX=256, maxX=-1, minY=256, maxY=-1;

        for (let x in this.columns){
            if (Object.keys(this.columns[x]).length > 0){
                minX = Math.min(Number(x),minX);
                maxX = Math.max(Number(x),maxX);
            }
            for (let y in this.columns[x]){
                valid = true;
                minY = Math.min(Number(y),minY);
                maxY = Math.max(Number(y),maxY);
            }
        }

        if (!valid)
            return;

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        }
    }

    copy(x1,y1,width,height){
        let copy = new TileCollection();
        
        let x2 = x1 + width;
        let y2=  y1 + height;

        this.forEach((tx,ty,type)=>{
            if (tx >= x1 && tx <= x2 && ty >= y1 && ty <= y2){
                let xRel = tx - x1;
                let yRel = ty - y1; 

                copy.setTile(xRel,yRel,type);
            }
        });

        return copy;
    }

    stamp(target,x,y){
        this.forEach((tx,ty,type)=>{
            let xRel = x + tx;
            let yRel = y + ty; 

            target.setTile(xRel,yRel,type);
        });
    }

    stampFlipped(target,x,y,width){
        this.forEach((tx,ty,type)=>{
            let xRel =  x + (width - tx) - 1;
            let yRel = y + ty; 

            target.setTile(xRel,yRel,type);
        });
    }

    serialize(buffer){
        const count = o => Object.keys(o).length;

        buffer.writeByte(count(this.columns)); // Number of columns
        for (let x in this.columns){
            let column = this.columns[x];
            buffer.writeByte(Number(x)); // Column X position
            buffer.writeByte(count(column)); // Number of items in column
            for (let y in column){
                buffer.writeByte(Number(y)); // Y position
                buffer.writeByte(column[y]); //Item
            }
        }
    }

    load(data){
        let columnCount = data.readByte(); // Number of columns
        for (let i = 0; i < columnCount; i++){
            let x = data.readByte(); // Column X position
            let rowCount = data.readByte();  // Number of items in column
            for (let j = 0; j < rowCount; j++){
                let y = data.readByte(); // Y position 
                let type = data.readByte(); // Item
                this.setTile(x,y,type);        
            }
        }
    }

    static From(data){
        let newTileCollection = new TileCollection();

        let columnCount = data.readByte(); // Number of columns
        for (let i = 0; i < columnCount; i++){
            let x = data.readByte(); // Column X position
            let rowCount = data.readByte();  // Number of items in column
            for (let j = 0; j < rowCount; j++){
                let y = data.readByte(); // Y position 
                let type = data.readByte(); // Item
                newTileCollection.setTile(x,y,type);        
            }
        }

        return newTileCollection;
    }

    forEach(callback){
        for (let x in this.columns){
            let column = this.columns[x];
            for (let y in column){
                let type = this.columns[x][y];
                callback(Number(x),Number(y),type);
            }
        }
    }
}

export default TileCollection;