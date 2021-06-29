class IdGenerator {
    constructor(){
        this._retiredIds = [];
        this._incrementer = 0;
    }

    getId(){
        if (this._retiredIds.length>0) 
            return this._retiredIds.pop();
        else
            return this._incrementer++
    }

    retireId(id){
        this._retiredIds.push(id);
    }
}

module.exports = IdGenerator;