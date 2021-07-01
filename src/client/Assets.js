import * as PIXI from "pixi.js";
import {Howl} from "howler";

let contentBase = "./";

let images = {};

let texIdGen = 0;
let textures = {};
let textureArray = [];

let sounds = {};

function setContentBase(path){
    contentBase = path;
}

async function load(){
    await Promise.all([
        loadSound("break.ogg"),
        loadSound("place.ogg"),
        loadSound("Braam.wav"),
        loadSound("whack.ogg"),
        loadSound("clink.ogg"),
        loadSound("kaching.ogg"),
        loadSound("bossanova.mp3"),
        loadSound("whoosh.ogg"),

        loadImage("cursor.png"),
        loadImage("tiles_test.png"),
        loadImage("cat.png",0),
        loadImage("brick.png",1),
        loadImage("box.png",2),
        loadImage("arrow.png",3),
        loadImage("bowarrow.png",4),
        loadImage("bow.png",5),
        loadImage("core.png",6),
        loadImage("dirt.png",7),
        loadImage("hand.png",8),
        loadImage("poke.png",9),
        loadImage("cannon.png",10),
        loadImage("warning.png",11),
        loadImage("ghost.png",11),
        loadImage("pickaxe.png",12),
        loadImage("fight.png",13),
        loadImage("swoosh.png",14),
        loadImage("slingshot.png",15)
    ]);
    return;
}

function baseName(path){
    return path.substring(path.lastIndexOf('/')+1,path.lastIndexOf('.'));
}

function loadImage(name,id){
    return new Promise((res,rej)=>{
        let path = contentBase + "textures/" + name;
        let baseName = name.substring(0,name.lastIndexOf('.'));

        let image = new Image();
        image.onload = ()=>{
            images[baseName] = image;
            image.width = image.naturalWidth;
            image.height = image.naturalHeight;

            let texture = PIXI.Texture.from(image);
            console.log(baseName);
            
            textures[baseName] = texture;


            textureArray[id] = texture;
            texture.id = id;
            
            res("Loaded Image");
        };
        image.src = path;
    })
}

function loadSound(name){
    let path = contentBase + 'sounds/' + name;
    let baseName = name.substring(0,name.lastIndexOf('.'));

    return new Promise((res,rej)=>{
        let sound = new Howl({
            src:[path]
        });

        sounds[baseName] = sound;
        sound.on('load',()=>{
            res("Loaded Sound");
        });
    });
}

function getTexture(url){
    return textures[url];
}

function getTextureId(id) {
    return textureArray[id];
}

export {images, sounds, load, getTexture, getTextureId, setContentBase};