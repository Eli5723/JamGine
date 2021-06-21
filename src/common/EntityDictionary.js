import {EntityRecord} from "./EntityRecord.js"

class EntityDictionary extends Map {
    serialize(buffer){
        buffer.writeByte(this.size); // size
        
        this.forEach((record,id)=>{
            buffer.writeByte(id); // id
            record.serialize(buffer) // record
        });
    }

    decode(data){
        let count = data.readByte(); // size

        for (let i=0; i < count; i++){
            let id = data.readByte(); // id
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