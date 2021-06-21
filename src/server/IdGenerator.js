class IdGenerator {
    constructor(){
        this._incrementer = 0;
    }

    getId(){
        let id = this._incrementer++;
        this._incrementer %= 65535;
        return id;
    }

    retireId(id){
        // Lazy version, shouldn't ever matter
    }
}

export default IdGenerator;