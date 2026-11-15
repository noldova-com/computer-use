<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

function Bring-ToFront([IntPtr] $window) {
  if ("__RESTORE__" -eq "always" -or $user32::GetForegroundWindow() -eq [IntPtr]::Zero) {
    $user32::ShowWindow($window, 6) | Out-Null
    $user32::ShowWindow($window, 9) | Out-Null
    Report "restored"
  }
  $front = $user32::GetWindowThreadProcessId($user32::GetForegroundWindow(), [IntPtr]::Zero)
  $own = $user32::GetCurrentThreadId()
  $user32::AttachThreadInput($own, $front, $true) | Out-Null
  $user32::BringWindowToTop($window) | Out-Null
  $user32::SetForegroundWindow($window) | Out-Null
  $user32::AttachThreadInput($own, $front, $false) | Out-Null
}
