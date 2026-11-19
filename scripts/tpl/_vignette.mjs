// 모든 템플릿 공통: 가장자리를 은은하게 어둡게 하는 비네트 그림(vignette.png). 시선을 가운데로 모으고 화면에 깊이를 준다.
// 가운데는 완전히 투명하고, 가장자리로 갈수록 어두워진다(가장 어두운 곳의 진하기는 레이어 투명도로 조절).
export default async function vignette(out, sharp, W, H) {
  const w = 960
  const h = 540
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="50%" cy="50%" r="75%" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.85" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.95"/>
    </radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/></svg>`
  await sharp(Buffer.from(svg)).resize(W, H).png({ compressionLevel: 9 }).toFile(`${out}/vignette.png`)
}
