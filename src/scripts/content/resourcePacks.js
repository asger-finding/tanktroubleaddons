import './resourcePackPlugin.js';
import { calculateFileHash } from '../utils/mathUtils.js';
import { interceptFunction } from '../utils/gameUtils.js';
import { mergeWithSchema } from '../utils/objectUtils.js';
import { unzip } from 'but-unzip';

const storeName = 'resourcePacks';


/**
 * Listens to a Phaser event and returns callback with remove function.
 * @private
 * @param {object} target Phaser signal event manager
 * @param {(removeListener: () => void, ...args: unknown[]) => void} callback Callback function
 */
const phaserUntil = (target, callback) => {
	// eslint-disable-next-line jsdoc/require-jsdoc
	function handler(...args) {
		callback(() => target.remove(handler), ...args);
	}
	target.add(handler);
};

/**
 * Normalizes file paths in the decoded zip by setting the directory containing meta.json as the root
 * @private
 * @param {Record<string, Uint8Array>} decoded The decoded zip file contents
 * @returns {{ normalized: Record<string, Uint8Array>, metaPath: string | null }} Normalized file paths and the path to meta.json
 */
const normalizeResourcePack = decoded => {
	const metaFilePath = Object.keys(decoded).find((file) => file.endsWith('meta.json'));
	if (!metaFilePath) return { normalized: decoded, metaPath: null };

	// Determine the root directory (directory containing meta.json)
	const metaDir = metaFilePath.substring(0, metaFilePath.lastIndexOf('/') + 1);

	// If meta.json is in the root, no normalization needed
	if (!metaDir) return { normalized: decoded, metaPath: metaFilePath };

	// Create a new object with normalized paths
	const normalized = {};
	for (const [path, data] of Object.entries(decoded)) {
		if (path.startsWith(metaDir)) {
			const newPath = path.substring(metaDir.length);
			normalized[newPath] = data;
		}
	}

	return { normalized, metaPath: metaFilePath };
};

/**
 * Filter out directory paths
 * @param {Record<string, Uint8Array>} decoded The decoded zip file contents
 * @returns {Record<string, Uint8Array>} Filtered zip file
 */
const filterOutDirectories = decoded => {
	const result = {};
	for (const key in decoded) {
		if (Object.prototype.hasOwnProperty.call(decoded, key) && !key.endsWith('/'))
			result[key] = decoded[key];
	}
	return result;
};

/**
 * Parses the metafile from a resource pack decode
 * @private
 * @param {File} file The zip file
 * @param {Record<string, Uint8Array>} decoded Resource pack
 * @returns {object} Decoded metafile or fallback
 */
const createMetaFile = (file, decoded) => {
	const [defaultPackName] = file.name.split('.zip');
	const schema = {
		pack: {
			name: defaultPackName,
			description: ''
		},
		features: [],
		themeConfig: Constants.MAZE_THEME_INFO[0]
	};

	let fatal = false;
	try {
		const { normalized, metaPath } = normalizeResourcePack(decoded);
		if (!metaPath) throw new Error('No meta.json found in resource pack');

		const metafile = normalized['meta.json'];
		if (!metafile) {
			fatal = true;
			throw new Error('meta.json exists, but accessing it failed');
		}

		try {
			let text = null;
			let json = null;
			try {
				text = new TextDecoder().decode(metafile);
				json = JSON.parse(text);
			} catch (err) {
				fatal = true;
				throw new Error(`Failed to parse meta.json: ${ err.message }`);
			}

			if (
				json.themeConfig instanceof Object
				&& Object.keys(json.themeConfig).length > 0
				&& !json.features.includes('noMazeThemes')
			) {
				fatal = true;
				throw new Error('Using a custom theme config only works with the `noMazeThemes` feature');
			}

			return mergeWithSchema(schema, json);
		} catch (err) {
			fatal = true;
			throw new Error(err.message);
		}
	} catch (err) {
		if (fatal) {
			console.error('createMetaFile:', err);
			throw new Error(err.message);
		} else {
			console.warn('createMetaFile:', err);
		}

		return schema;
	}
};

/**
 * Parse styles.css, if any, and return it or default value
 * @private
 * @param {Record<string, Uint8Array>} normalized Resource pack with normalized paths
 * @returns {string} Stylesheet or empty fallback
 */
