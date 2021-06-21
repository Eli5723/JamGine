let controlsArray = [];
let keys = {};

let enabled = false;

window.addEventListener('keydown',handleDown);
window.addEventListener('keyup',handleUp);

function handleDown(e) {
    if (!enabled)
        return;
    e.preventDefault();
    var control,i;
    for (i = 0;i<controlsArray.length;i++){
        control = controlsArray[i];
        if (e.keyCode == control.keyCode) {
            if (!control.down)
                control.pressed = true;
            control.down = true;
            return;
        }
    }
}

function handleUp(e) {
    if (!enabled)
        return;
    e.preventDefault();

    var control,i;
    for (i = 0;i<controlsArray.length;i++){
        control = controlsArray[i];
        if (e.keyCode == control.keyCode) {
            control.down = false;
            control.released = true;
            return;
        }
    }
}

function frameEnd(){
    var control,i;
    for (i = 0;i<controlsArray.length;i++){
        control = controlsArray[i];
        control.pressed = false;
        control.released = false;
    }
}

function clear(){
    var i, control;
    for (i = 0;i<controlsArray.length;i++){
        control = controlsArray[i];
        control.down = false;
    }
}

function disable(){
    enabled = false;
}

function enable(){
    enabled = true;
}

function addControl(name, charCode){

    let newControl = {};
    newControl.keyCode =  charCode;
    newControl.down = false;
    keys[name] = newControl;
    controlsArray.push(newControl);
}

function bind(name,newCode){
    keys[name].keyCode = newCode;
}

function unbind(name){
    keys[name].keyCode = -1;
}

export {
    frameEnd,
    clear,
    disable,
    enable,
    addControl,
    bind,
    unbind,
    keys
};