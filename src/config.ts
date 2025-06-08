import { Regex, type SomeCompanionConfigField, InstanceStatus, DropdownChoice } from '@companion-module/base'
import { ModuleInstance } from './main.js'
import { getLocalInterfaceIPs } from './discopixel/sACNReceiver/sacnReceiver.js'

export interface ModuleConfig {
	host: string
	port: number
	osc_id: number
	use_rec_sACN: boolean
	sacn_universe: number
	sacn_local_ip: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	const localIPChoices: DropdownChoice[] = []
	getLocalInterfaceIPs().forEach((elem) => localIPChoices.push({ id: elem, label: elem }))

	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Vor Host (IP or Hostname)',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Target Port',
			width: 4,
			default: 3049,
			min: 101,
			max: 65535,
			// regex: Regex.PORT,
		},
		// @ts-expect-error - Static Text not defined in the type for some reason, but it is valid for alignment.
		{
			type: 'static-text',
			id: 'null1',
			label: '',
			width: 8,
		},
		{
			type: 'number',
			id: 'osc_id',
			label: 'OSC Instance ID',
			width: 4,
			default: 1,
			min: 1,
			max: 999,
		},
		{
			type: 'checkbox',
			id: 'use_rec_sACN',
			label: 'Enable Recording Status sACN?',
			width: 12,
			default: false,
		},
		{
			type: 'number',
			id: 'sacn_universe',
			label: 'Recording Status sACN Universe',
			isVisible: (options) => !!options.use_rec_sACN,
			width: 6,
			min: 1,
			max: 65535,
			step: 1,
			default: 1,
		},
		{
			type: 'dropdown',
			id: 'sacn_local_ip',
			label: 'Local Interface to listen for sACN',
			isVisible: (options) => !!options.use_rec_sACN,
			width: 6,
			choices: localIPChoices,
			default: 'Pick an interface IP...',
		},
	]
}

export function validateConfig(instance: ModuleInstance): boolean {
	const config = instance.config

	try {
		if (!config.host) {
			throw Error('IP or Hostname is mandatory!')
		}
		if (!config.port) {
			throw Error('Destination Port Num is mandatory!')
		}
		if (config.use_rec_sACN && !config.sacn_universe) {
			throw Error('sACN Universe must be specified when sACN recording status is enabled!')
		}
	} catch (e: any) {
		instance.updateStatus(InstanceStatus.BadConfig, e.toString())
		return false
	}
	return true
}
