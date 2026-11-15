<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -Namespace NoldovaBackdropWindow -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
[DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
[DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr window, int attribute, out int value, int size);
[DllImport("dwmapi.dll")] public static extern int DwmExtendFrameIntoClientArea(IntPtr window, ref Margins margins);
[DllImport("dwmapi.dll")] public static extern int DwmFlush();
public struct Margins { public int Left; public int Right; public int Top; public int Bottom; }
'@
[NoldovaBackdropWindow.Native]::SetProcessDPIAware() | Out-Null

$form = New-Object System.Windows.Forms.Form
$form.Text = "__TITLE__"
$form.ShowInTaskbar = $false
$form.BackColor = [System.Drawing.Color]::Black
$handle = $form.Handle
$off = 1
[NoldovaBackdropWindow.Native]::DwmSetWindowAttribute($handle, 3, [ref] $off, 4) | Out-Null
$backdrop = __BACKDROP__
$set = [NoldovaBackdropWindow.Native]::DwmSetWindowAttribute($handle, 38, [ref] $backdrop, 4)
$margins = New-Object NoldovaBackdropWindow.Native+Margins
$margins.Left = -1
$margins.Right = -1
$margins.Top = -1
$margins.Bottom = -1
[NoldovaBackdropWindow.Native]::DwmExtendFrameIntoClientArea($handle, [ref] $margins) | Out-Null
[NoldovaBackdropWindow.Native]::SetWindowPos($handle, [IntPtr](-1), __X__, __Y__, __WIDTH__, __HEIGHT__, 0x0050) | Out-Null
[System.Windows.Forms.Application]::DoEvents()
[NoldovaBackdropWindow.Native]::DwmFlush() | Out-Null
$asked = 0
$got = [NoldovaBackdropWindow.Native]::DwmGetWindowAttribute($handle, 38, [ref] $asked, 4)
[Console]::Out.WriteLine("ready $($handle.ToInt64()) $asked 0x$($set.ToString('X8')) 0x$($got.ToString('X8'))")
[Console]::Out.Flush()

[System.Threading.SynchronizationContext]::SetSynchronizationContext((New-Object System.Windows.Forms.WindowsFormsSynchronizationContext))
$onWindowThread = [System.Threading.Tasks.TaskScheduler]::FromCurrentSynchronizationContext()
$command = [Console]::OpenStandardInput().ReadAsync((New-Object byte[] 64), 0, 64)
$command.ContinueWith([Action[System.Threading.Tasks.Task[int]]] { param($read) [System.Windows.Forms.Application]::ExitThread() }, $onWindowThread) | Out-Null
[System.Windows.Forms.Application]::Run()
$form.Dispose()
