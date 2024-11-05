import ProxyHelper from '../utils/proxyHelper.js';
import { get, set } from '../common/store.js';

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

ProxyHelper.interceptFunction(TankTrouble.Statistics, 'init', (original, ...args) => {
	const result = original(...args);

	TankTrouble.Statistics.wrapper = $('<div id="statisticsSnippet" class="snippet teaser standard">');
	TankTrouble.Statistics.content = $('<div class="content">');
	TankTrouble.Statistics.header = $('<div class="header">Who has deployed?</div>');
	TankTrouble.Statistics.playerCount = $('<div id="onlinePlayerCount">');
	TankTrouble.Statistics.gameCount = $('<div id="onlineGameCount">');
	TankTrouble.Statistics.statisticsType = $('<div class="managedNavigation"></div>');

	get('statisticsState').then(state => {
		TankTrouble.Statistics.current = state;
		TankTrouble.Statistics.handleStatisticsChange(0);
		TankTrouble.Statistics.statisticsType.on('mouseup', () => TankTrouble.Statistics.handleStatisticsChange(1));
	});

	TankTrouble.Statistics.content.append([
		TankTrouble.Statistics.header,
		TankTrouble.Statistics.playerCount,
		TankTrouble.Statistics.gameCount,
		TankTrouble.Statistics.statisticsType
	]);
	TankTrouble.Statistics.wrapper.append([TankTrouble.Statistics.content]);

	$('#secondaryContent').append(TankTrouble.Statistics.wrapper);

	return result;
});

ProxyHelper.interceptFunction(TankTrouble.Statistics, '_updateStatistics', (original, ...args) => {
	const [serverId = ClientManager.multiplayerServerId, ...rest] = args;

	// Handle statistics for type local ("how many in server?")
	if (TankTrouble.Statistics.current === TankTrouble.Statistics.STATISTICS_SETTINGS.LOCAL) {
		ClientManager._getSelectedServerStats(serverId, (_success, _serverId, _latency, gameCount, playerCount) => {
			TankTrouble.Statistics._updateNumber(TankTrouble.Statistics.playerCount, playerCount);
			TankTrouble.Statistics._updateNumber(TankTrouble.Statistics.gameCount, gameCount, 'game');

			$('#statisticsSnippet').css('display', 'inline-block');
		});

		return null;
	}

	const result = original(serverId, ...rest);
	return result;
});

/**
 * Handle client events
 * @param {any} _self `this` context
 * @param {string} evt Client event type
 */
TankTrouble.Statistics._clientEventHandler = function(_self, evt) {
	switch (evt) {
		case TTClient.EVENTS.PLAYERS_AUTHENTICATED:
		{
			TankTrouble.Statistics._updateStatistics(ClientManager.multiplayerServerId);
			break;
		}
		default:
			break;
	}
};

ProxyHelper.whenContentInitialized().then(() => {
	ClientManager.getClient().addEventListener(TankTrouble.Statistics._clientEventHandler, TankTrouble.Statistics);
});

export const _isESmodule = true;
