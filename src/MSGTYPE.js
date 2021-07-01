let i = 0;
let MSG = {
    //Chat Messages
    CHAT_MESSAGE : i++,
    
    //USER LOGIN
    AUTH_BEGIN : i++,
    AUTH_TOKEN : i++,
    AUTH_REJECT : i++,
    AUTH_SUCCESS : i++,
    
    // Game Utility
    FULLSTATE : i++,
    FULLSTATE_SUCCESS : i++,

    //Start gameloop
    RUN : i++,
    RELOAD : i++,
    
    STATE : i++,

    READY : i++,
    UNREADY : i++,

    PURCHASE_ITEM : i++,

    ENT_REM : i++,
    ENT_DIE : i++,
    ENT_ADD_CLIENTSIDE : i++,
    ENT_ADD_SERVERSIDE : i++,
    ENT_ADD_TEMP : i++,

    REMOVE_ENT : i++,

    SOUND_PLAY : i++,

    TEAM_INFO : i++,

    TILE_SET : i++,
    TILE_REMOVE : i++,

    MAP_SET : i++,
    MAP_LOADED : i++,

    INFO_SET : i++,

    COMBAT_BEGIN : i++,

    get_key(value){
        for (let key in MSG){
            if (MSG[key] == value)
                return key;
        }
    }
}

export default MSG;