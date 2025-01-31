import { GitHub } from "@actions/github/lib/utils";

import { DeploymentContext } from "../lib/context";
import deactivateEnvironment from "../lib/deactivate";

export type FinishArgs = {
  autoDeactivate: boolean;
  deploymentID: string;
  status: string;
  envURL?: string;
};

async function createFinish(
  github: InstanceType<typeof GitHub>,
  context: DeploymentContext,
  stepArgs: FinishArgs
) {
  const {
    log,
    coreArgs: { description, logsURL },
  } = context;
  if (stepArgs.autoDeactivate) {
    await deactivateEnvironment(github, context);
  }

  // we must do this to validate the argument to get type checking
  if (
    stepArgs.status !== "success" &&
    stepArgs.status !== "failure" &&
    stepArgs.status !== "cancelled" &&
    stepArgs.status !== "error" &&
    stepArgs.status !== "inactive" &&
    stepArgs.status !== "in_progress" &&
    stepArgs.status !== "queued" &&
    stepArgs.status !== "pending"
  ) {
    log.fail(`unexpected status ${stepArgs.status}`);
    return;
  }
  log.info(
    `finishing deployment for ${stepArgs.deploymentID} with status ${stepArgs.status}`
  );

  // Set cancelled jobs to inactive environment
  const newStatus =
    stepArgs.status === "cancelled" ? "inactive" : stepArgs.status;
  const {
    data: { id: statusID },
  } = await github.rest.repos.createDeploymentStatus({
    owner: context.owner,
    repo: context.repo,
    deployment_id: parseInt(stepArgs.deploymentID, 10),
    state: newStatus,
    description: description,
    ref: context.ref,

    // only set environment_url if deployment worked
    environment_url: newStatus === "success" ? stepArgs.envURL : "",
    // set log_url to action by default
    log_url: logsURL,
    auto_inactive: false,
  });

  log.info(`${stepArgs.deploymentID} status set to ${newStatus}`, {
    statusID: statusID,
  });

  return { statusID };
}

export default createFinish;
