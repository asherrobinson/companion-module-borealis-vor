import type { ModuleInstance } from './main.js'
import { Image } from './images.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		RecordingState: {
			name: 'Recording Status',
			type: 'boolean',
			defaultStyle: {
				png64: Image.VorRed,
			},
			options: [],
			callback: () => {
				return !!self.getVariableValue('recordingState')
			},
		},
		RecordingPulse: {
			name: 'Recording Pulse',
			type: 'boolean',
			defaultStyle: {
				png64: Image.VorRed,
			},
			options: [],
			callback: () => {
				return (Number(self.getVariableValue('recordingPulse')) / 255) * 100 > 50
			},
		},
	})
}
