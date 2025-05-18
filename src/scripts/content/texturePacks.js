import { MaxRectsPacker } from 'maxrects-packer';
import { calculateFileHash } from '../utils/mathUtils.js';
import { mergeWithSchema } from '../utils/objectUtils.js';
import { unzip } from 'fflate';

const storeName = 'texturePacks';

/**
 * Frames in the format { [frameName: string]: url as string }
 * @typedef {Record<string, string>} FrameDetails
 */

/** @protected */
Phaser.Packer = new MaxRectsPacker(2048, 2048, 2, {
	smart: true,
	square: false,
	pot: true,
	allowRotation: false,
	tag: false,
	border: 1
});

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
const rootTexturePack = decoded => {
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
			// Remove the metaDir prefix from the path
			const newPath = path.substring(metaDir.length);
			normalized[newPath] = data;
		}
	}

	return { normalized, metaPath: metaFilePath };
};

/**
 * Parses the metafile from a texture pack decode
 * @private
 * @param {File} file The zip file
 * @param {Record<string, Uint8Array>} decoded Texture pack
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

	try {
		const { normalized, metaPath } = rootTexturePack(decoded);
		if (!metaPath) throw new Error('No meta.json found in texture pack');

		const metafile = normalized['meta.json'];
		if (!metafile) throw new Error('Failed to access normalized meta.json');

		try {
			const text = new TextDecoder().decode(metafile);
			const json = JSON.parse(text);
			return mergeWithSchema(schema, json);
		} catch (err) {
			throw new Error('Failed to parse meta.json: ', err);
		}
	} catch (err) {
		console.warn('createMetaFile:', err);

		return schema;
	}
};

/**
 * Generates a unique name for a texture pack by appending an incremental suffix if needed.
 * @private
 * @param {IDBObjectStore} store The IndexedDB object store
 * @param {string} baseName The base name of the texture pack
 * @param {number} [suffix] The current suffix to try (default: 0, meaning no suffix)
 * @returns {Promise<string>} Resolves with a unique name
 */
const generateUniqueName = async(store, baseName, suffix = 0) => {
	const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_ ()]/gu, '').trim() || 'Unnamed texture pack';
	const candidateName = suffix === 0 ? sanitizedName : `${sanitizedName} (${suffix})`;

	return new Promise((resolve, reject) => {
		const request = store.get(candidateName);
		/* eslint-disable jsdoc/require-jsdoc */
		request.onsuccess = () => {
			if (!request.result) {
				resolve(candidateName);
			} else {
				generateUniqueName(store, sanitizedName, suffix + 1)
					.then(resolve)
					.catch(reject);
			}
		};
		request.onerror = () => reject(request.error);
		/* eslint-enable jsdoc/require-jsdoc */
	});
};

/**
 * Add a zip file entry to the database, storing its extracted content
 * @private
 * @param {File} file The zip file to be added
 * @param {boolean} builtIn Is the texture pack user-added or built-in?
 * @returns {Promise<string>} Resolves with hashsum when the operation is complete
 */
