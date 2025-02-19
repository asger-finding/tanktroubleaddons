type RelativeTimeUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

const ranges: { [key in RelativeTimeUnit]: number } = {
	years: 3600 * 24 * 365,
	months: (365 * 3600 * 24) / 12,
	weeks: 3600 * 24 * 7,
	days: 3600 * 24,
	hours: 3600,
	minutes: 60,
	seconds: 1
};

/**
 * Format a timestamp to relative time ago from now
 * @param date Date object
 * @returns Relative time ago as a string
 */
// eslint-disable-next-line complexity
export const timeAgo = (date: Date): string => {
	const formatter = new Intl.RelativeTimeFormat('en');
	const now = Date.now();
	const secondsElapsed = (date.getTime() - now) / 1000;

	// Special handling for days to account for the time of day
	if (Math.abs(secondsElapsed) >= ranges.days && Math.abs(secondsElapsed) < ranges.weeks) {
		const startOfDay = new Date(now);
		startOfDay.setHours(0, 0, 0, 0);

		const daysDifference = Math.floor((date.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));
		if (daysDifference !== 0) return formatter.format(daysDifference, 'day');
	}

	for (const [key, range] of Object.entries(ranges)) {
		if (range < Math.abs(secondsElapsed)) {
			const delta = secondsElapsed / range;
			return formatter.format(Math.ceil(delta), key as Intl.RelativeTimeFormatUnit);
		}
	}

	return 'now';
};

/**
 * Format a timestamp to relative time until now
 * @param date Date object
 * @returns Relative time until as a string
 */
export const timeUntil = (date: Date): string => {
	const formatter = new Intl.RelativeTimeFormat('en');
	const secondsUntil = (date.getTime() - Date.now()) / 1000;

	for (const [key, range] of Object.entries(ranges)) {
		if (range < Math.abs(secondsUntil)) {
			const delta = secondsUntil / range;
			return formatter.format(Math.floor(delta), key as Intl.RelativeTimeFormatUnit);
		}
	}

	return 'now';
};
