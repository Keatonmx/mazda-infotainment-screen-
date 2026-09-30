# Draws the KODO home screen artwork for the stock Mazda Connect interface.
#
#   powershell -ExecutionPolicy Bypass -File tools\stock-theme\make-home.ps1
#
# Writes PNGs into stock-theme\files\jci\gui\... at the exact paths and sizes the stock UI uses
# (the same files MZD-AIO themes replace), plus stock-theme\preview-home.png, an approximate mockup.
# Needs the full fonts in tools\.cache (downloaded by tools/build-theme.js, or see README).

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$out = Join-Path $root 'stock-theme\files'
$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile((Join-Path $root 'tools\.cache\DelaGothicOne-Regular.ttf'))
$display = $fonts.Families[0]

function C([string]$hex, [int]$a = 255) {
    $h = $hex.TrimStart('#')
    [System.Drawing.Color]::FromArgb($a, [Convert]::ToInt32($h.Substring(0,2),16), [Convert]::ToInt32($h.Substring(2,2),16), [Convert]::ToInt32($h.Substring(4,2),16))
}
function NewCanvas([int]$w, [int]$h) {
    $b = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.InterpolationMode = 'HighQualityBicubic'
    return @($b, $g)
}
function Save($bmp, [string]$rel) {
    $p = Join-Path $out $rel
    New-Item -ItemType Directory -Force (Split-Path $p) | Out-Null
    $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
}
function RadialDisk($g, [float]$cx, [float]$cy, [float]$r, $inner, $outer) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($cx - $r, $cy - $r, 2 * $r, 2 * $r)
    $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
    $brush.CenterPoint = New-Object System.Drawing.PointF ($cx - $r * 0.3), ($cy - $r * 0.35)
    $brush.CenterColor = $inner
    $brush.SurroundColors = @($outer)
    $g.FillPath($brush, $path)
    $brush.Dispose(); $path.Dispose()
}
function CenteredText($g, [string]$text, $family, [float]$size, $color, [float]$cx, [float]$cy) {
    $font = New-Object System.Drawing.Font $family, $size, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
    $rect = New-Object System.Drawing.RectangleF ($cx - 200), ($cy - 100), 400, 200
    $g.DrawString($text, $font, (New-Object System.Drawing.SolidBrush $color), $rect, $fmt)
    $font.Dispose()
}

# ---------- coins ----------
# Each coin: soft shadow, gold ring, sumi (or Soul Red when focused) face, thin inner ring, kanji emblem, gloss.
function Coin([int]$w, [int]$h, [string]$kanji, [bool]$focus) {
    $b, $g = NewCanvas $w $h
    $d = $w - 14; $r = $d / 2; $cx = $w / 2; $cy = $r + 5
    for ($i = 6; $i -ge 1; $i--) {   # shadow
        $sb = New-Object System.Drawing.SolidBrush (C '000000' (18))
        $g.FillEllipse($sb, $cx - $r - $i / 2, $cy - $r + 5 + $i, $d + $i, $d + $i / 2); $sb.Dispose()
    }
    RadialDisk $g $cx $cy $r (C 'f2d58e') (C '8f6a2a')                         # gold ring
    if ($focus) { RadialDisk $g $cx $cy ($r - 6) (C 'e8364f') (C '6e0818') }   # Soul Red face
    else        { RadialDisk $g $cx $cy ($r - 6) (C '34303d') (C '0d0c12') }   # sumi face
    $pen = New-Object System.Drawing.Pen ($(if ($focus) { C 'f4ede1' 150 } else { C 'c8102e' 200 })), 2
    $g.DrawEllipse($pen, $cx - $r + 13, $cy - $r + 13, $d - 26, $d - 26); $pen.Dispose()
    CenteredText $g $kanji $display ($d * 0.40) ($(if ($focus) { C 'ffffff' } else { C 'f4ede1' 225 })) $cx ($cy + $d * 0.02)
    $gloss = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.PointF 0, ($cy - $r)), (New-Object System.Drawing.PointF 0, $cy), (C 'ffffff' 55), (C 'ffffff' 0)
    $g.FillEllipse($gloss, $cx - $r + 12, $cy - $r + 8, $d - 24, $r - 6); $gloss.Dispose()
    $g.Dispose(); return $b
}

$coins = @(
    @{ file = 'HomeCom';   kanji = '話'; size = @(142, 152); focus = @(180, 192) },
    @{ file = 'HomeAudio'; kanji = '楽'; size = @(142, 152); focus = @(180, 192) },
    @{ file = 'HomeNav';   kanji = '道'; size = @(142, 152); focus = @(180, 192) },
    @{ file = 'HomeApps';  kanji = '技'; size = @(114, 122); focus = @(142, 151) },
    @{ file = 'HomeSet';   kanji = '設'; size = @(114, 122); focus = @(142, 151) }
)
foreach ($c in $coins) {
    $n = Coin $c.size[0] $c.size[1] $c.kanji $false
    Save $n "jci\gui\apps\system\controls\MainMenu\images\coins\$($c.file).png"; $n.Dispose()
    $f = Coin $c.focus[0] $c.focus[1] $c.kanji $true
    Save $f "jci\gui\apps\system\controls\MainMenu\images\coins\$($c.file)_Focus.png"; $f.Dispose()
}

