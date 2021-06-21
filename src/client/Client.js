import * as PIXI from 'pixi.js'

import * as Keyboard from './Keyboard'
import Mouse from './Mouse'
import TypedBuffer from './TypedBuffer'
import Net from './Net'
import MSGTYPE from "../MSGTYPE"

import {ClientWorld} from "../common/ClientWorld.js"

let app;

let time;
let dt = 0;

let packet = new TypedBuffer(1400);

function main(){
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    
    let attach = document.getElementById("attach");
    app = new PIXI.Application({
        antialias: false,
        resolution: 1,
        resizeTo:attach
    });

    app.view.setAttribute('tabindex', -1);
    app.view.onclick=function() {app.view.focus()};
    app.view.onfocus = rendererFocused;
    app.view.onblur = rendererBlurred;  
    app.view.style.width = "100%";
    app.view.style.height = "100%";
    
    attach.onresize = onResize;

    attach.appendChild(app.view);
    
    // Input Setup
    const keyCode = (char)=>char.toUpperCase().charCodeAt(0);
    Keyboard.addControl("left", keyCode('a'));
    Keyboard.addControl("right",keyCode('d'));
    Keyboard.addControl("up",   keyCode('w'));
    Keyboard.addControl("down", keyCode('s'));
    Keyboard.addControl("jump", keyCode(' '));

    Mouse.setRenderer(app.renderer);
    Mouse.setContainer(app.stage);

    Net.connect("ws:\\localhost:8080");

    time = new Date().getTime();
}   
window.onload = main;

// Networking
function connect(){
    Net.connect("ws:\\localhost:8080");
}

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

Net.on(MSGTYPE.AUTH_BEGIN,(data)=>{
    loginForm.style.display = "block";
});

Net.on(MSGTYPE.AUTH_REJECT,(data)=>{
    let reason = data.readAscii();
    loginFailiureReason.textContent = `Login Failed: ${reason}`;
});

Net.on(MSGTYPE.AUTH_SUCCESS, (data)=>{
    loginForm.style.display = "none";
});

Net.on(MSGTYPE.FULLSTATE, (data)=>{
    world = ClientWorld.From(data);
    world.print();
    // Inform Server that the full state was processed
    packet.writeByte(MSGTYPE.FULLSTATE_SUCCESS);
    Net.send(packet.flush());
    console.log("GAME | Recieved full state update from server.")
});

// Gameplay
let world;

function loop(){
    // Time
    let newTime =  new Date().getTime();
    dt = (newTime - time) / 1000;
    time = new Date().getTime();

    // Input
    Mouse.update();

    // Simulation
    update(dt);
    
    // Networking; Send state to server
    if (Net.connected()){
        packet.writeByte(MSGTYPE.STATE);
        Net.send(packet.flush());
    }

    // Finish Frame
    app.render();
    Keyboard.frameEnd();
    window.requestAnimationFrame(loop);
}

function update(dt){

}

// Events
function rendererFocused(){
    Keyboard.enable();
    Mouse.enable();
    Mouse.clear();
    console.log("Game gained focus");
}

function rendererBlurred(){
    Keyboard.clear();
    Keyboard.disable();
    Mouse.clear();
    Mouse.disable();
    console.log("Game lost focus");
}

function onResize(){
    app.resize();
}
