class ActionRecord extends Array {
    serialize(buffer){
        buffer.writeAscii(this[0]); // Type
        buffer.writeByte(this.length-1); // Prop count
        for (let i = 1; i < this.length; i++){
            buffer.encodeTyped(this[i]); // Properties
        }
    }

    static From(data){
        let record = new ActionRecord();

        let type = data.readAscii(); // Type
        record.push(type);
        
        let propCount = data.readByte(); // Prop Count

        for (let i= 0 ;i < propCount; i++) {
            record.push(data.decodeTyped()); // Properties
        }
        return record;
    }
}

export {ActionRecord};