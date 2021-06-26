let buffer;
let view;
let readPos = 0;

function advance(len){
    readPos+=len;
}

function setBufferRaw(packet){
    setBuffer(packet.data);
}

function setBuffer(buffer){
    buffer = buffer;
    view = new DataView(buffer); 

    readPos = 0;
}

function getData(){
    return buffer.slice(0,readPos);
}

//Read Typed data from the buffer
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
        case 4:
            res = readInt32();
    }

    return res;
}


//Read Simple data types from the buffer
function readByte(){
    let res = view.getUint8(readPos++);
    return res;
}

function readInt8(){
    let res = view.getUint8(readPos++);
    return res;
}

function readInt16(){
    let res = view.getInt16(readPos);
    readPos+=2;
    return res;
}
function readUint16(){
    let res = view.getUint16(readPos);
    readPos+=2;
    return res;
}

function readInt32(){
    let res = view.getInt32(readPos);
    readPos+=4;
    return res;
}
function readUint32(){
    let res = view.getUint32(readPos);
    readPos+=4;
    return res;
}

function readFloat32(){
    let res = view.getFloat32(readPos);
    readPos+=4;
    return res;
}
function readFloat64(){
    let res = view.getFloat64(readPos);
    readPos+=8;
    return res;
}

function readBigInt64(){
    let res = view.getBigInt64(readPos);
    readPos+=8;
    return res;
}
function readBigUint64(){
    let res = view.getUBigUint64(readPos);
    readPos+=8;
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

function readAsciiLong(){
    let len = readUint16();
    
    let str = '';

    for (let i=0;i<len;i++){
        str += String.fromCharCode(readByte());
    }

    return str;
}

function getPosition(){
    return readPos;
}

export {
    getPosition,
    advance,

    setBuffer,
    setBufferRaw,
    getData,

    decodeTyped,

    readByte,
    readInt8,
    readInt16,
    readUint16,
    readInt32,
    readUint32,
    readFloat32,
    readFloat64,
    readBigInt64,
    readBigUint64,
    readAscii,
    readAsciiLong
};