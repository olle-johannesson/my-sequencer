const portraitVideos = [
  '855907',
  '855907-1',
  '855909',
  '8382685',
  '8382686',
  '11124042',
  '12321390',
  '17979996',
  '17980004'
]

const landscapeVideos = [
  '855907',
  '855909',
  '5927778',
  '8382403',
  '8382683',
  '8382684',
  '8382687',
  '8382688',
  '11124042',
  '17980004',
  '7334673',
  '16469196'
]

export const getVideoUrl = () => {
  const isSmallScreen =  window.matchMedia("(max-width: 768px)").matches;
  const slug = isSmallScreen ? 'portrait' : 'landscape'
  const selection = isSmallScreen ? portraitVideos : landscapeVideos
  // import.meta.env.BASE_URL respects vite's `base` config (set to "./" so
  // assets resolve relative to the document — works under any subpath
  // deployment, not just at the domain root).
  return `${import.meta.env.BASE_URL}images/${slug}/${selection[Math.floor(Math.random() * selection.length)]}.mp4`
}