/**
 * Compute a calendar-aware diff between two dates, matching PHP's DateTime::diff().
 * Returns the first non-zero unit in [years, months, days, hours, minutes, seconds].
 * No "weeks" unit so it matches the native site's time function
 * @param {Date} date Earlier date
 * @param {Date} now Later date (reference point)
 * @returns {{ count: number, unit: Intl.RelativeTimeFormatUnit }} First non-zero diff unit
 */
const calendarDiff = (date: Date, now: Date): { count: number; unit: Intl.RelativeTimeFormatUnit } => {
	let years = now.getFullYear() - date.getFullYear();
	let months = now.getMonth() - date.getMonth();
	let days = now.getDate() - date.getDate();
	let hours = now.getHours() - date.getHours();
	let minutes = now.getMinutes() - date.getMinutes();
	let seconds = now.getSeconds() - date.getSeconds();

	// Borrow down through units, same as DateInterval
	if (seconds < 0) { seconds += 60; minutes--; }
	if (minutes < 0) { minutes += 60; hours--; }
	if (hours < 0) { hours += 24; days--; }
	if (days < 0) {
		// Days in the previous month
		const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
		days += prevMonth.getDate();
		months--;
	}
	if (months < 0) { months += 12; years--; }

	if (years !== 0) return { count: years, unit: 'year' };
	if (months !== 0) return { count: months, unit: 'month' };
	if (days !== 0) return { count: days, unit: 'day' };
	if (hours !== 0) return { count: hours, unit: 'hour' };
	if (minutes !== 0) return { count: minutes, unit: 'minute' };
	if (seconds !== 0) return { count: seconds, unit: 'second' };

	return { count: 0, unit: 'second' };
};

/**
 * Format a timestamp to relative time ago from now.
 * Matches the native site's PHP time_diff filter (no "weeks" unit, calendar-aware).
 * @param date Date object
 * @returns Relative time ago as a string
 */
export const timeAgo = (date: Date): string => {
	const now = new Date();
	const { count, unit } = calendarDiff(date, now);

	if (count === 0) return 'now';

	const formatter = new Intl.RelativeTimeFormat('en');
	return formatter.format(-count, unit);
};

/**
 * Format a timestamp to relative time until now
 * @param date Date object
 * @returns Relative time until as a string
 */
export const timeUntil = (date: Date): string => {
	const now = new Date();
	const { count, unit } = calendarDiff(now, date);

	if (count === 0) return 'now';

	const formatter = new Intl.RelativeTimeFormat('en');
	return formatter.format(count, unit);
};

export const _isESmodule = true;
