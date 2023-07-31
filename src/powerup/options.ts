import {TimePointType, UInt64} from '@wharfkit/antelope'

export interface PowerUpStateOptions {
    // timestamp to base adjusted_utilization off
    timestamp?: TimePointType
    // blockchain resource limits for calculating usage
    virtual_block_cpu_limit?: UInt64
    virtual_block_net_limit?: UInt64
}
