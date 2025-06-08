import * as dgram from "node:dgram";
import { networkInterfaces } from "os";
import type { Socket } from 'node:dgram';

/**
 * An sACN (ACN ANSI E1.31) DMX client library
 *
 * streaming ACN (sACN) DMX data is detailed in ANSI specification E1.31
 *
 * Asher Robinson for Disco Pixel Productions
 * GitHub @asherrobinson
 */
export default class sACNReceiver {

    /**
     * Default Configuration...
     * adjustable at time of instantiation by passing an object of properties to override
     */
    #config: {
        listenerPortNumber: number;
        staleTimeout: number;
        universes: number[];
        localInterfaceIP: string;
        reSubInterval: number,
        priorityTimeout: number
    } = {
        listenerPortNumber : 5568,
        staleTimeout       : 5000,
        reSubInterval      : 120000,
        priorityTimeout    : 5000,
        universes          : [],
        localInterfaceIP   : '',
    }

    #stats = {
        updateCount : 0
    }

    #listener:Socket
    #isAlive:boolean = false
    #state:boolean = false
    #staleTimer:NodeJS.Timeout | undefined = undefined
    #reSubTimer:NodeJS.Timeout

    #universes:sACNUniverse[]

    #priorities:{
        priority_pending: number,
        priority_active: number,
    }[]




    /**
     * Create an SACN Receiver instance
     * @param localInterfaceIP {string} IP Address of local interface to receive data on
     * @param options {Object?} Plain object of configuration properties to override defaults
     */
    constructor (localInterfaceIP: string, options?:object) {

        options = options || {};

        this.#isAlive = false;

        this.#config = {
            ...this.#config,
            ...{localInterfaceIP : localInterfaceIP},
            ...options
        }

        this.#universes = []
        this.#priorities = []

        this.#preStart();

        this.#listener = this.#startACNClient()

        this.#reSubTimer = setInterval(this.#resubscribeAll, this.#config.reSubInterval);

        setInterval(this.#priorityUpdater, this.#config.priorityTimeout);
    }

    #preStart = () => {

        const localIPs = getLocalInterfaceIPs();

        if (!localIPs.find((i:string) => i === this.#config.localInterfaceIP)) {

            throw Error ('Specified local IP not found on host!');
        }

    };

    #startACNClient = () => {

        const listener = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        listener.on('error', (err) => {
            console.error('sACN listener error:\n' + err.stack);
            listener.close();
            this.#state = false;
        });

        listener.on('message', (msg:Buffer) => {

            this.#sacnMessageHandler(msg);

            this.#stats.updateCount++;
            this.#isAlive = true;

            clearTimeout(this.#staleTimer);
            this.#staleTimer = setTimeout(() => {

                // console.error('[ERROR] sACN data stale! Haven\'t received in 5+ seconds on local interface ' + this.#config.localInterfaceIP);
                this.#isAlive = false;

            }, this.#config.staleTimeout);

        });

        listener.on('listening', () => {

            this.#state = true;

            const address = listener.address();

            console.log('sACN Receiver listening on local interfaces with IP ' + this.#config.localInterfaceIP + ' for data on UDP port ' + address.port);

            console.log('sACN Receiver - subscribing to all previously specified universes...');

            this.#listener.setBroadcast(true)
            this.#listener.setMulticastTTL(128);

            this.#config.universes.forEach((universe) => {

                this.subscribeMulticast(universe);
            });
        });

        listener.bind(this.#config.listenerPortNumber);

        return listener;
    }

    // #restartACNClient = () => {
    //
    //     console.log('Retrying client start...');
    //     this.#storage.listener.close();
    //     this.#startACNClient();
    // }

    #resubscribeAll = () => {

        this.#config.universes.forEach(this.resubscribeMulticast);
    };

    destroyTimers ():void {

        clearInterval(this.#reSubTimer);
    }

    /**
     * Add the specified universe to the list to capture
     * @param universe {number|string}
     */
    addUniverse = (universe: number): void => {

        universe = parseInt(universe + '', 10);

        if (this.#config.universes.indexOf(universe) === -1) {

            this.#config.universes.push(universe);

            this.subscribeMulticast(universe)
        }
    }

    /**
     * Subscribe to the multicast group for the specified universe
     * @param universe {number}
     */
    subscribeMulticast = (universe: number): void => {

        if (this.#state) {

            const sACNMulticastGroup = "239.255." + Math.floor(universe / 256) + "." + Math.floor(universe % 256);

            console.log(`sACN Listener - subscribing to universe ${universe} (${sACNMulticastGroup}) on local interface with IP ` + this.#config.localInterfaceIP);

            this.#listener.addMembership(sACNMulticastGroup, this.#config.localInterfaceIP);
        }
    }

    /**
     * Unsubscribe to the multicast group for the specified universe
     * @param universe {number}
     */
    resubscribeMulticast = (universe: number): void => {

        if (this.#state) {

            const sACNMulticastGroup = "239.255." + Math.floor(universe / 256) + "." + Math.floor(universe % 256);

            this.#listener.dropMembership(sACNMulticastGroup, this.#config.localInterfaceIP);
            this.#listener.addMembership(sACNMulticastGroup, this.#config.localInterfaceIP);
        }
    }


    // --------------------
    // ---- HANDLERS ------
    // --------------------

    /**
     * Handle received bytes on the StgCmd interface
     */
    #sacnMessageHandler = (payload:Buffer) => {

        const parsedData = this.#decodeSacn(payload);

        if (this.#config.universes.indexOf(parsedData.universe) > -1) {
            // This universe was requested for capture

            if (parsedData.type !== 0) {

                // Don't process this packet, it's a per-address priority PDU
                return;
            }

            this.#priorityScanner(parsedData);

            if (parsedData.priority < this.#priorities[parsedData.universe].priority_active) {

                // Don't process this packet, as it's priority is lower than our current established priority.
                return;
            }

            // @ts-expect-error idk
            this.#universes[parsedData.universe] = parsedData.data;

            this.#stats.updateCount++;
            this.#isAlive = true;

            clearTimeout(this.#staleTimer);

            this.#staleTimer = setTimeout(() => {

                this.#isAlive = false;
                console.warn('[WARN] sACN data stale! Haven\'t received in 5+ seconds');

                Object.keys(this.#universes).forEach((key) => {
                    // @ts-expect-error idk
                    this.#universes[key] = [];
                });

                this.#priorities = [];

            }, this.#config.staleTimeout);
        }

        //Ignore all others
    }


    // --------------------
    // - PARSERS/DECODERS -
    // --------------------

    /**
     * Decode an sACN DMX packet
     * @return {{universe: number, priority: number, type: number, data: Array<number>}}
     */
    #decodeSacn =  (bytes: Buffer): sACNUniverse => {

        // Byte address of DMX Universe value
        const universeOffset = 113;

        // Byte address of DMX Universe Priority value
        const priorityOffset = 108;

        // Byte address of first DMX address value
        const firstAddrOffset = 126;

        // Byte address of the start code of the actual DMX PDU
        // Indicates whether this PDU contains level (0x00) or per-address priority (0xDD) Info
        const startCodeOffset = 125;

        const universe = bytes.readUint16BE(universeOffset);

        const priority = bytes.readUInt8(priorityOffset);

        const startCode = bytes.readUInt8(startCodeOffset);

        const DMXVals = [];

        for (let i = 0; i < 512; i++) {

            if (i >= (bytes.length - firstAddrOffset)) { break;  }

            DMXVals.push(bytes.readUInt8(firstAddrOffset + i));
        }

        // Debug sACN message structure
        // console.log(`Univ: ${universe} Priority: ${priority} StartCode: ${startCode} First Val: ${DMXVals[0]}`);

        return {
            universe : universe,
            priority : priority,
            type     : startCode,
            data     : DMXVals
        };
    };

    /**
     * Scan sACN messages over a time period to determine the active
     * highest priority source for a given universe
     * @param {{universe: number, priority: number, data: Array<number>}} parsedUniverse
     */
    #priorityScanner = (parsedUniverse: sACNUniverse) => {

        if (Object.prototype.hasOwnProperty.call(this.#priorities, parsedUniverse.universe)) {

            if (parsedUniverse.priority > this.#priorities[parsedUniverse.universe].priority_pending) {

                this.#priorities[parsedUniverse.universe].priority_pending = parsedUniverse.priority;
            }
        } else {

            this.#priorities[parsedUniverse.universe] = {
                priority_pending : parsedUniverse.priority,
                priority_active  : parsedUniverse.priority,
            }
        }
    };

    #priorityUpdater = () => {

        Object.keys(this.#priorities).forEach((key) => {

            const universeData = this.#priorities[Number(key)];

            universeData.priority_active = universeData.priority_pending;
        });
    };


    // --------------------
    // ----- OUTPUT -------
    // --------------------

    /**
     * Get all available universes captured on this listener
     * @return {Object<Array>} Object with Key = universe number and Value = array of DMX values as 8-bit values
     */
    getAllUniverses (): object {

        return this.#universes;
    }

    /**
     * Get the latest available data for a particular universe
     * @param universe {number}
     * @return {Array<number>} Array of 8-bit values representing DMX addresses
     */
    getUniverseData (universe: number): sACNUniverse | false {

        return Object.prototype.hasOwnProperty.call(this.#universes, universe) ? this.#universes[universe] : false;
    }


    // --------------------
    // ----- STATS --------
    // --------------------

    /**
     * Reset all statistics on this receiver
     */
    resetStats (): void {

        this.#stats.updateCount = 0;
    }

    /**
     * Get all available statistics
     * @return {{updateCount: number}}
     */
    getStats  (): object {

        return this.#stats;
    }

    /**
     * Convenience method to return all available stats and reset counters
     *
     * @return {{updateCount: number}}
     */
    getAndResetStats (): object {

        const statsToReturn = {
            ...this.getStats()
        };

        this.resetStats();

        return statsToReturn
    }

    getStatus () :boolean {

        return this.#isAlive;
    }

}


export type sACNUniverse = {
    universe: number
    priority: number
    type: number,
    data: number[]
}


export function getLocalInterfaceIPs (): string[] {

    // @ts-expect-error idk
    return Object.values(networkInterfaces()).reduce((r, list) => r.concat(list.reduce((rr, i) => rr.concat(i.family === "IPv4" && !i.internal && i.address || []), [])), []);
}
