import type { Lobby, Player, Flashcard } from "@shared/types.js"

function generateCode(lenght = 4){
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";

    for(let i = 0; i < 4; i ++){
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
}

