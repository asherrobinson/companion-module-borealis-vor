import { combineRgb, CompanionPresetDefinitions } from '@companion-module/base'
import { ModuleInstance } from './main.js'
import { Image } from './images.js'

/**
 * INTERNAL: initialize presets.
 *
 * @access protected
 * @since 1.1.1
 */
function getPresets(): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	presets['rec_start'] = {
		category: 'Actions',
		name: 'Start',
		type: 'button',
		style: {
			text: '',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
			png64: Image.VorStart,
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: 'rec_start',
						options: {},
					},
				],
				up: [],
			},
		],
	}

	presets['rec_stop'] = {
		category: 'Actions',
		name: 'Stop',
		type: 'button',
		style: {
			text: '',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
			png64: Image.VorStop,
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: 'rec_stop',
						options: {},
					},
				],
				up: [],
			},
		],
	}

	presets['rec_toggle'] = {
		category: 'Actions',
		name: 'Record Toggle',
		type: 'button',
		style: {
			text: '',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
			png64: Image.VorStart,
		},
		feedbacks: [
			{
				feedbackId: 'RecordingState',
				style: {
					png64: Image.VorStop,
				},
				options: {},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'rec_toggle',
						options: {},
					},
				],
				up: [],
			},
		],
	}

	presets['snapshot'] = {
		category: 'Actions',
		name: 'Snapshot',
		type: 'button',
		style: {
			text: '',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
			png64: Image.VorSnap,
		},
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: 'snapshot',
						options: {},
					},
				],
				up: [],
			},
		],
	}

	presets['rec_flasher'] = {
		category: 'Status',
		name: 'Recording Status (Flashing)',
		type: 'button',
		style: {
			text: '',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
			png64: Image.VorGray,
		},
		feedbacks: [
			{
				feedbackId: 'RecordingPulse',
				style: {
					png64: Image.VorRed,
				},
				options: {},
			},
		],
		steps: [],
	}

	return presets
}

export function UpdatePresets(instance: ModuleInstance): void {
	instance.setPresetDefinitions(getPresets())
}