# ---------- glow behind the focused coin (364x323) ----------
$b, $g = NewCanvas 364 323
$path = New-Object System.Drawing.Drawing2D.GraphicsPath; $path.AddEllipse(22, 12, 320, 300)
$br = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
$br.CenterColor = C 'e2253f' 150; $br.SurroundColors = @(C 'c8102e' 0)
$g.FillPath($br, $path); $br.Dispose(); $path.Dispose(); $g.Dispose()
Save $b 'jci\gui\apps\system\controls\MainMenu\images\highlights\Glow.png'; $b.Dispose()

# ---------- arc under the coins (800x304): a thin gold brush stroke with a red underline ----------
$b, $g = NewCanvas 800 304
$pen = New-Object System.Drawing.Pen (C 'd4a857' 170), 3
$g.DrawArc($pen, -120, 70, 1040, 520, 200, 140); $pen.Dispose()
$pen = New-Object System.Drawing.Pen (C 'c8102e' 110), 1.5
$g.DrawArc($pen, -110, 84, 1020, 500, 202, 136); $pen.Dispose(); $g.Dispose()
Save $b 'jci\gui\apps\system\controls\MainMenu\images\Ellipse.png'; $b.Dispose()

# ---------- app-wide background (800x481): sumi, faint seigaiha, a rising sun low on the right ----------
$b, $g = NewCanvas 800 481
$g.Clear((C '0c0b10'))
$tile = [System.Drawing.Image]::FromFile((Join-Path $root 'theme\seigaiha.png'))
$tb = New-Object System.Drawing.TextureBrush $tile
$g.FillRectangle($tb, 0, 0, 800, 481); $tb.Dispose(); $tile.Dispose()
$path = New-Object System.Drawing.Drawing2D.GraphicsPath; $path.AddEllipse(470, 190, 420, 420)
$br = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
$br.CenterColor = C 'c8102e' 70; $br.SurroundColors = @(C '7d0a1c' 30)
$g.FillPath($br, $path); $br.Dispose(); $path.Dispose()
$vig = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.PointF 0, 300), (New-Object System.Drawing.PointF 0, 481), (C '0c0b10' 0), (C '0c0b10' 200)
$g.FillRectangle($vig, 0, 300, 800, 181); $vig.Dispose(); $g.Dispose()
Save $b 'jci\gui\common\images\background.png'; $b.Dispose()

# ---------- approximate home screen mockup ----------
# Coin positions are estimates of the stock arc (the stock layout CSS isn't public).
$b, $g = NewCanvas 800 480
$bg = [System.Drawing.Image]::FromFile((Join-Path $out 'jci\gui\common\images\background.png')); $g.DrawImage($bg, 0, 0, 800, 481); $bg.Dispose()
$el = [System.Drawing.Image]::FromFile((Join-Path $out 'jci\gui\apps\system\controls\MainMenu\images\Ellipse.png')); $g.DrawImage($el, 0, 150, 800, 304); $el.Dispose()
$sb = New-Object System.Drawing.SolidBrush (C '0b0b0b'); $g.FillRectangle($sb, 0, 0, 800, 64); $sb.Dispose()
$place = @(@('HomeApps', 44, 250), @('HomeAudio', 150, 128), @('HomeCom_Focus', 310, 54), @('HomeNav', 508, 128), @('HomeSet', 642, 250))
$gl = [System.Drawing.Image]::FromFile((Join-Path $out 'jci\gui\apps\system\controls\MainMenu\images\highlights\Glow.png')); $g.DrawImage($gl, 218, -10, 364, 323); $gl.Dispose()
foreach ($p in $place) {
    $img = [System.Drawing.Image]::FromFile((Join-Path $out "jci\gui\apps\system\controls\MainMenu\images\coins\$($p[0]).png"))
    $g.DrawImage($img, $p[1], $p[2], $img.Width, $img.Height); $img.Dispose()
}
$lab = New-Object System.Drawing.Font 'Segoe UI', 26, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = 'Center'
$g.DrawString('Communication', $lab, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 395, 800, 40), $fmt)
$g.DrawString('Home', $lab, [System.Drawing.Brushes]::White, 24, 16)
$g.Dispose()
$b.Save((Join-Path $root 'stock-theme\preview-home.png'), [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose()
"done: $(Get-ChildItem $out -Recurse -File | Measure-Object | Select-Object -ExpandProperty Count) files"