const addTexturePackToStore = async(file, builtIn) => {
	if (!file.name.endsWith('.zip')) throw new Error('Only zip files are supported');

	const timestamp = Date.now();
	const hashsum = await calculateFileHash(file);

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		/* eslint-disable jsdoc/require-jsdoc */
		reader.addEventListener('load', async(event) => {
			try {
				unzip(new Uint8Array(event.target.result), (err, decoded) => {
					if (err) {
						reject(new Error(`Error when unzipping file: ${err.message}`));
						return;
					}

					if (!decoded || Object.keys(decoded).length === 0) {
						reject(new Error('No valid data found in the zip file'));
						return;
					}

					const { normalized } = rootTexturePack(decoded);
					const metafile = createMetaFile(file, decoded);

					const transaction = Addons.indexedDB.transaction([storeName], 'readwrite');
					const store = transaction.objectStore(storeName);
					const index = store.index('hashsum');
					const hashRequest = index.get(hashsum);
					hashRequest.onsuccess = async() => {
						const existingFile = hashRequest.result;

						// File with same hashsum exists
						if (existingFile) {
							reject(new Error('Texture pack already exists'));
							return;
						}

						// Generate new name with suffix if a texture
						// pack with the same name already exists
						const uniqueName = await generateUniqueName(store, metafile.pack.name);
						// eslint-disable-next-line require-atomic-updates
						metafile.pack.name = uniqueName;

						// Store texture pack
						store.add({
							name: metafile.pack.name,
							hashsum,
							timestamp,
							metafile,
							builtin: builtIn,
							texturepack: normalized
						});
						resolve(hashsum);
					};
					hashRequest.onerror = () => reject(hashRequest.error);
				});
			} catch (err) {
				reject(new Error(`Failed to process zip file: ${err.message}`));
			}
		});
		reader.onerror = () => reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
		reader.readAsArrayBuffer(file);
		/* eslint-enable jsdoc/require-jsdoc */
	});
};

/**
 * Retrieve all hashsums and names from the database
 * @private
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries
 */
const getAllTexturePacksFromStore = () => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction(storeName, 'readonly');
	const store = transaction.objectStore(storeName);
	const request = store.getAll();

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		const files = request.result.map(({ name, hashsum, builtin, timestamp, metafile }) => ({ name, hashsum, builtin, timestamp, metafile }));
		files.sort((first, sec) => first.timestamp - sec.timestamp)
			.sort((first, sec) => sec.builtin - first.builtin);

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
const getTexturePackFromStore = hashsum => new Promise((resolve, reject) => {
	const transaction = Addons.indexedDB.transaction([storeName], 'readonly');
	const store = transaction.objectStore(storeName);
	const index = store.index('hashsum');
	const request = index.get(hashsum);

	/* eslint-disable jsdoc/require-jsdoc */
	request.onsuccess = () => {
		if (request.result)
			resolve(request.result);
		else
			reject(new Error('No file found'));

	};
	request.onerror = () => reject(request.error);
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Get the first available texture pack in the object store.
 * Returns false if the store is empty.
 * @private
 * @returns {Promise<object|false>} Resolves when texture pack is determined, or if none available, with null
 */
const getFirstTexturePackFromStore = async() => {
	const texturePacks = await getAllTexturePacksFromStore();
	if (texturePacks.length === 0) return false;
	return getTexturePackFromStore(texturePacks[0].hashsum);
};

/**
 * Remove an entry from the texture packs object store
 * @private
 * @param {string} hashsum The hashsum of the entry to be removed
 * @returns {Promise<void>} Resolves if the entry is successfully removed or if it does not exist
 */
const removeTexturePackFromStore = hashsum => new Promise((resolve, reject) => {
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
				reject(new Error('Failed to delete the texture pack'));
			};
		} else {
			// Entry does not exist
			resolve();
		}
	};

	request.onerror = () => { reject(new Error('Failed to retrieve the texture pack')); };
	/* eslint-enable jsdoc/require-jsdoc */
});

/**
 * Add the default texture packs to the object store
 * @protected
 */
const storeDefaultTexturePacks = async() => {
	const texturePacks = await Promise.all(
		[
			Addons.t_url('assets/texturepacks/Normal.zip'),
			Addons.t_url('assets/texturepacks/Dark.zip'),
			Addons.t_url('assets/texturepacks/3D Light.zip'),
			Addons.t_url('assets/texturepacks/Classic.zip')
		].map(url => fetch(url))
	);

	for (const texturePack of texturePacks) {
		const { url } = texturePack;
		texturePack.arrayBuffer().then(arrayBuffer => {
			const fileName = decodeURIComponent(url).replace(/^.*[\\/]/u, '');
			const file = new File([arrayBuffer], fileName);
			const builtIn = true;

			addTexturePackToStore(file, builtIn)
				// Texture packs are already stored.
				// Intentionally do nothing.
				.catch(() => {});
		});
	}
};

