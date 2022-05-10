var GameState = Classy.newClass().name('GameState'); // eslint-disable-line no-var

GameState.constructor(function() {

});

GameState.constructor('withState', function(playerStates, mode, theme, ranked, scoreStates, emblemStates, id) {
    this.data.playerStates = playerStates;
    this.data.mode = mode;
    this.data.theme = theme;
    this.data.ranked = ranked;
    this.data.scoreStates = scoreStates;
    this.data.emblemStates = emblemStates;
    this.data.id = id;
});

GameState.constructor('withObject', function(obj) {
    this.data = obj;
});

GameState.fields({
    data: {
        playerStates: [],
        mode: null,
        theme: null,
        ranked: false,
        scoreStates: [],
        emblemStates: [],
        id: null
    }
});

GameState.methods({
    setPlayerStates: function(playerStates) {
        this.data.playerStates = [];
        for (let i = 0; i < playerStates.length; ++i) {
            this.data.playerStates.push(playerStates[i].toObj());
        }
    },

    getPlayerStates: function() {
        const playerStates = [];
        for (let i = 0; i < this.data.playerStates.length; ++i) {
            playerStates.push(PlayerState.withObject(this.data.playerStates[i]));
        }
        return playerStates;
    },
    
    setMode: function(mode) {
        this.data.mode = mode;
    },

    getMode: function() {
        return this.data.mode;
    },

    setTheme: function(theme) {
        this.data.theme = theme;
    },

    getTheme: function() {
        return this.data.theme;
    },

    setRanked: function(ranked) {
        this.data.ranked = ranked;
    },

    getRanked: function() {
        return this.data.ranked;
    },

    setScoreStates: function(scoreStates) {
        this.data.scoreStates = [];
        for (let i = 0; i < scoreStates.length; ++i) {
            this.data.scoreStates.push(scoreStates[i].toObj());
        }
    },

    getScoreStates: function() {
        const scoreStates = [];
        for (let i = 0; i < this.data.scoreStates.length; ++i) {
            scoreStates.push(ScoreState.withObject(this.data.scoreStates[i]));
        }
        return scoreStates;
    },

    setEmblemStates: function(emblemStates) {
        this.data.emblemStates = [];
        for (let i = 0; i < emblemStates.length; ++i) {
            this.data.emblemStates.push(emblemStates[i].toObj());
        }
    },

    getEmblemStates: function() {
        const emblemStates = [];
        for (let i = 0; i < this.data.emblemStates.length; ++i) {
            emblemStates.push(EmblemState.withObject(this.data.emblemStates[i]));
        }
        return emblemStates;
    },

    setId: function(id) {
        this.data.id = id;
    },

    getId: function() {
        return this.data.id;
    },
    
    toObj: function() {
        return this.data;
    }

});

if (typeof module === 'object') {
    module.exports = GameState;
}
