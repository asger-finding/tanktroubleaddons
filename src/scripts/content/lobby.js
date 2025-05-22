import ProxyHelper from '../utils/proxyHelper.js';
import UIGameIconImage from './uigameiconimage.js';
import UIGameIconScrollerGroup from './uigameiconscrollergroup.js';

window.UIGameIconImage = UIGameIconImage;

/**
 * Increase pool size to 6 to include max possible games in server
 */
UIConstants.classFields({
	GAME_ICON_POOL_SIZE: 6,
	GAME_ICON_COUNT: 6
});

/** Create the scroller group */
ProxyHelper.interceptFunction(Game.UILobbyState, 'create', function(original, ...args) {
	const result = original(...args);

	this.gameIconScroller = this.gameIconGroup.add(new UIGameIconScrollerGroup(
		this.game,
		UIConstants.GAME_ICON_WIDTH,
		UIConstants.GAME_ICON_HEIGHT,
		UIConstants.GAME_ICON_SCROLL_SPEED
	));

	return result;
}, { isClassy: true });

/** Override client event handler logic for TTClient.EVENTS.GAME_LIST_CHANGED for our scroller */
// eslint-disable-next-line complexity
ProxyHelper.interceptFunction(Game.UILobbyState, '_clientEventHandler', (original, ...args) => {
	const [self, evt] = args;
	if (evt === TTClient.EVENTS.GAME_LIST_CHANGED) {
		self._updateGameButtons();

		const gameStates = ClientManager.getClient().getAvailableGameStates();
		const numGames = gameStates.length;

		self.allGamesActive = numGames === Constants.SERVER.MAX_GAME_COUNT;
		self.allGamesFull = true;

		const currentGameIds = Object.keys(self.gameIcons);
		const newGameIds = gameStates.map(gameState => gameState.getId());
		const gameIconsNoLongerNeeded = currentGameIds.filter(gameId => !newGameIds.includes(gameId));

		const gameIconScroller = self.gameIconScroller.getFirstExists(false);
		if (gameIconScroller) self.gameIconScroller.spawn(0, 140);

		// Retire closed games icons
		for (const gameIconSpriteId of gameIconsNoLongerNeeded) {
			self.gameIconScroller.removeGameIcon(self.gameIcons[gameIconSpriteId].icon);

			self.gameIcons[gameIconSpriteId].icon.remove();
			self.gameIcons[gameIconSpriteId].button.remove();
			self.gameIconPlacementsTaken[self.gameIcons[gameIconSpriteId].placement] = false;
			self.gameIconPlacementsTaken[self.gameIcons[gameIconSpriteId].placement] = false;
			delete self.gameIcons[gameIconSpriteId];
		}

		for (const gameState of gameStates) {
			if (gameState.getPlayerStates().length < gameState.getMaxActivePlayerCount() + Constants.GAME.MAX_QUEUED_PLAYERS) self.allGamesFull = false;

			const counts = self._countFavouritesActiveAndQueuedInGame(gameState);

			const isAlreadyInserted = gameState.getId() in self.gameIcons;
			if (isAlreadyInserted) {
				self.gameIcons[gameState.getId()].icon.refresh(gameState, counts);
				self.gameIcons[gameState.getId()].button.refresh(counts);
			} else {
				const gameIconSprite = self.gameIconGroup.getFirstExists(false);
				if (gameIconSprite) {
					const newGameIcon = { icon: gameIconSprite, button: gameIconSprite.gameButton, placement: 0 };
					self.gameIcons[gameState.getId()] = newGameIcon;

					// Add to spawn queue
					self.gameIconScroller.enqueueGameIcon(newGameIcon.icon, [gameState, counts, self._joinGame.bind(self), self]);

					newGameIcon.button.refresh(counts);
				}
			}
		}

		// Spawn enqueued game icons
		for (const { icon } of Object.values(self.gameIcons)) self.gameIconScroller.spawnGameIcon(icon);
	} else {
		original(...args);
	}
}, { isClassy: true });

/** Override the lobby resize handler to call our group */
ProxyHelper.interceptFunction(Game.UILobbyState, '_onSizeChangeHandler', function() {
	this.log.debug('SIZE CHANGE!');

	// Move offline message.
	this.disconnectedIconGroup.position.set(this.game.width / 2.0, UIConstants.DISCONNECTED_ICON_Y);

	// Move random and create game buttons.
	this.randomGameButton.x = this.game.width / 3.0;
	this.randomGameInfo.x = this.game.width / 3.0;
	this.createGameButton.x = this.game.width / 3.0 * 2.0;
	this.createGameInfo.x = this.game.width / 3.0 * 2.0;
	this.localGameButton.x = this.game.width / 2.0;

	this.gameIconScroller.onSizeChangeHandler();
}, { isClassy: true });

export const _isESmodule = true;