const parseCSS = normalized => {
	try {
		return new TextDecoder().decode(normalized['styles.css']);
	} catch {
		return '';
	}
};

/**
 * Generates a unique name for a resource pack by appending an incremental suffix if needed.
 * @private
 * @param {IDBObjectStore} store The IndexedDB object store
 * @param {string} baseName The base name of the resource pack
 * @param {number} [suffix] The current suffix to try (default: 0, meaning no suffix)
 * @returns {Promise<string>} Resolves with a unique name
 */
const generateUniqueName = async(store, baseName) => {
	const name = baseName.trim() || 'Unnamed resource pack';

	for (let suffix = 0; ; suffix++) {
		const candidateName = suffix === 0 ? name : `${name} (${suffix})`;

		const exists = await new Promise((resolve, reject) => {
			const request = store.get(candidateName);
			/* eslint-disable jsdoc/require-jsdoc */
			request.onsuccess = () => resolve(Boolean(request.result));
			request.onerror = () => reject(request.error);
			/* eslint-enable jsdoc/require-jsdoc */
		});

		if (!exists) return candidateName;
	}
};

/**
 * Add a zip file entry to the database, storing its extracted content
 * @private
 * @param {File} file The zip file to be added
 * @param {boolean} builtIn Is the resource pack user-added or built-in?
 * @param {number?} timestamp When the resource pack was added to the store
 * @returns {Promise<string>} Resolves with hashsum when the operation is complete
 */
const addResourcePackToStore = async(file, builtIn, timestamp = Date.now()) => {
	if (!file.name.endsWith('.zip')) throw new Error('Only zip files are supported');

	const hashsum = await calculateFileHash(file);

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		/* eslint-disable jsdoc/require-jsdoc */
		reader.addEventListener('load', async(event) => {
			try {
				const entries = unzip(new Uint8Array(event.target.result));
				if (!entries || entries.length === 0) {
					reject(new Error('No valid data found in the zip file'));
					return;
				}

				const decoded = {};
				for (const entry of entries)
					decoded[entry.filename] = await entry.read();


				let normalized = null;
				let metafile = null;
				try {
					({ normalized } = normalizeResourcePack(decoded));
					normalized = filterOutDirectories(normalized);
					metafile = createMetaFile(file, decoded);
				} catch (userReadableError) {
					reject(userReadableError);
					return;
				}
				const css = parseCSS(normalized);

				const transaction = Addons.indexedDB.transaction([storeName], 'readwrite');
				const store = transaction.objectStore(storeName);
				const index = store.index('hashsum');
				const hashRequest = index.get(hashsum);
				hashRequest.onsuccess = async() => {
					const existingFile = hashRequest.result;

					// File with same hashsum exists
					if (existingFile) {
						reject(new Error('Resource pack already exists'));
						return;
					}

					// Generate new name with suffix if a resource
					// pack with the same name already exists
					const uniqueName = await generateUniqueName(store, metafile.pack.name);
					// eslint-disable-next-line require-atomic-updates
					metafile.pack.name = uniqueName;

					// Store resource pack
					store.add({
						name: metafile.pack.name,
						hashsum,
						timestamp,
						metafile,
						css,
						builtin: builtIn,
						textures: normalized
					});
					resolve(hashsum);
				};
				hashRequest.onerror = () => reject(hashRequest.error);
			} catch (err) {
				reject(new Error(`Failed to process zip file: ${err.message}`));
			}
		});
		reader.onerror = () => reject(new Error(`Failed to read zip file: ${reader.error?.message || 'Unknown error'}`));
		reader.readAsArrayBuffer(file);
		/* eslint-enable jsdoc/require-jsdoc */
	});
};

/**
 * Retrieve all hashsums and names from the database
 * @private
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries
 */
