<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

$ErrorActionPreference = "Stop"
Add-Type -Namespace NoldovaStopKey -Name User32 -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
'@
$keyUp = 2
$control = 0x11
$shift = 0x10
$period = 0xBE
foreach ($key in @($control, $shift, $period)) { [NoldovaStopKey.User32]::keybd_event($key, 0, 0, [UIntPtr]::Zero) }
foreach ($key in @($period, $shift, $control)) { [NoldovaStopKey.User32]::keybd_event($key, 0, $keyUp, [UIntPtr]::Zero) }
[Console]::Out.WriteLine("pressed")
