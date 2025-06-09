/**
 * Keep the Vor OSC commands in one spot for
 * easy API updating should they change things
 * in the future.
 */

export enum OSCString {
	BASE = '/vor/',

	REC_START = 'record/start',
	REC_STOP = 'record/stop',
	REC_TOGGLE = 'record/toggle',
	SNAPSHOT = 'record/snapshot',

	SHOW_NAME = 'showname/set',
	SHOW_NUM = 'shownumber/set',
	SHOW_NUM_UP = 'shownumber/plus',
	SHOW_NUM_DN = 'shownumber/minus',
	SHOW_NUM_RST = 'shownumber/reset',

	COMP = 'composition/set',

	SYS_QUIT = 'system/quit',
	SYS_SHUT = 'system/shutdown',
}

export enum MessageType {
	RecStart = 'RecStart',
	RecStop = 'RecStop',
	RecToggle = 'RecToggle',
	Snapshot = 'Snapshot',

	ShowName = 'ShowName',
	ShowNumber = 'ShowNumber',
	ShowNumberPlus = 'ShowNumberPlus',
	ShowNumberMinus = 'ShowNumberMinus',
	ShowNumberReset = 'ShowNumberReset',

	Composition = 'Composition',

	SysQuit = 'SysQuit',
	SysShutdown = 'SysShutdown',
}