const getAllResourcePacksFromStore = () => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction(storeName, 'readonly');
	const store = transaction.objectStore(storeName);
	const request = store.getAll();

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		const files = request.result.map(({ name, hashsum, builtin, timestamp, metafile }) => ({ name, hashsum, builtin, timestamp, metafile }));
		files.sort((first, sec) => (sec.builtin - first.builtin) || (first.timestamp - sec.timestamp));

		resolve(files);
	};
	request.onerror = () => reject(request.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Retrieve a specific entry by its hashsum
 * @private
 * @param {string} hashsum The hashsum of the file to retrieve
 * @returns {Promise<{ name: string, hashsum: string, timestamp: number }>} Resolves with the file entry
 */
const getResourcePackFromStore = hashsum => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction([storeName], 'readonly');
	const store = transaction.objectStore(storeName);
	const index = store.index('hashsum');
	const request = index.get(hashsum);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		if (request.result) resolve(request.result);
		else reject(new Error('No file found'));
	};
	request.onerror = () => reject(request.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Get the first available resource pack in the object store.
 * Returns false if the store is empty.
 * @private
 * @returns {Promise<object|false>} Resolves when resource pack is determined, or if none available, with null
 */
const getFirstResourcePackFromStore = async() => {
	const resourcePacks = await getAllResourcePacksFromStore();
	if (resourcePacks.length === 0) return false;
	return getResourcePackFromStore(resourcePacks[0].hashsum);
};

/**
 * Remove an entry from the resource packs object store
 * @private
 * @param {string} hashsum The hashsum of the entry to be removed
 * @returns {Promise<void>} Resolves if the entry is successfully removed or if it does not exist
 */
const removeResourcePackFromStore = hashsum => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction([storeName], 'readwrite');
	const store = transaction.objectStore(storeName);
	const index = store.index('hashsum');

	const request = index.get(hashsum);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		const entry = request.result;

		if (entry) {
			const deleteRequest = store.delete(entry.name);

			deleteRequest.onsuccess = () => { resolve(); };

			deleteRequest.onerror = () => {
				reject(new Error('Failed to delete the resource pack'));
			};
		} else {
			// Entry does not exist
			resolve();
		}
	};

	request.onerror = () => { reject(new Error('Failed to retrieve the resource pack')); };
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Add the default resource packs to the object store
 * @protected
 */
const storeDefaultResourcePacks = async() => {
	const resourcePacks = await Promise.all(
		[
			Addons.t_url('assets/resourcepacks/Normal.zip'),
			Addons.t_url('assets/resourcepacks/Dark.zip'),
			Addons.t_url('assets/resourcepacks/3D Light.zip'),
			Addons.t_url('assets/resourcepacks/Classic.zip')
		].map(url => fetch(url))
	);

	for (let i = 0; i < resourcePacks.length; i++) {
		const resourcePack = resourcePacks[i];
		const { url } = resourcePack;
		resourcePack.arrayBuffer().then(arrayBuffer => {
			const fileName = decodeURIComponent(url).replace(/^.*[\\/]/u, '');
			const file = new File([arrayBuffer], fileName);
			const builtIn = true;

			addResourcePackToStore(file, builtIn, i)
				// Resource pack is already stored.
				// Intentionally do nothing.
				.catch(() => {});
		});
	}
};

/**
 * Get the user-loaded resource pack
 * @public
 * @returns {Promise<Uint8Array>} Resource pack or error if unset
 */
const getActiveResourcePack = () => new Promise((resolve, reject) => {
	/**
	 * Fallback to first resource pack in store if error
	 * @returns {Promise<Uint8Array>} Pack or reject
	 */
	const handleError = () => getFirstResourcePackFromStore()
		.then(result => {
			if (result !== false) resolve(result);
			else reject('Resource pack unset');
		});

	const hashsum = localStorage.getItem('resourcepack');
	if (hashsum === null || !/\b[a-fA-F0-9]{64}\b/u.test(hashsum)) {
		handleError();
	} else {
		getResourcePackFromStore(hashsum)
			.then(resolve)
			.catch(handleError);
	}

});

/**
 * Store a new resource pack
 * @public
 * @param {File} file The zip file to be added.
 * @returns {Promise<string>} Resolves with hashsum or error if fail
 */
const storeResourcePack = file => addResourcePackToStore(file, false);

/**
 * Set the active resource pack in local storage
 * @public
 * @param {string} hashsum The unique hashsum of the resource pack
 * @returns {Promise<object>} Resolves with resource pack object if successfully added, else rejects with error
 */
const setActiveResourcePack = hashsum => new Promise((resolve, reject) => {
	if (!(/\b[a-fA-F0-9]{64}\b/u).test(hashsum)) {
		reject('Resource pack key is invalid');
		return;
	}
	localStorage.setItem('resourcepack', hashsum);
	Addons.getActiveResourcePack()
		.then(pack => {
			insertResourcePackCSS(pack.css);
			resolve(pack);
		})
		.catch(reject);
});

