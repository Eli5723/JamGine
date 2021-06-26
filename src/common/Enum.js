class Enum{
    constructor(keys){
        for (let i=0;i<keys.length;i++){
            let key = keys[i];
            this[key] = i;
        }
    }

    get_key(value){
        for (let key in this){
            if (this[key] == value)
                return key;
        }
    }
}

export default Enum;