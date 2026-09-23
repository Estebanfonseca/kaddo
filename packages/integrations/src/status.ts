// Integration status (VS-102).
//
// Two independent axes must never be conflated: the *integration connection status* (below) and a
// *Work Item lifecycle status*. This describes whether an integration is usable, nothing about work.

import type { ConnectionStatus } from './contract.js'

export type IntegrationStatus =
  | 'configured'    // valid config, enabled, not yet verified
  | 'available'     // verified reachable & authorized
  | 'unavailable'   // verified but the provider is unreachable
  | 'unauthorized'  // verified but credentials were rejected
  | 'invalid-config'// config has blocking findings
  | 'disabled'      // explicitly disabled

/** Map a verified ConnectionResult status onto the integration status axis. */
export function statusFromConnection(connection: ConnectionStatus): IntegrationStatus {
  switch (connection) {
    case 'available': return 'available'
    case 'unauthorized': return 'unauthorized'
    case 'unavailable': return 'unavailable'
    case 'invalid-config': return 'invalid-config'
  }
}