/**
 * Remove a resource pack saved to the store
 * @public
 * @param {string} hashsum The hashsum of the resource pack to remove
 * @returns {Promise<object>} Resolves when resource pack has been removed
 */
const removeResourcePack = hashsum => {
	const wasActive = localStorage.getItem('resourcepack') === hashsum;

	return removeResourcePackFromStore(hashsum).then(() => {
		if (!wasActive) return false;

		localStorage.removeItem('resourcepack');

		return getFirstResourcePackFromStore().then(result => {
			if (result !== false) {
				Addons.setActiveResourcePack(result.hashsum);
				Addons.reloadGame();
			}

			return result;
		});
	});
};

/**
 * Retrieve all hashsums and names.
 * @public
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries.
 */
const getAllResourcePacks = () => getAllResourcePacksFromStore();

/**
 * Reload the TankTrouble phaser game instance and rejoin the current game
 * @public
 */
const reloadGame = () => {
	const game = GameManager.getGame();
	if (game) {
		const gameController = GameManager.getGameController();

		game?.load.reset(true, true);
		game.destroy();
		GameManager.phaserInstance = null;
		const newGameInstance = GameManager.insertGame($('#game'));

		if (!gameController) return;

		// Attempt to rejoin online game after preload has finished.
		//
		// Due to how game controllers are handled, it's difficult
		// to rejoin a local game. Therefore, we exit the user
		// from the bootcamp and don't attempt to rejoin.
		if (Constants.getMode() !== Constants.MODE_CLIENT_ONLINE) {
			gameController.endGame();
			return;
		}

		GameManager.setGameController(null);
		ClientManager.getClient().roundState = null;
		ClientManager.getClient().expandedRoundState = null;

		const gameId = gameController.getId();
		const state = gameController.getState();
		const started = gameController.roundController.model.getStarted();

		/**
		 * Event listener for Phaser state change
		 * @param {string} newState State id
		 */
		phaserUntil(newGameInstance.state.onStateChange, (removeListener, newState) => {
			if (newState === 'Lobby') {
				removeListener();

				const originalLobbyState = newGameInstance.state;
				const originalLobbyCreate = originalLobbyState.onCreateCallback;

				originalLobbyState.onCreateCallback = function(...args) {
					if (originalLobbyCreate) originalLobbyCreate.call(this, ...args);

					const playerIds = ClientManager.getClient().getPlayerIds();
					const ttGame = GameController.withIds(gameId, playerIds);
					ttGame.model.setState(state);
					ttGame.roundController.model.started = started;

					newGameInstance.state.start('Game', true, false, ttGame);
				};
			}
		});
	}
};

/**
 * Loads an image from a source (URL or Uint8Array)
 * @private
 * @param {string|Uint8Array} source The image source as URL or binary data
 * @returns {Promise<HTMLImageElement>} Resolves with the loaded image
 */
const loadImage = source =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';

		const isBlob = source instanceof Uint8Array;
		if (isBlob) {
			const blob = new Blob([source]);
			image.src = URL.createObjectURL(blob);
		} else {
			image.src = source;
		}

		image.addEventListener('load', () => {
			if (isBlob) URL.revokeObjectURL(image.src);
			resolve(image);
		});
		image.addEventListener('error', () => {
			if (isBlob) URL.revokeObjectURL(image.src);
			reject(new Error(`Failed to load image: ${image.src}`));
		});
	});

/**
 * Insert a custom resource pack theme configuration at the end of the maze themes
 * @private
 * @param {Record<string, any>} metafile Metafile config
 * @returns {number} Custom theme index in Constants.MAZE_THEME_INFO
 */
const insertCustomMazeThemeInfo = metafile => {
	const theme = {
		...Constants.MAZE_THEME_INFO[0],
		...metafile.themeConfig || {},
		ADDONS: true
	};

	const customThemeIndex = Constants.MAZE_THEME_INFO.findIndex(THEME => THEME.ADDONS);
	if (customThemeIndex !== -1) Constants.MAZE_THEME_INFO.splice(customThemeIndex, 1, theme);
	else Constants.MAZE_THEME_INFO.push(theme);

	const index = Addons.getResourcePackSwitch('noMazeThemes').value
		? Constants.MAZE_THEME_INFO.length - 1
		: -1;
	Addons._maze_theme = index;

	return customThemeIndex === -1 ? Constants.MAZE_THEME_INFO.length - 1 : customThemeIndex;
};

