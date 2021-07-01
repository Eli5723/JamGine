import * as PIXI from 'pixi.js'

import * as Keyboard from './Keyboard'
import Mouse from './Mouse'
import TypedBuffer from './TypedBuffer'
import Net from './Net'
import MSGTYPE from "../MSGTYPE"

import {ClientInstance} from "./ClientInstance.js"
import { EntityDictionary } from '../common/EntityDictionary'
import { EntityRecord } from '../common/EntityRecord'

import TileCollectionRendered from "../common/TileCollectionRendered"

import * as Assets from "./Assets.js"

let app;

let time;
let dt = 0;

let packet = new TypedBuffer(1400);

let stage;
let renderer;
let view;

async function main(){  
    // View Setup
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    let attach = document.getElementById("attach");
    app = new PIXI.Application({
        antialias: false,
        resolution: 1,
        resizeTo:attach,
        backgroundColor:0x1b3045,
        autoStart: false
    });
    app.render();
    app.ticker.stop();

    app.view.setAttribute('tabindex', -1);
    app.view.onclick=function() {app.view.focus()};
    app.view.onfocus = rendererFocused;
    app.view.onblur = rendererBlurred;
    app.view.style.imageRender = "pixelated";
    app.view.style.width = "100%";
    app.view.style.height = "100%";
    app.stage.scale.x = 1;
    app.stage.scale.y = 1;
    attach.oncontextmenu = (e)=>{e.preventDefault();}
    attach.onresize = onResize;
    attach.appendChild(app.view);
    
    // Load assets
    await Assets.load();

    // Input Setup
    const keyCode = (char)=>char.toUpperCase().charCodeAt(0);
    Keyboard.addControl("left", keyCode('a'));
    Keyboard.addControl("right",keyCode('d'));
    Keyboard.addControl("up",   keyCode('w'));
    Keyboard.addControl("down", keyCode('s'));
    Keyboard.addControl("jump", keyCode(' '));
    
    Keyboard.addControl("use", keyCode('r'));
    Keyboard.addControl("equipNext", keyCode('e'));
    Keyboard.addControl("equipPrevious", keyCode('q'));

    Mouse.setRenderer(app.renderer);
    Mouse.setContainer(app.stage);

    // Connect to server
    Net.connect("ws:\\"+window.location.hostname+":8080");

    // Establish initial time
    time = new Date().getTime();
}   

window.onload = main;


// Login Form
let loginForm = document.getElementById("loginForm");
let loginFailiureReason = document.getElementById("loginFailiureReason");
let usernameInput = document.getElementById("usernameInput");
let loginButton = document.getElementById("loginButton");

loginButton.onclick = ()=>{
    let username = usernameInput.value;

    if (username !== ""){
        packet.writeByte(MSGTYPE.AUTH_TOKEN);   
        packet.writeAscii(username);
        Net.send(packet.flush());
    }
}

// jquery lol
let $ = document.getElementById.bind(document);
$("gameMenu").onclick = ()=>{ app.view.focus();}
$("buyCannon").onclick = ()=>{packet.writeByte(MSGTYPE.PURCHASE_ITEM);Net.send(packet.flush());}
$("ready").onclick = ()=>{packet.writeByte(MSGTYPE.READY);Net.send(packet.flush());}
$("unready").onclick = ()=>{packet.writeByte(MSGTYPE.UNREADY);Net.send(packet.flush());}

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

Net.on(MSGTYPE.AUTH_BEGIN,(data)=>{
    loginForm.style.display = "block";
});
// setTimeout(()=>{
//     packet.writeByte(MSGTYPE.AUTH_TOKEN);   
//     packet.writeAscii(makeid(10));
//     Net.send(packet.flush());
// },1000);

Net.on(MSGTYPE.AUTH_REJECT,(data)=>{
    let reason = data.readAscii();
    loginFailiureReason.textContent = `Login Failed: ${reason}`;
});

Net.on(MSGTYPE.AUTH_SUCCESS, (data)=>{
    loginForm.style.display = "none";
});


let playerIcon = document.createElement("img");
playerIcon.src = "./cat.png";
Net.on(MSGTYPE.TEAM_INFO, (data)=>{
    $("teamName").textContent = data.readAscii();
    $("teamPlayers").innerHTML = "";
    
    let count = data.readByte();
    for (let i=0; i < count; i++){
        let playerDiv = document.createElement("div");
        playerDiv.appendChild(Assets.images['cat'].cloneNode(true));
        let playerName = document.createElement("span");
        playerName.textContent = "  " + data.readAscii();
        playerDiv.appendChild(playerName);

        $("teamPlayers").appendChild(playerDiv);
    }
});

Net.on(MSGTYPE.INCOME_STATEMENT, (data)=>{
    $("statementItems").innerHTML = "";
    
    let count = data.readByte();
    for (let i=0; i < count; i++){
        let item = document.createElement("div");
        item.textContent = `${data.readAscii()}:  $${data.readByte()}`;
        $("statementItems").appendChild(item);
    }

    $("statement").style.display = "block";
});
$("closeStatement").onclick = ()=>{$("statement").style.display = "none"; app.view.focus()}