/**
 * Get the user-loaded texture pack
 * @public
 * @returns {Uint8Array} Texture pack or error if unset
 */
const getActiveTexturePack = () => new Promise((resolve, reject) => {
	const hashsum = localStorage.getItem('texturepack');
	if (hashsum === null) {
		reject('Texture pack unset');
		return;
	}

	if (/\b[a-fA-F0-9]{64}\b/u.test(hashsum)) {
		getTexturePackFromStore(hashsum)
			.then(resolve)
			.catch(reject);
	} else {
		reject('Texture pack has an invalid key');
	}
});

/**
 * Store a new texture pack
 * @public
 * @param {File} file The zip file to be added.
 * @returns {Promise<string>} Resolves with hashsum or error if fail
 */
const storeTexturePack = file => new Promise((resolve, reject) => {
	addTexturePackToStore(file, false)
		.then(resolve)
		.catch(reject);
});

/**
 * Set the active texture pack in local storage
 * @public
 * @param {string} hashsum The unique hashsum of the texture pack.
 * @returns {Promise<object>} Resolves with texture pack object if successfully added, else rejects with error
 */
const setActiveTexturePack = hashsum => new Promise((resolve, reject) => {
	if (!(/\b[a-fA-F0-9]{64}\b/u).test(hashsum)) {
		reject('Texture pack key is invalid');
		return;
	}
	localStorage.setItem('texturepack', hashsum);
	Addons.getActiveTexturePack()
		.then(resolve)
		.catch(reject);
});

/**
 * Remove a texture pack saved to the store
 * @public
 * @param {string} hashsum The hashsum of the texture pack to remove
 * @returns {Promise<object>} Resolves when texture pack has been removed
 */
const removeTexturePack = hashsum => new Promise((resolve, reject) => {
	removeTexturePackFromStore(hashsum).finally(() => {
		localStorage.removeItem('texturepack');

		getFirstTexturePackFromStore().then(result => {
			if (result !== false) {
				Addons.setActiveTexturePack(result.hashsum);
				Addons.reloadGame();
			}

			resolve(result);
		}).catch(err => reject(err));
	});
});

/**
 * Retrieve all hashsums and names.
 * @public
 * @returns {Promise<Array<{ name: string, hashsum: string }>>} Resolves with an array of file entries.
 */
const getAllTexturePacks = () => getAllTexturePacksFromStore();

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
 * Insert a custom texture pack theme configuration at the end of the maze themes
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

	const index = customThemeIndex === -1 ? Constants.MAZE_THEME_INFO.length - 1 : customThemeIndex;
	Addons._maze_theme = index;

	return index;
};

/**
 * Remove a custom texture pack theme configuration from the maze themes
 * @private
 */
const removeCustomMazeThemeInfo = () => {
	const customThemeIndex = Constants.MAZE_THEME_INFO.findIndex(THEME => THEME.ADDONS);
	if (customThemeIndex !== -1) Constants.MAZE_THEME_INFO.splice(customThemeIndex, 1);

	Addons._maze_theme = -1;
};

/**
 * Get the index for the addons theme or use the provided theme index
 * @param {number} themeIfUnset Fallback theme
 * @returns {number} Addons theme index or initial
 */
const getMazeThemeIndex = themeIfUnset => Addons._maze_theme !== -1 ? Addons._maze_theme : themeIfUnset;

/**
 * Set the custom features (switches) used by the texture pack
 * @param {string[]} switchList Array over switches
 */
const setTexturePackSwitches = switchList => {
	const validSwitches = [
		'dontTintTurret',
		'dontTintBase',
		'dontTintTreads',
		'dontTintHomingMissile',
		'dontTintMines'
	];
	Addons._texture_pack_switches = switchList.filter(switchKey => {
		if (!validSwitches.includes(switchKey)) {
			console.warn(`setTexturePackSwitches: ${switchKey} is not a valid switch`);

			return false;
		}
		return true;
	});
};

