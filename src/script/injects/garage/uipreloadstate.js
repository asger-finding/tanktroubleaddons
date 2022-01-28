var Garage = Garage || {};

Garage.UIPreloadState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - load - a reference to the Phaser.Loader
 *  - add - a reference to the Phaser.GameObjectFactory 
*/

Garage.UIPreloadState.fields({
    preloadBar: null
});

//loading the game assets
Garage.UIPreloadState.methods({
    preload: function() {
        //show loading screen
        this.preloadBackground = this.add.sprite(this.game.world.centerX - UIConstants.WAITING_ICON_WIDTH / 2.0, this.game.height / 3.0, 'preloadbar');
        this.preloadBackground.anchor.setTo(0.0, 0.5);
        this.preloadBackground.alpha = 0.3;
        this.preloadBackground.scale.setTo(UIConstants.ASSET_SCALE);
        this.preloadBar = this.add.sprite(this.game.world.centerX - UIConstants.WAITING_ICON_WIDTH / 2.0, this.game.height / 3.0, 'preloadbar');
        this.load.setPreloadSprite(this.preloadBar);
        this.preloadBar.anchor.setTo(0.0, 0.5);
        this.preloadBar.scale.setTo(UIConstants.ASSET_SCALE);

        // With loading text.
        this.waitingIconGroup = this.game.add.existing(new UIWaitingIconGroup(this.game));
        this.waitingIconGroup.spawn(this.game.width / 2.0, this.game.height / 3.0, false, "Loading");
                
        //load game assets 
        if (this.game.device.pixelRatio > 1) {
            this.load.image('background', g_url('assets/images/beta/background@2x.png'));
            this.load.image('tankiconplaceholder-large', g_url('assets/images/tankIcon/placeholder-320@2x.png'));
            this.load.image('spraycan', g_url('assets/images/garage/sprayCan-26@2x.png'));
            this.load.spritesheet('spraycanshade', g_url('assets/images/garage/sprayCanShade-26@2x.png'), 52, 122, 3);
            this.load.image('leftarrow', g_url('assets/images/garage/leftArrow@2x.png'));
            this.load.image('rightarrow', g_url('assets/images/garage/rightArrow@2x.png'));
        } else {
            this.load.image('background', g_url('assets/images/beta/background.png'));
            this.load.image('tankiconplaceholder-large', g_url('assets/images/tankIcon/placeholder-320.png'));
            this.load.image('spraycan', g_url('assets/images/garage/sprayCan-26.png'));
            this.load.spritesheet('spraycanshade', g_url('assets/images/garage/sprayCanShade-26.png'), 26, 61, 3);
            this.load.image('leftarrow', g_url('assets/images/garage/leftArrow.png'));
            this.load.image('rightarrow', g_url('assets/images/garage/rightArrow.png'));
        }

        this.load.audio('spraycan', g_url('assets/audio/SprayCan.m4a'));
        this.load.audio('shakecan', g_url('assets/audio/ShakeCan.m4a'));
        this.load.audio('welder', g_url('assets/audio/Welder.m4a'));
        this.load.audio('woosh1', g_url('assets/audio/Woosh1.m4a'));
        this.load.audio('woosh2', g_url('assets/audio/Woosh2.m4a'));
        this.load.audio('woosh3', g_url('assets/audio/Woosh3.m4a'));
        
        // Create dynamic assets.
        var spray = this.game.make.bitmapData(UIConstants.SPRAY_RADIUS * 2, UIConstants.SPRAY_RADIUS * 2);
        this.game.cache.addBitmapData('spray0', spray);
        spray = this.game.make.bitmapData(UIConstants.SPRAY_RADIUS * 2, UIConstants.SPRAY_RADIUS * 2);
        this.game.cache.addBitmapData('spray1', spray);
        var welderSmoke = this.game.make.bitmapData(UIConstants.WELDER_SMOKE_RADIUS * 2, UIConstants.WELDER_SMOKE_RADIUS * 2);
        this.game.cache.addBitmapData('weldersmoke0', welderSmoke);
        welderSmoke = this.game.make.bitmapData(UIConstants.WELDER_SMOKE_RADIUS * 2, UIConstants.WELDER_SMOKE_RADIUS * 2);
        this.game.cache.addBitmapData('weldersmoke1', welderSmoke);
        var welderSpark = this.game.make.bitmapData(UIConstants.WELDER_SPARK_LENGTH, UIConstants.WELDER_SPARK_WIDTH);
        welderSpark.line(0, UIConstants.WELDER_SPARK_WIDTH/2, UIConstants.WELDER_SPARK_LENGTH, UIConstants.WELDER_SPARK_WIDTH/2, "#ffddaa", UIConstants.WELDER_SPARK_WIDTH);
        this.game.cache.addBitmapData('welderspark', welderSpark);
    },

    create: function() {
        // Apply sound setting now.
        this.game.sound.mute = !AudioManager.isSoundOn();
        if (AudioManager.isSoundOn()) {
            this.game.sound.volume = AudioManager.getSoundVolume();
        }
        
        if (Users.getAllPlayerIds().length > 0) {
            this.state.start('Load');
        } else {
            this.state.start('NoUsers');
        }
    }
});