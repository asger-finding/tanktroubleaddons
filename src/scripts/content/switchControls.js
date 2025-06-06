import { interceptFunction } from '../utils/gameUtils.js';

/**
 * Pretty printed alias for input set id
 * @param {string} inputSetId Input set internal id
 * @returns {string} Human readable definition
 */
const getInputSetAlias = inputSetId => {
	switch (inputSetId) {
		case 'WASDKeys':
			return 'WASD keys';
		case 'arrowKeys':
			return 'Arrow keys';
		case 'mouse':
			return 'Mouse';
		default:
			throw new Error('Unalised input setrequested in getInputSetAlias');
	}
};

/**
 * Allow a user to set a new input manager.
 *
 * If the input manager is contested, switch controls between the two users.
 * @param {string} playerId Player id
 * @param {string} newInputSetId Input set id
 */
Inputs.switchInputManager = function(playerId, newInputSetId) {
	const oldSetId = Inputs.getAssignedInputSetId(playerId);
	const isContested = Inputs._inputSetsInUse[newInputSetId];

	Inputs._releaseInput(playerId);

	if (isContested) {
		// Switch around controls of the two users
		const alreadyAssignedPlayerId = Object.keys(Inputs._playerIdInputSetId)
			.find(_playerId => Inputs.getAssignedInputSetId(_playerId) === newInputSetId);

		Inputs._releaseInput(alreadyAssignedPlayerId);

		// If the new user didn't have any assigned input
		// then show the overlay for controls selector of
		// the replaced user
		if (!oldSetId && alreadyAssignedPlayerId) {
			OverlayManager.enqueueOverlay(
				TankTrouble.ControlsOverlay,
				{ playerId: alreadyAssignedPlayerId }
			);
		} else {
			Inputs._assignInput(alreadyAssignedPlayerId, oldSetId);
		}
	}

	Inputs._assignInput(playerId, newInputSetId);
	Inputs._storeInputSetAssignments();
};

Addons.switchControlsBox = {

	switchControls: null,
	switchControlsContent: null,
	switchControlsTabLeft: null,
	switchControlsTabRight: null,
	switchControlsTabBottom: null,
	switchControlsBackground: null,
	playerId: null,
	initialized: false,
	showing: false,

	/**
	 * Initialize switch controls tooltip elements
	 */
	_initialize() {
		this.switchControls = $("<div class='box noselect' id='switchcontrols'></div>");
		this.switchControlsContent = $("<div class='content'></div>");
		this.switchControlsTabLeft = $("<div class='tab left'></div>");
		this.switchControlsTabRight = $("<div class='tab right'></div>");
		this.switchControlsTabBottom = $("<div class='tab bottom'></div>");
		this.switchControlsBackground = $("<div class='boxbackground'></div>");

		for (const inputSet of Inputs.getAllInputSetIds()) {
			const inputButton = $('<div class="button" title=""/>');

			const standard = Addons.addImageWithClasses(inputButton, 'standard', `assets/switch-controls/${ inputSet }.{{png|avif}}`);
			const active = Addons.addImageWithClasses(inputButton, 'active', `assets/switch-controls/${ inputSet }Active.{{png|avif}}`);

			$(standard).add(active)
				.attr('draggable', 'false')
				.css({
					width: '52px',
					height: '52px'
				});
			inputButton.attr('data-inputsetid', inputSet);
			inputButton.tooltipster({ position: 'top' });

			inputButton.on('mouseup', ({ currentTarget }) => {
				if (!this.playerId) return;

				const inputSetId = currentTarget.getAttribute('data-inputsetid');
				Inputs.switchInputManager(this.playerId, inputSetId);

				setTimeout(() => {
					this.hide();
					TankTrouble.TankInfoBox.hide();
				}, UIConstants.OVERLAY_FADE_TIME);
			});

			this.switchControlsContent.append(inputButton);
		}

		this.switchControls.append([
			this.switchControlsContent,
			this.switchControlsTabLeft,
			this.switchControlsTabRight,
			this.switchControlsTabBottom
		]);

		$('body').append(this.switchControlsBackground);
		$('body').append(this.switchControls);

		this.switchControlsBackground.hide();
		this.switchControls.hide();

		this.switchControlsBackground.click(() => {
			if (this.showing) this.hide();
		});

		this.initialized = true;
	},

	/**
	 * Show the switch controls tooltip for the clicked user
	 * @param {string} playerId Player id
	 * @param {number} x Tooltipster x
	 * @param {number} y Tooltipster y
	 * @param {string} preferredDirection Tooltipster direction
	 * @param {number} preferredRadius Tooltipster radius
	 */
	show(playerId, x, y, preferredDirection, preferredRadius) {
		if (!this.initialized) this._initialize();

		this.playerId = playerId;

		this.switchControls.show();
		this.switchControlsBackground.fadeIn(200);
		this.showing = true;

		GameManager.disableGameInput();

		this.switchControlsContent.find('[data-inputsetid]').each((_i, el) => {
			const inputButton = $(el);
			const inputSet = inputButton.attr('data-inputsetid');

			inputButton.tooltipster('content', getInputSetAlias(inputSet));

			const assignedPlayerId = Object.keys(Inputs._playerIdInputSetId)
				.find(_playerId => Inputs.getAssignedInputSetId(_playerId) === inputSet);

			if (assignedPlayerId) {
				Backend.getInstance().getPlayerDetails(result => {
					if (typeof result === 'object') {
						const username = result.getUsername();
						const newTooltipster = `Switch with ${ username }`;
						inputButton.tooltipster('content', newTooltipster);
					}
				}, () => {}, () => {}, assignedPlayerId, Caches.getPlayerDetailsCache());
			}
		});

		const assignedInputSetId = Inputs.getAssignedInputSetId(this.playerId);
		this.switchControlsContent.find('[data-inputsetid]').show();
		this.switchControlsContent.find(`[data-inputsetid="${ assignedInputSetId }"]`).hide();

		this.switchControls.removeClass('left right top bottom');

		if (preferredDirection === 'right') {
			this.switchControls.position({
				my: 'left top',
				at: `left+${  x + preferredRadius + 30  } top+${  y - 35}`,
				of: $(document),
				collision: 'none'
			});
			this.switchControls.addClass('left');
			this.switchControls.css({ transformOrigin: '-15% 35px' });
		} else if (preferredDirection === 'left') {
			this.switchControls.position({
				my: 'right top',
				at: `left+${  x - preferredRadius - 30  } top+${  y - 35}`,
				of: $(document),
				collision: 'none'
			});
			this.switchControls.addClass('right');
			this.switchControls.css({ transformOrigin: '115% 35px' });
		} else if (preferredDirection === 'top') {
			this.switchControls.position({
				my: 'center bottom',
				at: `left+${  x  } top+${  y - preferredRadius - 30}`,
				of: $(document),
				collision: 'none'
			});
			this.switchControls.addClass('bottom');
			this.switchControls.css({ transformOrigin: '50% 130%' });
		}

		this.switchControls.css({
			scale: 0.1,
			opacity: 0
		});

		this.switchControls.transition({
			scale: 1,
			queue: false
		}, 300, 'easeOutBack');

		this.switchControls.animate({
			opacity: 1
		}, {
			duration: 200,
			queue: false
		});
	},

	/**
	 * Hide the switch controls tooltip
	 */
	hide() {
		if (!this.initialized) this._initialize();

		this.switchControls.transition({
			scale: 0,
			queue: false
		}, 200, 'easeInQuad', () => {
			this.switchControls.hide();
			this.switchControls.css({
				scale: 1
			});
		});

		this.switchControls.animate({
			opacity: 0
		}, {
			duration: 200,
			queue: false
		});

		this.switchControlsBackground.fadeOut(200);
		this.showing = false;

		GameManager.enableGameInput();
	}

};