/**
 * Return a list of the features enabled by the current texture pack
 * @returns {string[]} Array over feature identifiers
 */
const getTexturePackSwitches = () => Addons._texture_pack_switches ?? [];

/**
 * Load a texture pack into the game
 * @public
 * @param {Record<string, Uint8Array>} files Texture pack data
 * @param {Record<string, any>} metafile Metafile config
 */
// eslint-disable-next-line complexity
const loadTexturePackIntoGame = async(files, metafile) => {
	const game = GameManager.getGame();
	if (!game) return;

	const success = await game.load.addTexturePack('game', files);
	if (!metafile || !success) {
		removeCustomMazeThemeInfo();
		return;
	}

	setTexturePackSwitches(metafile.features);

	const themeIndex = insertCustomMazeThemeInfo(metafile);
	const { frameData } = game.cache._cache.image.game;
	for (const frameName in frameData._frameNames) {
		const frame = frameData.getFrameByName(frameName);
		const themeFrameKey = frameName.replace(/0-(?<_>.*)/u, `${themeIndex}-$1`);
		if (frameName !== themeFrameKey) {
			frame.name = themeFrameKey;
			frameData.addFrame(frame);
		}
	}
};

Object.assign(Addons, {
	getActiveTexturePack,
	setActiveTexturePack,
	storeTexturePack,
	removeTexturePack,
	getAllTexturePacks,
	getMazeThemeIndex,
	getTexturePackSwitches,
	loadTexturePackIntoGame,
	reloadGame
});

/**
 * Waits for the atlas to load in the Phaser cache
 * @private
 * @param {Phaser.Loader} loader The Phaser loader instance
 * @param {string} atlasKey The key of the atlas to wait for
 * @returns {Promise<void>}
 */
const waitForAtlas = async(loader, atlasKey) => {
	if (!loader.cache.hasFrameData(atlasKey)) {
		await new Promise((resolve) => {
			loader.onFileComplete.add((_progress, key) => {
				if (key === atlasKey) resolve();
			});
		});
	}
};

/**
 * Checks if the atlas URL uses the @2x convention, meaning Retina resolution
 * @private
 * @param {string} url The atlas URL identifier
 * @returns {boolean} True if the atlas is 1x resolution
 */
const is1xResolution = (url) => !/@2x\.[a-zA-Z0-9]+$/u.test(url);

/**
 * Loads an image from a source
 * @private
 * @param {string} source - The image source
 * @returns {Promise<HTMLImageElement>} Resolves with the loaded image
 */
const loadImage = source =>
	new Promise(resolve => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.src = source;

		image.addEventListener('load', () => resolve(image));
	});

/**
 * Scales frame data for 2x resolution.
 * @private
 * @param {Phaser.FrameData} frameData The frame data to scale
 */
const scaleFrameData = frameData => {
	frameData._frames.forEach(frame => {
		frame.bottom *= 2;
		frame.x *= 2;
		frame.y *= 2;
		frame.width *= 2;
		frame.height *= 2;
		frame.centerX *= 2;
		frame.centerY *= 2;
		frame.sourceSizeW *= 2;
		frame.sourceSizeH *= 2;
		frame.right *= 2;
	});
};

/**
 * Loads and resizes the spritesheet if needed.
 * @private
 * @param {string} sourceURL The original spritesheet URL
 * @param {boolean} is1x Whether the atlas is 1x resolution
 * @param {Record<string, Uint8Array>} files Texture pack files
 * @returns {Promise<ImageBitmap | HTMLImageElement>} The spritesheet image
 */
const loadSpritesheet = async(sourceURL, is1x, files) => {
	const sheet = await loadImage(sourceURL);
	if (!is1x || !Object.keys(files).length) return sheet;

	const { width, height } = sheet;
	return createImageBitmap(sheet, {
		resizeWidth: width * 2,
		resizeHeight: height * 2,
		resizeQuality: 'pixelated'
	});
};

