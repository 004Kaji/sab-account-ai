const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svgPath  = path.join(__dirname, '../public/icon.svg')
const publicDir = path.join(__dirname, '../public')

// Build a valid ICO file wrapping PNG payloads
function buildIco(pngBuffers, sizes) {
  const count      = pngBuffers.length
  const headerSize = 6
  const entrySize  = 16
  const dirSize    = headerSize + entrySize * count

  let dataOffset = dirSize
  const offsets = pngBuffers.map(buf => { const o = dataOffset; dataOffset += buf.length; return o })

  const ico = Buffer.alloc(dataOffset)
  ico.writeUInt16LE(0, 0)      // reserved
  ico.writeUInt16LE(1, 2)      // type: 1 = ICO
  ico.writeUInt16LE(count, 4)  // image count

  pngBuffers.forEach((buf, i) => {
    const base = headerSize + entrySize * i
    const dim  = sizes[i] >= 256 ? 0 : sizes[i]
    ico.writeUInt8(dim, base)          // width  (0 = 256)
    ico.writeUInt8(dim, base + 1)      // height (0 = 256)
    ico.writeUInt8(0, base + 2)        // color count
    ico.writeUInt8(0, base + 3)        // reserved
    ico.writeUInt16LE(1, base + 4)     // planes
    ico.writeUInt16LE(32, base + 6)    // bit depth
    ico.writeUInt32LE(buf.length, base + 8)   // data size
    ico.writeUInt32LE(offsets[i], base + 12)  // data offset
    buf.copy(ico, offsets[i])
  })

  return ico
}

async function main() {
  const svgBuf = fs.readFileSync(svgPath)

  // PNG outputs
  const pngJobs = [
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
  ]
  for (const { size, name } of pngJobs) {
    await sharp(svgBuf).resize(size, size).png().toFile(path.join(publicDir, name))
    console.log(`✓ ${name}`)
  }

  // favicon.ico — 16, 32, 48 px embedded in one file
  const icoSizes   = [16, 32, 48]
  const icoBuffers = await Promise.all(
    icoSizes.map(s => sharp(svgBuf).resize(s, s).png().toBuffer())
  )
  const icoData = buildIco(icoBuffers, icoSizes)
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoData)
  console.log('✓ favicon.ico  (16 + 32 + 48 px)')

  console.log('\nAll icons generated.')
}

main().catch(err => { console.error(err); process.exit(1) })
