import { get, set } from '../common/store.js';
import { interceptFunction, whenContentInitialized } from '../utils/gameUtils.js';

TankTrouble.Statistics.STATISTICS_SETTINGS = {
	LOCAL: 'local',
	GLOBAL: 'global'
};
TankTrouble.Statistics.STATISTICS_VALUES = {
	'local': {
		DESCRIPTION: 'Local'
	},
	'global': {
		DESCRIPTION: 'Global'
	}
};

/**
 * Shift the statistics type by an x amount
 * @param {number} change Indexies to move
 */
TankTrouble.Statistics.handleStatisticsChange = function(change = 1) {
	const settings = Object.values(this.STATISTICS_SETTINGS);
	const limit = settings.length;
	const nextIndex = (settings.indexOf(this.current) + change) % limit;

	this.current = settings[nextIndex];

	this.statisticsType.text(this.STATISTICS_VALUES[this.current].DESCRIPTION);
	this._updateStatistics();
	set('statisticsState', this.current);
};

/**
 * Initialize statistics snippet
 */
interceptFunction(TankTrouble.Statistics, 'init', function(original, ...args) {
	const result = original(...args);

	this.wrapper = $('<div id="statisticsSnippet" class="snippet teaser standard">');
	this.content = $('<div class="content">');
	this.header = $('<div class="header">Who has deployed?</div>');
	this.playerCount = $('<div id="onlinePlayerCount">');
	this.gameCount = $('<div id="onlineGameCount">');
	this.statisticsType = $('<div class="managedNavigation"></div>');

	get('statisticsState').then(state => {
		this.current = state;
		this.handleStatisticsChange(0);
		this.statisticsType.on('mouseup', () => this.handleStatisticsChange(1));
	});

	this.content.append([
		this.header,
		this.playerCount,
		this.gameCount,
		this.statisticsType
	]);
	this.wrapper.append([this.content]);

	$('#secondaryContent').append(this.wrapper);

	return result;
});

/**
 * Update statistics from data
 */
interceptFunction(TankTrouble.Statistics, '_updateStatistics', function(original, ...args) {
	const [serverId = ClientManager.multiplayerServerId, ...rest] = args;

	// Handle statistics for type local ("how many in server?")
	if (this.current === this.STATISTICS_SETTINGS.LOCAL) {
		ClientManager._getSelectedServerStats(serverId, (_success, _serverId, _latency, gameCount, playerCount) => {
			this._updateNumber(this.playerCount, playerCount);
			this._updateNumber(this.gameCount, gameCount, 'game');

			$('#statisticsSnippet').css('display', 'inline-block');
		});

		return null;
	}

	const result = original(serverId, ...rest);
	return result;
});

/**
 * Handle client events
 * @param {this} self `this` context
 * @param {string} evt Client event type
 */
// eslint-disable-next-line consistent-this
TankTrouble.Statistics._clientEventHandler = function(self, evt) {
	switch (evt) {
		case TTClient.EVENTS.PLAYERS_AUTHENTICATED:
		{
			self._updateStatistics(ClientManager.multiplayerServerId);
			break;
		}
		default:
			break;
	}
};

whenContentInitialized().then(() => {
	ClientManager.getClient().addEventListener(TankTrouble.Statistics._clientEventHandler, TankTrouble.Statistics);
});

export const _isESmodule = true;
