import { testExports } from "$lib/server/services/nodes";

import { describe, expect, it } from "vitest";

describe("parseNodeStatus", () => {
  describe("for a healthy running node", () => {
    it("returns a running status", () => {
      expect(testExports.parseNodeStatus(RUNNING_HEALTHY_1_6_1)).toEqual({
        isRunning: true,
        peers: 9,
        sinceSeconds: 2035.2,
      });
    });
  });

  describe("for a healthy stopped node", () => {
    it("returns a stopped status", () => {
      expect(testExports.parseNodeStatus(STOPPED_HEALTHY_1_6_1)).toEqual({
        isRunning: false,
        peers: -2,
        sinceSeconds: 0,
      });
    });
  });

  describe("for a running node with no peers", () => {
    it("returns a running status with peers set to zero", () => {
      expect(testExports.parseNodeStatus(RUNNING_NO_PEERS_1_6_1)).toEqual({
        isRunning: true,
        peers: 0,
        sinceSeconds: 0,
      });
    });
  });
});

const RUNNING_HEALTHY_1_6_1 = `
✓ Node is running with Node ID z6MkwPUeUS2fJMfc2HZN1RQTQcTTuhw4HhPySB8JeUg2mVvx and not configured to listen for inbound connections.

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Node ID                                            Address                      ?   ⤭   Since           │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ z6Mks7oYVxX7WoiUTK8oiMMb9zXW1TKazBhpsttzgqosi7fn   seed.meshnet.lol:8776        ✓   ↗   33.92 minute(s) │
│ z6MkmvNrdsAihAGD4vz3wN7U8hy7SmZpBoDe28K1m3GFjkf2   seed.cielago.xyz:8776        ✓   ↗   33.92 minute(s) │
│ z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7   iris.radicle.xyz:8776        ✓   ↗   1.82 minute(s)  │
│ z6MksZDUgnKTAa2WZ3oaMYxysjHgtmzHFKWfYQFbFWYyCtVv   radseed.alt0r.com:8776       ✓   ↗   33.92 minute(s) │
│ z6Mkr5ad8ZN5tyJygyp7wgujJLSykAvXznQyUtV3kh8CsTyd   radicle.qmooku.com:8776      ✓   ↗   33.92 minute(s) │
│ z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo   rosa.radicle.xyz:8776        ✓   ↗   22.52 minute(s) │
│ z6MkoK2du54THVFvDRYmPxTttkbGtiH9ZEeCf91ndTnzBaW5   seed.kenadera.org:8776       ✓   ↗   33.92 minute(s) │
│ z6MkogDinownn1Jd3zSM92U2E3PUegWHrZ7a6fnDeAngpVPq   root.seednode.garden:8776    ✓   ↗   33.92 minute(s) │
│ z6MkjhTRyynC1Gn9GHirh7uiuLKYFMV9RFBh9QwnWXS2A5sZ   rad.foddur-hodler.top:8776   ✓   ↗   33.92 minute(s) │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✗ Hint:
   ? … Status:
       ✓ … connected    ✗ … disconnected
       ! … attempted    • … initial
   ⤭ … Link Direction:
       ↘ … inbound      ↗ … outbound

2026-01-27T15:51:33.693-06:00 INFO  service  Received command QueryState(..)
2026-01-27T15:56:05.353-06:00 INFO  service  Connected to z6MkmXdBVkNiieUuEAgS6Td4qMzqP969tFfTpe3Lx79iS2Wf (seed.pipapo.org:8776) (Outbound)
2026-01-27T16:02:36.284-06:00 INFO  service  Disconnected from z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo (connection reset)
2026-01-27T16:02:55.231-06:00 INFO  service  Connected to z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo (rosa.radicle.xyz:8776) (Outbound)
2026-01-27T16:03:36.914-06:00 INFO  service  Disconnected from z6MkmXdBVkNiieUuEAgS6Td4qMzqP969tFfTpe3Lx79iS2Wf (peer timed out)
2026-01-27T16:22:54.800-06:00 INFO  service  Disconnected from z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7 (connection reset)
2026-01-27T16:23:37.456-06:00 INFO  service  Connected to z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7 (iris.radicle.xyz:8776) (Outbound)
2026-01-27T16:25:26.204-06:00 INFO  service  Received command ListenAddrs
2026-01-27T16:25:26.205-06:00 INFO  service  Received command QueryState(..)
2026-01-27T16:25:26.205-06:00 INFO  service  Received command QueryState(..)
`.trim();

const STOPPED_HEALTHY_1_6_1 = `
Node is stopped.
To start it, run \`rad node start\`.
`.trim();

const RUNNING_NO_PEERS_1_6_1 = `
rudolfs: Hm, even if I remove the onion preferred seeds and restart, it's still not peered up.
✓ Node is running with Node ID z6MknFBLrTPWpYzVwDxYjGvWS8HTRSueuRiQKkvZHzWPt4cx and listening for inbound connections on 0.0.0.0:8776.

╭──────────────────────────────────────────────────────────────────────────────────────────╮
│ Node ID                                            Address                 ?   ⤭   Since │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo   rosa.radicle.xyz:8776   !   ↗         │
│ z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7   iris.radicle.xyz:8776   !   ↗         │
╰──────────────────────────────────────────────────────────────────────────────────────────╯
✗ Hint:
   ? … Status:
       ✓ … connected    ✗ … disconnected
       ! … attempted    • … initial
   ⤭ … Link Direction:
       ↘ … inbound      ↗ … outbound
`;
