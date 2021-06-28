import MSGTYPE from "../MSGTYPE.js"

class SocketGroup {

    constructor(){
        this.sockets = {};
        this.events = {};

        this.size = 0;

        this.onAdd = function(){};
        this.onRemove=  function(){};

        this.onDisconnect = function(){};
    }

    add(socket){
        this.sockets[socket.id] = socket;
        socket.group = this;
        this.size++;
        this.onAdd(socket);
    }

    remove(socket){
        delete socket.group;
        delete this.sockets[socket.id];
        this.size--;
    }

    moveTo(group){
        for (let _id in this.sockets){
            group.add(this.sockets[_id]);   
        }

        this.clear();
    }

    forEach(callback){
        for (let id in this.sockets){
            callback(this.sockets[id]);
        }
    }

    clear(){
        for (let _id in this.sockets){
            delete this.sockets[_id];
        }

        this.size = 0;
    }

    broadcast(buffer){
        for (let _id in this.sockets){
            if (this.sockets[_id].readyState != 1)
                return;
            this.sockets[_id].send(buffer);
        }
    }

    broadcastExclude(buffer,socket){
        let _idEx = socket.id;
        for (let _id in this.sockets){
            if (_id == _idEx)
                continue;

            if (this.sockets[_id].readyState != 1)
                return;

            this.sockets[_id].send(buffer);
        }
    }

    //Registers Events
    on(id,callback) {
        this.events[id] = callback;
        return this;
    }

    resolveEvent(socket,msgType,buffer){
        let callback = this.events[msgType];
        try {
            if (callback)
                callback(socket,buffer);
        } catch (e) {
            let eventName = MSGTYPE.get_key(msgType);
            console.warn(`Failed to handle client event of type ${eventName}`);
            console.warn(e.toString());
            console.warn(e.stack);
        }
    }

    resolveDisconnect(socket){
        this.remove(socket);
        this.onDisconnect(socket);
    }
}

export default SocketGroup;