var UIConstants = Classy.newClass();

UIConstants.classFields({
    SCORE_CATEGORIES: {
        EMBLEM: 0,
        SCORE: 1,
        SEPARATOR: 2,
        TEAM: 3
    }
});

UIConstants.classFields({
    // Sizes in canvas pixels should be scaled when the canvas gets bigger. Therefore they are multiplied by the devicePixelRatio as the canvas size is also multiplied by this value.
    // Sizes in pixels should be scaled when a bigger image asset is used. Therefore they are multiplied by the resolution scale of the loaded assets.
    // Sizes in screen pixels never change. Therefore they are not scaled.

    SCALED_FOR_HIGH_DENSITY: false,
    ASSET_SCALE: 1.0,
    GAME_ASSET_SCALE: 2.0,
    SPINE_SCALE: 1.0,

    MAX_CLICK_LENGTH: 200,                     // ms

    MOUSE_INPUT:
        {
            MAX_REVERSE_DISTANCE: 200,               // screen px
            POSITION_DEAD_DISTANCE: 100,             // screen px
            POSITION_DEAD_ANGLE: 0.78,               // radian (~45 degrees)
            ROTATION_DEAD_ANGLE: 0.1                 // radian
        },

    SIGNUP_TYPING_SOUND_COUNT: 3,
    SIGNUP_TYPING_PAUSE: 500,         // ms
    SIGNUP_RANDOM_OPTIONS: 6,

    TANK_ICON_SIZES:
        {
            SMALL: "small",
            MEDIUM: "medium",
            LARGE: "large"
        },
    TANK_ICON_RESOLUTIONS:
        {
            "small": 140,                      // screen px
            "medium": 200,                     // screen px
            "large": 320                       // screen px
        },
    TANK_ICON_TINT_PARTS:
        {
            TURRET: "turret",
            TREAD: "tread",
            BASE: "base"
        },
    TANK_ICON_PARTS:
        {
            TURRET: "turret",
            BARREL: "barrel",
            LEFT_TREAD: "leftTread",
            RIGHT_TREAD: "rightTread",
            BASE: "base",
            TURRET_SHADE: "turretShade",
            BARREL_SHADE: "barrelShade",
            LEFT_TREAD_SHADE: "leftTreadShade",
            RIGHT_TREAD_SHADE: "rightTreadShade",
            BASE_SHADE: "baseShade"
        },
    TANK_ICON_ACCESSORY_PARTS:
        {
            TURRET: "turret",
            BARREL: "barrel",
            FRONT: "front",
            BACK: "back",
            TREAD: "tread",
            BACKGROUND: "background",
            BADGE: "badge"
        },

    TANK_UNAVAILABLE_COLOUR: {type: 'numeric', rawValue: '0x888888', numericValue: '0x888888', imageValue: ''},

    GAME_ICON_POOL_SIZE: 5,
    TANK_AVATAR_POOL_SIZE: 10,
    TANK_ICON_POOL_SIZE: 10,

    REFRESH_GAME_LIST_INTERVAL: 10000,          // ms
    INITIAL_SERVER_STATS_DELAY: 2000,           // ms
    REFRESH_SERVER_STATS_INTERVAL: 60000,       // ms

    ELEMENT_POP_IN_TIME: 300,                   // ms
    ELEMENT_GLIDE_OUT_TIME: 200,                // ms
    ELEMENT_MOVE_TIME: 300,                     // ms
    ELEMENT_SELECTION_TIME: 200,                // ms
    ELEMENT_DESELECTION_TIME: 200,              // ms

    GAME_ICON_COUNT: 3,
    GAME_ICON_WIDTH: 160,                       // canvas px
    GAME_ICON_HEIGHT: 120,                      // canvas px
    GAME_ICON_MARGIN: 120,                      // canvas px
    GAME_ICON_Y: 100,                           // canvas px

    LOGIN_BACKGROUND_TOP_MARGIN: 20,            // canvas px
    LOGIN_BACKGROUND_SIDE_MARGIN: 40,           // canvas px
    LOGIN_BACKGROUND_BOTTOM_MARGIN: 70,         // canvas px - should be related to the height of player panel

    BUTTON_SIZES:
        {
            SMALL: "small",
            MEDIUM: "medium",
            LARGE: "large"
        },
    BUTTON_RESOLUTIONS:
        {
            "small": 24,                        // screen px
            "medium": 34,                       // screen px
            "large": 52                         // screen px
        },
    BUTTON_HEIGHTS:
        {
            "small": 24,                        // canvas px
            "medium": 34,                       // canvas px
            "large": 52                         // canvas px
        },
    BUTTON_FONT_SIZES:
        {
            "small": 12.6,                      // canvas px
            "medium": 16.8,                     // canvas px
            "large": 28                         // canvas px
        },
    BUTTON_MARGINS:
        {
            "small": 5,                         // canvas px
            "medium": 10,                       // canvas px
            "large": 20                         // canvas px
        },
    BUTTON_SHADOW_WIDTH: 6,                     // canvas px
    BUTTON_SHADOW_HEIGHT_TOP: 3,                // canvas px
    BUTTON_SHADOW_HEIGHT_BOTTOM: 9,             // canvas px
    BUTTON_ACTIVE_OFFSET: 2,                    // canvas px
    BUTTON_FONT_BASELINE_FRACTION: 170 / 1000,

    OVERLAY_FADE_TIME: 200,                     // ms

    MENU_BACKGROUND_MIN_TOP_MARGIN: 10,         // canvas px
    MENU_BACKGROUND_HEIGHT_RATIO: 0.81,
    MENU_BACKGROUND_Y_RATIO: 0.43,
    MENU_BUTTON_WIDTHS:
        {
            "small": 80,                        // canvas px
            "medium": 120,                      // canvas px
            "large": 200                        // canvas px
        },
    MENU_BUTTON_SPACINGS:
        {
            "small": 10,                        // canvas px
            "medium": 15,                       // canvas px
            "large": 25                         // canvas px
        },
    MENU_BUTTON_BACKGROUND_Y_RATIO: 0.93,       // canvas px
    MENU_LAIKA_X: -148,                         // canvas px
    MENU_LAIKA_MIN_EVENT_DELAY: 15,             // s
    MENU_LAIKA_MAX_EVENT_DELAY: 30,             // s
    MENU_LAIKA_Y: 16,                           // canvas px
    MENU_LAIKA_GROWL_TIME: 2000,                // ms
    MENU_LAIKA_HOWL_TIME: 2500,                 // ms
    MENU_DIMITRI_X: 98,                         // canvas px
    MENU_DIMITRI_Y: -33,                        // canvas px
    MENU_DIMITRI_MIN_EVENT_DELAY: 15,           // s
    MENU_DIMITRI_MAX_EVENT_DELAY: 30,           // s
    MENU_DIMITRI_SCOWL_TIME: 3000,              // ms

    BUTTON_INFO_FONT_SIZE: 14,                  // canvas px

    DISCONNECTED_ICON_Y: 110,                   // canvas px
    DISCONNECTED_HEADER_Y: -74,                 // canvas px
    DISCONNECTED_MESSAGE_Y: 64,                 // canvas px
    DISCONNECTED_HEADER_FONT_SIZE: 24,          // canvas px
    DISCONNECTED_HEADER_STROKE_WIDTH: 4,        // canvas px
    DISCONNECTED_MESSAGE_FONT_SIZE: 16,         // canvas px
    DISCONNECTED_MESSAGE_STROKE_WIDTH: 4,       // canvas px
    DISCONNECTED_MESSAGE_UPDATE_TIME: 2800,     // ms
    DISCONNECTED_DELAY_TIME: 100,               // ms

    CONNECTING_MESSAGES:
        [
            "Establishing communications",
            "Making contact",
            "Calling for backup",
            "Awaiting signal",
            "Wiring telegram",
            "Telegraphing code",
            "Negotiating terms",
            "Preparing nukes",
            "Reloading turrets",
            "Reheating the Cold War",
            "Cleaning the pipes",
            "Broadcasting propaganda"
        ],

    USERNAME_FONT_SIZE: 24,                     // canvas px
    USERNAME_STROKE_WIDTH: 4,                   // canvas px

    TANK_NAME_FONT_SIZE: 32,                    // screen px
    TANK_NAME_STROKE_WIDTH: 8,                  // screen px
    TANK_NAME_MARGIN: 5,                        // canvas px

    JOIN_GAME_BUTTON_INFO_Y: 31,                // canvas px
    JOIN_GAME_BUTTON_Y: 218,                    // canvas px

    RANDOM_GAME_BUTTON_INFO_Y: 40,              // canvas px
    CREATE_GAME_BUTTON_INFO_Y: 40,              // canvas px

    TANK_ICON_WIDTH_SMALL: 140,                 // px
    TANK_ICON_HEIGHT_SMALL: 84,                 // px
    TANK_ICON_WIDTH_MEDIUM: 200,                // px
    TANK_ICON_HEIGHT_MEDIUM: 120,               // px
    TANK_ICON_WIDTH_LARGE: 320,                 // px
    TANK_ICON_HEIGHT_LARGE: 192,                // px
    TANK_ICON_PLACEMENTS:                       // px
        [
            {x: -70, y: 35, flipped: false},
            {x: 70, y: 35, flipped: true},
            {x: -70, y: -60, flipped: false},
            {x: 70, y: -60, flipped: true}
        ],
    TANK_NAME_PLACEMENTS:                       // px
        [
            {x: -70, y: 75},
            {x: 70, y: 75},
            {x: -70, y: -20},
            {x: 70, y: -20}
        ],
    AVATAR_LAIKA_X: 190,                       // canvas px
    AVATAR_LAIKA_Y: 40,                         // canvas px
    AVATAR_LAIKA_SCALE: 0.3,
    AVATAR_LAIKA_GROWL_TIME: 1500,              // ms
    AVATAR_LAIKA_WHIMPER_TIME: 2000,            // ms
    AVATAR_LAIKA_GASP_TIME: 1500,               // ms
    AVATAR_LAIKA_GLOAT_CHANCE: 0.3,
    AVATAR_LAIKA_HOWL_TIME: 2000,               // ms
    AVATAR_DIMITRI_X: 100,                      // canvas px
    AVATAR_DIMITRI_Y: 40,                       // canvas px
    AVATAR_DIMITRI_SCALE: 0.4,
    AVATAR_DIMITRI_GASP_CHANCE: 0.4,
    AVATAR_DIMITRI_GASP_TIME: 1500,             // ms
    AVATAR_DIMITRI_GLOAT_CHANCE: 0.4,
    AVATAR_DIMITRI_SCOWL_TIME: 2000,            // ms
    TANK_ICON_OUTLINE_WIDTH: 1,                 // canvas px

    CONTROL_SELECTED_WAIT_TIME: 500,            // ms

    WEAPON_ICON_WIDTH: 36,                      // px
    WEAPON_ICON_MAX_SCALE: 0.8,
    WEAPON_ICON_SCALE_STEP: 0.1,

    FAVOURITE_ICON_WIDTH: 20,                   // px
    FAVOURITE_ICON_HEIGHT: 20,                  // px

    ROUND_TIMER_FONT_SIZE: 15,                  // px
    ROUND_TIMER_OFFSET_X: 10,                   // px
    ROUND_TIMER_OFFSET_Y: 10,                  // px
    ROUND_TIMER_SHADOW_BLUR: 3,                 // px

    LEAVE_GAME_BUTTON_WIDTH: 35,                // canvas px
    LEAVE_GAME_MESSAGE_FONT_SIZE: 16,           // canvas px
    LEAVE_GAME_MESSAGE_STROKE_WIDTH: 4,         // canvas px
    LEAVE_GAME_MESSAGE_DELAY: 200,              // ms
    LEAVE_GAME_MARGIN: 28,                      // canvas px

    RANK_ICON_WIDTH: 22,                        // px
    RANK_ICON_HEIGHT: 24,                       // px

    GUEST_ICON_WIDTH: 14,                        // px
    GUEST_ICON_HEIGHT: 24,                       // px

    WAITING_ICON_WIDTH: 199,                    // canvas px
    WAITING_ICON_HEIGHT: 210,                   // canvas px
    WAITING_HEADER_Y: -128,                     // canvas px
    WAITING_MESSAGE_Y: 128,                     // canvas px
    WAITING_MAX_DOTS: 3,
    WAITING_UPDATE_TIME: 200,                   // ms
    WAITING_HEADER_FONT_SIZE: 24,               // canvas px
    WAITING_HEADER_STROKE_WIDTH: 4,             // canvas px
    WAITING_MESSAGE_FONT_SIZE: 16,              // canvas px
    WAITING_MESSAGE_STROKE_WIDTH: 4,            // canvas px

    WAITING_FOR_ROUND_TITLE_TIME: 1000,         // ms
    WAITING_FOR_MAZE_REMOVAL_TIME: 1000,        // ms - related to Constants.BETWEEN_ROUNDS_DURATION FIXME Maybe replace with that constant?
    WAITING_FOR_PLAYERS_DELAY_TIME: 1500,       // ms
    WAITING_FOR_CELEBRATION_TIME: 7000,         // ms - related to Constants.CELEBRATION_DURATION FIXME Maybe replace with that constant?

    CELEBRATION_TROPHY_LIFETIME: 1.0,           // s
    CELEBRATION_TANK_LIFETIME: 5.5,             // s
    CELEBRATION_PRIZE_HANDOUT_TIME: 3.5,         // s

    CELEBRATION_HEADER_Y: -128,                 // canvas px
    CELEBRATION_HEADER_FONT_SIZE: 24,           // canvas px
    CELEBRATION_HEADER_STROKE_WIDTH: 4,         // canvas px

    TROPHY_EXPLOSION_Y: 55,                     // canvas px
    TROPHY_EXPLOSION_MIN_X_SPEED: -80,          // canvas px/s
    TROPHY_EXPLOSION_MAX_X_SPEED: 80,           // canvas px/s
    TROPHY_EXPLOSION_MIN_Y_SPEED: -110,         // canvas px/s
    TROPHY_EXPLOSION_MAX_Y_SPEED: 30,           // canvas px/s
    TROPHY_EXPLOSION_DRAG_X: 25,                // canvas px related
    TROPHY_EXPLOSION_DRAG_Y: 37,                // canvas px related
    TROPHY_EXPLOSION_FLOOR_Y: 90,               // canvas px
    TROPHY_FRAGMENT_MIN_SPEED: 170,             // canvas px/s
    TROPHY_FRAGMENT_MAX_SPEED: 270,             // canvas px/s
    TROPHY_FRAGMENT_MAX_ROTATION_SPEED: 30.0,    // radian/s
    TROPHY_FRAGMENT_MIN_ANGLE: -1.0367,          // -pi * 0.33
    TROPHY_FRAGMENT_MAX_ANGLE: -2.0734,          // -pi * 0.66
    TROPHY_FRAGMENT_GRAVITY: 250,               // canvas px related
    TROPHY_FRAGMENT_POOL_SIZE: 12,
    TROPHY_BASE_FRAGMENT_POOL_SIZE: 4,
    TROPHY_BASE_FRAGMENT_EXPLOSION_OFFSET: 30,  // canvas px

    CONFETTI_COLORS: [0x0a3bdb, 0xe14041, 0x17a01a, 0xf7ef5c, 0xdc771e, 0xbb169f],
    CONFETTI_MIN_X_SPEED: -300,             // canvas px/s
    CONFETTI_MAX_X_SPEED: 300,              // canvas px/s
    CONFETTI_MIN_Y_SPEED: -430,             // canvas px/s
    CONFETTI_MAX_Y_SPEED: 50,               // canvas px/s
    CONFETTI_DRAG: 200,                     // canvas px related
    CONFETTI_GRAVITY: 250,                  // canvas px related
    CONFETTI_WOBBLE_KICK_IN_SPEED: 1.5,     // canvas px/s
    CONFETTI_WOBBLE_MIN_FREQUENCY: 2.5,
    CONFETTI_WOBBLE_MAX_FREQUENCY: 7.5,
    CONFETTI_WOBBLE_AMPLITUDE: 5,           // canvas px
    CONFETTI_Y_VARIATION: 20,               // canvas px

    STREAMER_MIN_SPEED: 250,                    // canvas px/s
    STREAMER_MAX_SPEED: 300,                    // canvas px/s
    STREAMER_MIN_ANGLE: -0.785398,                // -pi * 0.25
    STREAMER_MAX_ANGLE: -2.35619,                // -pi * 0.75
    STREAMER_LIFETIME: 2.5,                     // s
    STREAMER_WIDTH: 6,                          // canvas px
    STREAMER_FREQUENCY: 0.1,
    STREAMER_AMPLITUDE_X: 10,                   // canvas px
    STREAMER_AMPLITUDE_Y: 8.5,                  // canvas px

    TANK_PANEL_MAX_WIDTH: 800,                  // canvas px
    TANK_PANEL_MAX_HEIGHT: 180,                 // canvas px
    TANK_PANEL_SIDE_MARGIN: 30,                 // canvas px
    TANK_PANEL_MIN_WIDTH_PER_ICON: 137,         // canvas px
    TANK_PANEL_MAX_ICONS_BEFORE_INTERLEAVING: 3,
    TANK_PANEL_ICON_INTERLEAVE_SCALE: 0.9,
    TANK_PANEL_INTERLEAVE_HEIGHT: 20,           // canvas px
    TANK_PANEL_INTERLEAVE_OFFSET: 8,            // canvas px
    TANK_PANEL_ICON_BOTTOM_MARGIN: 50,          // canvas px
    TANK_PANEL_NAME_BOTTOM_MARGIN: 54,          // canvas px
    TANK_PANEL_SCORE_BOTTOM_MARGIN: 30,         // canvas px

    RANK_LEVEL_UP_SPARKLE_POOL_SIZE: 12,
    RANK_LEVEL_DOWN_SHAKE_OFFSET: 1.5,          // canvas px
    RANK_LEVEL_DOWN_TEAR_MIN_OFFSET: 7.5,       // canvas px
    RANK_LEVEL_DOWN_TEAR_RANDOM_OFFSET: 10,     // canvas px
    RANK_LEVEL_DOWN_TEAR_Y_OFFSET: 2.5,         // canvas px

    SCORE_EXPLOSION_Y: 9,                       // canvas px
    SCORE_EXPLOSION_MIN_X_SPEED: -60,           // canvas px/s
    SCORE_EXPLOSION_MAX_X_SPEED: 60,            // canvas px/s
    SCORE_EXPLOSION_MIN_Y_SPEED: -110,          // canvas px/s
    SCORE_EXPLOSION_MAX_Y_SPEED: -40,           // canvas px/s
    SCORE_EXPLOSION_DRAG: 50,                   // canvas px related
    SCORE_FRAGMENT_MIN_SPEED: 50,               // canvas px/s
    SCORE_FRAGMENT_MAX_SPEED: 150,              // canvas px/s
    SCORE_FRAGMENT_MAX_ROTATION_SPEED: 30.0,    // radian/s
    SCORE_FRAGMENT_MIN_ANGLE: -1.0367,          // -pi * 0.33
    SCORE_FRAGMENT_MAX_ANGLE: -2.0734,          // -pi * 0.66
    SCORE_FRAGMENT_POOL_SIZE: 30,
    MAX_SCORE_FRAGMENTS_PER_EXPLOSION: 15,
    MIN_SCORE_FRAGMENTS_PER_LETTER: 5,
    SCORE_FONT_SIZE: 20,                        // canvas px
    SCORE_STROKE_WIDTH: 4,                      // canvas px
    PLAYER_PANEL_GRAVITY: 175,                  // canvas px / s^2

    GAME_MODE_NAME_INFO: [
        // Classic.
        {
            NAME: 'Last Tank Standing',
            ICON: -1
        },
        // Boot camp.
        {
            NAME: 'Boot Camp',
            ICON: -1
        },
        // Deathmatch.
        {
            NAME: 'Deathmatch',
            ICON: 0
        }
    ],

    GAME_MODE_SCORE_ITEM_INFO: [
        // Classic.
        {
            ITEM_CONFIG: [
                {category: UIConstants.SCORE_CATEGORIES.EMBLEM, type: Constants.EMBLEM_TYPES.TERMINATOR, anchorX: 0.5},
                {category: UIConstants.SCORE_CATEGORIES.SCORE, type: Constants.SCORE_TYPES.KILL, anchorX: 1.0},
                {category: UIConstants.SCORE_CATEGORIES.SEPARATOR, type: null, anchorX: 0.5},
                {category: UIConstants.SCORE_CATEGORIES.SCORE, type: Constants.SCORE_TYPES.VICTORY, anchorX: 0.0},
                {category: UIConstants.SCORE_CATEGORIES.EMBLEM, type: Constants.EMBLEM_TYPES.DOMINATOR, anchorX: 0.5}
            ],
            CENTER_ITEM: 2
        },
        // Boot camp.
        {
            ITEM_CONFIG: [
                {category: UIConstants.SCORE_CATEGORIES.SCORE, type: Constants.SCORE_TYPES.KILL, anchorX: 1.0},
                {category: UIConstants.SCORE_CATEGORIES.SEPARATOR, type: null, anchorX: 0.5},
                {category: UIConstants.SCORE_CATEGORIES.SCORE, type: Constants.SCORE_TYPES.VICTORY, anchorX: 0.0}
            ],
            CENTER_ITEM: 1
        },
        // Deathmatch.
        {
            ITEM_CONFIG: [
                {category: UIConstants.SCORE_CATEGORIES.EMBLEM, type: Constants.EMBLEM_TYPES.TERMINATOR, anchorX: 0.5},
                {category: UIConstants.SCORE_CATEGORIES.SCORE, type: Constants.SCORE_TYPES.KILL, anchorX: 0.5}
            ],
            CENTER_ITEM: 1
        }
    ],

    SCORE_ITEM_INFO: [
        // Emblem
        {paddingX: 5, offsetY: -4}, // px
        // Score
        {paddingX: 0, offsetY: 0},  // px
        // Separator
        {paddingX: 1.5, offsetY: -2}  // px, screen px - really px but treating it as screen px makes it look good on both retina and non-retina displays
    ],

    THEME_MUSIC: [
        // Standard.
        'assets/audio/RussianMarch.m4a',
        // Halloween.
        'assets/audio/HalloweenTheme.m4a',
        // Christmas.
        'assets/audio/RussianMarch.m4a'
    ],

    ERROR_WIDTH: 280,                           // screen px

    TANK_INFO_WIDTH: 218,                       // screen px
    TANK_INFO_MAX_NUMBER_WIDTH: 58,             // screen px

    RANK_TITLES: [
        'Dog Food',
        'Lab Rat',
        'Intern',
        'Scavenger',
        'Cadet',
        'Sergeant',
        'Captain',
        'Commander',
        'Jr. Scientist',
        'Scientist',
        'Lead Scientist',
        'Mad Scientist'
    ],

    RANK_LEVELS: [
        5,
        10,
        25,
        50,
        100,
        150,
        250,
        500,
        1000,
        1500,
        2000   // Remember to change backend value when adding more rank levels.
    ],

    XP_LEVELS: [
        1000,
        3000,
        6000,
        10000,
        15000,
        21000,
        28000,
        36000,
        45000,
        55000,
        66000,
        78000,
        91000,
        105000,
        120000,
        136000,
        153000,
        171000,
        190000   // Remember to change backend value when adding more xp levels.
    ],


    SETTINGS_WIDTH: 250,                        // screen px
    SETTINGS_SERVER_SELECT_HEIGHT: 30,          // screen px
    SETTINGS_SERVER_MAX_OPTION_HEIGHT: 280,     // screen px
    SETTINGS_QUALITY_SELECT_HEIGHT: 30,         // screen px
    SETTINGS_QUALITY_MAX_OPTION_HEIGHT: 110,    // screen px
    SETTINGS_QUALITY_FPS_AVG_WEIGHT: 0.15,
    SETTINGS_QUALITY_FPS_MIN_SAMPLES: 300,
    SETTINGS_QUALITY_FPS_CHANGE_TO_LOW: 30,
    SETTINGS_QUALITY_FPS_SAMPLE_UPDATE_INTERVAL: 120,

    MAXIMUM_GOOD_LATENCY: 150,                  // ms
    MAXIMUM_AVERAGE_LATENCY: 300,               // ms

    MINIMUM_GOOD_FPS: 55,
    MINIMUM_AVERAGE_FPS: 45,

    SELECT_USER_WIDTH_PER_USER: 114,            // screen px

    REQUEST_MAZE_INTERVAL: 1000,                // ms

    COUNT_DOWN_POOL_SIZE: 3,
    TANK_POOL_SIZE: 4,
    TANK_NAME_POOL_SIZE: 4,
    CRATE_POOL_SIZE: 3,
    GOLD_POOL_SIZE: 3,
    DIAMOND_SHINE_POOL_SIZE: 1,
    DIAMOND_POOL_SIZE: 1,
    SPARKLE_POOL_SIZE: 12,
    PROJECTILE_POOL_SIZE: 20,
    MISSILE_POOL_SIZE: 4,
    LASER_POOL_SIZE: 4,
    AIMER_POOL_SIZE: 4,
    SPAWN_ZONE_POOL_SIZE: 4,
    SHIELD_POOL_SIZE: 4,
    TANK_FEATHER_POOL_SIZE: 50,
    EXPLOSION_POOL_SIZE: 4,
    BULLET_PUFF_POOL_SIZE: 100,
    MISSILE_LAUNCH_SMOKE_POOL_SIZE: 40,
    CHAT_SYMBOL_POOL_SIZE: 4,
    WEAPON_SYMBOL_POOL_SIZE: 4,

    ROUND_TITLE_FONT_SIZE: 48,                  // canvas px
    ROUND_TITLE_STROKE_WIDTH: 4,                // canvas px
    ROUND_RANKED_FONT_SIZE: 24,                 // canvas px
    ROUND_TITLE_SPACING: 40,                    // canvas px
    ROUND_TITLE_OFFSET: -100,                   // canvas px
    ROUND_TITLE_DISPLAY_TIME: 2000,             // ms

    COUNT_DOWN_DISPLAY_TIME: 500,               // ms
    TANK_NAME_DISPLAY_TIME: 2.5,                // s
    CHAT_SYMBOL_DISPLAY_TIME: 3.0,              // s

    TANK_LOCAL_SMOOTHING: 1,
    TANK_ONLINE_SMOOTHING: 3,

    TANK_LEFT_TREAD_X: -13,                     // px
    TANK_RIGHT_TREAD_X: 13,                     // px
    TANK_TURRET_Y: -8,                          // px

    TANK_TREAD_FORWARD_SPEED: 0.108,            // frames/ms
    TANK_TREAD_INNER_FORWARD_SPEED: 0.024,      // frames/ms
    TANK_TREAD_BACK_SPEED: 0.084,               // frames/ms
    TANK_TREAD_INNER_BACK_SPEED: 0.012,         // frames/ms
    TANK_TREAD_TURN_SPEED: 0.069,               // frames/ms

    LASER_RETRACTION_TIME: 0.05,                // s
    LASER_WIDTH: 4,                             // screen px

    MISSILE_LAUNCH_MIN_SPEED: 70,               // screen px
    MISSILE_LAUNCH_MAX_SPEED: 90,               // screen px
    MISSILE_SMOKE_COLOUR: 0x000000,
    MISSILE_TARGETING_SOUND_INTERVAL_PER_TILE: 0.2, // s

    AIMER_WIDTH: 4,                             // screen px
    AIMER_OFFSET: 50,                           // screen px
    AIMER_MIN_STEP_LENGTH: 0.01,                // m

    SHIELD_SPARK_BOLT_POOL_SIZE: 10,
    SHIELD_SPARK_SPEED: 150,                    // screen px/s
    SHIELD_SPARK_RANDOM_SPEED: 75,              // screen px/s
    SHIELD_SPAWN_TIME: 300,                     // ms
    SHIELD_LAYER_1_ROTATION_SPEED: 0.4,         // radian/s
    SHIELD_LAYER_2_ROTATION_SPEED: -0.25,       // radian/s
    SHIELD_NUM_BOLTS: 5,
    SHIELD_BOLT_MIN_ROTATION_SPEED: 0.3,        // radian/s
    SHIELD_BOLT_MAX_ROTATION_SPEED: 0.6,        // radian/s
    SHIELD_BREAK_TIME: 200,                     // ms
    INVERSE_SHIELD_WEAKENED_FLICKER_PROBABILITY: 0.5,
    SHIELD_WEAKENED_FLICKER_ALPHA_MIN: 0.2,
    SHIELD_WEAKENED_FLICKER_ALPHA_MAX: 0.7,
    INVERSE_SHIELD_SPARK_PROBABILITY_IN_COLLISION: 0.85,

    COUNTER_TIMER_POOL_SIZE: 2,
    TIMER_TOP_MARGIN: 20,                       // canvas px
    TIMER_SPACING: 6,                           // canvas px
    TIMER_FONT_SIZE: 24,                        // canvas px
    TIMER_STROKE_WIDTH: 4,                      // canvas px
    TIMER_COUNT_SCALE: 1.3,
    TIMER_EMPHASIZE_SCALE: 1.5,

    OVERTIME_BLINK_SPEED: 10,
    OVERTIME_BLINK_COLORS: [0xff0000, 0xffff00],
    OVERTIME_SCALE_TIME: 500,                              // ms
    OVERTIME_SCALE: 1.2,

    SPAWN_ZONE_SPAWN_TIME: 300,                             // ms
    SPAWN_ZONE_NUM_BOLTS: 5,
    SPAWN_ZONE_HOLE_EXPANSION_TIME: 0.5,                    // s
    SPAWN_ZONE_HOLE_EXPANSION_SIZE: 5,                      // screen px
    SPAWN_ZONE_SPARK_SPEED: 150,                            // screen px/s
    SPAWN_ZONE_SPARK_RANDOM_SPEED: 25,                      // screen px/s
    SPAWN_ZONE_HOLE_1_ROTATION_SPEED: 0.5,                  // radian/s
    SPAWN_ZONE_HOLE_2_ROTATION_SPEED: -0.25,                // radian/s
    SPAWN_ZONE_SWIRL_1_ROTATION_SPEED: 1.0,                 // radian/s
    SPAWN_ZONE_SWIRL_2_ROTATION_SPEED: -1.2,                // radian/s
    INVERSE_SPAWN_ZONE_STABLE_BOLT_PROBABILITY: 0.99,
    INVERSE_SPAWN_ZONE_UNSTABLE_BOLT_PROBABILITY: 0.97,
    SPAWN_ZONE_UNSTABLE_SHAKE: 2,                           // screen px
    SPAWN_ZONE_UNSTABLE_BOLT_OFFSET: 10,                    // screen px
    SPAWN_ZONE_UNSTABLE_PARTICLE_OFFSET: 50,                // screen px
    SPAWN_ZONE_UNSTABLE_PARTICLE_SPEED: -1.5,               // screen px/s
    SPAWN_ZONE_COLLAPSE_MIN_PARTICLE_SPEED: 0.7,            // screen px/s
    SPAWN_ZONE_COLLAPSE_MAX_PARTICLE_SPEED: 1.2,            // screen px/s
    SPAWN_ZONE_BREAK_DELAY: 300,                            // ms
    SPAWN_ZONE_BREAK_TIME: 200,                             // ms

    TANK_FEATHER_COUNT: 30,

    CRATE_SPAWN_TIME: 500,                      // ms

    GOLD_SPAWN_TIME: 500,                       // ms
    GOLD_MIN_ROTATION_SPEED: 18.0,              // radian/s
    GOLD_MAX_ROTATION_SPEED: 22.0,              // radian/s
    GOLD_SPARKLE_MIN_INTERVAL_TIME: 500,        // ms
    GOLD_SPARKLE_MAX_INTERVAL_TIME: 1500,       // ms

    DIAMOND_SPAWN_TIME: 500,                    // ms
    DIAMOND_GLOW_SCALE_CYCLE_SPEED: 2.0,        // s
    DIAMOND_FIRST_RAY_OPACITY_CYCLE_SPEED: 2.0, // s
    DIAMOND_FIRST_RAY_ROTATION_SPEED: 0.5,      // radian/s
    DIAMOND_SECOND_RAY_OPACITY_CYCLE_SPEED: 3.0,// s
    DIAMOND_SECOND_RAY_OPACITY_CYCLE_PHASE: 1.0,// s
    DIAMOND_SECOND_RAY_ROTATION_SPEED: 0.5,     // radian/s
    DIAMOND_SPARKLE_MIN_INTERVAL_TIME: 500,     // ms
    DIAMOND_SPARKLE_MAX_INTERVAL_TIME: 1500,    // ms

    SPARKLE_ANIMATION_TIME: 500,                // ms

    EXPLOSION_FRAGMENT_COUNT: 15,
    EXPLOSION_FRAGMENT_COLLISION_TIME: 0.1,     // s
    EXPLOSION_FRAGMENT_MIN_LIFETIME: 2.0,       // s
    EXPLOSION_FRAGMENT_MAX_LIFETIME: 3.0,       // s
    EXPLOSION_FRAGMENT_MIN_SPEED: 50,           // screen px/s
    EXPLOSION_FRAGMENT_MAX_SPEED: 300,          // screen px/s
    EXPLOSION_FRAGMENT_MAX_ROTATION_SPEED: 30.0,// radian/s

    RUBBLE_FRAGMENT_POOL_SIZE: 25,
    INVERSE_RUBBLE_SPAWN_PROBABILITY_IN_THE_OPEN: 0.99,
    INVERSE_RUBBLE_SPAWN_PROBABILITY_IN_COLLISION: 0.83,
    RUBBLE_FRAGMENT_MIN_LIFETIME: 0.5,       // s
    RUBBLE_FRAGMENT_MAX_LIFETIME: 0.8,       // s
    RUBBLE_FRAGMENT_SPEED_SCALE: 25,
    RUBBLE_FRAGMENT_RANDOM_SPEED: 120,       // screen px/s
    RUBBLE_FRAGMENT_MAX_ROTATION_SPEED: 40.0,// radian/s
    RUBBLE_SMOKE_SPEED_SCALE: 15,
    RUBBLE_SMOKE_RANDOM_SPEED: 65,          // screen px/s
    RUBBLE_TREAD_OFFSET: 26,                // screen px

    MAZE_SIDE_MARGIN: 20,                       // canvas px
    MAZE_TOP_MARGIN: 10,                        // canvas px
    MAZE_BOTTOM_MARGIN: 140,                    // canvas px - should be related to the height of player panel

    TANK_EXPLOSION_CAMERA_SHAKE: 15,            // canvas px
    MAX_CAMERA_SHAKE: 25,                       // canvas px
    CAMERA_SHAKE_FADE: 0.5,                     // canvas px/frame

    LAIKA: {
        TRACKS: {
            TORSO: 0,
            HEAD: 1,
            EYES: 2,
            MOUTH: 3,
            HOWL: 4,
            EARS: 5,
            TOES: 6,
            CHAIN: 7
        },
        DEFAULT_MIX_TIME: 0.4,                  // s
        HOWL_MIX_TIME: 0.2,                     // s
        MIN_TOE_ROLL_DELAY: 3,                  // s
        MAX_TOE_ROLL_DELAY: 15,                 // s
        MIN_BLINK_DELAY: 5,                     // s
        MAX_BLINK_DELAY: 8,                     // s
        BLINK_TIME: 0.2,                        // s
        LASER_BLINK_TIME: 0.1,                  // s
        LASER_BLINK_PROBABILITY: 0.1,
        LASER_NUM_BLINKS: 3,
        LASER_TIME: 3,                          // s
        NUM_HOWLS: 3,
        MIN_HOWL_TIME: 0.3,                     // s
        MAX_HOWL_TIME: 0.5,                     // s
        CHAIN_RATTLE_DELAY: 200                 // ms
    },

    DIMITRI: {
        TRACKS: {
            TORSO: 0,
            HEAD: 1,
            EYES: 2,
            MOUTH: 3,
            SCHNURRBART: 4,
            HANDS: 5,
            HIP: 6,
            FOOT: 7
        },
        DEFAULT_MIX_TIME: 0.4,                  // s
        FOOT_TAP_MIX_TIME: 0.1,                 // s
        MIN_LEGS_DELAY: 7,                      // s
        MAX_LEGS_DELAY: 13,                     // s
        MIN_WIGGLE_DELAY: 5,                    // s
        MAX_WIGGLE_DELAY: 11,                   // s
        SCHNURRBART_NUM_WIGGLES: 2,
        HIP_BOUNCE_PROBABILITY: 0.33,
        HIP_NUM_BOUNCES: 3,
        FOOT_SCRATCH_PROBABILITY: 0.33,
        FOOT_NUM_SCRATCHES: 5,
        FOOT_NUM_TAPS: 3
    },

    CONNECTION_ERROR_MESSAGE_OFFSET: 30,        // canvas px
    CONNECTION_ERROR_MESSAGE_FONT_SIZE: 16,     // canvas px
    CONNECTION_ERROR_MESSAGE_STROKE_WIDTH: 4,   // canvas px

    GARAGE_TANK_ICON_MARGIN: 115,               // canvas px
    SPRAY_CAN_POOL_SIZE: 30,
    PER_SPRAY_CAN_SPAWN_DELAY: 90,              // ms
    SPRAY_CAN_WIDTH: 40,                        // px
    SPRAY_CAN_DRAG_MARGIN: 5,                   // canvas px
    GARAGE_SPRAY_ZONE_TURRET_Y: 0.05,
    GARAGE_SPRAY_ZONE_TREAD_X: 0.015,
    GARAGE_SPRAY_ZONE_OUTSIDE_MIN_Y: -0.22,
    GARAGE_SPRAY_ZONE_OUTSIDE_MAX_Y: 0.45,
    GARAGE_SPRAY_ZONE_OUTSIDE_X: 0.3,
    GARAGE_SPRAY_START_X: 0.32,
    GARAGE_SPRAY_TURRET_END_X: -0.21,
    GARAGE_SPRAY_TREAD_END_X: -0.35,
    GARAGE_SPRAY_BASE_END_X: -0.31,
    GARAGE_SPRAY_TURRET_Y: 0.1,
    GARAGE_SPRAY_TREAD_Y: 0.4,
    GARAGE_SPRAY_BASE_Y: 0.38,
    GARAGE_SPRAY_SHAKE_PROBABILITY: 0.15,       // probability
    GARAGE_SPRAY_SHAKE_TIME: 80,                // ms
    GARAGE_SPRAY_NUM_SHAKES: 6,
    GARAGE_SPRAY_SHAKE_OFFSET: 25,              // canvas px
    GARAGE_SPRAY_SHAKE_MAX_ROTATION: 0.2,       // radian
    GARAGE_SPRAY_TIME: 800,                     // ms
    GARAGE_SPRAY_PARTICLE_TIME: 1500,           // ms
    GARAGE_SPRAY_OFFSET_X: 0.0,
    GARAGE_SPRAY_OFFSET_Y: -0.43,
    SPRAY_MIN_X_SPEED: -120,                    // canvas px/s
    SPRAY_MAX_X_SPEED: 60,                      // canvas px/s
    SPRAY_MIN_Y_SPEED: -70,                     // canvas px/s
    SPRAY_MAX_Y_SPEED: 70,                      // canvas px/s
    SPRAY_DRAG: 25,                             // canvas px/s^2
    SPRAY_RADIUS: 16,                           // canvas px
    SPRAY_INNER_RADIUS: 2,                      // canvas px
    ACCESSORIES_PER_ROW: 8,
    PER_ACCESSORY_SPAWN_DELAY: 90,              // ms
    ACCESSORY_FLY_OUT_TIME: 600,                // ms
    ACCESSORY_WIDTH: 65,                        // px
    ACCESSORY_HEIGHT: 65,                       // px
    GARAGE_MAX_DRAG_SPEED: 850,                 // canvas px/s
    GARAGE_SNAP_DISTANCE_TO_SPEED_SCALE: 8.0,
    GARAGE_TANK_ICON_SCROLL_SPEED: 600,         // canvas px/s
    GARAGE_BOX_SCROLL_SPEED: 400,               // canvas px/s
    GARAGE_ACCESSORY_SCROLL_SPEED: 400,         // canvas px/s
    GARAGE_BUTTON_SCROLL_OFFSET: 50,            // canvas px
    GARAGE_SCROLL_DRAG: 0.9,
    WELDER_SAMPLE_CELL_SIZE: 5,                 // px
    WELDER_SAMPLE_JITTER_SIZE: 5,               // px
    GARAGE_WELD_SMOKE_TIME: 700,                // ms
    GARAGE_WELD_PARTICLE_TIME: 1500,            // ms
    WELDER_SMOKE_MIN_X_SPEED: -30,              // canvas px/s
    WELDER_SMOKE_MAX_X_SPEED: 30,               // canvas px/s
    WELDER_SMOKE_MIN_Y_SPEED: -20,              // canvas px/s
    WELDER_SMOKE_MAX_Y_SPEED: 30,               // canvas px/s
    WELDER_SMOKE_INNER_RADIUS: 8,               // canvas px
    WELDER_SMOKE_RADIUS: 16,                    // canvas px
    GARAGE_WELD_SPARK_TIME: 1300,               // ms
    WELDER_SPARK_MIN_X_SPEED: -150,             // canvas px/s
    WELDER_SPARK_MAX_X_SPEED: 150,              // canvas px/s
    WELDER_SPARK_MIN_Y_SPEED: -130,             // canvas px/s
    WELDER_SPARK_MAX_Y_SPEED: 50,               // canvas px/s
    WELDER_SPARK_LENGTH: 8,                     // canvas px
    WELDER_SPARK_WIDTH: 2,                      // canvas px
    GARAGE_BOX_WIDTH: 140,                      // px
    GARAGE_BOX_HEIGHT: 140,                     // px
    BOXES_PER_ROW: 4,
    BASE_BOX_SPAWN_DELAY: 250,                  // ms
    PER_BOX_SPAWN_DELAY: 90,                    // ms

	SCRAPYARD_PLATE_WIDTH: 11,					// canvas px
	SCRAPYARD_PLATE_HEIGHT: 22,					// canvas px
	SCRAPYARD_PLATE_SPACING: 1,					// canvas px
	SCRAPYARD_FLIP_DELAY: 100,					// ms - delay between spawning and flipping plates
	SCRAPYARD_FLIP_TIME: 630,					// ms - time it takes to flip a plate
	SCRAPYARD_FIRST_UPDATE: 60000,				// ms - time to first update
	SCRAPYARD_FOLLOWING_UPDATES: 300000,    	// ms - time between following updates

    FORUM_THREAD_REFRESH_INTERVAL: 30, // s
    FORUM_REPLY_REFRESH_INTERVAL: 10,  // s
    FORUM_MAX_PAGES_AROUND_CURRENT: 3,
    FORUM_BACK_BUTTON_WIDTH: 77,          // screen px
    FORUM_OLDEST_PAGE_BUTTON_WIDTH: 51,   // screen px
    FORUM_NEWEST_PAGE_BUTTON_WIDTH: 51,   // screen px
    FORUM_PAGE_ELLIPSIS_WIDTH: 36,        // screen px
    FORUM_PAGE_BUTTON_WIDTHS:             // screen px
        [
            37,
            41,
            37,
            39,
            32,
            40
        ],
    FORUM_PAGE_BUTTON_HEIGHT: 45,            // screen px
    FORUM_PAGE_BUTTON_ANIMATION_BOTTOM: 15,  // screen px
    FORUM_PAGE_ELLIPSIS_ANIMATION_BOTTOM: 9, // screen px

    ADMIN_LEVEL_ACCEPT_GUIDELINES: 0,

    ADMIN_LEVEL_DASHBOARD: 1,
    ADMIN_LEVEL_MODERATE_PLAYER_NAME: 1,
    ADMIN_LEVEL_PLAYER_LOOKUP: 1,
    ADMIN_LEVEL_APPROVE_THREAD_OR_REPLY: 1,
    ADMIN_LEVEL_DELETE_THREAD_OR_REPLY: 1,
    ADMIN_LEVEL_CHAT_LOG: 1,
    ADMIN_LEVEL_READ_MESSAGES: 1,
    ADMIN_LEVEL_VIEW_STATISTICS: 1,
    ADMIN_LEVEL_VIEW_LOG: 1,

    ADMIN_LEVEL_RESOLVE_CHAT_MESSAGE_REPORT: 2,
    ADMIN_LEVEL_LOCK_THREAD: 2,

    ADMIN_LEVEL_PIN_THREAD: 3,
    ADMIN_LEVEL_BAN_THREAD_OR_REPLY: 3,
    ADMIN_LEVEL_BAN_USER: 3,

    ADMIN_LEVEL_VIEW_SENSITIVE_PLAYER_DETAILS: 6,
    ADMIN_LEVEL_SET_PLAYER_ADMIN_LEVEL: 6,
    ADMIN_LEVEL_PURCHASE_GOLD_SHOP_ITEM: 6,
    ADMIN_LEVEL_PURCHASE_VIRTUAL_SHOP_ITEM: 6,

    ADMIN_LEVEL_NEWS: 9,
    ADMIN_LEVEL_SERVER_LOG: 9,
    ADMIN_LEVEL_PURCHASE_SHOP_ITEM: 9,
    ADMIN_LEVEL_EDIT_SHOP_ITEM: 9,

    ADMIN_ROLE_WRITE_MESSAGES: 'writeMessages',

    ADMIN_LOG: {
        ACTION_APPROVE_USERNAME: 0,
        ACTION_REJECT_USERNAME: 1,
        ACTION_UNDO_USERNAME_MODERATION: 2,
        ACTION_BAN_PLAYER: 3,
        ACTION_REMOVE_PLAYER_BAN: 4,
        ACTION_RECOMMEND_PLAYER_PROMOTION: 5,
        ACTION_PROMOTE_PLAYER_FROM_RECOMMENDATIONS: 6,
        ACTION_PROMOTE_PLAYER: 7,
        ACTION_DEMOTE_PLAYER: 8,
        ACTION_APPROVE_CHAT_MESSAGE: 9,
        ACTION_BAN_CHAT_MESSAGE: 10,
        ACTION_CREATE_NEWS_POST: 11,
        ACTION_EDIT_NEWS_POST: 12,
        ACTION_DELETE_NEWS_POST: 13,
        ACTION_ACCEPT_ADMIN_GUIDELINES: 14,
        ACTION_REJECT_ADMIN_GUIDELINES: 15,
        ACTION_RETIRE_ADMIN: 16,
        ACTION_EDIT_MESSAGE_CONTENT: 17,
        ACTION_REVERT_ACCOUNT_CHANGE: 18,
        ACTION_RESET_ACCOUNT_PASSWORD: 19,
        ACTION_RESEND_VERIFICATION_EMAIL: 20,
        ACTION_PURCHASE_VIRTUAL_SHOP_ITEM: 21,
        ACTION_REFUND_VIRTUAL_SHOP_ITEM: 22,
        ACTION_APPROVE_FORUM_THREAD: 23,
        ACTION_UNAPPROVE_FORUM_THREAD: 24,
        ACTION_LOCK_FORUM_THREAD: 25,
        ACTION_UNLOCK_FORUM_THREAD: 26,
        ACTION_PIN_FORUM_THREAD: 27,
        ACTION_UNPIN_FORUM_THREAD: 28,
        ACTION_DELETE_FORUM_THREAD: 29,
        ACTION_UNDELETE_FORUM_THREAD: 30,
        ACTION_BAN_FORUM_THREAD: 31,
        ACTION_UNBAN_FORUM_THREAD: 32,
        ACTION_APPROVE_FORUM_REPLY: 33,
        ACTION_UNAPPROVE_FORUM_REPLY: 34,
        ACTION_DELETE_FORUM_REPLY: 35,
        ACTION_UNDELETE_FORUM_REPLY: 36,
        ACTION_BAN_FORUM_REPLY: 37,
        ACTION_UNBAN_FORUM_REPLY: 38,
        ACTION_DELETE_ACCOUNT: 39,
        ACTION_PURCHASE_GOLD_SHOP_ITEM: 40,
        ACTION_REFUND_GOLD_SHOP_ITEM: 41,
        ACTION_PURCHASE_SHOP_ITEM: 42,
        ACTION_REFUND_SHOP_ITEM: 43,
        ACTION_EDIT_EMAIL: 44,
        ACTION_DELETE_EMAIL: 45,
        ACTION_EDIT_SHOP_ITEM: 46,
        ACTION_REMOVE_ACCOUNT_DELETION: 47
    },

    CHAT_BOX_MAX_NUM_MESSAGES: 30,

    AD_RELIEF_TIME: 600000,
    NAG_RELIEF_TIME: 1800000
});

