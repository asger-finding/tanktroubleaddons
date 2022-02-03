const Game = Game || {};

Game.UIPreloadState = Classy.newClass();

/*
 * Phaser fills in some properties:
 *  - game - a reference to the Phaser.Game
 *  - load - a reference to the Phaser.Loader
 *  - add - a reference to the Phaser.GameObjectFactory
*/

Game.UIPreloadState.fields({
    preloadBar: null
});

//loading the game assets
Game.UIPreloadState.methods({
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
            this.load.spine('laika', g_url('assets/images/laika/laika.json'), '@2x');
            this.load.spine('dimitri', g_url('assets/images/dimitri/dimitri.json'), '@2x');

            this.load.nineSlice('button24', g_url('assets/images/buttons/standard24@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button24Active', g_url('assets/images/buttons/standard24Active@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button24Disabled', g_url('assets/images/buttons/24Disabled@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('buttonWarning34', g_url('assets/images/buttons/warning34@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('buttonWarning34Active', g_url('assets/images/buttons/warning34Active@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button34', g_url('assets/images/buttons/standard34@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button34Active', g_url('assets/images/buttons/standard34Active@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button34Disabled', g_url('assets/images/buttons/34Disabled@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button52', g_url('assets/images/buttons/standard52@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button52Active', g_url('assets/images/buttons/standard52Active@2x.png'), 22, 22, 22, 22);
            this.load.nineSlice('button52Disabled', g_url('assets/images/buttons/52Disabled@2x.png'), 22, 22, 22, 22);

            this.load.atlas('game', g_url('assets/images/game/game@2x.png'), g_url('assets/images/game/game@2x.json'));
            this.load.physics('game-physics', g_url('assets/images/game/game-physics@2x.json'));

            this.load.atlas('celebration', g_url('assets/images/game/celebration@2x.png'), g_url('assets/images/game/celebration@2x.json'));
            this.load.physics('celebration-physics', g_url('assets/images/game/celebration-physics@2x.json'));

            this.load.atlas('ranks', g_url('assets/images/ranks/ranks@2x.png'), g_url('assets/images/ranks/ranks@2x.json'));

            this.load.image('background', g_url('assets/images/beta/background@2x.png'));
            this.load.image('menuBackground', g_url('assets/images/menu/background@2x.png'));
            this.load.spritesheet('waitingmodeicon', g_url('assets/images/lobby/waitingModes@2x.png'), 400, 400);
            this.load.image('favourite', g_url('assets/images/lobby/favourite@2x.png'));
            this.load.image('tankiconplaceholder-small', g_url('assets/images/tankIcon/placeholder-140@2x.png'));
            this.load.image('tankiconplaceholder-large', g_url('assets/images/tankIcon/placeholder-320@2x.png'));
            this.load.image('gameiconplaceholder', g_url('assets/images/lobby/game@2x.png'));
            this.load.image('gameicon', g_url('assets/images/lobby/game@2x.png'));
            this.load.spritesheet('gamemodeicon', g_url('assets/images/lobby/gameModes@2x.png'), 196, 196);
            this.load.image('disconnectedicon', g_url('assets/images/lobby/disconnected@2x.png'));
        } else {
            this.load.spine('laika', g_url('assets/images/laika/laika.json'));
            this.load.spine('dimitri', g_url('assets/images/dimitri/dimitri.json'));

            this.load.nineSlice('button24', g_url('assets/images/buttons/standard24.png'), 11, 11, 11, 11);
            this.load.nineSlice('button24Active', g_url('assets/images/buttons/standard24Active.png'), 11, 11, 11, 11);
            this.load.nineSlice('button24Disabled', g_url('assets/images/buttons/24Disabled.png'), 11, 11, 11, 11);
            this.load.nineSlice('buttonWarning34', g_url('assets/images/buttons/warning34.png'), 11, 11, 11, 11);
            this.load.nineSlice('buttonWarning34Active', g_url('assets/images/buttons/warning34Active.png'), 11, 11, 11, 11);
            this.load.nineSlice('button34', g_url('assets/images/buttons/standard34.png'), 11, 11, 11, 11);
            this.load.nineSlice('button34Active', g_url('assets/images/buttons/standard34Active.png'), 11, 11, 11, 11);
            this.load.nineSlice('button34Disabled', g_url('assets/images/buttons/34Disabled.png'), 11, 11, 11, 11);
            this.load.nineSlice('button52', g_url('assets/images/buttons/standard52.png'), 11, 11, 11, 11);
            this.load.nineSlice('button52Active', g_url('assets/images/buttons/standard52Active.png'), 11, 11, 11, 11);
            this.load.nineSlice('button52Disabled', g_url('assets/images/buttons/52Disabled.png'), 11, 11, 11, 11);

            this.load.atlas('game', g_url('assets/images/game/game.png'), g_url('assets/images/game/game.json'));
            this.load.physics('game-physics', g_url('assets/images/game/game-physics.json'));

            this.load.atlas('celebration', g_url('assets/images/game/celebration.png'), g_url('assets/images/game/celebration.json'));
            this.load.physics('celebration-physics', g_url('assets/images/game/celebration-physics.json'));

            this.load.atlas('ranks', g_url('assets/images/ranks/ranks.png'), g_url('assets/images/ranks/ranks.json'));

            this.load.image('background', g_url('assets/images/beta/background.png'));
            this.load.image('menuBackground', g_url('assets/images/menu/background.png'));
            this.load.spritesheet('waitingmodeicon', g_url('assets/images/lobby/waitingModes.png'), 200, 200);
            this.load.image('favourite', g_url('assets/images/lobby/favourite.png'));
            this.load.image('tankiconplaceholder-small', g_url('assets/images/tankIcon/placeholder-140.png'));
            this.load.image('tankiconplaceholder-large', g_url('assets/images/tankIcon/placeholder-320.png'));
            this.load.image('gameiconplaceholder', g_url('assets/images/lobby/game.png'));
            this.load.image('gameicon', g_url('assets/images/lobby/game.png'));
            this.load.spritesheet('gamemodeicon', g_url('assets/images/lobby/gameModes.png'), 98, 98);
            this.load.image('disconnectedicon', g_url('assets/images/lobby/disconnected.png'));
        }

        this.load.audio('tankLand', g_url('assets/audio/TankLand.m4a'));
        this.load.audio('fireBullet', g_url('assets/audio/FireBullet.m4a'));
        this.load.audio('bulletBounce', g_url('assets/audio/BulletBounce.m4a'));
        this.load.audio('bulletBounce2', g_url('assets/audio/BulletBounce2.m4a'));
        this.load.audio('shieldOn', g_url('assets/audio/ShieldOn.m4a'));
        this.load.audio('shieldImpact', g_url('assets/audio/ShieldImpact.m4a'));
        this.load.audio('shieldWeakened', g_url('assets/audio/ShieldWeakened.m4a'));
        this.load.audio('fireLaser', g_url('assets/audio/FireLaser.m4a'));
        this.load.audio('fireShotgun', g_url('assets/audio/FireShotgun.m4a'));
        this.load.audio('fireMissile', g_url('assets/audio/FireMissile.m4a'));
        this.load.audio('homingMissileTargetChange', g_url('assets/audio/HomingMissileTargetChange.m4a'));
        this.load.audio('homingMissileTargeting', g_url('assets/audio/HomingMissileTargeting.m4a'));
        this.load.audio('crateSpawn', g_url('assets/audio/CrateSpawn.m4a'));
        this.load.audio('crateLand', g_url('assets/audio/CrateLand.m4a'));
        this.load.audio('weaponStore', g_url('assets/audio/WeaponStore.m4a'));
        this.load.audio('tankExplosion', g_url('assets/audio/TankExplosion.m4a'));
        this.load.audio('bulletPuff', g_url('assets/audio/BulletPuff.m4a'));
        this.load.audio('chickenOut', g_url('assets/audio/ChickenOut.m4a'));
        this.load.audio('goldSpawn', g_url('assets/audio/GoldSpawn.m4a'));
        this.load.audio('spawnZoneTear', g_url('assets/audio/SpawnZoneTear.m4a'));
        this.load.audio('spawnZoneOpen', g_url('assets/audio/SpawnZoneOpen.m4a'));
        this.load.audio('spawnZoneUnstable', g_url('assets/audio/SpawnZoneUnstable.m4a'));
    },
    create: function() {
        // Apply sound setting now.
        this.game.sound.mute = !AudioManager.isSoundOn();
        if (AudioManager.isSoundOn()) {
            this.game.sound.volume = AudioManager.getSoundVolume();
        }

        // Go directly to lobby state if any players are present.
        if (Users.getAllPlayerIds().length == 0) {
            this.state.start('Menu');
        } else {
            this.state.start('Lobby');
        }
    }
});
