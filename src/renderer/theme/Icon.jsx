// 16×16 선 아이콘, 선 굵기 1.5, 둥근 끝.
const PATHS = {
  undo: 'M6 3 2.5 6.5 6 10M3 6.5h6.5a3.5 3.5 0 0 1 0 7H6',
  redo: 'M10 3l3.5 3.5L10 10M13 6.5H6.5a3.5 3.5 0 0 0 0 7H10',
  forward: 'M3 10l5-5 5 5M3 14h10',
  backward: 'M3 6l5 5 5-5M3 2h10',
  duplicate: 'M5.5 5.5h7v7h-7zM3.5 10.5v-7h7',
  delete: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5M7 7v4M9 7v4',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z',
  eyeOff: 'M2 2l12 12M6.3 4a6.5 6.5 0 0 1 1.7-.5c4 0 6.5 4.5 6.5 4.5a11 11 0 0 1-2 2.5M4 5.6A11 11 0 0 0 1.5 8S4 12.5 8 12.5c.9 0 1.7-.2 2.4-.5',
  lock: 'M4 7.5h8v6H4zM5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2',
  unlock: 'M4 7.5h8v6H4zM5.5 7.5V5.5a2.5 2.5 0 0 1 4.8-1',
  image: 'M2 3.5h12v9H2zM2 11l3.5-3.5L9 11l2-2 3 3M10.5 6.5a.8.8 0 1 0 0-.01',
  chat: 'M2 3.5h12v8H8l-3 2.5v-2.5H2z',
  table: 'M2 6h12M3 6v7M13 6v7M2 3.5h12v2.5H2z',
  plus: 'M8 3v10M3 8h10',
  warn: 'M8 2.5 14 13H2zM8 6.5v3M8 11.2v.1',
  folder: 'M2 4.5h4l1.5 1.5H14v6.5H2z',
  play: 'M5 3l8 5-8 5z',
  alignLeft: 'M2 2v12M5 4h8v3H5zM5 9h5v3H5z',
  alignHCenter: 'M8 2v12M3.5 4h9v3h-9zM5 9h6v3H5z',
  alignRight: 'M14 2v12M3 4h8v3H3zM6 9h5v3H6z',
  alignTop: 'M2 2h12M4 5v8h3V5zM9 5v5h3V5z',
  alignVMiddle: 'M2 8h12M4 3.5v9h3v-9zM9 5v6h3V5z',
  alignBottom: 'M2 14h12M4 3v8h3V3zM9 6v5h3V6z',
  distH: 'M2 2v12M14 2v12M6.5 5h3v6h-3z',
  distV: 'M2 2h12M2 14h12M5 6.5v3h6v-3z',
  flip: 'M8 2v12M6 4 2 12h4zM10 4l4 8h-4z',
  link: 'M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2.5-2.5a2.5 2.5 0 0 0-3.5-3.5l-.8.8M9.5 6.5a2.5 2.5 0 0 0-3.5 0L3.5 9a2.5 2.5 0 0 0 3.5 3.5l.8-.8',
}

export default function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
