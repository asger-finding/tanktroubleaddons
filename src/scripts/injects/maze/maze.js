if (typeof require === 'function') {
	var Classy = require('./classy');
	var ArrayUtils = require('./arrayutils');
	var MathUtils = require('./mathutils');
	var Constants = require('./constants');
	var MazeThemeManager = require('./mazethememanager');
	var Log = require('./log');
	var jKstra = require('jkstra');
}
var Maze = Classy.newClass();

/*
 * Datastructures:
 *
 * Walls:
 *      0: Right wall,
 *      1: Down wall,
 *      2: Left wall,
 *      3: Up wall
 *
 * Tiles:
 *      0: Floor present,
 *      1: Top wall present,
 *      2: Left wall present
 *
 * Wall configurations:
 *      1: Top wall,
 *      2: Left wall,
 *      4: Bottom wall,
 *      8: Right wall
 *
 * Borders:
 *      x,
 *      y,
 *      number,
 *      offsetX,
 *      offsetY,
 *      rotation,
 *      flip
 * Floors:
 *      x,
 *      y,
 *      number,
 *      rotation
 * Spaces:
 *      x,
 *      y,
 *      number,
 *      rotation
 * Walls:
 *      x,
 *      y,
 *      number,
 *      offsetX,
 *      offsetY,
 *      rotation,
 *      flipX,
 *      flipY
 * Wall decorations:
 *      x,
 *      y,
 *      number,
 *      rotation
 */

Maze.classFields({
	log: Log.create('Maze')
});

Maze.fields({
	data: {
		theme: 0,
		tiles: [],
		borders: [],
		floors: [],
		spaces: [],
		walls: [],
		wallDecorations: [],
		distances: [],
		deadEndPenalties: []
	},
	width: 0,
	height: 0,
	graph: null, // jKstra graph representation of maze where edges carry position {x, y} of tile they point to
	vertices: [], // jKstra vertices in graph
	dijkstra: null, // jKstra Dijkstra instance for finding shortest paths in graph
	tankPositions: [], // x, y, rotation, playerId
	crateSpawnPositions: [], // x, y
	tankSpawnPositions: [], // x, y
	reachable: [], // List of reachable floors {x, y, used}
	tileToReachableIndex: [], // Map from tile (x,y) to index in reachable list
	tilePresentToTileIndex: [] // Map from index in present tiles to tile (x,y)
});

Maze.constructor('withObject', function(obj) {
	this.data = obj;
	this.width = this.data.tiles.length;
	this.height = this.data.tiles[0].length;

	this._createGraph();
});

Maze.constructor('createRandom', function(width, height, playerIds, theme) {

	this.width = width;
	this.height = height;

	const wallProbability = Constants.MAZE.WALL_PROBABILITIES[Math.floor(Math.random() * Constants.MAZE.WALL_PROBABILITIES.length)];
	const tileProbability = Constants.MAZE.TILE_PROBABILITIES[Math.floor(Math.random() * Constants.MAZE.TILE_PROBABILITIES.length)];

	// Keep creating a new maze until successful.
	const bool = true;
	while (bool) {
		this.tankPositions = [];

		this.data.tiles = this._createRandomMaze(this.width, this.height, wallProbability, tileProbability);

		// Place first tank.
		// Ensure that tank is placed in a tile that is present.
		this._calculateTilePresentToTileIndex(this.width, this.height);

		// Guard against the case where no tiles are present.
		if (this.tilePresentToTileIndex.length == 0)
			continue;

		const presentTile = this.tilePresentToTileIndex[Math.floor(Math.random()*this.tilePresentToTileIndex.length)];
		this.tankPositions.push({x:presentTile.x, y:presentTile.y, rotation: Math.random()*2.0*Math.PI, playerId: playerIds[0]});
		
		// Compute reachable tiles.
		this._calculateReachable(this.tankPositions[0], this.width, this.height);
			
		// Ensure that reachable tiles make up a fitting percentage of available tiles.
		let failedToReachEnoughTiles = false;
		while (this.reachable.length < Constants.MAZE_MINIMUM_REACHABLE_RATIO * this.tilePresentToTileIndex.length) {
			//console.log("Reachable too small: " + this.reachable.length + " / " + Constants.MAZE_MINIMUM_REACHABLE_RATIO * this.tilePresentToTileIndex.length);

			if (!this._expandReachable(this.tankPositions[0], this.width, this.height)) {
				failedToReachEnoughTiles = true;
				break;
			}
		}
		
		// Failed to expand reachable tiles to fitting percentage.
		if (failedToReachEnoughTiles)
			continue;
		
		// Mark neighbouring tiles as used.
		this._markTilesAsUsed(this.tankPositions[0], Constants.MAZE_MINIMUM_TILES_BETWEEN_TANKS);
		
		// Get available tiles.
		let available = this._getUnusedTiles();
		
		// Place remaining tanks.
		let failedToPlaceRemainingTanks = false;
		for (let i = 1; i < playerIds.length; ++i) {
			if (available.length <= 0) {
				failedToPlaceRemainingTanks = true;
				break;
			}
			
			const newPosition = Math.floor(Math.random()*available.length);
			this.tankPositions.push({x:available[newPosition].x, y:available[newPosition].y, rotation: Math.random()*2.0*Math.PI, playerId: playerIds[i]});
			
			// Mark neighbouring tiles as used.
			this._markTilesAsUsed(this.tankPositions[i], Constants.MAZE_MINIMUM_TILES_BETWEEN_TANKS);
			
			available = this._getUnusedTiles();
		}

		// Failed to place remaining tanks.
		if (failedToPlaceRemainingTanks) {
			continue;
		}

		// Success!
		break;
	}    

	// Center on tile and convert to physical units.
	for (let i = 0; i< this.tankPositions.length; ++i) {
		this.tankPositions[i].x += 0.5;
		this.tankPositions[i].y += 0.5;
		this.tankPositions[i].x *= Constants.MAZE_TILE_SIZE.m;
		this.tankPositions[i].y *= Constants.MAZE_TILE_SIZE.m;
	}

	// Store theme.
	this.data.theme = theme;

	// Compute borders, floors, spaces, walls and decorations based on theme.
	this._calculateBorderFloorsSpacesWallsAndDecorations();

	// Compute distances from all tiles to all other tiles.
	this._calculateDistances();

	// Compute dead end penalties.
	this._calculateDeadEndPenalties();

	// Create graph representation.
	this._createGraph();

});

