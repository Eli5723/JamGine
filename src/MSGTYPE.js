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

    ENT_REM : i++,
    ENT_ADD_CLIENTSIDE : i++,
    ENT_ADD_SERVERSIDE : i++,
    ENT_ADD_TEMP : i++,
    ENT_TABLE : i++,

    REMOVE_ENT : i++,

    INFO_DELETE : i++,
    INFO_CHANGE : i++,
    INFO_CHANGE_SCORE : i++,
    INFO_FULL : i++,
    INFO_PLAYERS : i++,

    SOUND_PLAY : i++,

    SCOREBOARD_TEMPLATE : i++,

    TILE_SET : i++,
    TILE_SET_BREAK : i++,

    ENT_APPLY : i++,
    ENT_SET : i++,

    CAMERA_FOCUS : i++,

    MAP_SET : i++,
    MAP_LOADED : i++,

    PLAYER_LIST : i++,
    PLAYER_REMOVE : i++,
    PLAYER_ADD : i++,

    get_key(value){
        for (let key in MSG){
            if (MSG[key] == value)
                return key;
        }
    }
}

export default MSG;