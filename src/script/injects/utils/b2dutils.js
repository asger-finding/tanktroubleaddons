if (typeof require === 'function') {
    var Classy = require('./classy');
    var Constants = require('./constants');
    var Box2D = require('./box2d');
}

// These really only need to be called once, but we do it here
Box2D.Common.b2Settings.b2_maxTranslation = 8.0;//4.0;
Box2D.Common.b2Settings.b2_maxTranslationSquared = 64.0;//16.0;
Box2D.Common.b2Settings.b2_velocityThreshold = 0.0;

var B2DUtils = Classy.newClass().name('B2DUtils');

B2DUtils.fields({

});

B2DUtils.classFields({
    _manifoldInstance: null
});

B2DUtils.classMethods({
    createMaze: function(b2dworld, maze) {
        // Setup helper array which is used to determine if colliders have already been created for a given maze tile.
        var tiles = maze.getTiles();
    
        var tempArray = new Array(tiles.length);
        for (var i = 0; i < tiles.length; ++i)
        {
            tempArray[i] = new Array(tiles[0].length);
            for (var j = 0; j < tiles[0].length; ++j)
            {
                tempArray[i][j] = {topWallColliderCreated: false, leftWallColliderCreated: false};
            }
        }
    
        // Create collision bodies.
        for (var i = 0; i < tiles.length; ++i)
        {
            for (var j = 0; j < tiles[0].length; ++j)
            {
                // Top wall.
                if (tiles[i][j][1] == 1 && !tempArray[i][j].topWallColliderCreated)
                {
                    // The points containing the collider geometry (must be convex).
                    var points = new Array();

                    // First, check for how the starting end of the collider should be.
                    if (j-1 < 0 || tiles[i][j-1][2] == 1)
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0 + Constants.MAZE_WALL_WIDTH.m;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    else
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    if (tiles[i][j][2] == 1)
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0 + Constants.MAZE_WALL_WIDTH.m;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    else
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                    }

                    // Then, step along to the right until finding the other end of the collider.
                    var iStep = i;
                    while (iStep < tiles.length)
                    {
                        if (tiles[iStep][j][1] == 1)
                        {
                            tempArray[iStep][j].topWallColliderCreated = true;
                            ++iStep;
                        }
                        else
                        {
                            break;
                        }
                    }
                
                    // Finally, check for how the ending end of the collider should be.
                    if (iStep == tiles.length || tiles[iStep][j][2] == 1)
                    {
                        points[points.length] = iStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0 - Constants.MAZE_WALL_WIDTH.m;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    else
                    {
                        points[points.length] = iStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    if (iStep == tiles.length || j-1 < 0 || tiles[iStep][j-1][2] == 1)
                    {
                        points[points.length] = iStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0 - Constants.MAZE_WALL_WIDTH.m;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    else
                    {
                        points[points.length] = iStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                    }

                    var wallVertices = [
                        Box2D.Common.Math.b2Vec2.Make(points[6], points[7]),
                        Box2D.Common.Math.b2Vec2.Make(points[4], points[5]),
                        Box2D.Common.Math.b2Vec2.Make(points[2], points[3]),
                        Box2D.Common.Math.b2Vec2.Make(points[0], points[1])
                    ];

                    this._createWallBody(b2dworld, wallVertices, maze);
                }
            
                // Left wall.
                if (tiles[i][j][2] == 1 && !tempArray[i][j].leftWallColliderCreated)
                {
                    // The points containing the collider geometry (must be convex).
                    var points = new Array();

                    // First, check for how the starting end of the collider should be.
                    if (i-1 < 0 || tiles[i-1][j][1] == 1)
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0 + Constants.MAZE_WALL_WIDTH.m;
                    }
                    else
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    if (tiles[i][j][1] == 1)
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0 + Constants.MAZE_WALL_WIDTH.m;
                    }
                    else
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                    }

                    // Then, step along down until finding the other end of the collider.
                    var jStep = j;
                    while (jStep < tiles[0].length)
                    {
                        if (tiles[i][jStep][2] == 1)
                        {
                            tempArray[i][jStep].leftWallColliderCreated = true;
                            ++jStep;
                        }
                        else
                        {
                            break;
                        }
                    }
                
                    // Finally, check for how the ending end of the collider should be.
                    if (jStep == tiles[0].length || tiles[i][jStep][1] == 1)
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = jStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0 - Constants.MAZE_WALL_WIDTH.m;
                    }
                    else
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = jStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                    }
                    if (jStep == tiles[0].length || i-1 < 0 || tiles[i-1][jStep][1] == 1)
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = jStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0 - Constants.MAZE_WALL_WIDTH.m;
                    }
                    else
                    {
                        points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                        points[points.length] = jStep * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                    }

                    var wallVertices = [
                        Box2D.Common.Math.b2Vec2.Make(points[0], points[1]),
                        Box2D.Common.Math.b2Vec2.Make(points[2], points[3]),
                        Box2D.Common.Math.b2Vec2.Make(points[4], points[5]),
                        Box2D.Common.Math.b2Vec2.Make(points[6], points[7])
                    ];

                    this._createWallBody(b2dworld, wallVertices, maze);
                }
            }
        }
        for (var i = 0; i < tiles.length; ++i)
        {
            // Bottom wall.
            if (tiles[i][tiles[0].length-1][0] == 1)
            {
                // The points containing the collider geometry (must be convex).
                var points = new Array();
            
                points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = tiles[0].length * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = i * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = tiles[0].length * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
            
                // Step along to the right until finding the other end of the collider.
                while (i < tiles.length)
                {
                    if (tiles[i][tiles[0].length-1][0] == 1)
                    {
                        ++i;
                    }
                    else
                    {
                        break;
                    }
                }
            
                points[points.length] = i * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = tiles[0].length * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = i * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = tiles[0].length * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
        
                var wallVertices = [
                    Box2D.Common.Math.b2Vec2.Make(points[6], points[7]),
                    Box2D.Common.Math.b2Vec2.Make(points[4], points[5]),
                    Box2D.Common.Math.b2Vec2.Make(points[2], points[3]),
                    Box2D.Common.Math.b2Vec2.Make(points[0], points[1])
                ];
                
                this._createWallBody(b2dworld, wallVertices, maze);
            }
        }
        for (var j = 0; j < tiles[0].length;  ++j)
        {
            // Right wall.
            if (tiles[tiles.length-1][j][0] == 1)
            {
                // The points containing the collider geometry (must be convex).
                var points = new Array();

                points[points.length] = tiles.length * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = tiles.length * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = j * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;

                // Step along down until finding the other end of the collider.
                while (j < tiles[0].length)
                {
                    if (tiles[tiles.length-1][j][0] == 1)
                    {
                        ++j;
                    }
                    else
                    {
                        break;
                    }
                }
            
                points[points.length] = tiles.length * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = j * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = tiles.length * Constants.MAZE_TILE_SIZE.m - Constants.MAZE_WALL_WIDTH.m/2.0;
                points[points.length] = j * Constants.MAZE_TILE_SIZE.m + Constants.MAZE_WALL_WIDTH.m/2.0;

                var wallVertices = [
                    Box2D.Common.Math.b2Vec2.Make(points[0], points[1]),
                    Box2D.Common.Math.b2Vec2.Make(points[2], points[3]),
                    Box2D.Common.Math.b2Vec2.Make(points[4], points[5]),
                    Box2D.Common.Math.b2Vec2.Make(points[6], points[7])
                ];

                this._createWallBody(b2dworld, wallVertices, maze);
            }
        }
    },
    
    _createWallBody: function(b2dworld, wallVertices, maze) {
        var wallFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        wallFixtureDef.density = 0.0;
        wallFixtureDef.friction = 0.05;
        wallFixtureDef.restitution = 0.0;

        wallFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(wallVertices);
        wallFixtureDef.userData = {gameObject: maze};
        wallFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        wallFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.MAZE;
        wallFixtureDef.filter.maskBits = Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.PROJECTILE;

        var wallBodyDef = new Box2D.Dynamics.b2BodyDef;
        wallBodyDef.type = Box2D.Dynamics.b2Body.b2_staticBody;

        var box2dBody = b2dworld.CreateBody(wallBodyDef);
        box2dBody.CreateFixture(wallFixtureDef);

        return box2dBody;
    },

    createProjectileBody: function(b2dworld, projectile, radius) {
        // Enable physics on the projectile.
        var projectileFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        projectileFixtureDef.density = 0.01;
        projectileFixtureDef.friction = 0.0;
        projectileFixtureDef.restitution = 1.0;
        projectileFixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(radius);
        projectileFixtureDef.userData = {gameObject: projectile};
        projectileFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        projectileFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.PROJECTILE;
        projectileFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK | 
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;

        var projectileBodyDef = new Box2D.Dynamics.b2BodyDef;
        projectileBodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        projectileBodyDef.linearDamping = 0.0;
        projectileBodyDef.fixedRotation = true;
        projectileBodyDef.active = true;
        // Prevents tunneling through dynamic bodies such as the tanks!
        projectileBodyDef.bullet = true;
        var box2dBody = b2dworld.CreateBody(projectileBodyDef);
        box2dBody.CreateFixture(projectileFixtureDef);
        box2dBody.SetPosition(
            Box2D.Common.Math.b2Vec2.Make(projectile.getX(), projectile.getY())
        );
        box2dBody.SetLinearVelocity(
            Box2D.Common.Math.b2Vec2.Make(projectile.getSpeedX(), projectile.getSpeedY())
        );

        return box2dBody;
    },

    createCrateBody: function(b2dworld, collectible) {
        //enable physics on the crate
        var crateFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        crateFixtureDef.density = 0.1;
        crateFixtureDef.friction = 0.0;
        crateFixtureDef.restitution = 1.0;
        crateFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsBox(
            Constants.CRATE.WIDTH.m / 2.0,
            Constants.CRATE.HEIGHT.m / 2.0
        );
        crateFixtureDef.userData = {gameObject: collectible};
        crateFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        crateFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.COLLECTIBLE;
        crateFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK;

        var crateBodyDef = new Box2D.Dynamics.b2BodyDef;
        crateBodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        crateBodyDef.angle = collectible.getRotation();
        crateBodyDef.linearDamping = 4.0;
        crateBodyDef.angularDamping = 4.0;
        crateBodyDef.fixedRotation = false;
        crateBodyDef.active = true;
        crateBodyDef.allowSleep = false;
        var box2dBody = b2dworld.CreateBody(crateBodyDef);
        box2dBody.CreateFixture(crateFixtureDef);
        box2dBody.SetPosition(
            Box2D.Common.Math.b2Vec2.Make(collectible.getX(), collectible.getY())
        );

        return box2dBody;
    },

    createGoldBody: function(b2dworld, collectible) {
        //enable physics on the gold
        var goldFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        goldFixtureDef.density = 0.1;
        goldFixtureDef.friction = 0.0;
        goldFixtureDef.restitution = 1.0;
        goldFixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(Constants.GOLD.RADIUS.m);
        goldFixtureDef.userData = {gameObject: collectible};
        goldFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        goldFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.COLLECTIBLE;
        goldFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK;

        var goldBodyDef = new Box2D.Dynamics.b2BodyDef;
        goldBodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        goldBodyDef.linearDamping = 4.0;
        goldBodyDef.fixedRotation = true;
        goldBodyDef.active = true;
        goldBodyDef.allowSleep = false;
        var box2dBody = b2dworld.CreateBody(goldBodyDef);
        box2dBody.CreateFixture(goldFixtureDef);
        box2dBody.SetPosition(
            Box2D.Common.Math.b2Vec2.Make(collectible.getX(), collectible.getY())
        );

        return box2dBody;
    },

    createDiamondBody: function(b2dworld, collectible) {
        //enable physics on the diamond
        var diamondFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        diamondFixtureDef.density = 0.1;
        diamondFixtureDef.friction = 0.0;
        diamondFixtureDef.restitution = 1.0;
        var diamondVertices = [
            Box2D.Common.Math.b2Vec2.Make(0, Constants.DIAMOND.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(-Constants.DIAMOND.WIDTH.m/2.0, Constants.DIAMOND.MIDDLE_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(-Constants.DIAMOND.WIDTH.m/2.0, -Constants.DIAMOND.MIDDLE_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(0, -Constants.DIAMOND.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.DIAMOND.WIDTH.m/2.0, -Constants.DIAMOND.MIDDLE_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.DIAMOND.WIDTH.m/2.0, Constants.DIAMOND.MIDDLE_HEIGHT.m/2.0)
        ];

        diamondFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(diamondVertices);
        diamondFixtureDef.userData = {gameObject: collectible};
        diamondFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        diamondFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.COLLECTIBLE;
        diamondFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK;

        var diamondBodyDef = new Box2D.Dynamics.b2BodyDef;
        diamondBodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        diamondBodyDef.angle = collectible.getRotation();
        diamondBodyDef.linearDamping = 4.0;
        diamondBodyDef.fixedRotation = true;
        diamondBodyDef.active = true;
        diamondBodyDef.allowSleep = false;
        var box2dBody = b2dworld.CreateBody(diamondBodyDef);
        box2dBody.CreateFixture(diamondFixtureDef);
        box2dBody.SetPosition(
            Box2D.Common.Math.b2Vec2.Make(collectible.getX(), collectible.getY())
        );

        return box2dBody;
    },

    createSpawnZoneBody: function(b2dworld, zone, radius) {
        var spawnZoneFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        spawnZoneFixtureDef.density = 0.0;
        spawnZoneFixtureDef.friction = 0.0;
        spawnZoneFixtureDef.restitution = 1.0;

        spawnZoneFixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(radius);
        spawnZoneFixtureDef.userData = {gameObject: zone};
        spawnZoneFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        spawnZoneFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.ZONE;
        spawnZoneFixtureDef.filter.maskBits = Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.SHIELD;

        var spawnZoneBodyDef = new Box2D.Dynamics.b2BodyDef;
        spawnZoneBodyDef.type = Box2D.Dynamics.b2Body.b2_staticBody;

        var box2dBody = b2dworld.CreateBody(spawnZoneBodyDef);
        box2dBody.CreateFixture(spawnZoneFixtureDef);
        var position = zone.getTiles()[0];
        box2dBody.SetPosition(
            Box2D.Common.Math.b2Vec2.Make((position.x + 0.5) * Constants.MAZE_TILE_SIZE.m, (position.y + 0.5) * Constants.MAZE_TILE_SIZE.m)
        );

        return box2dBody;
    },

    updateSpawnZoneBody: function(b2body, zone, radius) {
        var fixture = b2body.GetFixtureList();
        b2body.DestroyFixture(fixture);

        var spawnZoneFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        spawnZoneFixtureDef.density = 0.0;
        spawnZoneFixtureDef.friction = 0.0;
        spawnZoneFixtureDef.restitution = 1.0;

        spawnZoneFixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(radius);
        spawnZoneFixtureDef.userData = {gameObject: zone};
        spawnZoneFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        spawnZoneFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.ZONE;
        spawnZoneFixtureDef.filter.maskBits = Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.SHIELD;

        b2body.CreateFixture(spawnZoneFixtureDef);
    },

    addTankBodyUpgrade: function(b2body, upgrade) {
        // Remove any old upgrade of type.
        B2DUtils.removeTankBodyUpgrade(b2body, upgrade.getType());

        // Add new upgrade.
        var newFixtureDefs = [];
        switch(upgrade.getType()) {
            case Constants.UPGRADE_TYPES.LASER_AIMER:
            case Constants.UPGRADE_TYPES.AIMER:
            case Constants.UPGRADE_TYPES.SPEED_BOOST:
            {
                // Intentionally create no new fixtures.
                break;
            }
            case Constants.UPGRADE_TYPES.SPAWN_SHIELD:
            case Constants.UPGRADE_TYPES.SHIELD:
            {
                newFixtureDefs = B2DUtils._createShieldFixtureDefs(upgrade);
                break;
            }
        }

        for (var i = 0; i < newFixtureDefs.length; ++i) {
            b2body.CreateFixture(newFixtureDefs[i]);
        }
    },

    removeTankBodyUpgrade: function(b2body, upgradeType) {
        var currentFixture = b2body.GetFixtureList();
        while (currentFixture !== null) {
            if (currentFixture.GetUserData().type === upgradeType) {
                var nextFixture = currentFixture.GetNext();
                b2body.DestroyFixture(currentFixture);
                currentFixture = nextFixture;
            } else {
                currentFixture = currentFixture.GetNext();
            }
        }
    },

    _createShieldFixtureDefs: function(upgrade) {
        var shieldFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        shieldFixtureDef.density = 10.0;
        shieldFixtureDef.friction = 0.0;
        shieldFixtureDef.restitution = 1.0;
        shieldFixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(Constants.SHIELD.RADIUS.m);
        shieldFixtureDef.userData = {type: upgrade.getType(), gameObject: upgrade};
        shieldFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        shieldFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.SHIELD;
        shieldFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;

        return [shieldFixtureDef];
    },

    updateTankBodyTurret: function(b2body, tank, weapon) {
        // Remove old tank turret.
        var currentFixture = b2body.GetFixtureList();
        while (currentFixture !== null) {
            if (currentFixture.GetUserData().type === "turret") {
                var nextFixture = currentFixture.GetNext();
                b2body.DestroyFixture(currentFixture);
                currentFixture = nextFixture;
            } else {
                currentFixture = currentFixture.GetNext();
            }
        }
        
        // Add new tank turret.
        var newFixtureDefs = [];
        switch(weapon.getType()) {
            case Constants.WEAPON_TYPES.BULLET:
            {
                newFixtureDefs = B2DUtils._createBulletTurretFixtureDefs(tank);
                break;
            }
            case Constants.WEAPON_TYPES.LASER:
            {
                newFixtureDefs = B2DUtils._createLaserTurretFixtureDefs(tank);
                break;
            }
            case Constants.WEAPON_TYPES.DOUBLE_BARREL:
            {
                newFixtureDefs = B2DUtils._createDoubleBarrelTurretFixtureDefs(tank);
                break;
            }
            case Constants.WEAPON_TYPES.SHOTGUN:
            {
                newFixtureDefs = B2DUtils._createShotgunTurretFixtureDef(tank);
                break;
            }
            case Constants.WEAPON_TYPES.HOMING_MISSILE:
            {
                if (!weapon.getField("launched")) {
                    newFixtureDefs = B2DUtils._createMissileTurretFixtureDef(tank);
                }
                break;
            }
        }
        
        for (var i = 0; i < newFixtureDefs.length; ++i) {
            b2body.CreateFixture(newFixtureDefs[i]);
        }
    },

    _createBulletTurretFixtureDefs: function(tank) {
        var turretFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        turretFixtureDef.density = 0.0;
        turretFixtureDef.friction = 0.25;
        turretFixtureDef.restitution = 0.0;
        var turretVertices = [
            Box2D.Common.Math.b2Vec2.Make(Constants.BULLET_TURRET.OFFSET_X.m + Constants.BULLET_TURRET.WIDTH.m/2.0, Constants.BULLET_TURRET.OFFSET_Y.m + Constants.BULLET_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.BULLET_TURRET.OFFSET_X.m - Constants.BULLET_TURRET.WIDTH.m/2.0, Constants.BULLET_TURRET.OFFSET_Y.m + Constants.BULLET_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.BULLET_TURRET.OFFSET_X.m - Constants.BULLET_TURRET.WIDTH.m/2.0, Constants.BULLET_TURRET.OFFSET_Y.m - Constants.BULLET_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.BULLET_TURRET.OFFSET_X.m + Constants.BULLET_TURRET.WIDTH.m/2.0, Constants.BULLET_TURRET.OFFSET_Y.m - Constants.BULLET_TURRET.HEIGHT.m/2.0)
        ];

        turretFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(turretVertices);
        turretFixtureDef.userData = {type: "turret", gameObject: tank};
        turretFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        turretFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.TANK;
        turretFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.COLLECTIBLE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;
        
        return [turretFixtureDef];
    },
    
    _createLaserTurretFixtureDefs: function(tank) {
        var dishFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        dishFixtureDef.density = 0.0;
        dishFixtureDef.friction = 0.25;
        dishFixtureDef.restitution = 0.0;
        var dishVertices = [
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.DISH_OFFSET_X.m + Constants.LASER_TURRET.DISH_WIDTH.m/2.0, Constants.LASER_TURRET.DISH_OFFSET_Y.m + Constants.LASER_TURRET.DISH_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.DISH_OFFSET_X.m - Constants.LASER_TURRET.DISH_WIDTH.m/2.0, Constants.LASER_TURRET.DISH_OFFSET_Y.m + Constants.LASER_TURRET.DISH_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.DISH_OFFSET_X.m - Constants.LASER_TURRET.DISH_WIDTH.m/2.0, Constants.LASER_TURRET.DISH_OFFSET_Y.m - Constants.LASER_TURRET.DISH_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.DISH_OFFSET_X.m + Constants.LASER_TURRET.DISH_WIDTH.m/2.0, Constants.LASER_TURRET.DISH_OFFSET_Y.m - Constants.LASER_TURRET.DISH_HEIGHT.m/2.0)
        ];

        dishFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(dishVertices);
        dishFixtureDef.userData = {type: "turret", gameObject: tank};
        dishFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        dishFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.TANK;
        dishFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.COLLECTIBLE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;
        
        var antennaFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        antennaFixtureDef.density = 0.0;
        antennaFixtureDef.friction = 0.25;
        antennaFixtureDef.restitution = 0.0;
        var antennaVertices = [
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.ANTENNA_OFFSET_X.m + Constants.LASER_TURRET.ANTENNA_WIDTH.m/2.0, Constants.LASER_TURRET.ANTENNA_OFFSET_Y.m + Constants.LASER_TURRET.ANTENNA_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.ANTENNA_OFFSET_X.m - Constants.LASER_TURRET.ANTENNA_WIDTH.m/2.0, Constants.LASER_TURRET.ANTENNA_OFFSET_Y.m + Constants.LASER_TURRET.ANTENNA_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.ANTENNA_OFFSET_X.m - Constants.LASER_TURRET.ANTENNA_WIDTH.m/2.0, Constants.LASER_TURRET.ANTENNA_OFFSET_Y.m - Constants.LASER_TURRET.ANTENNA_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.LASER_TURRET.ANTENNA_OFFSET_X.m + Constants.LASER_TURRET.ANTENNA_WIDTH.m/2.0, Constants.LASER_TURRET.ANTENNA_OFFSET_Y.m - Constants.LASER_TURRET.ANTENNA_HEIGHT.m/2.0)
        ];

        antennaFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(antennaVertices);
        antennaFixtureDef.userData = {type: "turret", gameObject: tank};
        antennaFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        antennaFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.TANK;
        antennaFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.COLLECTIBLE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;
        
        return [dishFixtureDef, antennaFixtureDef];
    },

    _createDoubleBarrelTurretFixtureDefs: function(tank) {
        var turretFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        turretFixtureDef.density = 0.0;
        turretFixtureDef.friction = 0.25;
        turretFixtureDef.restitution = 0.0;
        var turretVertices = [
            Box2D.Common.Math.b2Vec2.Make(Constants.DOUBLE_BARREL_TURRET.OFFSET_X.m + Constants.DOUBLE_BARREL_TURRET.WIDTH.m/2.0, Constants.DOUBLE_BARREL_TURRET.OFFSET_Y.m + Constants.DOUBLE_BARREL_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.DOUBLE_BARREL_TURRET.OFFSET_X.m - Constants.DOUBLE_BARREL_TURRET.WIDTH.m/2.0, Constants.DOUBLE_BARREL_TURRET.OFFSET_Y.m + Constants.DOUBLE_BARREL_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.DOUBLE_BARREL_TURRET.OFFSET_X.m - Constants.DOUBLE_BARREL_TURRET.WIDTH.m/2.0, Constants.DOUBLE_BARREL_TURRET.OFFSET_Y.m - Constants.DOUBLE_BARREL_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.DOUBLE_BARREL_TURRET.OFFSET_X.m + Constants.DOUBLE_BARREL_TURRET.WIDTH.m/2.0, Constants.DOUBLE_BARREL_TURRET.OFFSET_Y.m - Constants.DOUBLE_BARREL_TURRET.HEIGHT.m/2.0)
        ];

        turretFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(turretVertices);
        turretFixtureDef.userData = {type: "turret", gameObject: tank};
        turretFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        turretFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.TANK;
        turretFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.COLLECTIBLE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;

        return [turretFixtureDef];
    },

    _createShotgunTurretFixtureDef: function(tank) {
        var turretFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        turretFixtureDef.density = 0.0;
        turretFixtureDef.friction = 0.25;
        turretFixtureDef.restitution = 0.0;
        var turretVertices = [
            Box2D.Common.Math.b2Vec2.Make(Constants.SHOTGUN_TURRET.OFFSET_X.m + Constants.SHOTGUN_TURRET.WIDTH.m/2.0, Constants.SHOTGUN_TURRET.OFFSET_Y.m + Constants.SHOTGUN_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.SHOTGUN_TURRET.OFFSET_X.m - Constants.SHOTGUN_TURRET.WIDTH.m/2.0, Constants.SHOTGUN_TURRET.OFFSET_Y.m + Constants.SHOTGUN_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.SHOTGUN_TURRET.OFFSET_X.m - Constants.SHOTGUN_TURRET.WIDTH.m/2.0, Constants.SHOTGUN_TURRET.OFFSET_Y.m - Constants.SHOTGUN_TURRET.HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.SHOTGUN_TURRET.OFFSET_X.m + Constants.SHOTGUN_TURRET.WIDTH.m/2.0, Constants.SHOTGUN_TURRET.OFFSET_Y.m - Constants.SHOTGUN_TURRET.HEIGHT.m/2.0)
        ];

        turretFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(turretVertices);
        turretFixtureDef.userData = {type: "turret", gameObject: tank};
        turretFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        turretFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.TANK;
        turretFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.COLLECTIBLE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;

        return [turretFixtureDef];
    },

    _createMissileTurretFixtureDef: function(tank) {
        var turretFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        turretFixtureDef.density = 0.0;
        turretFixtureDef.friction = 0.25;
        turretFixtureDef.restitution = 0.0;
        var turretVertices = [
            Box2D.Common.Math.b2Vec2.Make(Constants.MISSILE_TURRET.OFFSET_X.m + Constants.MISSILE_TURRET.WIDTH.m/2.0, Constants.MISSILE_TURRET.OFFSET_Y.m + Constants.MISSILE_TURRET.CENTER_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.MISSILE_TURRET.OFFSET_X.m - Constants.MISSILE_TURRET.WIDTH.m/2.0, Constants.MISSILE_TURRET.OFFSET_Y.m + Constants.MISSILE_TURRET.CENTER_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.MISSILE_TURRET.OFFSET_X.m - Constants.MISSILE_TURRET.WIDTH.m/2.0, Constants.MISSILE_TURRET.OFFSET_Y.m - Constants.MISSILE_TURRET.SIDE_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.MISSILE_TURRET.OFFSET_X.m, Constants.MISSILE_TURRET.OFFSET_Y.m - Constants.MISSILE_TURRET.CENTER_HEIGHT.m/2.0),
            Box2D.Common.Math.b2Vec2.Make(Constants.MISSILE_TURRET.OFFSET_X.m + Constants.MISSILE_TURRET.WIDTH.m/2.0, Constants.MISSILE_TURRET.OFFSET_Y.m - Constants.MISSILE_TURRET.SIDE_HEIGHT.m/2.0)
        ];

        turretFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsArray(turretVertices);
        turretFixtureDef.userData = {type: "turret", gameObject: tank};
        turretFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        turretFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.TANK;
        turretFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.COLLECTIBLE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;

        return [turretFixtureDef];
    },

    createTankBody: function(b2dworld, tank) {
        //enable physics on the player
        var tankBaseFixtureDef = new Box2D.Dynamics.b2FixtureDef;
        tankBaseFixtureDef.density = 1.0;
        tankBaseFixtureDef.friction = 0.25;
        tankBaseFixtureDef.restitution = 0.0;
        tankBaseFixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape.AsBox(
            Constants.TANK.WIDTH.m / 2.0,
            Constants.TANK.HEIGHT.m / 2.0
        );
        tankBaseFixtureDef.userData = {type: "base", gameObject: tank};
        tankBaseFixtureDef.filter = new Box2D.Dynamics.b2FilterData;
        tankBaseFixtureDef.filter.categoryBits = Constants.COLLISION_CATEGORIES.TANK;
        tankBaseFixtureDef.filter.maskBits =
            Constants.COLLISION_CATEGORIES.TANK |
            Constants.COLLISION_CATEGORIES.MAZE |
            Constants.COLLISION_CATEGORIES.PROJECTILE |
            Constants.COLLISION_CATEGORIES.COLLECTIBLE |
            Constants.COLLISION_CATEGORIES.SHIELD |
            Constants.COLLISION_CATEGORIES.ZONE;

        var tankBodyDef = new Box2D.Dynamics.b2BodyDef;
        tankBodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
        tankBodyDef.angle = tank.getRotation();
        tankBodyDef.linearDamping = 0.0;
        tankBodyDef.fixedRotation = false;
        tankBodyDef.active = true;
        tankBodyDef.allowSleep = false;
        var box2dBody = b2dworld.CreateBody(tankBodyDef);
        box2dBody.CreateFixture(tankBaseFixtureDef);
        box2dBody.CreateFixture(B2DUtils._createBulletTurretFixtureDefs(tank)[0]);
        box2dBody.SetPosition(
            Box2D.Common.Math.b2Vec2.Make(tank.getX(), tank.getY())
        );

        return box2dBody;
    },
    
    getWorldManifold: function() {
        if (B2DUtils._manifoldInstance === null) {
            B2DUtils._manifoldInstance = new Box2D.Collision.b2WorldManifold();
        }
        
        return B2DUtils._manifoldInstance;
    },
    
    getContactData: function(b2dcontact) {
        var categoryBitsA = b2dcontact.GetFixtureA().GetFilterData().categoryBits;
        var categoryBitsB = b2dcontact.GetFixtureB().GetFilterData().categoryBits;
        var fixtureA = b2dcontact.GetFixtureA();
        var fixtureB = b2dcontact.GetFixtureB();

        var data = {};
        data.contactBits = categoryBitsA | categoryBitsB;

        var worldManifold = B2DUtils.getWorldManifold();
        b2dcontact.GetWorldManifold(worldManifold);
        
        // Make a copy of the collision point since it will be overwritten by other collisions.
        data.collisionPoint = worldManifold.m_points[0].Copy();
        data.collisionNormal = worldManifold.m_normal.Copy();

        switch (categoryBitsA) {
            case Constants.COLLISION_CATEGORIES.TANK:
            {
                data.tankA = fixtureA.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.MAZE:
            {
                data.maze = fixtureA.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.PROJECTILE:
            {
                data.projectile = fixtureA.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.COLLECTIBLE:
            {
                data.collectible = fixtureA.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.SHIELD:
            {
                data.shieldA = fixtureA.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.ZONE:
            {
                data.zone = fixtureA.GetUserData().gameObject;
                break;
            }
            default:
            {
                console.log("Unknown collision category in B2DUtils.getContactData");
            }

        }

        switch (categoryBitsB) {
            case Constants.COLLISION_CATEGORIES.TANK:
            {
                if (data.tankA) {
                    data.tankB = fixtureB.GetUserData().gameObject;
                }  else {
                    data.tankA = fixtureB.GetUserData().gameObject;
                }

                break;
            }
            case Constants.COLLISION_CATEGORIES.MAZE:
            {
                data.maze = fixtureB.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.PROJECTILE:
            {
                data.projectile = fixtureB.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.COLLECTIBLE:
            {
                data.collectible = fixtureB.GetUserData().gameObject;
                break;
            }
            case Constants.COLLISION_CATEGORIES.SHIELD:
            {
                if (data.shieldA) {
                    data.shieldB = fixtureB.GetUserData().gameObject;
                } else {
                    data.shieldA = fixtureB.GetUserData().gameObject;
                }

                break;
            }
            case Constants.COLLISION_CATEGORIES.ZONE:
            {
                data.zone = fixtureB.GetUserData().gameObject;
                break;
            }
            default:
            {
                console.log("Unknown collision category in B2DUtils.getContactData");
            }

        }
        
        return data;        
    },

    // Returns path info object containing path (array of {x,y}), direction ({x,y}), hit (Tank object), firstSegmentLength (float) and length (float)
    calculateProjectilePath: function(b2dworld, projectile, maxBounces, maxLength, collideWithTanks) {
        var b2body = projectile.getB2DBody();
        return B2DUtils.calculatePath(b2dworld, b2body.GetPosition(), b2body.GetLinearVelocity(), maxBounces, maxLength, collideWithTanks);
    },

    // Returns path info object containing path (array of {x,y}), direction ({x,y}), hit (Tank object), firstSegmentLength (float) and length (float)
    calculateFiringPath: function(b2dworld, tank, angle, maxBounces, maxLength, collideWithTanks) {
        var b2body = tank.getB2DBody();
        var direction = Box2D.Common.Math.b2Math.MulMV(
            Box2D.Common.Math.b2Mat22.FromAngle(b2body.GetAngle() + angle),
            Box2D.Common.Math.b2Vec2.Make(0, -Constants.TANK.HEIGHT.m * 0.5)
        );
        var position = b2body.GetPosition().Copy();
        position.x += direction.x;
        position.y += direction.y;
        return B2DUtils.calculatePath(b2dworld, position, direction, maxBounces, maxLength, collideWithTanks);
    },

    // Returns path info object containing path (array of {x,y}), direction ({x,y}), hit (Tank object), firstSegmentLength (float) and length (float)
    calculatePath: function(b2dworld, position, direction, maxBounces, maxLength, collideWithTanks) {
        var path = [];
        var hit = null;
        var pathLength = 0;
        var firstSegmentLength = 0;
        path.push(position);
        var remainingLength = maxLength;
        var bounces = 0;
        // Initialize ray.
        var currentDirection = direction.Copy();
        currentDirection.Normalize();
        var currentPosition = position.Copy();
        var nextPosition = currentPosition.Copy();
        nextPosition.x += currentDirection.x * remainingLength;
        nextPosition.y += currentDirection.y * remainingLength;
        // Intersection values.
        var closestFixture = null;
        var closestPoint = Box2D.Common.Math.b2Vec2.Make(0, 0);
        var closestNormal = Box2D.Common.Math.b2Vec2.Make(0, 0);
        var closestFraction = 1;
        while(remainingLength > 0 && bounces <= maxBounces) {
            b2dworld.RayCast(function(fixture, point, normal, fraction) {
                // Ignore all projectiles and collectibles!
                if (fixture.GetFilterData().categoryBits === Constants.COLLISION_CATEGORIES.PROJECTILE ||
                    fixture.GetFilterData().categoryBits === Constants.COLLISION_CATEGORIES.COLLECTIBLE) {
                    return closestFraction;
                }
                // Ignore tanks if asked to!
                if (!collideWithTanks && fixture.GetFilterData().categoryBits === Constants.COLLISION_CATEGORIES.TANK) {
                    return closestFraction;
                }
                // If closer than previous intersection, update intersection values.
                // This should not be necessary according to documentation, but it seems to be.
                if (fraction < closestFraction) {
                    closestFixture = fixture;
                    closestPoint.SetV(point);
                    closestNormal.SetV(normal);
                    closestFraction = fraction;
                }
                return closestFraction;
            }, currentPosition, nextPosition);
            if (closestFixture) {
                // Put a copy into path to be able to reuse closestPoint.
                path.push(closestPoint.Copy());
                if (closestFixture.GetFilterData().categoryBits === Constants.COLLISION_CATEGORIES.MAZE ||
                    closestFixture.GetFilterData().categoryBits === Constants.COLLISION_CATEGORIES.SHIELD) {
                    // Continue ray.
                    var rayLength = Math.max(Constants.PATH_MIN_STEP_LENGTH, closestFraction * remainingLength);
                    pathLength += rayLength;
                    remainingLength -= rayLength;
                    // Reflect direction around normal.
                    closestNormal.Multiply(-2 * Box2D.Common.Math.b2Math.Dot(currentDirection, closestNormal));
                    currentDirection.x += closestNormal.x;
                    currentDirection.y += closestNormal.y;
                    // Update current and next position.
                    currentPosition.SetV(closestPoint);
                    nextPosition.SetV(currentPosition);
                    nextPosition.x += currentDirection.x * remainingLength;
                    nextPosition.y += currentDirection.y * remainingLength;
                } else {
                    // End path here.
                    pathLength += closestFraction * remainingLength;
                    remainingLength = 0;
                    // Store hit if tank was closest.
                    if (closestFixture.GetFilterData().categoryBits === Constants.COLLISION_CATEGORIES.TANK) {
                        hit = closestFixture.GetUserData().gameObject;
                    }
                }
            } else {
                // No intersection. End path at next position.
                pathLength += remainingLength;
                remainingLength = 0;
                path.push(nextPosition);
            }
            // Store first segment length.
            if (bounces === 0) {
                firstSegmentLength = pathLength;
            }
            // Reset intersection values for next ray.
            closestFraction = 1;
            closestFixture = null;
            // Increase bounces.
            ++bounces;
        }

        return {path: path, hit: hit, firstSegmentLength: firstSegmentLength, length: pathLength, direction: direction};
    },

    splatPathUntoMazeMap: function(map, path, stepSize, splatFn) {
        var mapData = map.data();

        // First validate path.
        for (var i = 0; i < path.length; ++i) {
            var tile = {
                x: Math.floor(path[i].x/Constants.MAZE_TILE_SIZE.m),
                y: Math.floor(path[i].x/Constants.MAZE_TILE_SIZE.m)
            };
            if (!map.isPositionInsideMap(tile)) {
                return;
            }
        }

        // Then do the splatting.
        var totalLength = 0;
        var segmentSample = 0.0;
        var tile = Box2D.Common.Math.b2Vec2.Make(0, 0);
        for (var i = 1; i < path.length; ++i) {
            var segmentStart = path[i-1];
            var segmentEnd = path[i];
            var segmentDir = segmentEnd.Copy();
            segmentDir.Subtract(segmentStart);
            var segmentLength = segmentDir.Normalize();

            while (segmentSample < segmentLength) {
                var current = segmentDir.Copy();
                current.Multiply(segmentSample);
                current.Add(segmentStart);

                tile.Set(Math.floor(current.x/Constants.MAZE_TILE_SIZE.m), Math.floor(current.y/Constants.MAZE_TILE_SIZE.m));

                mapData[tile.x][tile.y] += splatFn(tile, totalLength + segmentSample, stepSize);

                segmentSample += stepSize;
            }

            totalLength += segmentLength;
            segmentSample -= segmentLength;
        }
    },

    checkLineForMazeCollision: function(b2dworld, startPosition, endPosition) {
        var hitMaze = false;
        b2dworld.RayCast(function(fixture, point, normal, fraction) {
            // Ignore everything except maze!
            if (fixture.GetFilterData().categoryBits !== Constants.COLLISION_CATEGORIES.MAZE) {
                return 1;
            }

            hitMaze = true;
            return 0;
        }, startPosition, endPosition);

        return hitMaze;
    },

    toLocalSpace: function(b2body, position) {
        var worldPoint = Box2D.Common.Math.b2Vec2.Make(position.x, position.y);
        var localPoint = b2body.GetLocalPoint(worldPoint);
        return localPoint;
    },

    directionToLocalSpace: function(b2body, direction) {
        var worldPoint = b2body.GetPosition().Copy();
        worldPoint.Add(direction);
        var localPoint = b2body.GetLocalPoint(worldPoint);
        return localPoint;
    }
});

if (typeof module === 'object') {
    module.exports = B2DUtils;
}
