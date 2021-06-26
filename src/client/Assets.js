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

        loadImage("./tiles_test.png"),
        loadImage("./cat.png",0),
        loadImage("./brick.png",1),
        loadImage("./box.png",2),
        loadImage("./arrow.png",3),
    ]);
    console.log(textures);
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