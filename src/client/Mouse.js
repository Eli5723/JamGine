let x=0;
let y=0;
let down = 0;
let right = 0;
let _pressed = false;
let _released = false;

let _scrollPrev = 0;
let _scroll = 0;

let enabled = false;

let interaction;
let container;

function setRenderer(renderer){
    interaction = renderer.plugins.interaction;
}

function setContainer(newContainer){
    container = newContainer;
    container.interactive = true;
}

function setView(element){
    element.onwheel = e=>{_scroll= e.deltaY};
}

function update(){
    if (!enabled)
        return;
    let point = interaction.mouse.getLocalPosition(container);
    x = point.x;
    y = point.y;

    let downWas = down;

    down = interaction.mouse.buttons & 1;
    right = interaction.mouse.buttons & 2;
    _pressed = false;
    _released = false;
    if (!downWas&&down)
        _pressed=true;
    else if (downWas&&!down)
        _released=true;

    _scrollPrev = _scroll;
    _scroll = 0;
}

function enable(){
    enabled=true;
}

function disable(){
    enabled=false;
}

function clear(){
    down=0;
}


export default {
    setContainer,
    setRenderer,
    setView,
    update,
    enable,
    disable,
    clear,
    get mouse(){
        return interaction.mouse;
    },

    get down() {
        return down; 
    },
    get right() {
        return right; 
    },
    get x() {
       return x; 
    },
    get y(){
        return y;
    },

    get released(){
        return _released;
    },

    get pressed(){
        return _pressed;
    },

    get scroll(){
        return _scrollPrev;
    }
};