let _instance;
let buffer;

let readPos = 0;

function advance(len){
    readPos+=len;
}

function setBuffer(_buffer){
    buffer = _buffer;
    readPos = 0;
}

function getData(){
    return buffer.slice(0,readPos);
}

//Read typed data from the buffer
function decodeTyped(){  
    let res;

    switch(readByte()){ // Read Type
        case 0:
            res = readInt16();
            break;
        case 1:
            res = readAscii();
            break;
        case 2:
            res = readByte();
            break;
        case 3:
            res = readFloat32();
            break;
    }

    return res;
}

//read to the buffer and move the pointer
function readByte(){
    let res = buffer.readUInt8(readPos++);
    return res;
}

function readInt8(){
    let res = buffer.readUInt8(readPos++);
    return res;
}

function readInt16(){
    let res = buffer.readInt16BE(readPos);
    readPos+=2;
    return res;
}
function readUInt16(){
    let res = buffer.readUInt16BE(readPos);
    readPos+=2;
    return res;
}

function readInt32(){
    let res = buffer.readInt32BEBE(readPos);
    readPos+=4;
    return res;
}
function readUInt32(){
    let res = buffer.readUInt32BE(readPos);
    readPos+=4;
    return res;
}

function readFloat32(){
    let res = buffer.readFloatBE(readPos);
    readPos+=4;
    return res;
}

//read an ascii string
function readAscii(){
    let len = readByte();
    
    let str = '';

    for (let i=0;i<len;i++){
        str += String.fromCharCode(readByte());
    }

    return str;
}

export default {
    advance,
    setBuffer,
    getData,
    decodeTyped,
    readByte,
    readInt8,
    readInt16,
    readUInt16,
    readInt32,
    readUInt32,
    readFloat32,
    readAscii
};