Net.on(MSGTYPE.FULLSTATE, (data)=>{
    if (world) {
        app.stage.removeChild(world.stage);
    }

    world = ClientInstance.From(data);

    if (world.combat){
        Assets.sounds['bossanova'].stop();
        Assets.sounds['Braam'].play();
        $("gameMenu").style.display = "none";
    } else {
        Assets.sounds['bossanova'].play();
        $("gameMenu").style.display = "block";
        if (world.readyState){
            $("ready").style.display = "none";
            $("unready").style.display = "inline";
        } else {
            $("ready").style.display = "inline";
            $("unready").style.display = "none";
        }
    }

    ///////////////// Test garbage
    let str = "{";
    world.tileCollection.forEach((x,y,type)=>{
        str+=`{"x":${x},"y":${y},"type":${type}},`;
    });
    str+="}";
    console.log(str);
    /////////////////

    
    app.stage.addChild(world.stage);
    // Inform Server that the full state was processed
    packet.writeByte(MSGTYPE.FULLSTATE_SUCCESS);
    Net.send(packet.flush());
    Mouse.setContainer(world.worldContainer);
    loop();
});

let lastState = 0;
let ping = 0;
const serverTimestep = 16;
Net.on(MSGTYPE.STATE, (data)=>{
    let time = Date.now();
    let delta = time - lastState - serverTimestep;
    lastState = time;
    ping = delta / 2;

    world.consumeState(data);
});

Net.on(MSGTYPE.ENT_ADD_SERVERSIDE,(data)=>{
    let id = data.readUint16();
    let record = EntityRecord.From(data);
    world.addServerEntity(id, record);
});

Net.on(MSGTYPE.ENT_ADD_CLIENTSIDE,(data)=>{
    let id = data.readUint16();
    let record = EntityRecord.From(data);
    world.addClientEntity(id, record);
});

Net.on(MSGTYPE.ENT_REM, (data)=>{
    let id = data.readUint16();
    world.removeEntity(id);
});

Net.on(MSGTYPE.ENT_DIE, (data)=>{
    let id = data.readUint16();
    let removed = world.removeEntity(id);
    if (removed){
        if (removed.type.name == "Player") {
            Assets.sounds["whack"].play();
            removed.grip.unequip();
        }
        world.addEffect(['TileShard', removed.x, removed.y, new PIXI.Sprite(removed.sprite.texture)]);
    }
});


Net.on(MSGTYPE.TILE_SET,(data=>{
    let x = data.readByte();
    let y = data.readByte();
    let type = data.readByte();

    let removed = world.tileCollection.setTile(x,y,type);

    if (removed){
        world.addEffect[x*16,y*16,new PIXI.Sprite(world.tileCollection.textures[removed])];
    }

    Assets.sounds['place'].stop();
    Assets.sounds['place'].play();
}));

Net.on(MSGTYPE.TILE_REMOVE,(data=>{
    let x = data.readByte();
    let y = data.readByte();

    let removed = world.tileCollection.removeTile(x,y);
    if (removed !== undefined){
        world.addEffect(['TileShard',x*16,y*16,new PIXI.Sprite(world.tileCollection.textures[removed])]);
        Assets.sounds['break'].stop();
        Assets.sounds['break'].play();
    }
}));

Net.on(MSGTYPE.INFO_SET,data=>{
    world.info.decodeSet(data);
});

Net.on(MSGTYPE.READY,data=>{
    console.log("Ready!");
    world.readyState = 1;
    $("ready").style.display = "none";
    $("unready").style.display = "inline";
});

Net.on(MSGTYPE.UNREADY,data=>{
    console.log("Not ready!");
    world.readyState = 0;
    $("ready").style.display = "inline";
    $("unready").style.display = "none";
});

Net.on(MSGTYPE.SOUND_PLAY,data=>{
    let sound = Assets.sounds[ data.readAscii() ];
    if (sound) {
        sound.play();
    }
});

Net.on(MSGTYPE.ENT_EFFECT, data=>{
    let record = EntityRecord.From(data);
    world.addEffect(record);
});

// Gameplay
let world;

function loop(){
    // Time
    let newTime =  Date.now();
    dt = (newTime - time) / 1000;
    dt = Math.min(dt, 33/1000)
    time = Date.now();

    // Input
    Mouse.update();

    // Simulation
    world.update(dt,Mouse,Keyboard);
    
    // Networking; Send state to server
    if (Net.connected()){
        packet.writeByte(MSGTYPE.STATE);
        world.serialize(packet);
        Net.send(packet.flush());
    }

    // Finish Frame
    app.render();
    Keyboard.frameEnd();
    window.requestAnimationFrame(loop);
}

// Events
function rendererFocused(){
    Keyboard.enable();
    Mouse.enable();
    Mouse.clear();
    attach.style.cursor = "none";
}

function rendererBlurred(){
    Keyboard.clear();
    Keyboard.disable();
    Mouse.clear();
    Mouse.disable();
    attach.style.cursor = "default";
}

function onResize(){
    app.resize();
}