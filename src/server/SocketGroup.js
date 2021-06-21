class SocketGroup {

    constructor(){
        this.sockets = {};
        this.events = {};

        this.size = 0;

        this.onDisconnect = function(){};
    }

    add(socket){
        this.sockets[socket.id] = socket;
        socket.group = this;
        this.size++;
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

    clear(){
        for (let _id in this.sockets){
            delete this.sockets[_id];
        }

        this.size = 0;
    }

    broadcast(buffer){
        for (let _id in this.sockets){
            this.sockets[_id].send(buffer);
        }
    }

    broadcastExclude(buffer,socket){
        let _idEx = socket.id;
        for (let _id in this.sockets){
            if (_id == _idEx)
                continue;

            this.sockets[_id].send(buffer);
        }
    }

    //Registers Events
    on(id,callback) {
        this.events[id] = callback;
        return this;
    }

    resolveEvent(socket,msgType,buffer){
        if (this.events[msgType])
            this.events[msgType](socket,buffer);
    }

    resolveDisconnect(socket){
        this.remove(socket);
        this.onDisconnect(socket);
    }
}

export default SocketGroup;