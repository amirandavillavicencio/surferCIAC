Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\SAURABH KUMAR\.gemini\antigravity-ide\brain\14d5818b-772d-425f-989e-8d3ede8c74b5\sprint_runner_icon_1789985363534.jpg"
$destDir = "c:\Users\SAURABH KUMAR\OneDrive\Desktop\Saurabh's Sprint\assets\icons"

$sizes = @(
    @{ Name = "icon-512.png"; Width = 512; Height = 512 },
    @{ Name = "icon-192.png"; Width = 192; Height = 192 },
    @{ Name = "apple-touch-icon.png"; Width = 180; Height = 180 },
    @{ Name = "icon-maskable-512.png"; Width = 512; Height = 512 },
    @{ Name = "favicon-32x32.png"; Width = 32; Height = 32 },
    @{ Name = "favicon-16x16.png"; Width = 16; Height = 16 }
)

$img = [System.Drawing.Image]::FromFile($srcPath)

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s.Width, $s.Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $s.Width, $s.Height)
    $g.Dispose()
    $outPath = Join-Path $destDir $s.Name
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved $outPath"
}
$img.Dispose()

# Also save a copy as icon.png and in root for favicon
Copy-Item (Join-Path $destDir "icon-512.png") (Join-Path $destDir "icon.png") -Force
Copy-Item (Join-Path $destDir "apple-touch-icon.png") "c:\Users\SAURABH KUMAR\OneDrive\Desktop\Saurabh's Sprint\apple-touch-icon.png" -Force
Copy-Item (Join-Path $destDir "favicon-32x32.png") "c:\Users\SAURABH KUMAR\OneDrive\Desktop\Saurabh's Sprint\favicon.ico" -Force
Write-Host "All icons generated successfully!"