/**
 * Packs texture pack images into the image packer
 * @private
 * @param {Record<string, Uint8Array>} files - Texture pack files.
 * @returns {Promise<void>}
 */
const packTextures = async(files) => {
	const imagePromises = Object.keys(files)
		.filter((fileName) => fileName.startsWith('game/') && fileName.endsWith('.png'))
		.map(async(fileName) => {
			const file = files[fileName];
			const blob = new Blob([file], { type: 'image/png' });
			const bmp = await createImageBitmap(blob);

			const basename = fileName.split('/').at(-1);
			const [ext] = basename.match(/\.(?:[^.]*?)(?=\?|#|$)/u) ?? [''];
			const frameName = basename.slice(0, -ext.length);

			return {
				width: bmp.width,
				height: bmp.height,
				image: bmp,
				frameName
			};
		});

	const images = await Promise.all(imagePromises);
	for (const { width, height, image, frameName } of images) Phaser.Packer.add({ width, height, image, frameName });
};

/**
 * Draws the image onto the canvas at the given coordinates, and draws a 1px padding around it.
 * @private
 * @param {CanvasRenderingContext2D} context The canvas context
 * @param {object} rect The packed rectangle data
 * @param {number} spritesheetHeight The height of the original spritesheet
 */
const drawFrameToCanvas = (context, rect, spritesheetHeight) => {
	const { x, y, width, height, image } = rect;
	const drawY = y + spritesheetHeight;

	// Draw image
	context.drawImage(image, x, drawY);

	// Draw additional 1px padding to correct sizing problems.
	// Top, bottom, left, right borders
	context.drawImage(image, 0, 0, width, 1, x, drawY - 1, width, 1);
	context.drawImage(image, 0, height - 1, width, 1, x, drawY + height, width, 1);
	context.drawImage(image, 0, 0, 1, height, x - 1, drawY, 1, height);
	context.drawImage(image, width - 1, 0, 1, height, x + width, drawY, 1, height);

	// Tl, tr, bl, br corners
	context.drawImage(image, 0, 0, 1, 1, x - 1, drawY - 1, 1, 1);
	context.drawImage(image, width - 1, 0, 1, 1, x + width, drawY - 1, 1, 1);
	context.drawImage(image, 0, height - 1, 1, 1, x - 1, drawY + height, 1, 1);
	context.drawImage(image, width - 1, height - 1, 1, 1, x + width, drawY + height, 1, 1);
};

/**
 * Inserts or updates the frame data for texture pack frames.
 * @private
 * @param {Phaser.FrameData} frameData The frame data to update
 * @param {object} rect The packed rectangle data
 * @param {number} spritesheetHeight The height of the original spritesheet
 */
const insertFrameData = (frameData, rect, spritesheetHeight) => {
	const exists = frameData.checkFrameName(rect.frameName);
	const frame = exists
		? frameData.getFrameByName(rect.frameName)
		: new Phaser.Frame(frameData._frames.length, rect.x, rect.y + spritesheetHeight, rect.width, rect.height, rect.frameName);

	if (exists) {
		frame.x = rect.x;
		frame.y = rect.y + spritesheetHeight;
		frame.rotated = false;
		frame.resize(rect.width, rect.height);
	} else {
		frameData.addFrame(frame);
	}
};

/**
 * Load texture pack from arraybuffer into an already-loaded sprite atlas, overriding existing textures in it.
 * @public
 * @param {string} atlasKey The Phaser atlas key
 * @param {Record<string, Uint8Array>} files Texture pack data
 * @returns {Promise<boolean>} Success status
 */
// eslint-disable-next-line complexity
Phaser.Loader.prototype.addTexturePack = async function(atlasKey, files) {
	await waitForAtlas(this, atlasKey);

	const data = this.cache._cache.image[atlasKey];
	const { url: sourceURL, frameData } = data;
	const is1x = is1xResolution(sourceURL);

	const spritesheet = await loadSpritesheet(sourceURL, is1x, files);
	if (is1x && Object.keys(files).length) scaleFrameData(frameData);

	await packTextures(files);

	const bin = Phaser.Packer.bins[Phaser.Packer.bins.length - 1];
	if (!bin) {
		Phaser.Packer.reset();
		return false;
	}

	let canvas = document.createElement('canvas');
	canvas.width = spritesheet.width;
	canvas.height = spritesheet.height + bin.height;
	const context = canvas.getContext('2d');
	context.drawImage(spritesheet, 0, 0);

	for (const rect of Phaser.Packer.rects) {
		drawFrameToCanvas(context, rect, spritesheet.height);
		insertFrameData(frameData, rect, spritesheet.height);
		rect.image.close();
	}

	const newImg = await loadImage(canvas.toDataURL());
	this.cache._cache.image[atlasKey].base = new PIXI.BaseTexture(newImg);
	if (is1x) this.cache._cache.image[atlasKey].base.resolution = 2;

	Phaser.Packer.reset();
	canvas = null;

	return true;
};

storeDefaultTexturePacks();

const tankSpriteSpawn = UITankSprite.prototype.spawn;
UITankSprite.prototype.spawn = function(...args) {
	Object.defineProperty(this, 'tint', {
		get() {
			return this._tint;
		},
		set(tint) {
			const switches = Addons.getTexturePackSwitches();
			// We need to finish execution first
			// because base tint is set before turret and treads
			requestAnimationFrame(() => {
				if (switches.includes('dontTintTurret')) this.turret.tint = 0xFFFFFF;
				if (switches.includes('dontTintTreads')) this.leftTread.tint = this.rightTread.tint = 0xFFFFFF;
				if (switches.includes('dontTintBase')) this._tint = 0xFFFFFF;
				else this._tint = tint;
			});
			return switches.includes('dontTintBase') ? 0xFFFFFF : this._tint;
		},
		enumerable: true,
		configurable: true
	});
	return tankSpriteSpawn.apply(this, args);
};

const mineSpriteSpawn = UIMineSprite.prototype.spawn;
UIMineSprite.prototype.spawn = function(...args) {
	Object.defineProperty(this, 'tint', {
		get() {
			return this._tint;
		},
		set(tint) {
			this._tint = Addons.getTexturePackSwitches().includes('dontTintMine')
				? 0xFFFFFF
				: tint;
			return this._tint;
		},
		enumerable: true,
		configurable: true
	});
	return mineSpriteSpawn.apply(this, args);
};

const missileSpriteSpawn = UIMissileImage.prototype.spawn;
UIMissileImage.prototype.spawn = function(...args) {
	Object.defineProperty(this, 'tint', {
		get() {
			return this._tint;
		},
		set(tint) {
			this._tint = Addons.getTexturePackSwitches().includes('dontTintMine')
				? 0xFFFFFF
				: tint;
			return this._tint;
		},
		enumerable: true,
		configurable: true
	});
	return missileSpriteSpawn.apply(this, args);
};

const calculateTheme = Maze.getMethod('_calculateBorderFloorsSpacesWallsAndDecorations');
Maze.method('_calculateBorderFloorsSpacesWallsAndDecorations', function(...args) {
	// Set theme here
	this.data.theme = Addons.getMazeThemeIndex(this.data.theme);
	return calculateTheme.apply(this, ...args);
});

const withObjectConstructor = Maze.getConstructor('withObject');
Maze.constructor('withObject', function(obj) {
	const result = withObjectConstructor.call(this, obj);

	this._calculateBorderFloorsSpacesWallsAndDecorations();

	return result;
});

const gamePreloadStage = Game.UIPreloadState.getMethod('preload');
Game.UIPreloadState.method('preload', function(...args) {
	const result = gamePreloadStage.apply(this, ...args);

	Addons.getActiveTexturePack().then(({ texturepack, metafile }) => {
		Addons.loadTexturePackIntoGame(texturepack, metafile);
	}).catch(() => {});

	return result;
});

export const _isESmodule = true;
