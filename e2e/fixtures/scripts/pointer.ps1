<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

$ErrorActionPreference = "Stop"
Add-Type -Namespace NoldovaPointer -Name User32 -MemberDefinition @'
[StructLayout(LayoutKind.Sequential)] public struct Point { public int X; public int Y; }
[DllImport("user32.dll", SetLastError = true)] public static extern bool GetCursorPos(out Point point);
[DllImport("user32.dll", SetLastError = true)] public static extern bool SetCursorPos(int x, int y);
'@
if ($env:NOLDOVA_POINTER_TARGET) {
  $parts = $env:NOLDOVA_POINTER_TARGET.Split(",")
  if (-not [NoldovaPointer.User32]::SetCursorPos([int]$parts[0], [int]$parts[1])) { throw "SetCursorPos failed with error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())." }
}
$point = New-Object NoldovaPointer.User32+Point
if (-not [NoldovaPointer.User32]::GetCursorPos([ref]$point)) { throw "GetCursorPos failed with error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())." }
[Console]::Out.WriteLine("$($point.X),$($point.Y)")
