import TileCollection from './TileCollection.js'
import * as PIXI from 'pixi.js'

import * as Assets from '../client/Assets.js'

function split(atlas,size){
    var i;
    var textures=[];

    let tex = atlas.baseTexture;
    let w = tex.width/size,
        h = tex.height/size;
    let count = w*h;

    let x,y;
    for (i=0;i<count;i++){
        x = (i%w)*size;
        y = Math.floor(i/w)*size;
        textures.push(new PIXI.Texture(atlas, new PIXI.Rectangle(x,y,size,size)));
    }

    return textures;
}

let tilesetTexture;
let textures;

class TileCollectionRendered extends TileCollection {

    constructor(){
        super();
        this.container = new PIXI.Container();
        this.spriteColumns = {};
        this.tilesetTexture = Assets.getTexture("tiles_test");
        this.textures = split(this.tilesetTexture,16);
    }

    getTileSprite(x,y){
        let column = this.spriteColumns[x];
        if (column){
            return column[y];
        }
    }

    setTile(x,y,type){
        let spriteColumn = this.spriteColumns[x];
        if (!spriteColumn){
            this.spriteColumns[x] = {};
        }

        //let sprite = ;
        if (this.spriteColumns[x][y] !== undefined) {
            this.spriteColumns[x][y].texture = this.textures[type];
        } else {
            let newSprite = new PIXI.Sprite(this.textures[type]);
            newSprite.x = x*16;
            newSprite.y = y*16;
            this.spriteColumns[x][y] = newSprite;
            this.container.addChild(newSprite);
        }

        return super.setTile(x,y,type);
    }

    static From(data){
        let newTileCollection = new TileCollectionRendered();

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

    removeTile(x,y,type){
        let tileSprite = this.getTileSprite(x,y);
        if (tileSprite)
            tileSprite.texture = PIXI.Texture.EMPTY;

        return super.removeTile(x,y,type);
    }
}

export default TileCollectionRendered;