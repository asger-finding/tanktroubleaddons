const PlayerPanel = PlayerPanel || {};

PlayerPanel.UIBootState = Classy.newClass();

PlayerPanel.UIBootState.fields({
    log: null
});

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - load - a reference to the Phaser.Loader
 *  - scale - a reference to the Phaser.ScaleManager
 *  - state - a reference to the Phaser.StateManager 
*/

//setting game configuration and loading the assets for the loading screen
PlayerPanel.UIBootState.methods({
    init: function() {
        this.game.plugins.add(PhaserSpine.SpinePlugin);
    },

    preload: function() {
        // Specify cross-origin.
        this.load.crossOrigin = 'anonymous';

        //assets we'll use in the loading screen
        if (this.game.device.pixelRatio > 1.0) {
            this.load.image('preloadbar', g_url('assets/images/lobby/waiting@2x.png'));
        } else {
            this.load.image('preloadbar', g_url('assets/images/lobby/waiting.png'));
        }
    },
    
    create: function() {
        // Create log.
        this.log = Log.create('UIBootState');

        // Generally, we do not want to prevent default actions such as touch scrolling.
        this.input.touch.preventDefault = false;

        // We do not want the page to scroll to top on every scale refresh.
        this.scale.compatibility.scrollTo = false;

        // Prevent right click menu.
        this.game.canvas.oncontextmenu = function (e) { e.preventDefault(); }

        // Do not pause the sounds when losing focus.
        this.game.stage.disableVisibilityChange = true;

        // Set world size.
        this.world.bounds = new Phaser.Rectangle(0, 0, this.game.width, this.game.height);

        // Update camera bounds.
        this.camera.setBoundsToWorld();

        // Loading screen will have a white background.
        this.stage.backgroundColor = '#fff';

        if (this.game.device.pixelRatio > 1.0) {
            // Set scale mode to user scale.
            this.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
            this.scale.setUserScale(1.0/this.game.device.pixelRatio, 1.0/this.game.device.pixelRatio, 0, 0);
            this.scale.setGameSize(this.game.width * this.game.device.pixelRatio, this.game.height * this.game.device.pixelRatio);

            // Setup resize callback to resize the game whenever the parent bounds change.
            this.scale.setResizeCallback(function(scale, parentBounds) {
                if (Math.abs(parentBounds.width * this.game.device.pixelRatio - this.game.width) >= 0.01 ||
                    Math.abs(parentBounds.height * this.game.device.pixelRatio - this.game.height) >= 0.01) {
                        this.log.debug("RESIZE CANVAS!");
                        this.scale.setGameSize(parentBounds.width * this.game.device.pixelRatio, parentBounds.height * this.game.device.pixelRatio);
                    }
            }, this);
            
        } else {
            // Set scale mode to plain resize.
            this.scale.scaleMode = Phaser.ScaleManager.RESIZE;
        }
        
        this.state.start('Preload');
    }
});
