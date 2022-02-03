const PlayerPanel = PlayerPanel || {};

PlayerPanel.UIPreloadState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - load - a reference to the Phaser.Loader
 *  - add - a reference to the Phaser.GameObjectFactory 
*/

PlayerPanel.UIPreloadState.fields({
    preloadBar: null
});

//loading the game assets
PlayerPanel.UIPreloadState.methods({
    preload: function() {
        //show loading screen
        this.preloadBackground = this.add.sprite(this.game.world.centerX - UIConstants.WAITING_ICON_WIDTH * 0.3 / 2.0, this.game.height / 2.0, 'preloadbar');
        this.preloadBackground.anchor.setTo(0.0, 0.5);
        this.preloadBackground.alpha = 0.3;
        this.preloadBackground.scale.setTo(0.3 * UIConstants.ASSET_SCALE);
        this.preloadBar = this.add.sprite(this.game.world.centerX - UIConstants.WAITING_ICON_WIDTH * 0.3 / 2.0, this.game.height / 2.0, 'preloadbar');
        this.load.setPreloadSprite(this.preloadBar);
        this.preloadBar.anchor.setTo(0.0, 0.5);
        this.preloadBar.scale.setTo(0.3 * UIConstants.ASSET_SCALE);
                
        //load game assets
        if (this.game.device.pixelRatio > 1) {
            this.load.spine('laika', g_url('assets/images/laika/laika.json'), '@2x');
            this.load.spine('dimitri', g_url('assets/images/dimitri/dimitri.json'), '@2x');

            this.load.atlas('playerpanel', g_url('assets/images/playerPanel/playerPanel@2x.png'), g_url('assets/images/playerPanel/playerPanel@2x.json'));
            this.load.physics('playerpanel-physics', g_url('assets/images/playerPanel/playerPanel-physics@2x.json'));

            this.load.atlas('ranks', g_url('assets/images/ranks/ranks@2x.png'), g_url('assets/images/ranks/ranks@2x.json'));

            this.load.image('favourite', g_url('assets/images/lobby/favourite@2x.png'));
            this.load.image('tankiconplaceholder-medium', g_url('assets/images/tankIcon/placeholder-200@2x.png'));
            this.load.image('addtank', g_url('assets/images/lobby/addTank@2x.png'));
        } else {
            this.load.spine('laika', g_url('assets/images/laika/laika.json'));
            this.load.spine('dimitri', g_url('assets/images/dimitri/dimitri.json'));

            this.load.atlas('playerpanel', g_url('assets/images/playerPanel/playerPanel.png'), g_url('assets/images/playerPanel/playerPanel.json'));
            this.load.physics('playerpanel-physics', g_url('assets/images/playerPanel/playerPanel-physics.json'));

            this.load.atlas('ranks', g_url('assets/images/ranks/ranks.png'), g_url('assets/images/ranks/ranks.json'));

            this.load.image('favourite', g_url('assets/images/lobby/favourite.png'));
            this.load.image('tankiconplaceholder-medium', g_url('assets/images/tankIcon/placeholder-200.png'));
            this.load.image('addtank', g_url('assets/images/lobby/addTank.png'));
        }
    },
    create: function() {
        this.state.start('Main');
    }
});