/**
 * Insert the switch controls button in the tank info box
 */
interceptFunction(TankTrouble.TankInfoBox, '_initialize', function(original, ...args) {
	original(...args);

	const switchControlsButton = this.infoSwitchControls = $('<div class="button" title=""/>');
	for (const inputSet of Inputs.getAllInputSetIds()) {
		const inputButton = $('<div/>');

		const standard = Addons.addImageWithClasses(inputButton, 'standard', `assets/switch-controls/${ inputSet }.{{png|avif}}`);
		const active = Addons.addImageWithClasses(inputButton, 'active', `assets/switch-controls/${ inputSet }Active.{{png|avif}}`);

		$(standard).add(active)
			.attr('draggable', 'false')
			.hide();
		inputButton.data('inputsetid', inputSet);
		switchControlsButton.append(inputButton);
	}

	switchControlsButton.tooltipster({
		position: 'right',
		offsetX: 5
	});

	switchControlsButton.on('mouseup', () => {
		Addons.switchControlsBox.show(
			this.playerId,
			this.infoSwitchControls.offset().left + this.infoSwitchControls.outerWidth() * 0.5,
			this.infoSwitchControls.offset().top + this.infoSwitchControls.outerHeight() * 0.5,
			'top',
			25
		);
	});

	switchControlsButton.insertBefore(this.infoAccount);
});

/**
 * Show the switch controls button for own users
 */
interceptFunction(TankTrouble.TankInfoBox, 'show', function(original, ...args) {
	original(...args);

	const [,, playerId] = args;

	this.infoSwitchControls.toggle(Users.getAllPlayerIds().includes(playerId));
	this.infoSwitchControls.tooltipster('content', 'Switch controls');

	const assignedInputSetId = Inputs.getAssignedInputSetId(playerId);
	this.infoSwitchControls.find(':data("inputsetid")').each((_i, el) => {
		const inputButton = $(el);
		const shouldShow = inputButton.data('inputsetid') === assignedInputSetId;

		if (shouldShow) inputButton.show();
		else inputButton.hide();
	});
});

export const _isESmodule = true;
