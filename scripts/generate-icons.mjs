import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = process.cwd()
const source = process.env.APP_ICON_SOURCE
  ? path.resolve(root, process.env.APP_ICON_SOURCE)
  : path.resolve(root, 'build/brand-logo.svg')

const outDir = path.resolve(root, 'build/icons')
const iconsetDir = path.resolve(outDir, 'icon.iconset')
const shouldGenerateIcns = process.platform === 'darwin'

if (!fs.existsSync(source)) {
  throw new Error(`Icon source not found: ${source}`)
}

fs.mkdirSync(outDir, { recursive: true })
if (shouldGenerateIcns) {
  fs.rmSync(iconsetDir, { recursive: true, force: true })
  fs.mkdirSync(iconsetDir, { recursive: true })
}

const sizes = [16, 32, 64, 128, 256, 512, 1024]

for (const size of sizes) {
  const file = path.join(outDir, `icon-${size}.png`)
  await sharp(source).resize(size, size).png().toFile(file)
}

const iconsetMap = [
  [16, 'icon_16x16.png'],
  [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'],
  [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'],
  [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'],
  [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'],
  [1024, 'icon_512x512@2x.png'],
]

if (shouldGenerateIcns) {
  for (const [size, fileName] of iconsetMap) {
    fs.copyFileSync(path.join(outDir, `icon-${size}.png`), path.join(iconsetDir, fileName))
  }

  const icnsPath = path.join(outDir, 'icon.icns')
  execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath])
}

const icoBuffer = await pngToIco([
  path.join(outDir, 'icon-256.png'),
  path.join(outDir, 'icon-128.png'),
  path.join(outDir, 'icon-64.png'),
  path.join(outDir, 'icon-32.png'),
  path.join(outDir, 'icon-16.png'),
])
fs.writeFileSync(path.join(outDir, 'icon.ico'), icoBuffer)

if (shouldGenerateIcns) {
  fs.rmSync(iconsetDir, { recursive: true, force: true })
}
console.log('Generated app icons in build/icons')
