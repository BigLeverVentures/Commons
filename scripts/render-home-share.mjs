import { readFile, writeFile } from 'node:fs/promises'
import { createElement as h } from 'react'
import { ImageResponse } from 'next/og.js'
import sharp from 'sharp'

// Render once: social crawlers receive a public PNG without a database or font fetch.
const art = await sharp(await readFile('public/images/fellowship-footer.webp')).png().toBuffer()
const fonts = await Promise.all([
  ['Fraunces', 'fraunces-600.ttf', 600],
  ['Inter', 'inter-400.ttf', 400],
  ['Inter', 'inter-600.ttf', 600],
].map(async ([name, file, weight]) => ({ name, data: await readFile(`public/fonts/${file}`), weight, style: 'normal' })))
const image = new ImageResponse(h('div', { style: {
  display: 'flex', flexDirection: 'column', position: 'relative',
  width: '100%', height: '100%', background: '#0d121d', color: '#f8f2e9',
  fontFamily: 'Inter', overflow: 'hidden',
} },
  h('img', { src: `data:image/png;base64,${art.toString('base64')}`, width: 1200, height: 400, style: { position: 'absolute', left: 0, bottom: -18 } }),
  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '40px 64px 0' } },
    h('div', { style: { fontFamily: 'Fraunces', fontWeight: 600, fontSize: 42 } }, 'Commons'),
    h('div', { style: { fontSize: 20, color: '#fdd087' } }, 'commons.example.org'),
  ),
  h('div', { style: { display: 'flex', flexDirection: 'column', margin: '30px 64px 0' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', marginTop: 22, fontFamily: 'Fraunces', fontWeight: 600, fontSize: 56, lineHeight: 1.08 } },
      h('div', {}, 'The fellowship continues, here.'),
    ),
    h('div', { style: { marginTop: 20, fontSize: 23, color: '#f8f2e9' } }, 'A question, an offer, an idea — that’s where things start.'),
  ),
), { width: 1200, height: 630, fonts })
await writeFile('public/images/commons-share.png', Buffer.from(await image.arrayBuffer()))
console.log('Rendered public/images/commons-share.png (1200 × 630).')
