<#
  @license
  Copyright (c) Noldova.

  This source code is licensed under the license found in the
  LICENSE file in the root directory of this source tree.
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @'
namespace NoldovaChildWindow {
  public class QuietForm : System.Windows.Forms.Form {
    protected override bool ShowWithoutActivation { get { return true; } }
  }
}
'@
Add-Type -Namespace NoldovaChildWindow -Name User32 -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
'@
[NoldovaChildWindow.User32]::SetProcessDPIAware() | Out-Null

function Report([string] $line) {
  [Console]::Out.WriteLine($line)
  [Console]::Out.Flush()
}

$form = New-Object NoldovaChildWindow.QuietForm
$form.Text = "__TITLE__"
$form.FormBorderStyle = "None"
$form.ShowInTaskbar = $false
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(0, 0)
$form.ClientSize = New-Object System.Drawing.Size(180, 120)
$form.BackColor = [System.Drawing.Color]::White

$button = New-Object System.Windows.Forms.Button
$button.Location = New-Object System.Drawing.Point(8, 8)
$button.Size = New-Object System.Drawing.Size(160, 32)
$button.Text = "Other app's button"

$box = New-Object System.Windows.Forms.TextBox
$box.Location = New-Object System.Drawing.Point(8, 56)
$box.Width = 160
$box.Text = "Other app's text"
$box.Add_TextChanged({ Report "text $($box.Text)" })

$form.Controls.Add($button)
$form.Controls.Add($box)
$form.Add_Shown({ Report "ready $($form.Handle.ToInt64())" })
$form.Add_FormClosed({ Report "closed" })

[System.Threading.SynchronizationContext]::SetSynchronizationContext((New-Object System.Windows.Forms.WindowsFormsSynchronizationContext))
$onWindowThread = [System.Threading.Tasks.TaskScheduler]::FromCurrentSynchronizationContext()
$commands = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$commands.ReadLineAsync().ContinueWith([Action[System.Threading.Tasks.Task[string]]] { param($read) $form.Close() }, $onWindowThread) | Out-Null
[System.Windows.Forms.Application]::Run($form)
