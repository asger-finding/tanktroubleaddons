import UIKilledByGroup from './killedbygroup.js';
import { interceptFunction } from '../utils/gameUtils.js';

Game.UIGameState.field('killedByGroup', null);

/** Inject killed by group to game state */
interceptFunction(Game.UIGameState, 'create', function(original, ...args) {
	const result = original(...args);
	this.killedByGroup = this.overlayGroup.add(new UIKilledByGroup(this.game, this.gameController));
	return result;
}, { isClassy: true });

/** Spawn the killed by message if a local user is killed */
interceptFunction(Game.UIGameState, '_roundEventHandler', (original, ...args) => {
	const [self,, evt, data] = args;

	if (evt === RoundModel._EVENTS.TANK_KILLED) {
		const victim = data.getVictimPlayerId();
		const isOwnPlayer = Users.getAllPlayerIds().includes(victim);
		if (isOwnPlayer && self.tankSprites[victim]) {
			const killer = data.getKillerPlayerId();
			self.killedByGroup.spawn(self.game.width / 2.0, UIConstants.TIMER_TOP_MARGIN, killer, victim, true);
		}
	}

	return original(...args);
}, { isClassy: true });

/** Retire group on cleanup */
interceptFunction(Game.UIGameState, '_cleanUp', function(original, ...args) {
	this.killedByGroup.retire();
	return original(...args);
}, { isClassy: true });

/** Position killed by group on resize */
interceptFunction(Game.UIGameState, '_onSizeChangeHandler', function(original, ...args) {
	const result = original(...args);
	this.killedByGroup.position.x = this.game.width / 2.0;
	return result;
}, { isClassy: true });

export const _isESmodule = true;
