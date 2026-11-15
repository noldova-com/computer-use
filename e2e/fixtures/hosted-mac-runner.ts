/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class HostedMacRunner {
  public static readonly NOT_HOSTED: string = "Only a GitHub-hosted macOS runner grants the test app here; on any other Mac a person gives the grants.";
  private static readonly PLATFORM: string = "darwin";
  private static readonly ACTIONS_VARIABLE: string = "GITHUB_ACTIONS";
  private static readonly ACTIONS_VALUE: string = "true";
  private static readonly ENVIRONMENT_VARIABLE: string = "RUNNER_ENVIRONMENT";
  private static readonly ENVIRONMENT_VALUE: string = "github-hosted";

  public static isHosted(platform: string, environment: Readonly<Record<string, string | undefined>>): boolean {
    return platform === HostedMacRunner.PLATFORM
      && environment[HostedMacRunner.ACTIONS_VARIABLE] === HostedMacRunner.ACTIONS_VALUE
      && environment[HostedMacRunner.ENVIRONMENT_VARIABLE] === HostedMacRunner.ENVIRONMENT_VALUE;
  }
}
