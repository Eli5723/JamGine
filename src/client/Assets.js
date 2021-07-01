import * as PIXI from "pixi.js";
import {Howl} from "howler";

let images = {};

let texIdGen = 0;
let textures = {};
let textureArray = [];

let sounds = {};

async function load(){
    await Promise.all([
        loadSound("./sounds/break.ogg"),
        loadSound("./sounds/place.ogg"),
        loadSound("./sounds/Braam.wav"),
        loadSound("./sounds/whack.ogg"),
        loadSound("./sounds/clink.ogg"),
        loadSound("./sounds/kaching.ogg"),
        loadSound("./sounds/bossanova.mp3"),

        loadImage("./tiles_test.png"),
        loadImage("./cat.png",0),
        loadImage("./brick.png",1),
        loadImage("./box.png",2),
        loadImage("./arrow.png",3),
        loadImage("./bowarrow.png",4),
        loadImage("./bow.png",5),
        loadImage("./core.png",6),
        loadImage("./dirt.png",7),
        loadImage("./hand.png",8),
        loadImage("./poke.png",9),
        loadImage("./cannon.png",10),
        loadImage("./warning.png",11),
        loadImage("./ghost.png",11),
        loadImage("./pickaxe.png",12),
        loadImage("./fight.png",13)
    ]);
    return;
}

function loadImage(url,id){
    return new Promise((res,rej)=>{
        let image = new Image();
        image.onload = ()=>{
            images[url] = image;
            image.width = image.naturalWidth;
            image.height = image.naturalHeight;

            let texture = PIXI.Texture.from(image);
            textures[url] = texture;
            textureArray[id] = texture;
            texture.id = id;
            
            res("Loaded Image");
        };
        image.src = url;
    })
}

function loadSound(url){
    return new Promise((res,rej)=>{
        let sound = new Howl({
            src:[url]
        });
        sounds[url] = sound;
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

export {images, sounds, load, getTexture, getTextureId};