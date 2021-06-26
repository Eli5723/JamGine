import {EntityRecord} from "./EntityRecord.js"

class EntityDictionary extends Map {
    serialize(buffer){
        buffer.writeUInt16(this.size); // size
        
        this.forEach((record,id)=>{
            buffer.writeUInt16(id); // id
            record.serialize(buffer) // record
        });
    }

    decode(data){
        let count = data.readUint16(); // size

        for (let i=0; i < count; i++){
            let id = data.readUint16(); // id
            let record = EntityRecord.From(data); // record
            this.set(id,record);
        }
    }

    print(){
        console.log(`Entity Dicitonary Contains ${this.size} entries.`);
        this.forEach((record,id)=>{
            console.log(record);
        });
        console.log("---");
    }
}

export {EntityDictionary};