/**
 * Remove a custom resource pack theme configuration from the maze themes
 * @private
 */
const removeCustomMazeThemeInfo = () => {
	const customThemeIndex = Constants.MAZE_THEME_INFO.findIndex(THEME => THEME.ADDONS);
	if (customThemeIndex !== -1) {
		delete MazeThemeManager.preparedThemes[customThemeIndex];
		Constants.MAZE_THEME_INFO.splice(customThemeIndex, 1);
	}

	Addons._maze_theme = -1;
};

/**
 * Get the index for the addons theme or use the provided theme index
 * @private
 * @param {number} themeIfUnset Fallback theme
 * @returns {number} Addons theme index or initial
 */
const getMazeThemeIndex = themeIfUnset => Addons._maze_theme !== -1 ? Addons._maze_theme : themeIfUnset;

/**
 * Set the custom features (switches) used by the resource pack
 * @private
 * @param {string[]} switchList Array over switches
 */
const setResourcePackSwitches = switchList => {
	const validSwitches = [
		'noTintBase',
		'noTintTreads',
		'noTintHomingMissiles',
		'noTintMines',
		'noMazeThemes',
		'localGameText',
		'randomText',
		'newGameText',
		'buttonTextFill'
	];
	Addons._resource_pack_switches = switchList.filter(switchKey => {
		const parsedKey = switchKey.split('=')[0];
		if (!validSwitches.includes(parsedKey)) {
			console.warn(`setResourcePackSwitches: ${parsedKey} is not a valid switch`);

			return false;
		}
		return true;
	});
};

/**
 * Gets a switch-value pair from the resource pack features (formatted as "switch=value" or "switch").
 * @param {string} switchKey Key to search for
 * @returns {{key: string, value: string|true|null}} Object with switch and found value
 */
const getResourcePackSwitch = switchKey => {
	if (!Addons._resource_pack_switches) return { key: switchKey, value: false };

	const foundItem = Addons._resource_pack_switches.find(item => {
		const [key] = item.split('=');
		return key === switchKey;
	});

	if (!foundItem) return { key: switchKey, value: null };

	const [key, ...valueParts] = foundItem.split('=');
	const value = valueParts.length === 0
		? true
		: valueParts.join('=');

	return { key, value };
};

/**
 * Load a resource pack into the game using batch resource replacement
 * @public
 * @param {Record<string, HTMLImageElement | ImageBitmap>} files Resource pack data
 * @param {Record<string, any>} metafile Metafile config
 */
const insertResourcePackIntoGame = async(files, metafile) => {
	const game = GameManager.getGame();
	if (!game) return;

	setResourcePackSwitches(metafile.features);
	removeCustomMazeThemeInfo();

	const resources = {
		atlases: [],
		images: {},
		sounds: {}
	};

	const frames = {};
	const imagePromises = [];

	for (const [path, data] of Object.entries(files)) {
		const key = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));

		if (path.startsWith('sound/'))
			resources.sounds[key] = data.buffer;
		else if (path.startsWith('image/'))
			imagePromises.push(loadImage(data).then(img => { resources.images[key] = img; }));
		else if (path.startsWith('game/') && path.endsWith('.png'))
			imagePromises.push(loadImage(data).then(img => { frames[key] = img; }));
	}

	await Promise.all(imagePromises);
	resources.atlases.push({ key: 'game', frames });

	const success = await game.plugins.resourcePack.replaceResources(resources);
	if (!success) return;

	const themeIndex = insertCustomMazeThemeInfo(metafile);
	const { frameData } = game.cache._cache.image.game;

	for (const frameName of Object.keys(frameData._frameNames)) {
		const themeFrameKey = frameName.replace(/0-(?<_>.*)/u, `${themeIndex}-$1`);
		if (frameName !== themeFrameKey) {
			const frame = frameData.getFrameByName(frameName);
			frame.name = themeFrameKey;
			frameData.addFrame(frame);
		}
	}
};

/**
 * Insert the resource pack css into the document
 * @param {string} css Resource pack css as a string
 */
const insertResourcePackCSS = css => {
	if (!Addons._resource_pack_styles) {
		Addons._resource_pack_styles = new CSSStyleSheet();
		document.adoptedStyleSheets.push(Addons._resource_pack_styles);
	}

	Addons._resource_pack_styles.replace(css);
};

