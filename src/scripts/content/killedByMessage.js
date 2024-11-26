import UIKilledByGroup from './killedbygroup.js';

Game.UIGameState.field('killedByGroup', null);

const createGameState = Game.UIGameState.getMethod('create');
Game.UIGameState.method('create', function(...args) {
	const result = createGameState.apply(this, ...args);

	this.killedByGroup = this.overlayGroup.add(new UIKilledByGroup(this.game, this.gameController));

	return result;
});

const gameRoundEventHandler = Game.UIGameState.getMethod('_roundEventHandler');
Game.UIGameState.method('_roundEventHandler', (...args) => {
	const [self,, evt, data] = args;

	if (evt === RoundModel._EVENTS.TANK_KILLED) {
		const victim = data.getVictimPlayerId();
		const isOwnPlayer = Users.getAllPlayerIds().includes(victim);
		if (isOwnPlayer && self.tankSprites[victim]) {
			const killer = data.getKillerPlayerId();
			self.killedByGroup.spawn(self.game.width / 2.0, UIConstants.TIMER_TOP_MARGIN, killer, victim, true);
		}
	}

	return gameRoundEventHandler(...args);
});

const gameCleanup = Game.UIGameState.getMethod('_cleanUp');
Game.UIGameState.method('_cleanUp', function(...args) {
	this.killedByGroup.retire();

	return gameCleanup.apply(this, ...args);
});

const gameResizeHandler = Game.UIGameState.getMethod('_onSizeChangeHandler');
Game.UIGameState.method('_onSizeChangeHandler', function(...args) {
	const result = gameResizeHandler.apply(this, ...args);

	this.killedByGroup.position.x = this.game.width / 2.0;

	return result;
});
