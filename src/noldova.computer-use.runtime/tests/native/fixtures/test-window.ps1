<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -Namespace NoldovaTestWindow -Name User32 -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, IntPtr processId);
[DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
[DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
[DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr window);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
[DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
[DllImport("user32.dll")] public static extern IntPtr SetWindowLongPtr(IntPtr window, int index, IntPtr value);
[DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr child, IntPtr parent);
[DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr window, int x, int y, int width, int height, bool repaint);
'@
[NoldovaTestWindow.User32]::SetProcessDPIAware() | Out-Null
$user32 = [NoldovaTestWindow.User32]

__BRING_TO_FRONT__

function Report([string] $line) {
  [Console]::Out.WriteLine($line)
  [Console]::Out.Flush()
}

$start = [System.Windows.Forms.Cursor]::Position
$pointerStart = New-Object System.Drawing.Point(40, 280)
$form = New-Object System.Windows.Forms.Form
$form.Text = "__TITLE__"
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(160, 160)
$form.ClientSize = New-Object System.Drawing.Size(480, 320)
$form.TopMost = $true
$form.KeyPreview = $true
$form.BackColor = [System.Drawing.Color]::White

$marker = New-Object System.Windows.Forms.Panel
$marker.BackColor = [System.Drawing.Color]::FromArgb(255, 0, 255)
$marker.Location = New-Object System.Drawing.Point(320, 200)
$marker.Size = New-Object System.Drawing.Size(48, 48)
$marker.Add_MouseClick({ param($sender, $click) Report "click $($click.X) $($click.Y)" })
$script:pressed = $null
$script:moveOnPress = $null
$marker.Add_MouseDown({
  param($sender, $press)
  $script:pressed = $press.Location
  if ($null -ne $script:moveOnPress) {
    $form.Location = New-Object System.Drawing.Point(($form.Location.X + $script:moveOnPress[0]), ($form.Location.Y + $script:moveOnPress[1]))
    $movedMs = [System.Diagnostics.Stopwatch]::GetTimestamp() * 1000.0 / [System.Diagnostics.Stopwatch]::Frequency
    $script:moveOnPress = $null
    Report "moved $($form.Location.X) $($form.Location.Y) $($movedMs.ToString('F3', [System.Globalization.CultureInfo]::InvariantCulture))"
  }
})
$marker.Add_MouseUp({
  param($sender, $release)
  $dx = $release.X - $script:pressed.X
  $dy = $release.Y - $script:pressed.Y
  if ($dx -ne 0 -or $dy -ne 0) { Report "drag $dx $dy $([System.Windows.Forms.Control]::ModifierKeys)" }
})

$box = New-Object System.Windows.Forms.TextBox
$box.Location = New-Object System.Drawing.Point(24, 24)
$box.Width = 240
$box.Add_TextChanged({ Report "text $($box.Text)" })

$password = New-Object System.Windows.Forms.TextBox
$password.Location = New-Object System.Drawing.Point(24, 64)
$password.Width = 240
$password.UseSystemPasswordChar = $true
$password.AccessibleName = "Password"

$save = New-Object System.Windows.Forms.Button
$save.Location = New-Object System.Drawing.Point(24, 104)
$save.Size = New-Object System.Drawing.Size(96, 32)
$save.Text = "Save"
$save.Add_Click({ Report "pressed save" })

$form.Controls.Add($marker)
$form.Controls.Add($box)
$form.Controls.Add($password)
$form.Controls.Add($save)
$form.Add_KeyDown({ param($sender, $key) if ($key.KeyCode -eq [System.Windows.Forms.Keys]::Escape) { $form.Close() } elseif ($key.KeyCode -eq [System.Windows.Forms.Keys]::Return) { Report "enter" } })
$form.Add_HandleCreated({ $off = 1; [NoldovaTestWindow.User32]::DwmSetWindowAttribute($form.Handle, 3, [ref] $off, 4) | Out-Null })
$script:isShown = $false
$script:isReady = $false
function Report-WhenReady {
  if ($script:isReady -or -not $script:isShown -or [NoldovaTestWindow.User32]::GetForegroundWindow() -ne $form.Handle) { return }
  $script:isReady = $true
  Report "ready $($form.Handle.ToInt64())"
}
$form.Add_Shown({ [System.Windows.Forms.Cursor]::Position = $form.PointToScreen($pointerStart); Bring-ToFront $form.Handle; $form.Activate(); $box.Focus() | Out-Null; $form.Refresh(); $script:isShown = $true; Report-WhenReady })
$form.Add_Activated({ Report-WhenReady })
$form.Add_MouseWheel({ param($sender, $wheel) Report "wheel $($wheel.Delta)" })
$box.Add_MouseWheel({ param($sender, $wheel) Report "wheel $($wheel.Delta)" })
$form.Add_FormClosed({ [System.Windows.Forms.Cursor]::Position = $start; Report "closed" })

[System.Threading.SynchronizationContext]::SetSynchronizationContext((New-Object System.Windows.Forms.WindowsFormsSynchronizationContext))
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
      if ($released -eq "release") { Read-Command } else { $form.Close() }
    } elseif ($null -ne $line -and $line -match '^move (-?\d+) (-?\d+)$') {
      $form.Location = New-Object System.Drawing.Point(($form.Location.X + [int] $Matches[1]), ($form.Location.Y + [int] $Matches[2]))
      $movedMs = [System.Diagnostics.Stopwatch]::GetTimestamp() * 1000.0 / [System.Diagnostics.Stopwatch]::Frequency
      Report "moved $($form.Location.X) $($form.Location.Y) $($movedMs.ToString('F3', [System.Globalization.CultureInfo]::InvariantCulture))"
      Read-Command
    } elseif ($null -ne $line -and $line -match '^warp (-?\d+) (-?\d+)$') {
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point([int] $Matches[1], [int] $Matches[2])
      Report "warped $($Matches[1]) $($Matches[2])"
      Read-Command
    } elseif ($line -eq "iconic") {
      Report "iconic $([NoldovaTestWindow.User32]::IsIconic($form.Handle))"
      Read-Command
    } elseif ($line -eq "keys") {
      Report "keys enter $(([NoldovaTestWindow.User32]::GetAsyncKeyState(0x0D) -band 0x8000) -ne 0) tab $(([NoldovaTestWindow.User32]::GetAsyncKeyState(0x09) -band 0x8000) -ne 0)"
      Read-Command
    } elseif ($line -eq "focus box") {
      Report "box focused $($box.Focus())"
      Read-Command
    } elseif ($null -ne $line -and $line -match '^move-on-press (-?\d+) (-?\d+)$') {
      $script:moveOnPress = @([int] $Matches[1], [int] $Matches[2])
      Report "armed"
      Read-Command
    } elseif ($line -eq "disarm") {
      $wasArmed = $null -ne $script:moveOnPress
      $script:moveOnPress = $null
      Report "disarmed $wasArmed"
      Read-Command
    } elseif ($null -ne $line -and $line -match '^adopt (\d+)$') {
      $child = [IntPtr] [long] $Matches[1]
      [NoldovaTestWindow.User32]::SetWindowLongPtr($child, -16, [IntPtr] 0x50000000) | Out-Null
      [NoldovaTestWindow.User32]::SetParent($child, $form.Handle) | Out-Null
      [NoldovaTestWindow.User32]::MoveWindow($child, 280, 24, 180, 120, $true) | Out-Null
      Bring-ToFront $form.Handle
      Report "adopted"
      Read-Command
    } else {
      $form.Close()
    }
  }, $onWindowThread) | Out-Null
}
Read-Command
[System.Windows.Forms.Application]::Run($form)
