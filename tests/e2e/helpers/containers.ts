import { config } from "$lib/server/config";

import { DockerClient } from "@docker/node-sdk";

export async function isContainerRunning(
  containerName: string,
): Promise<boolean> {
  try {
    const docker = await DockerClient.fromDockerHost(config.dockerHost);
    const container = await docker.containerInspect(containerName);
    return container.State?.Running === true;
  } catch {
    return false;
  }
}
