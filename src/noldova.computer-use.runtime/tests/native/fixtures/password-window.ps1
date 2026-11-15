<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase
Add-Type -Namespace NoldovaPasswordWindow -Name User32 -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, IntPtr processId);
[DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
[DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
[DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr window);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
'@
[NoldovaPasswordWindow.User32]::SetProcessDPIAware() | Out-Null
$user32 = [NoldovaPasswordWindow.User32]

__BRING_TO_FRONT__

function Report([string] $line) {
  [Console]::Out.WriteLine($line)
  [Console]::Out.Flush()
}

$window = New-Object System.Windows.Window
$window.Title = "__TITLE__"
$window.WindowStartupLocation = "Manual"
$window.Left = 160
$window.Top = 160
$window.Width = 480
$window.Height = 240
$window.Topmost = $true

$user = New-Object System.Windows.Controls.TextBox
$user.Margin = New-Object System.Windows.Thickness(24, 24, 24, 0)
$user.Add_TextChanged({ Report "user $($user.Text)" })
$box = New-Object System.Windows.Controls.PasswordBox
$box.Margin = New-Object System.Windows.Thickness(24)
$box.Add_PasswordChanged({ Report "secret $($box.SecurePassword.Length)" })
$box.Add_GotKeyboardFocus({ Report "focus password" })
$panel = New-Object System.Windows.Controls.StackPanel
$panel.Children.Add($user) | Out-Null
$panel.Children.Add($box) | Out-Null
$window.Content = $panel
$focused = if ("__FOCUS__" -eq "user") { $user } else { $box }
[System.Windows.Input.FocusManager]::SetFocusedElement($window, $focused)

$script:handle = [IntPtr]::Zero
$script:isReady = $false
function Report-WhenReady {
  if ($script:isReady -or $script:handle -eq [IntPtr]::Zero -or [NoldovaPasswordWindow.User32]::GetForegroundWindow() -ne $script:handle -or -not $focused.IsKeyboardFocused) { return }
  $script:isReady = $true
  Report "ready $($script:handle.ToInt64())"
}
$window.Add_ContentRendered({
  $script:handle = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle
  Bring-ToFront $script:handle
  $window.Activate() | Out-Null
  [System.Windows.Input.Keyboard]::Focus($focused) | Out-Null
  Report-WhenReady
})
$window.Add_Activated({ Report-WhenReady })
$focused.Add_GotKeyboardFocus({ Report-WhenReady })
$window.Add_PreviewMouseDown({ Report "click" })
$window.Add_Closed({ Report "closed" })

[System.Threading.SynchronizationContext]::SetSynchronizationContext((New-Object System.Windows.Threading.DispatcherSynchronizationContext))
$onWindowThread = [System.Threading.Tasks.TaskScheduler]::FromCurrentSynchronizationContext()
$commands = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
function Read-Command {
  $commands.ReadLineAsync().ContinueWith([Action[System.Threading.Tasks.Task[string]]] {
    param($read)
    $line = if ($read.IsFaulted) { $null } else { $read.Result }
    if ($line -eq "hold") {
      Report "held"
      $released = $commands.ReadLine()
      Report "released"
      if ($released -eq "release") { Read-Command } else { $window.Close() }
    } else {
      $window.Close()
    }
  }, $onWindowThread) | Out-Null
}
Read-Command
(New-Object System.Windows.Application).Run($window) | Out-Null
