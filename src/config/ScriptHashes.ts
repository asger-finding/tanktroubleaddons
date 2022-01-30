export default class ScriptHashes {
    static hashes = {
    // Game
        // Logic
            '7pqp95akl2s': 'game/gamemanager.js',
            '0ac4orarafp': 'game/roundcontroller.js',
            '759lcq3cnf3': 'game/roundmodel.js',
        // State
            '53vmeku41jh': 'game/tankstate.js',
            '5aju874idin': 'game/roundstate.js',
            '6bskh8jgbvt': 'game/gamestate.js',
        // Visual
            '1qnhb5p83ia': 'game/uibootstate.js',
            '6dsfjkq9b39': 'game/uipreloadstate.js',
            '1djlm2bho0c': 'game/uimenustate.js',
            '5ei63orc5dp': 'game/uigamestate.js',
            // Graphics
                '7kkf526noq0': 'game/uiaimergraphics.js',
                '6pk8me3pr3n': 'game/uimissileimage.js',
                '74t9acc1k30': 'game/uilasergraphics.js',
                '7ea9n5arpk7': 'game/uiweaponsymbolgroup.js',
                '61fneaqu1ae': 'game/uiweaponiconimage.js',
                '26fgvgmqejg': 'game/uiprojectileimage.js',
                '4s1e60j5ip5': 'game/uitanksprite.js',
                '79t0bcq6rh9': 'game/uitanknamegroup.js',
    
    // Garage
        '25ai7m0en1n': 'garage/uigarage.js',
        '4aecss92jt9': 'garage/uibootstate.js',
        '670ta48bvpg': 'garage/uipreloadstate.js',
        '0qc0ij6acu8': 'garage/uinousersstate.js',
        '77crp2q4o86': 'garage/uiloadstate.js',
        '6853dai20r9': 'garage/uimainstate.js',
    
    // TankTrouble Subclass
        '0fpg5uhiq8d': 'tanktrouble/controlsoverlay.js',
        '7dis0ah4fdg': 'tanktrouble/settingsbox.js',
        '3b70d6a5fnu': 'tanktrouble/chatbox.js',
        '0nhlbb8q68p': 'tanktrouble/virtualshopoverlay.js',
        '48m8678bii0': 'tanktrouble/adminplayerlookupoverlay.js',
    
        // Connection
        '56i8ao2nvf2': 'connection/ttclient.js',
        '374q3ksrqui': 'connection/clientmanager.js',
    
    // Player Panel
        '0sm9hrm0d0s': 'playerpanel/uiplayerpanel.js',
        '5uies3u5424': 'playerpanel/uibootstate.js',
        '2t4sgkdecm4': 'playerpanel/uipreloadstate.js',
        '5d0cm3ngrsr': 'playerpanel/uimainstate.js',
        // Tank Icon
            '65l23pgcn3m': 'playerpanel/uitankicon.js',
            '25e5c7of7ts': 'playerpanel/uitankiconloader.js',
            '1ckatud4umf': 'playerpanel/uitankiconimage.js',
            '0cevgp8k5a3': 'playerpanel/uitankiconloginimage.js',
            '4993mfvn24n': 'playerpanel/uitankavatargroup.js',
    
    // Inputs
        '34fmc83grn0': 'inputs/inputs.js',
        '6h043lvill0': 'inputs/inputmanager.js',
        '2c6lucmqmj4': 'inputs/keyboardinputmanager.js',
        '1tdudtdnitr': 'inputs/mouseinputmanager.js',
    
    // AI
        '06uom87q8t8': 'ai/aimanager.js',
        '612p2i0logf': 'ai/ais.js',
        '0cl4b58a6rg': 'ai/ai.js',
    
    // Maze
        '2svckk2geb4': 'maze/mazethememanager.js',
        '50u4al9isnr': 'maze/maze.js',
    
    // Utils
        '355rof3sk2c': 'utils/utils.js',
        '609n2v5ibq3': 'utils/b2dutils.js',
        '271tbbc6cos': 'utils/aiutils.js',
        '34visp9ckt4': 'utils/uiutils.js',
    
    // Managers
        '11m3onjol17': 'managers/focusmanager.js',
        '7dinv9lgtda': 'managers/overlaymanager.js',
        '5h59m7opcog': 'managers/premiummanager.js',
        '19th5lqtvv6': 'managers/qualitymanager.js',
    
    // Classes
        '6v200sak2qq': 'classes/users.js',
        '3ip0fdausiq': 'classes/content.js',
        '7nqmob1fehq': 'classes/constants.js',
        '697ii87vo0r': 'classes/uiconstants.js',
    }

    static get hashesLength() {
        return Object.keys(this.hashes).length;
    }
}