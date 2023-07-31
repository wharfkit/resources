import {Asset, Struct, UInt32, UInt8} from '@wharfkit/antelope'

import {Resources} from '.'
import {PowerUpStateResourceCPU} from './powerup/cpu'
import {PowerUpStateResourceNET} from './powerup/net'

@Struct.type('powerupstate')
export class PowerUpState extends Struct {
    @Struct.field('uint8') version!: UInt8
    @Struct.field(PowerUpStateResourceNET) net!: PowerUpStateResourceNET
    @Struct.field(PowerUpStateResourceCPU) cpu!: PowerUpStateResourceCPU
    @Struct.field('uint32') powerup_days!: UInt32
    @Struct.field('asset') min_powerup_fee!: Asset
}

export class PowerUpAPI {
    constructor(private parent: Resources) {}

    async get_state(): Promise<PowerUpState> {
        const response = await this.parent.api.v1.chain.get_table_rows({
            code: 'eosio',
            scope: '',
            table: 'powup.state',
            type: PowerUpState,
        })
        return response.rows[0]
    }
}
