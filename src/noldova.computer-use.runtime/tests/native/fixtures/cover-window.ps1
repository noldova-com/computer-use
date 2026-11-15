<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -Namespace NoldovaCoverWindow -Name User32 -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
[DllImport("user32.dll")] public static extern bool UpdateWindow(IntPtr window);
[DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
'@
[NoldovaCoverWindow.User32]::SetProcessDPIAware() | Out-Null

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = "None"
$form.ShowInTaskbar = $false
$form.BackColor = [System.Drawing.Color]::Lime
$handle = $form.Handle
$off = 1
[NoldovaCoverWindow.User32]::DwmSetWindowAttribute($handle, 3, [ref] $off, 4) | Out-Null
[NoldovaCoverWindow.User32]::SetWindowPos($handle, [IntPtr](-1), __X__, __Y__, __WIDTH__, __HEIGHT__, 0x0050) | Out-Null
[NoldovaCoverWindow.User32]::UpdateWindow($handle) | Out-Null
[Console]::Out.WriteLine("ready $($handle.ToInt64())")
[Console]::Out.Flush()

[System.Threading.SynchronizationContext]::SetSynchronizationContext((New-Object System.Windows.Forms.WindowsFormsSynchronizationContext))
$onWindowThread = [System.Threading.Tasks.TaskScheduler]::FromCurrentSynchronizationContext()
$command = [Console]::OpenStandardInput().ReadAsync((New-Object byte[] 64), 0, 64)
$command.ContinueWith([Action[System.Threading.Tasks.Task[int]]] { param($read) [System.Windows.Forms.Application]::ExitThread() }, $onWindowThread) | Out-Null
[System.Windows.Forms.Application]::Run()
$form.Dispose()
