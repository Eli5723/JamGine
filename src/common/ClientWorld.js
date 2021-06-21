import {EntityDictionary} from "./EntityDictionary.js"
import {EntityRecord} from "./EntityRecord";

class ClientWorld {
    constructor(){
        this.edict = new EntityDictionary();

        this.networkedEntities = new Map();
        this.clientEntities = new Map();
        this.serverEntities = new Map();
    }

    // Networking
    static From(data){
        let world = new ClientWorld();
        world.edict.decode(data);

        return world;
    }

    consumeState(data){
        // TODO: Implement Entity Sync
    }

    // Debug
    print(){
        console.log("World{");
        this.edict.print();
        console.log("World}");
    }
}

export {ClientWorld};