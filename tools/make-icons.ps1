# Regenerates icons\ for LocalhostSwitcher. Zero dependencies — .NET System.Drawing.
# Each icon is drawn natively at its target size (never downscaled from a master),
# so small sizes stay crisp. Re-run after tweaking $Color.
#
#   powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1

Add-Type -AssemblyName System.Drawing

$Color   = [System.Drawing.ColorTranslator]::FromHtml('#1565C0')
$OutDir  = Join-Path $PSScriptRoot '..\icons'
$OutDir  = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# size -> text, and whether to antialias (harmful below 48px, see plan §13)
$specs = @(
  @{ Size = 16;  Text = 'LH';   AA = $false },
  @{ Size = 24;  Text = '4200'; AA = $false },
  @{ Size = 32;  Text = '4200'; AA = $false },
  @{ Size = 48;  Text = '4200'; AA = $true  },
  @{ Size = 128; Text = '4200'; AA = $true  }
)

foreach ($s in $specs) {
  $size = [int]$s.Size
  $text = [string]$s.Text

  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  # Full-bleed white ground.
  $g.Clear([System.Drawing.Color]::White)

  $g.TextRenderingHint = if ($s.AA) {
    [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  } else {
    [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit
  }

  # Auto-fit the largest Arial Narrow Bold that fits within the canvas.
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment     = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  $font = $null
  for ($fs = $size; $fs -ge 4; $fs--) {
    $candidate = New-Object System.Drawing.Font('Arial Narrow', $fs, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $m = $g.MeasureString($text, $candidate)
    if ($m.Width -le ($size * 0.94) -and $m.Height -le ($size * 0.98)) {
      $font = $candidate
      break
    }
    $candidate.Dispose()
  }
  if ($null -eq $font) {
    $font = New-Object System.Drawing.Font('Arial Narrow', 4, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  }

  $brush = New-Object System.Drawing.SolidBrush($Color)
  $rect  = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $g.DrawString($text, $font, $brush, $rect, $format)

  $path = Join-Path $OutDir ("icon{0}.png" -f $size)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $font.Dispose(); $brush.Dispose(); $format.Dispose(); $g.Dispose(); $bmp.Dispose()
  Write-Host ("wrote {0}  ({1}px, '{2}')" -f $path, $size, $text)
}

Write-Host "done."