Object.assign(Addons, {
	getActiveResourcePack,
	setActiveResourcePack,
	storeResourcePack,
	removeResourcePack,
	getAllResourcePacks,
	getMazeThemeIndex,
	getResourcePackSwitch,
	insertResourcePackIntoGame,
	insertResourcePackCSS,
	reloadGame
});

storeDefaultResourcePacks();

// Apply resource pack CSS immediately so global styles don't wait for the game to load
getActiveResourcePack()
	.then(({ css }) => insertResourcePackCSS(css))
	.catch(() => {});

interceptFunction(Game.UIPreloadState, 'preload', (original, ...args) => {
	Addons.getActiveResourcePack().then(({ textures, metafile, css }) => {
		Addons.insertResourcePackIntoGame(textures, metafile);
		Addons.insertResourcePackCSS(css);
	}).catch(err => alert(`Error getting active texture pack: ${err}. This should never happen.`));

	return original(...args);
}, { isClassy: true });

const withObjectConstructor = Maze.getConstructor('withObject');
Maze.constructor('withObject', function(obj) {
	const result = withObjectConstructor.call(this, obj);
	this._calculateBorderFloorsSpacesWallsAndDecorations();
	return result;
});

interceptFunction(Maze, '_calculateBorderFloorsSpacesWallsAndDecorations', function(original, ...args) {
	this.data.theme = Addons.getMazeThemeIndex(this.data.theme);
	return original(this, ...args);
}, { isClassy: true });

interceptFunction(Game.UIBootState, 'init', function(original, ...args) {
	const result = original(this, ...args);
	this.game.plugins.resourcePack = this.game.plugins.add(Phaser.Plugin.ResourcePack);
	return result;
}, { isClassy: true });

interceptFunction(UITankSprite.prototype, 'spawn', function(original, ...args) {
	const noTintTurret = Addons.getResourcePackSwitch('noTintTurret').value;
	const noTintTreads = Addons.getResourcePackSwitch('noTintTreads').value;
	const noTintBase = Addons.getResourcePackSwitch('noTintBase').value;

	Object.defineProperty(this, 'tint', {
		get() {
			return this._tint;
		},
		set(tint) {
			// We need to finish execution first
			// because base tint is set before turret and treads
			requestAnimationFrame(() => {
				if (noTintTurret) this.turret.tint = 0xFFFFFF;
				if (noTintTreads) this.leftTread.tint = this.rightTread.tint = 0xFFFFFF;
				if (noTintBase) this._tint = 0xFFFFFF;
				else this._tint = tint;
			});
			return noTintBase
				? 0xFFFFFF
				: this._tint;
		},
		enumerable: true,
		configurable: true
	});
	return original(...args);
});

interceptFunction(UIMineSprite.prototype, 'spawn', function(original, ...args) {
	const noTintMine = Addons.getResourcePackSwitch('noTintMine').value;

	Object.defineProperty(this, 'tint', {
		get() {
			return this._tint;
		},
		set(tint) {
			this._tint = noTintMine ? 0xFFFFFF : tint;
			return this._tint;
		},
		enumerable: true,
		configurable: true
	});
	return original(...args);
});

interceptFunction(UIMissileImage.prototype, 'spawn', function(original, ...args) {
	const noTintHomingMissile = Addons.getResourcePackSwitch('noTintHomingMissile').value;

	Object.defineProperty(this, 'tint', {
		get() {
			return this._tint;
		},
		set(tint) {
			this._tint = noTintHomingMissile ? 0xFFFFFF : tint;
			return this._tint;
		},
		enumerable: true,
		configurable: true
	});
	return original(...args);
});

interceptFunction(UIButtonGroup.prototype, 'spawn', function(original, ...args) {
	switch (this.text) {
		case 'Random':
			this.setText(Addons.getResourcePackSwitch('randomText').value ?? this.text);
			break;
		case 'New game':
			this.setText(Addons.getResourcePackSwitch('newGameText').value ?? this.text);
			break;
		case 'Local game':
			this.setText(Addons.getResourcePackSwitch('localGameText').value ?? this.text);
			break;
		default:
			break;
	}

	if (this.buttonText.exists) {
		const textFill = Addons.getResourcePackSwitch('buttonTextFill').value;
		if (textFill) this.buttonText.fill = textFill;
	}

	original(...args);
});

export const _isESmodule = true;
