import type { ModuleInstance } from './main.js'
import sACNReceiver from './discopixel/sACNReceiver/sacnReceiver.js'

let receiver: sACNReceiver
let updateInterval: any
let lastStatusValue: number
let consecutiveValueCount: number = 0

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	if (self.config.use_rec_sACN) {
		try {
			self.setVariableDefinitions([
				{ variableId: 'recordingState', name: 'Current Recording Status' },
				{ variableId: 'recordingPulse', name: 'Recording Indicator' },
			])

			receiver = new sACNReceiver(self.config.sacn_local_ip)
			receiver.addUniverse(self.config.sacn_universe)
			updateInterval = setInterval(() => {
				updateVariables(self)
				self.checkFeedbacks()
			}, 220)
		} catch (e: any) {
			self.log('warn', 'Failed to start sACN listener')
			self.log('debug', e.toString())
		}
	} else {
		destroyVariableUpdaters()
	}
}

function updateVariables(self: ModuleInstance): void {
	if (self.config.use_rec_sACN) {
		const univData = receiver.getUniverseData(self.config.sacn_universe)

		if (univData) {
			const currentVorVal = univData.data[0]

			if (lastStatusValue === currentVorVal) {
				consecutiveValueCount++
			} else {
				consecutiveValueCount = 0
			}

			lastStatusValue = currentVorVal

			self.setVariableValues({
				recordingState: consecutiveValueCount < 6,
				recordingPulse: currentVorVal,
			})
		} else {
			self.setVariableValues({
				recordingState: false,
				recordingPulse: 0,
			})
		}
	}
}

export function destroyVariableUpdaters(): void {
	if (receiver) {
		receiver.destroyTimers()
	}
	clearInterval(updateInterval)
}
