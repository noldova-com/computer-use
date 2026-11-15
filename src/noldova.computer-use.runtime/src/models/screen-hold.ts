/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ScreenHold {
  private readonly grantedSessions: Set<string> = new Set();
  private holderScope: string | null = null;
  private waitingSessionId: string | null = null;

  public claim(scope: string, sessionId: string): void {
    this.holderScope = scope;
    this.waitingSessionId = sessionId;
  }

  public grant(sessionId: string): void {
    this.grantedSessions.add(sessionId);
    if (this.waitingSessionId === sessionId)
      this.waitingSessionId = null;
  }

  public isFree(): boolean {
    return this.holderScope === null;
  }

  public isGrantedTo(sessionId: string): boolean {
    return this.grantedSessions.has(sessionId);
  }

  public isHeldBy(scope: string): boolean {
    return this.holderScope === scope;
  }

  public leave(sessionId: string): void {
    this.grantedSessions.delete(sessionId);
    if (this.waitingSessionId === sessionId)
      this.waitingSessionId = null;
    if (this.grantedSessions.size === 0 && this.waitingSessionId === null)
      this.holderScope = null;
  }
}