Maze.constructor('createSymmetric', function(width, height, playerIds, theme) {
	this.width = width;
	this.height = height;

	const wallProbability = Math.sqrt(Constants.MAZE.WALL_PROBABILITIES[Math.floor(Math.random() * Constants.MAZE.WALL_PROBABILITIES.length)]);
	const tileProbability = Math.sqrt(Constants.MAZE.TILE_PROBABILITIES[Math.floor(Math.random() * Constants.MAZE.TILE_PROBABILITIES.length)]);

	const blockWidth = Math.floor(this.width/2);
	const blockHeight = Math.floor(this.height/2);

	// Keep creating a new maze until successful.
	const bool = true;
	while (bool) {
		this.tankPositions = [];

		// Start by creating a random maze representing the block of one player.
		this.data.tiles = this._createRandomMaze(blockWidth, blockHeight, wallProbability, tileProbability);

		// Place first tank.
		// Ensure that tank is placed in a tile that is present.
		this._calculateTilePresentToTileIndex(blockWidth, blockHeight);

		// Guard against the case where no tiles are present.
		if (this.tilePresentToTileIndex.length == 0)
			continue;

		const presentTile = this.tilePresentToTileIndex[0];
		this.tankPositions.push({x:presentTile.x, y:presentTile.y, rotation: Math.random()*2.0*Math.PI, playerId: playerIds[0]});

		// Compute reachable tiles.
		this._calculateReachable(this.tankPositions[0], blockWidth, blockHeight);

		// Ensure that all tiles are reachable.
		let failedToReachEnoughTiles = false;
		while (this.reachable.length < this.tilePresentToTileIndex.length) {
			//console.log("Reachable too small: " + this.reachable.length + " / " + this.tilePresentToTileIndex.length);

			if (!this._expandReachable(this.tankPositions[0], blockWidth, blockHeight)) {
				failedToReachEnoughTiles = true;
				break;
			}
		}

		// Failed to expand reachable tiles to all present.
		if (failedToReachEnoughTiles)
			continue;

		// Ensure that at least one of the right-most tiles is present - this is enough as all tiles are reachable.
		let openToTheRight = false;
		for(let j = 0; j < blockHeight; ++j) {
			if (this.data.tiles[blockWidth - 1][j][0] == 1) {
				openToTheRight = true;
				break;
			}
		}

		// Ensure that at least one of the bottom-most tiles is present - this is enough as all tiles are reachable.
		let openToTheBottom = false;
		for(let i = 0; i < blockWidth; ++i) {
			if (this.data.tiles[i][blockHeight - 1][0] == 1) {
				openToTheBottom = true;
				break;
			}
		}

		if (!openToTheRight || !openToTheBottom) {
			continue;
		}

		// We now have a block which can be used for a symmetric, connected maze - with space in the middle for weapon spawns.
		this.data.tiles = this._createSymmetricMaze(this.data.tiles, blockWidth, blockHeight, this.width, this.height, wallProbability);

		// Place remaining tanks.
		for (let i = 1; i < playerIds.length; ++i) {
			const newPosition = {x:this.tankPositions[0].x, y:this.tankPositions[0].y,rotation:this.tankPositions[0].rotation, playerId: playerIds[i]};
			if (i >= 1 && i <= 2) {
				newPosition.x = this.width - 1 - newPosition.x;
				newPosition.rotation = -newPosition.rotation;
			}
			if (i % 2) {
				newPosition.y = this.height - 1 - newPosition.y;
				newPosition.rotation = Math.PI - newPosition.rotation;
			}
			this.tankPositions.push(newPosition);
		}

		// Success!
		break;
	}

	// Update reachable to the final symmetric maze.
	this._calculateReachable(this.tankPositions[0], this.width, this.height);

	// Create crate spawn positions.
	if (this.tileToReachableIndex[blockWidth][blockHeight] !== undefined) {
		this.crateSpawnPositions.push({x: blockWidth, y: blockHeight});
	}
	const widthEven = this.width % 2 == 0;
	const heightEven = this.height % 2 == 0;
	// If width or height is even, place more crate spawn positions.
	if (widthEven || heightEven) {
		if (widthEven) {
			if (this.tileToReachableIndex[width - 1 - blockWidth][blockHeight] !== undefined) {
				this.crateSpawnPositions.push({x: width - 1 - blockWidth, y: blockHeight});
			}
		}
		if (heightEven) {
			if (this.tileToReachableIndex[blockWidth][height - 1 - blockHeight] !== undefined) {
				this.crateSpawnPositions.push({x: blockWidth, y: height - 1 - blockHeight});
			}
		}
		if (widthEven && heightEven) {
			if (this.tileToReachableIndex[width - 1 - blockWidth][height - 1 - blockHeight] !== undefined) {
				this.crateSpawnPositions.push({x: width - 1 - blockWidth, y: height - 1 - blockHeight});
			}
		}
	} else {
		// FIXME Place crate spawn positions in star?
	}

	// Create tank spawn positions from first tank position.
	const tankPosition = this.tankPositions[0];
	this.tankSpawnPositions.push({x: tankPosition.x, y: tankPosition.y});
	this.tankSpawnPositions.push({x: width - 1 - tankPosition.x, y: tankPosition.y});
	this.tankSpawnPositions.push({x: tankPosition.x, y: height - 1 - tankPosition.y});
	this.tankSpawnPositions.push({x: width - 1 - tankPosition.x, y: height - 1 - tankPosition.y});

	// Center on tile and convert to physical units.
	for (let i = 0; i < this.tankPositions.length; ++i) {
		this.tankPositions[i].x += 0.5;
		this.tankPositions[i].y += 0.5;
		this.tankPositions[i].x *= Constants.MAZE_TILE_SIZE.m;
		this.tankPositions[i].y *= Constants.MAZE_TILE_SIZE.m;
	}

	// Shuffle tank position player ids.
	for (let i = 0; i < this.tankPositions.length - 1; ++i) {
		const swap = this.tankPositions[i].playerId;
		const otherIndex = Math.floor(MathUtils.randomRange(i, this.tankPositions.length));
		this.tankPositions[i].playerId = this.tankPositions[otherIndex].playerId;
		this.tankPositions[otherIndex].playerId = swap;
	}

	// Store theme.
	this.data.theme = theme;

	// Compute borders, floors, spaces, walls and decorations based on theme.
	this._calculateBorderFloorsSpacesWallsAndDecorations();

	// Compute distances from all tiles to all other tiles.
	this._calculateDistances();

	// Compute dead end penalties.
	this._calculateDeadEndPenalties();

	// Create graph representation.
	this._createGraph();


});

