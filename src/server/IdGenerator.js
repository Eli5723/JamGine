const maxUint16 = 65535;

class IdGenerator {
    constructor(){
        this._incrementer = 0;
    }

    getId(){
        let id = this._incrementer++;
        this._incrementer %= maxUint16;
        return id;
    }

    retireId(id){
        // Lazy version, shouldn't ever matter
    }
}

export default IdGenerator;