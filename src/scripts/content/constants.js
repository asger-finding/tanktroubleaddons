UIConstants.classFields({
	/* uigameiconscrollergroup.js */
	GAME_ICON_SCROLL_SPEED: 10 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	GAME_ICON_MARGIN_FROM_BORDER: 30 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	LOBBY_MAX_DRAG_SPEED: 850 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	LOBBY_SNAP_DISTANCE_TO_SPEED_SCALE: 8,
	LOBBY_SCROLL_DRAG: 0.9,
	LOBBY_BUTTON_SCROLL_OFFSET: 30 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	NO_GAMES_FONT_SIZE: 48 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	NO_GAMES_STROKE_WIDTH: 4 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	NO_GAMES_Y: 140 * (devicePixelRatio > 1 ? devicePixelRatio : 1),

	/* fullscreen.js */
	FULLSCREEN_GAME_MARGIN_X: 68 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	FULLSCREEN_GAME_MARGIN_Y: 28 * (devicePixelRatio > 1 ? devicePixelRatio : 1),

	/* killedbygroup.js */
	KILLED_BY_FONT_SIZE: 24 *  (devicePixelRatio > 1 ? devicePixelRatio : 1),
	KILLED_BY_STROKE_WIDTH: 4 * (devicePixelRatio > 1 ? devicePixelRatio : 1),
	// ms
	KILLED_BY_POP_OUT_TIME: 2_000,

	/* lobby.js */
	GAME_ICON_POOL_SIZE: 6,
	GAME_ICON_COUNT: 6,

	/* uigameiconimage.js */
	GAME_ICON_TANK_COUNT: UIConstants.TANK_POOL_SIZE,
	GAME_ICON_JOIN_GAME_BUTTON_Y: 130 * (devicePixelRatio > 1 ? devicePixelRatio : 1),

	/* gamesettings.js */
	SETTINGS_QUALITY_MAX_OPTION_HEIGHT: 200
});

/* gamesettings.js */
QualityManager.QUALITY_SETTINGS.MINIMUM = 'minimum';
QualityManager.QUALITY_VALUES[QualityManager.QUALITY_SETTINGS.MINIMUM] = {
	'tank explosion smoke count': 1,
	'tank explosion fragment count': 0,
	'missile launch smoke count': 2,
	'missile smoke frequency': 360,
	'mine explosion smoke count': 0,
	'crate land dust count': 2,
	'aimer min segment length': 0.5,
	'aimer off max segment length': 2,
	'aimer on max segment length': 1,
	'bullet puff count': 1,
	'shield inverse bolt probability': 1.0,
	'shield spark particles per emit': 1,
	'spawn zone inverse unstable particle probability': 1.0,
	'spawn zone num collapse particles': 10
};

