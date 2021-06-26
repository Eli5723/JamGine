let _instance;
class TypedBuffer {
    constructor(size){
        this.size = size||1400;
        this.buffer = new ArrayBuffer(this.size);
        this.view = new DataView(this.buffer);
        this.writePos = 0;
    }

    static getInstance(){
        if (!_instance)
            _instance = new TypedBuffer(8000);
        return _instance; 
    }

    reset(){
        this.writePos = 0;
        return;
    }

    getData(){
        return this.buffer.slice(0,this.writePos);
    }

    flush(){
        let res = this.buffer.slice(0,this.writePos);
        this.reset();
        return res;
    }

    get length() {
        return this.writePos;
    }
    
    //Write Typed data to the buffer
    encodeTyped(argument){
        switch(typeof argument){
            case "number":
                if (argument-Math.floor(argument)===0){
                    // handle regular numbers
                    if (argument < 32766 && argument > -32766){
                        this.writeByte(0);
                        this.writeInt16(argument);
                        break;
                    } else {
                    //Handle huge numbers
                        this.writeByte(4);
                        this.writeInt32(argument);
                        break;
                    }
                } else {
                    this.writeByte(3);
                    this.writeFloat32(argument)
                }
                break;
            case "string":
                this.writeByte(1);
                this.writeAscii(argument);
                break;
            case "boolean":
                this.writeByte(2);
                this.writeByte(argument);
                break;
        }
    }

    overwriteHeader(val){
        this.view.setUint8(0,val);
        return this
    }

    //Write base data types to the buffer and move the pointer
    writeByte(val){
        this.view.setUint8(this.writePos++,val);
        return this
    }

    writeInt8(val){
        this.view.setUint8(this.writePos++,val);
        return this;
    }
    
    writeInt16(val){
        this.view.setInt16(this.writePos,val);
        this.writePos+=2;
        return this;
    }
    writeUInt16(val){
        this.view.setUint16(this.writePos,val);
        this.writePos+=2;
        return this;
    }
    
    writeInt32(val){
        this.view.setInt32(this.writePos,val);
        this.writePos+=4;
        return this;
    }
    writeUInt32(val){
        this.view.setUint32(this.writePos,val);
        this.writePos+=4;
        return this;
    }

    writeFloat32(val){
        this.view.setFloat32(this.writePos,val);
        this.writePos+=4;
        return this;
    }
    writeFloat64(val){
        this.view.setFloat64(this.writePos,val);
        this.writePos+=8;
        return this;
    }

    writeBigInt64(val){
        this.view.setBigInt64(this.writePos,val);
        this.writePos+=8;
        return this;
    }
    writeBigUInt64(val){
        this.view.setUBigUint64(this.writePos,val);
        this.writePos+=8;
        return this;
    }

    writeAscii(str){
        let len = str.length;
        this.writeByte(len);
        for (let i=0;i<len;i++){
            this.writeByte(str.charCodeAt(i));
        }

        return this;
    }

    writeAsciiLong(str){
        let len = str.length;
        this.writeUInt16(len);
        for (let i=0;i<len;i++){
            this.writeByte(str.charCodeAt(i));
        }

        return this;
    }
}

export default TypedBuffer;