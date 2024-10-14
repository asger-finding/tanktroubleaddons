/**
 * Determine player's admin state
 * @param playerDetails Player details
 * @returns -1 for retired admin, 0 for non-admin, 1 for admin
 */
const getAdminState = playerDetails => {
	const isAdmin = playerDetails.getGmLevel() >= UIConstants.ADMIN_LEVEL_PLAYER_LOOKUP;

	if (isAdmin) return 1;
	else if (TankTrouble.WallOfFame.admins.includes(playerDetails.getUsername())) return -1;
	return 0;
};

/**
 * Prepend admin details to username
 * @param usernameParts Transformable array for the username
 * @param playerDetails Player details
 * @returns Mutated username parts
 */
const maskUsernameByAdminState = (usernameParts, playerDetails) => {
	const adminState = getAdminState(playerDetails);

	if (adminState === 1) usernameParts.unshift(`(GM${ playerDetails.getGmLevel() }) `);
	else if (adminState === -1) usernameParts.unshift('(Retd.) ');

	return usernameParts;
};

/**
 * Mask username if not yet approved
 * If the user or an admin is logged in
 * locally, then still show the username
 * @param usernameParts Transformable array for the username
 * @param playerDetails Player details
 * @returns Mutated username parts
 */
const maskUnapprovedUsername = (usernameParts, playerDetails) => {
	if (!playerDetails.getUsernameApproved()) {
		const playerLoggedIn = Users.isAnyUser(playerDetails.getPlayerId());
		const anyAdminLoggedIn = Users.getHighestGmLevel() >= UIConstants.ADMIN_LEVEL_PLAYER_LOOKUP;

		if (playerLoggedIn || anyAdminLoggedIn) {
			usernameParts.unshift('× ');
			usernameParts.push(playerDetails.getUsername(), ' ×');
		} else {
			usernameParts.length = 0;
			usernameParts.push('× × ×');
		}
	} else {
		usernameParts.push(playerDetails.getUsername());
	}

	return usernameParts;
};

/**
 * Transforms the player's username
 * depending on parameters admin and username approved
 * @param playerDetails Player details
 * @returns New username
 */
const transformUsername = playerDetails => {
	const usernameParts = [];

	maskUnapprovedUsername(usernameParts, playerDetails);
	maskUsernameByAdminState(usernameParts, playerDetails);

	return usernameParts.join('');
};

Utils.classMethod('maskUnapprovedUsername', playerDetails => transformUsername(playerDetails));

export const _isESmodule = true;