UIConstants.classMethods({
    // FIXME: Move to UIUtils
    scaleForHighDensity: function(devicePixelRatio) {
        if (!this.SCALED_FOR_HIGH_DENSITY)
        {
            this.SCALED_FOR_HIGH_DENSITY = true;

            var resolutionScale = UIUtils.getLoadedAssetResolutionScale(devicePixelRatio);

            this.ASSET_SCALE = devicePixelRatio / resolutionScale;
            this.GAME_ASSET_SCALE /= resolutionScale;
            this.SPINE_SCALE = Math.sqrt(devicePixelRatio);

            // Scale to account for actual increase in canvas size.
            this.GAME_ICON_WIDTH *= devicePixelRatio;
            this.GAME_ICON_HEIGHT *= devicePixelRatio;
            this.GAME_ICON_MARGIN *= devicePixelRatio;
            this.GAME_ICON_Y *= devicePixelRatio;
            this.LOGIN_BACKGROUND_TOP_MARGIN *= devicePixelRatio;
            this.LOGIN_BACKGROUND_SIDE_MARGIN *= devicePixelRatio;
            this.LOGIN_BACKGROUND_BOTTOM_MARGIN *= devicePixelRatio;
            this.BUTTON_HEIGHTS[this.BUTTON_SIZES.SMALL] *= devicePixelRatio;
            this.BUTTON_HEIGHTS[this.BUTTON_SIZES.MEDIUM] *= devicePixelRatio;
            this.BUTTON_HEIGHTS[this.BUTTON_SIZES.LARGE] *= devicePixelRatio;
            this.BUTTON_MARGINS[this.BUTTON_SIZES.SMALL] *= devicePixelRatio;
            this.BUTTON_MARGINS[this.BUTTON_SIZES.MEDIUM] *= devicePixelRatio;
            this.BUTTON_MARGINS[this.BUTTON_SIZES.LARGE] *= devicePixelRatio;
            this.BUTTON_SHADOW_WIDTH *= devicePixelRatio;
            this.BUTTON_SHADOW_HEIGHT_TOP *= devicePixelRatio;
            this.BUTTON_SHADOW_HEIGHT_BOTTOM *= devicePixelRatio;
            this.BUTTON_ACTIVE_OFFSET *= devicePixelRatio;
            this.MENU_BACKGROUND_MIN_TOP_MARGIN *= devicePixelRatio;
            this.MENU_BUTTON_WIDTHS[this.BUTTON_SIZES.SMALL] *= devicePixelRatio;
            this.MENU_BUTTON_WIDTHS[this.BUTTON_SIZES.MEDIUM] *= devicePixelRatio;
            this.MENU_BUTTON_WIDTHS[this.BUTTON_SIZES.LARGE] *= devicePixelRatio;
            this.MENU_BUTTON_SPACINGS[this.BUTTON_SIZES.SMALL] *= devicePixelRatio;
            this.MENU_BUTTON_SPACINGS[this.BUTTON_SIZES.MEDIUM] *= devicePixelRatio;
            this.MENU_BUTTON_SPACINGS[this.BUTTON_SIZES.LARGE] *= devicePixelRatio;
            this.MENU_LAIKA_X *= devicePixelRatio;
            this.MENU_LAIKA_Y *= devicePixelRatio;
            this.MENU_DIMITRI_X *= devicePixelRatio;
            this.MENU_DIMITRI_Y *= devicePixelRatio;
            this.BUTTON_FONT_SIZES[this.BUTTON_SIZES.SMALL] *= devicePixelRatio;
            this.BUTTON_FONT_SIZES[this.BUTTON_SIZES.MEDIUM] *= devicePixelRatio;
            this.BUTTON_FONT_SIZES[this.BUTTON_SIZES.LARGE] *= devicePixelRatio;
            this.BUTTON_INFO_FONT_SIZE *= devicePixelRatio;
            this.DISCONNECTED_ICON_Y *= devicePixelRatio;
            this.DISCONNECTED_HEADER_Y *= devicePixelRatio;
            this.DISCONNECTED_HEADER_FONT_SIZE *= devicePixelRatio;
            this.DISCONNECTED_HEADER_STROKE_WIDTH *= devicePixelRatio;
            this.DISCONNECTED_MESSAGE_Y *= devicePixelRatio;
            this.DISCONNECTED_MESSAGE_FONT_SIZE *= devicePixelRatio;
            this.DISCONNECTED_MESSAGE_STROKE_WIDTH *= devicePixelRatio;
            this.USERNAME_FONT_SIZE *= devicePixelRatio;
            this.USERNAME_STROKE_WIDTH *= devicePixelRatio;
            this.TANK_NAME_MARGIN *= devicePixelRatio;
            this.JOIN_GAME_BUTTON_INFO_Y *= devicePixelRatio;
            this.JOIN_GAME_BUTTON_Y *= devicePixelRatio;
            this.RANDOM_GAME_BUTTON_INFO_Y *= devicePixelRatio;
            this.CREATE_GAME_BUTTON_INFO_Y *= devicePixelRatio;
            this.AVATAR_LAIKA_X *= devicePixelRatio;
            this.AVATAR_LAIKA_Y *= devicePixelRatio;
            this.AVATAR_DIMITRI_X *= devicePixelRatio;
            this.AVATAR_DIMITRI_Y *= devicePixelRatio;
            this.TANK_ICON_OUTLINE_WIDTH *= devicePixelRatio;
            this.LEAVE_GAME_BUTTON_WIDTH *= devicePixelRatio;
            this.LEAVE_GAME_MESSAGE_FONT_SIZE *= devicePixelRatio;
            this.LEAVE_GAME_MESSAGE_STROKE_WIDTH *= devicePixelRatio;
            this.LEAVE_GAME_MARGIN *= devicePixelRatio;
            this.WAITING_ICON_WIDTH *= devicePixelRatio;
            this.WAITING_ICON_HEIGHT *= devicePixelRatio;
            this.WAITING_HEADER_Y *= devicePixelRatio;
            this.WAITING_HEADER_FONT_SIZE *= devicePixelRatio;
            this.WAITING_HEADER_STROKE_WIDTH *= devicePixelRatio;
            this.WAITING_MESSAGE_Y *= devicePixelRatio;
            this.WAITING_MESSAGE_FONT_SIZE *= devicePixelRatio;
            this.WAITING_MESSAGE_STROKE_WIDTH *= devicePixelRatio;
            this.CELEBRATION_HEADER_Y *= devicePixelRatio;
            this.CELEBRATION_HEADER_FONT_SIZE *= devicePixelRatio;
            this.CELEBRATION_HEADER_STROKE_WIDTH *= devicePixelRatio;
            this.TROPHY_EXPLOSION_Y *= devicePixelRatio;
            this.TROPHY_EXPLOSION_MIN_X_SPEED *= devicePixelRatio;
            this.TROPHY_EXPLOSION_MAX_X_SPEED *= devicePixelRatio;
            this.TROPHY_EXPLOSION_MIN_Y_SPEED *= devicePixelRatio;
            this.TROPHY_EXPLOSION_MAX_Y_SPEED *= devicePixelRatio;
            this.TROPHY_EXPLOSION_DRAG_X *= devicePixelRatio;
            this.TROPHY_EXPLOSION_DRAG_Y *= devicePixelRatio;
            this.TROPHY_EXPLOSION_FLOOR_Y *= devicePixelRatio;
            this.TROPHY_FRAGMENT_MIN_SPEED *= devicePixelRatio;
            this.TROPHY_FRAGMENT_MAX_SPEED *= devicePixelRatio;
            this.TROPHY_FRAGMENT_GRAVITY *= devicePixelRatio;
            this.TROPHY_BASE_FRAGMENT_EXPLOSION_OFFSET *= devicePixelRatio;
            this.CONFETTI_MIN_X_SPEED *= devicePixelRatio;
            this.CONFETTI_MAX_X_SPEED *= devicePixelRatio;
            this.CONFETTI_MIN_Y_SPEED *= devicePixelRatio;
            this.CONFETTI_MAX_Y_SPEED *= devicePixelRatio;
            this.CONFETTI_DRAG *= devicePixelRatio;
            this.CONFETTI_GRAVITY *= devicePixelRatio;
            this.CONFETTI_WOBBLE_AMPLITUDE *= devicePixelRatio;
            this.CONFETTI_WOBBLE_KICK_IN_SPEED *= devicePixelRatio;
            this.CONFETTI_Y_VARIATION *= devicePixelRatio;
            this.STREAMER_MIN_SPEED *= devicePixelRatio;
            this.STREAMER_MAX_SPEED *= devicePixelRatio;
            this.STREAMER_WIDTH *= devicePixelRatio;
            this.STREAMER_AMPLITUDE_X *= devicePixelRatio;
            this.STREAMER_AMPLITUDE_Y *= devicePixelRatio;
            this.TANK_PANEL_MAX_WIDTH *= devicePixelRatio;
            this.TANK_PANEL_MAX_HEIGHT *= devicePixelRatio;
            this.TANK_PANEL_SIDE_MARGIN *= devicePixelRatio;
            this.TANK_PANEL_MIN_WIDTH_PER_ICON *= devicePixelRatio;
            this.TANK_PANEL_INTERLEAVE_HEIGHT *= devicePixelRatio;
            this.TANK_PANEL_INTERLEAVE_OFFSET *= devicePixelRatio;
            this.TANK_PANEL_ICON_BOTTOM_MARGIN *= devicePixelRatio;
            this.TANK_PANEL_NAME_BOTTOM_MARGIN *= devicePixelRatio;
            this.TANK_PANEL_SCORE_BOTTOM_MARGIN *= devicePixelRatio;
            this.RANK_LEVEL_DOWN_SHAKE_OFFSET *= devicePixelRatio;
            this.RANK_LEVEL_DOWN_TEAR_MIN_OFFSET *= devicePixelRatio;
            this.RANK_LEVEL_DOWN_TEAR_RANDOM_OFFSET *= devicePixelRatio;
            this.RANK_LEVEL_DOWN_TEAR_Y_OFFSET *= devicePixelRatio;
            this.SCORE_EXPLOSION_Y *= devicePixelRatio;
            this.SCORE_EXPLOSION_MIN_X_SPEED *= devicePixelRatio;
            this.SCORE_EXPLOSION_MAX_X_SPEED *= devicePixelRatio;
            this.SCORE_EXPLOSION_MIN_Y_SPEED *= devicePixelRatio;
            this.SCORE_EXPLOSION_MAX_Y_SPEED *= devicePixelRatio;
            this.SCORE_EXPLOSION_DRAG *= devicePixelRatio;
            this.SCORE_FRAGMENT_MIN_SPEED *= devicePixelRatio;
            this.SCORE_FRAGMENT_MAX_SPEED *= devicePixelRatio;
            this.SCORE_FONT_SIZE *= devicePixelRatio;
            this.SCORE_STROKE_WIDTH *= devicePixelRatio;
            this.PLAYER_PANEL_GRAVITY *= devicePixelRatio;
            this.ROUND_TITLE_FONT_SIZE *= devicePixelRatio;
            this.ROUND_TITLE_STROKE_WIDTH *= devicePixelRatio;
            this.ROUND_RANKED_FONT_SIZE *= devicePixelRatio;
            this.ROUND_TITLE_SPACING *= devicePixelRatio;
            this.ROUND_TITLE_OFFSET *= devicePixelRatio;
            this.TIMER_TOP_MARGIN *= devicePixelRatio;
            this.TIMER_SPACING *= devicePixelRatio;
            this.TIMER_FONT_SIZE *= devicePixelRatio;
            this.TIMER_STROKE_WIDTH *= devicePixelRatio;
            this.MAZE_SIDE_MARGIN *= devicePixelRatio;
            this.MAZE_TOP_MARGIN *= devicePixelRatio;
            this.MAZE_BOTTOM_MARGIN *= devicePixelRatio;
            this.TANK_EXPLOSION_CAMERA_SHAKE *= devicePixelRatio;
            this.MAX_CAMERA_SHAKE *= devicePixelRatio;
            this.CAMERA_SHAKE_FADE *= devicePixelRatio;
            this.CONNECTION_ERROR_MESSAGE_OFFSET *= devicePixelRatio;
            this.CONNECTION_ERROR_MESSAGE_FONT_SIZE *= devicePixelRatio;
            this.CONNECTION_ERROR_MESSAGE_STROKE_WIDTH *= devicePixelRatio;
            this.GARAGE_TANK_ICON_MARGIN *= devicePixelRatio;
            this.SPRAY_CAN_DRAG_MARGIN *= devicePixelRatio;
            this.GARAGE_SPRAY_SHAKE_OFFSET *= devicePixelRatio;
            this.SPRAY_MIN_X_SPEED *= devicePixelRatio;
            this.SPRAY_MAX_X_SPEED *= devicePixelRatio;
            this.SPRAY_MIN_Y_SPEED *= devicePixelRatio;
            this.SPRAY_MAX_Y_SPEED *= devicePixelRatio;
            this.SPRAY_DRAG *= devicePixelRatio;
            this.SPRAY_RADIUS *= devicePixelRatio;
            this.SPRAY_INNER_RADIUS *= devicePixelRatio;
            this.GARAGE_MAX_DRAG_SPEED *= devicePixelRatio;
            this.GARAGE_TANK_ICON_SCROLL_SPEED *= devicePixelRatio;
            this.GARAGE_BOX_SCROLL_SPEED *= devicePixelRatio;
            this.GARAGE_ACCESSORY_SCROLL_SPEED *= devicePixelRatio;
            this.GARAGE_BUTTON_SCROLL_OFFSET *= devicePixelRatio;
            this.WELDER_SMOKE_MIN_X_SPEED *= devicePixelRatio;
            this.WELDER_SMOKE_MAX_X_SPEED *= devicePixelRatio;
            this.WELDER_SMOKE_MIN_Y_SPEED *= devicePixelRatio;
            this.WELDER_SMOKE_MAX_Y_SPEED *= devicePixelRatio;
            this.WELDER_SMOKE_INNER_RADIUS *= devicePixelRatio;
            this.WELDER_SMOKE_RADIUS *= devicePixelRatio;
            this.WELDER_SPARK_MIN_X_SPEED *= devicePixelRatio;
            this.WELDER_SPARK_MAX_X_SPEED *= devicePixelRatio;
            this.WELDER_SPARK_MIN_Y_SPEED *= devicePixelRatio;
            this.WELDER_SPARK_MAX_Y_SPEED *= devicePixelRatio;
            this.WELDER_SPARK_LENGTH *= devicePixelRatio;
            this.WELDER_SPARK_WIDTH *= devicePixelRatio;
			this.SCRAPYARD_PLATE_WIDTH *= devicePixelRatio;
			this.SCRAPYARD_PLATE_HEIGHT *= devicePixelRatio;
			this.SCRAPYARD_PLATE_SPACING *= devicePixelRatio;

            // Scale to account for image assets of higher resolution.
            this.TANK_ICON_WIDTH_SMALL *= resolutionScale;
            this.TANK_ICON_HEIGHT_SMALL *= resolutionScale;
            this.TANK_ICON_WIDTH_MEDIUM *= resolutionScale;
            this.TANK_ICON_HEIGHT_MEDIUM *= resolutionScale;
            this.TANK_ICON_WIDTH_LARGE *= resolutionScale;
            this.TANK_ICON_HEIGHT_LARGE *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[0].x *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[0].y *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[1].x *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[1].y *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[2].x *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[2].y *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[3].x *= resolutionScale;
            this.TANK_ICON_PLACEMENTS[3].y *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[0].x *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[0].y *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[1].x *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[1].y *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[2].x *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[2].y *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[3].x *= resolutionScale;
            this.TANK_NAME_PLACEMENTS[3].y *= resolutionScale;
            this.WEAPON_ICON_WIDTH *= resolutionScale;
            this.FAVOURITE_ICON_WIDTH *= resolutionScale;
            this.FAVOURITE_ICON_HEIGHT *= resolutionScale;
            this.SCORE_ITEM_INFO[0].paddingX *= resolutionScale;
            this.SCORE_ITEM_INFO[0].offsetY *= resolutionScale;
            this.SCORE_ITEM_INFO[1].paddingX *= resolutionScale;
            this.SCORE_ITEM_INFO[1].offsetY *= resolutionScale;
            this.SCORE_ITEM_INFO[2].paddingX *= resolutionScale;
            this.RANK_ICON_WIDTH *= resolutionScale;
            this.RANK_ICON_HEIGHT *= resolutionScale;
            this.GUEST_ICON_WIDTH *= resolutionScale;
            this.GUEST_ICON_HEIGHT *= resolutionScale;
            this.TANK_LEFT_TREAD_X *= resolutionScale;
            this.TANK_RIGHT_TREAD_X *= resolutionScale;
            this.TANK_TURRET_Y *= resolutionScale;
            this.SPRAY_CAN_WIDTH *= resolutionScale;
            this.ACCESSORY_WIDTH *= resolutionScale;
            this.ACCESSORY_HEIGHT *= resolutionScale;
            this.WELDER_SAMPLE_CELL_SIZE *= resolutionScale;
            this.WELDER_SAMPLE_JITTER_SIZE *= resolutionScale;
            this.GARAGE_BOX_WIDTH *= resolutionScale;
            this.GARAGE_BOX_HEIGHT *= resolutionScale;
        }
    }
});
