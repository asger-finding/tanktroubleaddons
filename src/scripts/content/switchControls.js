import ProxyHelper from '../utils/proxyHelper.js';

ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, '_initialize', (original, ...args) => {
	original(...args);

	const container = TankTrouble.TankInfoBox.infoSwitchControls = $('<div class="button" title=""/>');

	for (const inputSet of Inputs.getAllInputSetIds()) {
		const inputContainer = $('<div/>');

		const standard = Addons.addImageWithClasses(inputContainer, 'standard', `assets/switch-controls/${ inputSet }.png`);
		const active = Addons.addImageWithClasses(inputContainer, 'active', `assets/switch-controls/${ inputSet }Active.png`);

		$(standard).add(active)
			.attr('draggable', 'false')
			.hide();

		inputContainer.data('inputset', inputSet);
		inputContainer.append([standard, active]);

		container.append(inputContainer);
	}

	container.css({
		width: '52px',
		height: '52px'
	});

	container.tooltipster({
		position: 'right',
		offsetX: 5
	});

	container.on('mouseup', () => {
		/*if (TankTrouble.TankInfoBox.showing) {
			TankTrouble.TankInfoBox.hide();
			Addons.menu.toggle();
		}*/
	});

	container.insertAfter(TankTrouble.TankInfoBox.infoAchievements);
});

ProxyHelper.interceptFunction(TankTrouble.TankInfoBox, 'show', (original, ...args) => {
	original(...args);

	const [,, playerId] = args;

	TankTrouble.TankInfoBox.infoSwitchControls.toggle(Users.getAllPlayerIds().includes(playerId));
	TankTrouble.TankInfoBox.infoSwitchControls.tooltipster('content', 'Switch controls');

	const activeInputSet = Inputs.getAssignedInputSetId(playerId);
	TankTrouble.TankInfoBox.infoSwitchControls.find(':data("inputset")').each((_i, el) => {
		const inputButton = $(el);
		const shouldShow = inputButton.data('inputset') === activeInputSet;

		if (shouldShow) inputButton.show();
		else inputButton.hide();
	});
});

export const _isESmodule = true;