Maze.methods({
	toObj: function() {
		return this.data;
	},

	_createRandomMaze: function(width, height, wallProbability, tileProbability) {
		const walls = new Array(width + 1);
		for (let i = 0; i < walls.length; ++i) {
			walls[i] = new Array(height + 1);
			for (let j = 0; j < height + 1; ++j) {
				walls[i][j] = Math.random() > wallProbability ? 4 : Math.floor(Math.random() * 4);
			}
		}

		const tiles = new Array(width);
		for (let i = 0; i < tiles.length; ++i) {
			tiles[i] = new Array(height);
			for (let j = 0; j < height; ++j) {
				tiles[i][j] = [Math.random() > tileProbability ? 0 : 1, 0, 0];
			}
		}

		for (let i = 0; i < width; ++i) {
			for (let j = 0; j < height; ++j) {
				const tilePresent = tiles[i][j][0] == 1;
				let topWall = false;
				let leftWall = false;
				if (tilePresent) {
					topWall = walls[i][j] == 0 || (i+1 < walls.length && walls[i+1][j] == 2) || j == 0 || (j > 0 && tiles[i][j-1][0] == 0);
					leftWall = walls[i][j] == 1 || (j+1 < walls[i].length && walls[i][j+1] == 3) || i == 0 || (i > 0 && tiles[i-1][j][0] == 0);
				} else {
					topWall = j > 0 && tiles[i][j-1][0] == 1;
					leftWall = i > 0 && tiles[i-1][j][0] == 1;
				}
				tiles[i][j][1] = topWall?1:0;
				tiles[i][j][2] = leftWall?1:0;
			}
		}

		return tiles;
	},

	_createSymmetricMaze: function(blockTiles, blockWidth, blockHeight, width, height, wallProbability) {
		const addVerticalConnector = width % 2;
		const addHorizontalConnector = height % 2;

		const tiles = new Array(width);
		for (let i = 0; i < tiles.length; ++i) {
			tiles[i] = new Array(height);
		}

		// Copy in upper-left block.
		for (let i = 0; i < blockWidth; ++i) {
			for (let j = 0; j < blockHeight; ++j) {
				tiles[i][j] = blockTiles[i][j];
			}
		}

		// Create lower-left block.
		for (let i = 0; i < blockWidth; ++i) {
			for (let j = 0; j < blockHeight-1; ++j) {
				tiles[i][height - 1 - j] = [blockTiles[i][j][0], blockTiles[i][j+1][1], blockTiles[i][j][2]];
			}
		}
		for (let i = 0; i < blockWidth; ++i) {
			tiles[i][height - blockHeight] = [blockTiles[i][blockHeight - 1][0], 0, blockTiles[i][blockHeight - 1][2]];
		}

		// Connect the two blocks: upper-left and lower-left.
		// First find possible connections.
		const potentialConnections = [];
		for (let i = 0; i < blockWidth; ++i) {
			if (tiles[i][blockHeight - 1][0] == 1) {
				potentialConnections.push(i);
			}
		}

		// Always close off first connection if possible.
		// Let the other ones be closed off randomly in next step.
		if (potentialConnections.length >= 2) {
			tiles[potentialConnections[0]][height - blockHeight][1] = 1;
			potentialConnections.shift();
		}

		// Close off a random amount except at least one.
		ArrayUtils.shuffle(potentialConnections);
		let amountToCloseOff = Math.floor(Math.random() * potentialConnections.length);
		for (let i = 0; i < amountToCloseOff; ++i) {
			tiles[potentialConnections[i]][height - blockHeight][1] = 1;
		}

		// Stitch blocks together with connector.
		if (addHorizontalConnector) {
			for (let i = 0; i < blockWidth; ++i) {
				const verticalNeighbourTilesPresent = tiles[i][height - blockHeight][0] == 1;
				const neighbourTopWallPresent = tiles[i][height - blockHeight][1] == 1;
				const placeTile = verticalNeighbourTilesPresent && !neighbourTopWallPresent;
				const firstConnectorTile = i == 0 && placeTile;
				const oppositeOfPreviousConnectorTile = i > 0 && (tiles[i-1][blockHeight][0] == 0 && placeTile || tiles[i-1][blockHeight][0] == 1 && !placeTile);
				const placeRandomWall = placeTile && Math.random() <= wallProbability;
				tiles[i][blockHeight] = [placeTile ? 1 : 0, verticalNeighbourTilesPresent && neighbourTopWallPresent ? 1 : 0, firstConnectorTile || oppositeOfPreviousConnectorTile || placeRandomWall ? 1 : 0];
			}
		}

		// Create right block.
		for (let i = 0; i < blockWidth-1; ++i) {
			for (let j = 0; j < height; ++j) {
				tiles[width - 1 - i][j] = [tiles[i][j][0], tiles[i][j][1], tiles[i+1][j][2]];
			}
		}
		for (let j = 0; j < height; ++j) {
			tiles[width - blockWidth][j] = [tiles[blockWidth - 1][j][0], tiles[blockWidth - 1][j][1], 0];
		}

		// Connect the two blocks: left and right.
		// First find possible connections.
		potentialConnections.length = 0;
		// If horizontal connector was added, also potentially cut that off.
		for (let j = 0; j < blockHeight + (addHorizontalConnector ? 1 : 0); ++j) {
			if (tiles[blockWidth - 1][j][0] == 1) {
				potentialConnections.push(j);
			}
		}

		// Always close off first connection if possible.
		// Let the other ones be closed off randomly in next step.
		if (potentialConnections.length >= 2) {
			tiles[width - blockWidth][potentialConnections[0]][2] = 1;
			tiles[width - blockWidth][height - 1 - potentialConnections[0]][2] = 1;
			potentialConnections.shift();
		}

		// Close off a random amount except at least one.
		ArrayUtils.shuffle(potentialConnections);
		amountToCloseOff = Math.floor(Math.random() * potentialConnections.length);
		for (let i = 0; i < amountToCloseOff; ++i) {
			tiles[width - blockWidth][potentialConnections[i]][2] = 1;
			tiles[width - blockWidth][height - 1 - potentialConnections[i]][2] = 1;
		}

		// Stitch blocks together with connector.
		if (addVerticalConnector) {
			for (let j = 0; j < height; ++j) {
				const horizontalNeighbourTilesPresent = tiles[width - blockWidth][j][0] == 1;
				const neighbourLeftWallPresent = tiles[width - blockWidth][j][2] == 1;
				const placeTile = horizontalNeighbourTilesPresent && !neighbourLeftWallPresent;
				const firstConnectorTile = j == 0 && placeTile;
				const oppositeOfPreviousConnectorTile = j > 0 && (tiles[blockWidth][j-1][0] == 0 && placeTile || tiles[blockWidth][j-1][0] == 1 && !placeTile);
				tiles[blockWidth][j] = [placeTile ? 1 : 0, firstConnectorTile || oppositeOfPreviousConnectorTile ? 1 : 0, horizontalNeighbourTilesPresent && neighbourLeftWallPresent ? 1 : 0];
			}
			// Add random horizontal walls - need to do this as separate loop as symmetrical tiles have not been created yet in first loop.
			for (let j = 1; j <= blockHeight; ++j) {
				const horizontalNeighbourTilesPresent = tiles[width - blockWidth][j][0] == 1;
				const neighbourLeftWallPresent = tiles[width - blockWidth][j][2] == 1;
				const placeTile = horizontalNeighbourTilesPresent && !neighbourLeftWallPresent;
				const placeRandomWall = placeTile && Math.random() <= wallProbability;
				tiles[blockWidth][j][1] = tiles[blockWidth][j][1] == 1 || placeRandomWall ? 1 : 0;
				tiles[blockWidth][height - j][1] = tiles[blockWidth][height - j][1] == 1 || placeRandomWall ? 1 : 0;
			}
		}

		return tiles;
	},

	_createGraph: function() {
		this.graph = new jKstra.Graph();

		this.vertices = new Array(this.width);
		for (let i = 0; i < this.width; ++i) {
			this.vertices[i] = new Array(this.height);
		}

		// Create vertex for each tile present.
		for (let i = 0; i < this.width; ++i) {
			for (let j = 0; j < this.height; ++j) {
				if (this.data.tiles[i][j][0] == 1) {
					this.vertices[i][j] = this.graph.addVertex({x: i, y: j});
				}
			}
		}

		// Create edge pairs between neighbouring tiles.
		const self = this;
		this.graph.forEachVertex(function(v) {
			const current = v.data;

			// Check if we can move left.
			if (current.x > 0 && self.data.tiles[current.x][current.y][2] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x-1][current.y], {x: current.x-1, y: current.y, length: 1});
			}

			// Check if we can move right.
			if (current.x < self.width-1 && self.data.tiles[current.x+1][current.y][2] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x+1][current.y], {x: current.x+1, y: current.y, length: 1});
			}

			// Check if we can move down.
			if (current.y < self.height-1 && self.data.tiles[current.x][current.y+1][1] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x][current.y+1], {x: current.x, y: current.y+1, length: 1});
			}

			// Check if we can move up.
			if (current.y > 0 && self.data.tiles[current.x][current.y][1] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x][current.y-1], {x: current.x, y: current.y-1, length: 1});
			}

			// Check if we can move left-down.
			if (current.x > 0 && current.y < self.height-1 && self.data.tiles[current.x][current.y][2] == 0 && self.data.tiles[current.x][current.y+1][2] == 0 && self.data.tiles[current.x][current.y+1][1] == 0 && self.data.tiles[current.x-1][current.y+1][1] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x-1][current.y+1], {x: current.x-1, y: current.y+1, length: Math.SQRT2});
			}

			// Check if we can move right-down.
			if (current.x < self.width-1 && current.y < self.height-1 && self.data.tiles[current.x+1][current.y][2] == 0 && self.data.tiles[current.x+1][current.y+1][2] == 0 && self.data.tiles[current.x][current.y+1][1] == 0 && self.data.tiles[current.x+1][current.y+1][1] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x+1][current.y+1], {x: current.x+1, y: current.y+1, length: Math.SQRT2});
			}

			// Check if we can move left-up.
			if (current.x > 0 && current.y > 0 && self.data.tiles[current.x][current.y][2] == 0 && self.data.tiles[current.x][current.y-1][2] == 0 && self.data.tiles[current.x][current.y][1] == 0 && self.data.tiles[current.x-1][current.y][1] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x-1][current.y-1], {x: current.x-1, y: current.y-1, length: Math.SQRT2});
			}

			// Check if we can move right-up.
			if (current.x < self.width-1 && current.y > 0 && self.data.tiles[current.x+1][current.y][2] == 0 && self.data.tiles[current.x+1][current.y-1][2] == 0 && self.data.tiles[current.x][current.y][1] == 0 && self.data.tiles[current.x+1][current.y][1] == 0)
			{
				self.graph.addEdge(v, self.vertices[current.x+1][current.y-1], {x: current.x+1, y: current.y-1, length: Math.SQRT2});
			}
		});

		this.dijkstra = new jKstra.algos.Dijkstra(this.graph);
	},

	// Can work on just a subset of the maze defined by width and height parameters.
	_calculateTilePresentToTileIndex: function(width, height) {
		this.tilePresentToTileIndex = [];
		for (let i = 0; i < width; ++i) {
			for (let j = 0; j < height; ++j) {
				const tilePresent = this.data.tiles[i][j][0] == 1;
				if (tilePresent)
				{
					this.tilePresentToTileIndex.push({x: i, y: j});
				}
			}
		}  
	},

	// Can work on just a subset of the maze defined by width and height parameters.
	_calculateReachable: function(tankPosition, width, height) {
		this.tileToReachableIndex = new Array(width);
		for (let i = 0; i < width; ++i) {
			this.tileToReachableIndex[i] = new Array(height);
		}
		
		this.reachable = [];

		const self = this;
		this._traverseCloseTiles(tankPosition, Number.MAX_VALUE, width, height, function(current) {
			self.tileToReachableIndex[current.x][current.y] = self.reachable.length;
			self.reachable.push({x: current.x, y: current.y, used: false});
		});
	},

	// Can work on just a subset of the maze defined by width and height parameters.
	_expandReachable: function(tankPosition, width, height) {
		let foundExpansion = false;
		
		//console.log("Try to expand reachable");
		
		// Walk through the reachable tiles and attempt to find a neighbouring unreachable tile, which we can punch a hole to.
		for (let i = 0; i < this.reachable.length; ++i) {
			const current = this.reachable[i];
			
			// Check left.
			if (current.x > 0 && this.data.tiles[current.x-1][current.y][0] == 1 && this.tileToReachableIndex[current.x-1][current.y] === undefined) {
				this.data.tiles[current.x][current.y][2] = 0;
				//console.log("Found expansion to the left of: " + current.x + ", " + current.y);
				foundExpansion = true;
				break;
			}

			// Check right.
			if (current.x < width-1 && this.data.tiles[current.x+1][current.y][0] == 1 && this.tileToReachableIndex[current.x+1][current.y] === undefined) {
				this.data.tiles[current.x+1][current.y][2] = 0;
				//console.log("Found expansion to the right of: " + current.x + ", " + current.y);
				foundExpansion = true;
				break;
			}
			
			// Check down.
			if (current.y < height-1 && this.data.tiles[current.x][current.y+1][0] == 1 && this.tileToReachableIndex[current.x][current.y+1] === undefined) {
				this.data.tiles[current.x][current.y+1][1] = 0;
				//console.log("Found expansion under: " + current.x + ", " + current.y);
				foundExpansion = true;
				break;
			}
			
			// Check up.
			if (current.y > 0 && this.data.tiles[current.x][current.y-1][0] == 1 && this.tileToReachableIndex[current.x][current.y-1] === undefined) {
				this.data.tiles[current.x][current.y][1] = 0;
				//console.log("Found expansion over: " + current.x + ", " + current.y);
				foundExpansion = true;
				break;
			}
			
		}
		
		if (foundExpansion) {
			this._calculateReachable(tankPosition, width, height);
		}
		
		return foundExpansion;
	},

	// Can work on just a subset of the maze defined by width and height parameters.
	_traverseCloseTiles: function(position, maximumDistance, width, height, traverseFn) {
		const alreadyAddedToWorklist = new Array(width);
		for (let i = 0; i < width; ++i) {
			alreadyAddedToWorklist[i] = new Array(height);
		}

		const worklist = [];
		worklist.push({x: position.x, y: position.y, distance: 0});

		alreadyAddedToWorklist[position.x][position.y] = true;

		while(worklist.length > 0)
		{
			const current = worklist.shift();

			// If we have moved too far away, stop traversing this path.
			if (current.distance > maximumDistance)
				continue;

			traverseFn(current);

			// Check if we can move left.
			if (current.x > 0 && this.data.tiles[current.x][current.y][2] == 0)
			{
				if (alreadyAddedToWorklist[current.x-1][current.y] === undefined) {
					alreadyAddedToWorklist[current.x-1][current.y] = true;
					worklist.push({x:current.x-1, y:current.y, distance:current.distance+1});
				}
			}

			// Check if we can move right.
			if (current.x < width-1 && this.data.tiles[current.x+1][current.y][2] == 0)
			{
				if (alreadyAddedToWorklist[current.x+1][current.y] === undefined) {
					alreadyAddedToWorklist[current.x+1][current.y] = true;
					worklist.push({x:current.x+1, y:current.y, distance:current.distance+1});
				}
			}

			// Check if we can move down.
			if (current.y < height-1 && this.data.tiles[current.x][current.y+1][1] == 0)
			{
				if (alreadyAddedToWorklist[current.x][current.y+1] === undefined) {
					alreadyAddedToWorklist[current.x][current.y+1] = true;
					worklist.push({x:current.x, y:current.y+1, distance:current.distance+1});
				}
			}

			// Check if we can move up.
			if (current.y > 0 && this.data.tiles[current.x][current.y][1] == 0)
			{
				if (alreadyAddedToWorklist[current.x][current.y-1] === undefined) {
					alreadyAddedToWorklist[current.x][current.y-1] = true;
					worklist.push({x:current.x, y:current.y-1, distance:current.distance+1});
				}
			}
		}
	},

	_markTilesAsUsed: function(position, minimumDistance) {
		const self = this;
		this.traverseCloseTiles(position, minimumDistance, function(current) {
			// Mark tile as used.
			self.reachable[self.tileToReachableIndex[current.x][current.y]].used = true;
		});

	},
	
	_clearUsedTiles: function() {
		for (let i = 0; i < this.reachable.length; ++i) {
			this.reachable[i].used = false;
		}
	},
	
	_getUnusedTiles: function() {
		const unused = [];
		
		for (let i = 0; i < this.reachable.length; ++i) {
			const current = this.reachable[i];
			if (!current.used) {
				unused.push({x:current.x, y: current.y});
			}
		}
		
		return unused;
	},

	traverseCloseTiles: function(position, maximumDistance, traverseFn) {
		this._traverseCloseTiles(position, maximumDistance, this.width, this.height, traverseFn);
	},

	getTheme: function() {
		return this.data.theme;
	},

	getWidth: function() {
		return this.width;
	},

	getHeight: function() {
		return this.height;
	},

	getTiles: function() {
		return this.data.tiles;
	},

	getBorders: function() {
		return this.data.borders;
	},

	getFloors: function() {
		return this.data.floors;
	},

	getSpaces: function() {
		return this.data.spaces;
	},

	getWalls: function() {
		return this.data.walls;
	},

	getWallDecorations: function() {
		return this.data.wallDecorations;
	},

	getDistances: function() {
		return this.data.distances;
	},

	getDistancesFromPosition: function(position) {
		if (!this._isPositionInsideMaze(position)) {
			return false;
		}
		return this.data.distances[position.x][position.y];
	},

	getDistanceBetweenPositions: function(startPosition, endPosition) {
		if (!this._isPositionInsideMaze(startPosition) || !this._isPositionInsideMaze(endPosition)) {
			return false;
		}
		return this.data.distances[startPosition.x][startPosition.y][endPosition.x][endPosition.y];
	},

	getDistanceToPosition: function(distances, position) {
		if (!this._isPositionInsideMaze(position)) {
			return false;
		}
		return distances[position.x][position.y];
	},

	getDeadEndPenalties: function() {
		return this.data.deadEndPenalties;
	},

	getReachable: function() {
		return this.reachable;
	},

	getReachableIndexFromPosition: function(position) {
		if (!this._isPositionInsideMaze(position)) {
			return false;
		}
		return this.tileToReachableIndex[position.x][position.y];
	},

	getTankPositions: function() {
		return this.tankPositions;
	},

	getRandomUnusedPosition: function(roundState, minimumDistance) {
		// Update positions already in use.
		this._updateUsedPositions(roundState, minimumDistance, true);

		const unused = this._getUnusedTiles();

		return this._getRandomPosition(unused);
	},

	getCrateSpawnPosition: function(roundState) {
		// Update positions already in use.
		this._updateUsedPositions(roundState, 0, true);

		const unused = this._getUnusedTiles();

		// Filter out spawn positions that are already in use.
		const comparePositionFn = function(a, b) { return a.x == b.x && a.y == b.y};
		const availablePositions = [];
		for (let i = 0;i<this.crateSpawnPositions.length;i++) {
			const crateSpawnPosition = this.crateSpawnPositions[i];
			const unusedIndex = ArrayUtils.indexOf(unused, crateSpawnPosition, comparePositionFn);
			if (unusedIndex != -1) {
				availablePositions.push(unused[unusedIndex]);
			}
		}

		return this._getRandomPosition(availablePositions);
	},

	// FIXME Add team information to spawn positions.
	getTankSpawnPosition: function(roundState) {
		// Update positions already in use.
		this._updateUsedPositions(roundState, 0, false);

		const unused = this._getUnusedTiles();

		// Filter out spawn positions that are already in use.
		const comparePositionFn = function(a, b) { return a.x == b.x && a.y == b.y};
		const availablePositions = [];
		for (let i = 0;i<this.tankSpawnPositions.length;i++) {
			const tankSpawnPosition = this.tankSpawnPositions[i];
			const unusedIndex = ArrayUtils.indexOf(unused, tankSpawnPosition, comparePositionFn);
			if (unusedIndex != -1) {
				availablePositions.push(unused[unusedIndex]);
			}
		}

		// Find the position with highest distance to other tanks.
		const tankStates = roundState.getTankStates();

		let maxDistance = 0;
		let bestPositions = [];
		for (let i = 0;i<availablePositions.length;++i) {
			const availablePosition = availablePositions[i];
			const distances = this.getDistancesFromPosition(availablePosition);
			let distance = Number.MAX_VALUE;
			for (let j = 0;j<tankStates.length;j++) {
				const tankState = tankStates[j];

				const position = {x:Math.floor(tankState.getX() / Constants.MAZE_TILE_SIZE.m), y:Math.floor(tankState.getY() / Constants.MAZE_TILE_SIZE.m)};

				// FIXME This should not be strictly necessary as server verifies tank state positions.
				if (!this._isPositionInsideMaze(position)) {
					Maze.log.error("A tank position was outside the maze. This should have been corrected by the server!");
					continue;
				}

				distance = Math.min(distance, distances[position.x][position.y]);
			}

			if (distance > maxDistance) {
				maxDistance = distance;
				bestPositions = new Array(availablePosition);
			} else if (distance == maxDistance) {
				bestPositions.push(availablePosition);
			}
		}

		return this._getRandomPosition(bestPositions);
	},

	// Selects a random tile position from array and makes it a physical position with a rotation.
	_getRandomPosition: function(positions) {
		if (positions.length == 0) {
			return undefined;
		}

		const position = MathUtils.randomArrayEntry(positions);

		return this._makePositionPhysical(position);
	},

	_makePositionPhysical: function(position) {
		position.x += 0.5;
		position.y += 0.5;
		position.x *= Constants.MAZE_TILE_SIZE.m;
		position.y *= Constants.MAZE_TILE_SIZE.m;

		position.rotation = Math.random() * 2.0 * Math.PI;

		return position;
	},

	isTankStateInsideMaze: function(tankState) {
		const position = {x:Math.floor(tankState.getX() / Constants.MAZE_TILE_SIZE.m), y:Math.floor(tankState.getY() / Constants.MAZE_TILE_SIZE.m)};
		return this._isPositionInsideMaze(position);
	},

	_isPositionInsideMaze: function(position) {
		if (position.x < 0 ||
			position.x >= this.width ||
			position.y < 0 ||
			position.y >= this.height) {
			Maze.log.error('Position outside tiles: ' + position.x + ", " + position.y);
			return false;
		}

		const distances = this.data.distances[position.x][position.y];
		if (distances === null) {
			Maze.log.error('Position pointing to invalid tile: ' + position.x + ", " + position.y);
			return false;
		}

		return true;
	},

	_updateUsedPositions: function(roundState, minimumDistance, includeTankSpawnPositions) {
		// Clear previous used marking.
		this._clearUsedTiles();

		// Iterate over tanks, collectibles and zones and mark neighbouring tiles as used.
		const tankStates = roundState.getTankStates();
		for (let i = 0;i<tankStates.length;i++) {
			const tankState = tankStates[i];

			const position = {x:Math.floor(tankState.getX() / Constants.MAZE_TILE_SIZE.m), y:Math.floor(tankState.getY() / Constants.MAZE_TILE_SIZE.m)};

			// FIXME This should not be strictly necessary as server verifies tank state positions.
			if (!this._isPositionInsideMaze(position)) {
				Maze.log.error("A tank position was outside the maze. This should have been corrected by the server!");
				continue;
			}

			this._markTilesAsUsed(position, minimumDistance);
		}

		const collectibleStates = roundState.getCollectibleStates();
		for (let i = 0;i<collectibleStates.length;i++) {
			const collectibleState = collectibleStates[i];

			const position = {x:Math.floor(collectibleState.getX() / Constants.MAZE_TILE_SIZE.m), y:Math.floor(collectibleState.getY() / Constants.MAZE_TILE_SIZE.m)};

			this._markTilesAsUsed(position, 0);
		}

		const zoneStates = roundState.getZoneStates();
		for (let i = 0;i<zoneStates.length;i++) {
			const zoneState = zoneStates[i];

			if (zoneState.getType() == Constants.ZONE_TYPES.SPAWN) {
				const tiles = zoneState.getTiles();
				for (let j = 0;j<tiles.length;j++) {
					this._markTilesAsUsed(tiles[j], 0);
				}
			}
		}

		if (includeTankSpawnPositions) {
			for(let i=0;i<this.tankSpawnPositions.length;i++) {
				const tankSpawnPosition = this.tankSpawnPositions[i];
				this._markTilesAsUsed(tankSpawnPosition, 0);
			}
		}
	},

	_calculateBorderFloorsSpacesWallsAndDecorations: function() {
		this.data.borders = [];
		this.data.floors = [];
		this.data.spaces = [];
		this.data.walls = [];
		this.data.wallDecorations = [];

		const tileToWallConfiguration = new Array(this.width);
		for (let i = 0; i < this.width; ++i) {
			tileToWallConfiguration[i] = new Array(this.height);
		}

		// Calculate wall configurations.
		for (let i = 0; i < this.width; ++i) {
			for (let j = 0; j < this.height; ++j) {
				tileToWallConfiguration[i][j] = (this.data.tiles[i][j][1] << 0) +
					(this.data.tiles[i][j][2] << 1) +
					((j < this.height - 1 ? this.data.tiles[i][j + 1][1] : this.data.tiles[i][j][0]) << 2) +
					((i < this.width - 1 ? this.data.tiles[i + 1][j][2] : this.data.tiles[i][j][0]) << 3);
			}
		}

		// Find all spaces and internal borders.
		for (let i = 0; i < this.width; ++i) {
			for (let j = 0; j < this.height; ++j) {

				const tilePresent = this.data.tiles[i][j][0] == 1;
				if (tilePresent) {
					const floor = MazeThemeManager.getRandomFloor(this.data.theme, tileToWallConfiguration[i][j]);
					if (floor) {
						this.data.floors.push({x: i, y: j, number: floor.number, rotation: floor.rotation});
					}
					const wallDecoration = MazeThemeManager.getRandomWallDecoration(this.data.theme, tileToWallConfiguration[i][j]);
					if (wallDecoration) {
						this.data.wallDecorations.push({
							x: i,
							y: j,
							number: wallDecoration.number,
							rotation: wallDecoration.rotation
						});
					}
				} else {
					if (tileToWallConfiguration[i][j] === 15 || this._isClosedOffSpace({x: i, y: j})) {
						const space = MazeThemeManager.getRandomSpace(this.data.theme, tileToWallConfiguration[i][j]);
						if (space) {
							this.data.spaces.push({x: i, y: j, number: space.number, rotation: space.rotation});
						}
					} else {
						const borders = MazeThemeManager.getRandomBorders(this.data.theme, tileToWallConfiguration[i][j]);
						for (let k = 0; k < borders.length; ++k) {
							const border = borders[k];
							this.data.borders.push({
								x: i,
								y: j,
								number: border.number,
								offsetX: border.offsetX,
								offsetY: border.offsetY,
								rotation: border.rotation,
								flip: border.flip
							});
						}
					}
				}
			}
		}
		// Find all outer borders.
		for (let i = 0; i < this.width; ++i) {
			if (this.data.tiles[i][0][1] == 1) {
				const borders = MazeThemeManager.getRandomBorders(this.data.theme, 1 << 2);
				for (let k = 0; k < borders.length; ++k) {
					const border = borders[k];
					this.data.borders.push({
						x: i,
						y: -1,
						number: border.number,
						offsetX: border.offsetX,
						offsetY: border.offsetY,
						rotation: border.rotation,
						flip: border.flip
					});
				}
			}
			if (this.data.tiles[i][this.height - 1][0] == 1) {
				const borders = MazeThemeManager.getRandomBorders(this.data.theme, 1 << 0);
				for (let k = 0; k < borders.length; ++k) {
					const border = borders[k];
					this.data.borders.push({
						x: i,
						y: this.height,
						number: border.number,
						offsetX: border.offsetX,
						offsetY: border.offsetY,
						rotation: border.rotation,
						flip: border.flip
					});
				}
			}
		}
		for (let j = 0; j < this.height; ++j) {
			if (this.data.tiles[0][j][2] == 1) {
				const borders = MazeThemeManager.getRandomBorders(this.data.theme, 1 << 3);
				for (let k = 0; k < borders.length; ++k) {
					const border = borders[k];
					this.data.borders.push({
						x: -1,
						y: j,
						number: border.number,
						offsetX: border.offsetX,
						offsetY: border.offsetY,
						rotation: border.rotation,
						flip: border.flip
					});
				}
			}
			if (this.data.tiles[this.width - 1][j][0] == 1) {
				const borders = MazeThemeManager.getRandomBorders(this.data.theme, 1 << 1);
				for (let k = 0; k < borders.length; ++k) {
					const border = borders[k];
					this.data.borders.push({
						x: this.width,
						y: j,
						number: border.number,
						offsetX: border.offsetX,
						offsetY: border.offsetY,
						rotation: border.rotation,
						flip: border.flip
					});
				}
			}
		}
		// Find all internal walls.
		for (let i = 0; i < this.width; ++i) {
			for (let j = 0; j < this.height; ++j) {
				const walls = MazeThemeManager.getRandomWalls(this.data.theme, tileToWallConfiguration[i][j]);
				for (let k = 0; k < walls.length; ++k) {
					const wall = walls[k];
					this.data.walls.push({
						x: i,
						y: j,
						number: wall.number,
						offsetX: wall.offsetX,
						offsetY: wall.offsetY,
						rotation: wall.rotation,
						flipX: wall.flipX,
						flipY: wall.flipY
					});
				}
			}
		}
		// Find all outer walls.
		for (let i = 0; i < this.width; ++i) {
			if (this.data.tiles[i][this.height - 1][0] == 1) {
				const walls = MazeThemeManager.getRandomWalls(this.data.theme, 1 << 0);
				for (let k = 0; k < walls.length; ++k) {
					const wall = walls[k];
					this.data.walls.push({
						x: i,
						y: this.height,
						number: wall.number,
						offsetX: wall.offsetX,
						offsetY: wall.offsetY,
						rotation: wall.rotation,
						flipX: wall.flipX,
						flipY: wall.flipY
					});
				}
			}
		}
		for (let j = 0; j < this.height; ++j) {
			if (this.data.tiles[this.width-1][j][0] == 1) {
				const walls = MazeThemeManager.getRandomWalls(this.data.theme, 1 << 1);
				for (let k = 0; k < walls.length; ++k) {
					const wall = walls[k];
					this.data.walls.push({
						x: this.width,
						y: j,
						number: wall.number,
						offsetX: wall.offsetX,
						offsetY: wall.offsetY,
						rotation: wall.rotation,
						flipX: wall.flipX,
						flipY: wall.flipY
					});
				}
			}
		}
	},

	_isClosedOffSpace: function(startPosition) {
		const alreadyAddedToWorklist = new Array(this.width);
		for (let i = 0; i < this.width; ++i) {
			alreadyAddedToWorklist[i] = new Array(this.height);
		}


		const worklist = [];
		worklist.push({x: startPosition.x, y: startPosition.y});

		alreadyAddedToWorklist[startPosition.x][startPosition.y] = true;

		while(worklist.length > 0)
		{
			const current = worklist.pop();

			// If at any point, we reach the edge of the maze. We know the space is not closed off.
			if (current.x == 0 || current.x == this.width-1 || current.y == 0 || current.y == this.height-1) {
				return false;
			}

			// Check if we can move left.
			if (this.data.tiles[current.x][current.y][2] == 0)
			{
				if (alreadyAddedToWorklist[current.x-1][current.y] === undefined) {
					alreadyAddedToWorklist[current.x-1][current.y] = true;
					worklist.push({x:current.x-1, y:current.y});
				}
			}

			// Check if we can move right.
			if (this.data.tiles[current.x+1][current.y][2] == 0)
			{
				if (alreadyAddedToWorklist[current.x+1][current.y] === undefined) {
					alreadyAddedToWorklist[current.x+1][current.y] = true;
					worklist.push({x:current.x+1, y:current.y});
				}
			}

			// Check if we can move down.
			if (this.data.tiles[current.x][current.y+1][1] == 0)
			{
				if (alreadyAddedToWorklist[current.x][current.y+1] === undefined) {
					alreadyAddedToWorklist[current.x][current.y+1] = true;
					worklist.push({x:current.x, y:current.y+1});
				}
			}

			// Check if we can move up.
			if (this.data.tiles[current.x][current.y][1] == 0)
			{
				if (alreadyAddedToWorklist[current.x][current.y-1] === undefined) {
					alreadyAddedToWorklist[current.x][current.y-1] = true;
					worklist.push({x:current.x, y:current.y-1});
				}
			}
		}

		// We never reached the edge of the maze, so the starting position must be part of a closed off space.
		return true;
	},

	_calculateDistances: function() {
		// Allocate distances array.
		this.data.distances = new Array(this.width);
		for (let i = 0; i < this.width; ++i) {
			this.data.distances[i] = new Array(this.height);
			for (let j = 0; j < this.height; ++j) {
				this.data.distances[i][j] = null;
			}
		}

		for (let i = 0; i < this.reachable.length; ++i) {
			this.data.distances[this.reachable[i].x][this.reachable[i].y] = this._calculateDistancesFromPosition(this.reachable[i]);
		}
	},

	_calculateDistancesFromPosition: function(position) {
		const result = new Array(this.width);
		for (let i = 0; i < this.width; ++i) {
			result[i] = new Array(this.height);
			for (let j = 0; j < this.height; ++j) {
				result[i][j] = Number.MAX_VALUE;
			}
		}

		this.traverseCloseTiles(position, Number.MAX_VALUE, function(current) {
			result[current.x][current.y] = current.distance;
		});

		return result;
	},

	getGradientPath: function(startPosition, maxLength, gradientFn) {
		const result = [];

		let currentValue = gradientFn(startPosition);
		let current = startPosition;
		let next = null;
		let foundPath = true;

		while (maxLength > 0 && foundPath) {
			foundPath = false;

			// Check if we can move left.
			if (current.x > 0 && this.data.tiles[current.x][current.y][2] == 0) {
				const value = gradientFn({x: current.x-1, y: current.y});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x-1, y:current.y};
					foundPath = true;
				}
			}

			// Check if we can move right.
			if (current.x < this.width-1 && this.data.tiles[current.x+1][current.y][2] == 0) {
				const value = gradientFn({x: current.x+1, y: current.y});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x+1, y:current.y};
					foundPath = true;
				}
			}

			// Check if we can move down.
			if (current.y < this.height-1 && this.data.tiles[current.x][current.y+1][1] == 0) {
				const value = gradientFn({x: current.x, y: current.y+1});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x, y:current.y+1};
					foundPath = true;
				}
			}

			// Check if we can move up.
			if (current.y > 0 && this.data.tiles[current.x][current.y][1] == 0) {
				const value = gradientFn({x: current.x, y: current.y-1});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x, y:current.y-1};
					foundPath = true;
				}
			}

			// Check if we can move left-down.
			if (current.x > 0 && current.y < this.height-1 && this.data.tiles[current.x][current.y][2] == 0 && this.data.tiles[current.x][current.y+1][2] == 0 && this.data.tiles[current.x][current.y+1][1] == 0 && this.data.tiles[current.x-1][current.y+1][1] == 0)
			{
				const value = gradientFn({x: current.x-1, y: current.y+1});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x-1, y:current.y+1};
					foundPath = true;
				}
			}

			// Check if we can move right-down.
			if (current.x < this.width-1 && current.y < this.height-1 && this.data.tiles[current.x+1][current.y][2] == 0 && this.data.tiles[current.x+1][current.y+1][2] == 0 && this.data.tiles[current.x][current.y+1][1] == 0 && this.data.tiles[current.x+1][current.y+1][1] == 0)
			{
				const value = gradientFn({x: current.x+1, y: current.y+1});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x+1, y:current.y+1};
					foundPath = true;
				}
			}

			// Check if we can move left-up.
			if (current.x > 0 && current.y > 0 && this.data.tiles[current.x][current.y][2] == 0 && this.data.tiles[current.x][current.y-1][2] == 0 && this.data.tiles[current.x][current.y][1] == 0 && this.data.tiles[current.x-1][current.y][1] == 0)
			{
				const value = gradientFn({x: current.x-1, y: current.y-1});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x-1, y:current.y-1};
					foundPath = true;
				}
			}

			// Check if we can move right-up.
			if (current.x < this.width-1 && current.y > 0 && this.data.tiles[current.x+1][current.y][2] == 0 && this.data.tiles[current.x+1][current.y-1][2] == 0 && this.data.tiles[current.x][current.y][1] == 0 && this.data.tiles[current.x+1][current.y][1] == 0)
			{
				const value = gradientFn({x: current.x+1, y: current.y-1});
				if (value > currentValue) {
					currentValue = value;
					next = {x:current.x+1, y:current.y-1};
					foundPath = true;
				}
			}

			if (foundPath) {
				result.push(next);
			}

			--maxLength;
			current = next;
		}

		return result;
	},

	getPathAwayFrom: function(startPosition, fromPosition, maxLength, deadEndWeight) {
		const distances = this.data.distances[fromPosition.x][fromPosition.y];

		const self = this;
		const path = this.getGradientPath(startPosition, maxLength, function(current) {
			return distances[current.x][current.y] - self.data.deadEndPenalties[current.x][current.y] * deadEndWeight;
		});

		return path;
	},

	getPathAwayFromWithThreats: function(startPosition, fromPosition, maxLength, deadEndWeight, threatMap, threatWeight) {
		const distances = this.data.distances[fromPosition.x][fromPosition.y];

		const self = this;
		const path = this.getGradientPath(startPosition, maxLength, function(current) {
			return distances[current.x][current.y] - self.data.deadEndPenalties[current.x][current.y] * deadEndWeight - threatMap.get(current) * threatWeight;
		});

		return path;
	},

	getPathAwayWithMultipleDistancesAndThreats: function(startPosition, maxLength, deadEndWeight, distancesArray, threatMap, threatWeight) {
		const self = this;
		const path = this.getGradientPath(startPosition, maxLength, function(current) {
			let distance = 0;
			for(let i = 0; i < distancesArray.length; ++i) {
				distance += distancesArray[i][current.x][current.y];
			}
			distance /= distancesArray.length;
			return distance - self.data.deadEndPenalties[current.x][current.y] * deadEndWeight - threatMap.get(current) * threatWeight;
		});

		return path;
	},

	getShortestPathWithGraph: function(startPosition, endPosition, weights, lengthWeight) {
		let result = null;

		if (weights !== undefined) {
			result = this.dijkstra.shortestPath(this.vertices[startPosition.x][startPosition.y], this.vertices[endPosition.x][endPosition.y], {
				edgeCost: function (e) {
					return weights[e.data.x][e.data.y] + e.data.length * lengthWeight;
				}/*,
				edgeFilter: function(e) {
					return weights[e.data.x][e.data.y] < 1;
				}*/
			});
		} else {
			result = this.dijkstra.shortestPath(this.vertices[startPosition.x][startPosition.y], this.vertices[endPosition.x][endPosition.y], {
				edgeCost: function (e) {
					return e.data.length;
				}
			});
		}

		if (result !== null) {
			return result.map(function(e) { return e.data; });
		} else {
			return [];
		}
	},

	_calculateDeadEndPenalties: function() {
		const result = new Array(this.width);
		for (let i = 0; i < this.width; ++i) {
			result[i] = new Array(this.height);
			for (let j = 0; j < this.height; ++j) {
				result[i][j] = 0;
			}
		}

		const worklist = [];
		for (let i = 0; i < this.reachable.length; ++i) {
			const current = this.reachable[i];
			let numExits = 0;

			// Check if we can move left.
			if (current.x > 0 && this.data.tiles[current.x][current.y][2] == 0)
			{
				++numExits;
			}
			// Check if we can move right.
			if (current.x < this.width-1 && this.data.tiles[current.x+1][current.y][2] == 0)
			{
				++numExits;
			}
			// Check if we can move down.
			if (current.y < this.height-1 && this.data.tiles[current.x][current.y+1][1] == 0)
			{
				++numExits;
			}
			// Check if we can move up.
			if (current.y > 0 && this.data.tiles[current.x][current.y][1] == 0)
			{
				++numExits;
			}

			if (numExits == 1) {
				worklist.push({x: current.x, y: current.y});
			}
		}

		while(worklist.length > 0)
		{
			const current = worklist.shift();

			let numExits = 0;
			let next = null;
			let penalty = Constants.MAZE_MAX_DEAD_END_PENALTY;

			// Check if we can move left.
			if (current.x > 0 && this.data.tiles[current.x][current.y][2] == 0)
			{
				// Check if left is not a dead end already.
				// If it is not, count it as an exit and add it for potential future processing.
				if (result[current.x-1][current.y] == 0) {
					++numExits;
					next = {x: current.x-1, y: current.y};
				} else {
					penalty = Math.max(1, Math.min(penalty, result[current.x-1][current.y]-1));
				}
			}

			// Check if we can move right.
			if (current.x < this.width-1 && this.data.tiles[current.x+1][current.y][2] == 0)
			{
				if (result[current.x+1][current.y] == 0) {
					++numExits;
					next = {x: current.x+1, y: current.y};
				} else {
					penalty = Math.max(1, Math.min(penalty, result[current.x+1][current.y]-1));
				}
			}

			// Check if we can move down.
			if (current.y < this.height-1 && this.data.tiles[current.x][current.y+1][1] == 0)
			{
				if (result[current.x][current.y+1] == 0) {
					++numExits;
					next = {x: current.x, y: current.y+1};
				} else {
					penalty = Math.max(1, Math.min(penalty, result[current.x][current.y+1]-1));
				}
			}

			// Check if we can move up.
			if (current.y > 0 && this.data.tiles[current.x][current.y][1] == 0)
			{
				if (result[current.x][current.y-1] == 0) {
					++numExits;
					next = {x: current.x, y: current.y-1};
				} else {
					penalty = Math.max(1, Math.min(penalty, result[current.x][current.y-1]-1));
				}
			}

			// There were at most one exit, so we can now mark this tile as a dead end.
			if (numExits <= 1) {
				result[current.x][current.y] = penalty;
			}

			// There was exactly one exit, so we should add the free neighbour for processing.
			if (numExits == 1) {
				worklist.push(next);
			}
		}

		this.data.deadEndPenalties = result;
	}

});

if (typeof module === 'object') {
	module.exports = Maze;
}
