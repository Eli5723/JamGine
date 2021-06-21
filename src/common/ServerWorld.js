import {EntityDictionary} from "./EntityDictionary.js"
import {EntityRecord} from "./EntityRecord.js";

class ServerWorld {
    constructor(){
        this.edict = new EntityDictionary();
        this.authority = new Map();
        
        this.networkedEntities = new Map();
        this.serverEntities = new Map();
        this.clientEntities = new Map();
    }

    //Simulation
    update(dt){
        this.serverEntities.forEach((entity,id)=>{
            entity.update(dt);
        });
    }

    // Networking
    fullstate(buffer){
        this.edict.serialize(buffer); // Edict 
        // send level?
        this.entityState(buffer); // Enttiy State
    }

    entityState(buffer){
        buffer.writeByte(this.networkedEntities.size); // Entity Count 
        
        this.networkedEntities.forEach((entity,id)=>{ 
            buffer.writeByte(id); //ID 
            entity.serialize(buffer); // State; includes size information 
        });
    }
}

export {ServerWorld}; 