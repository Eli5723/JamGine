class NetMap extends Map {
    serialize(buffer){
        buffer.writeByte(this.size);
        this.forEach((v,k)=>{
            buffer.writeAscii(k);
            buffer.encodeTyped(v);
        });
    }

    load(data){
        let keyNum = data.readByte();
        for (let i=0; i < keyNum; i++){
            let key = data.readAscii();
            let value = data.decodeTyped();

            console.log(key);
            console.log(value);
            this.set(key, value);
        }
    }

    encodeSet(buffer, key, value){
        buffer.writeAscii(key);
        buffer.encodeTyped(value);
        this.set(key,value);
    }

    decodeSet(data){
        let key = data.readAscii();
        let value = data.decodeTyped();
        this.set(key,value);
    }
}

export {NetMap};