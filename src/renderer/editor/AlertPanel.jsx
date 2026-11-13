import { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { SliderRow, ColorRow, CheckRow, SelectRow, Row } from './fields.jsx'
import Collapse from './Collapse.jsx'
import FontSelect from './FontSelect.jsx'
import { testAlerts } from './actions.js'
import { api } from '../api.js'
import { ALERT_ANIMS, ALERT_ANIM_LABEL, ALERT_LAYOUTS, ALERT_LAYOUT_LABEL, DONATION_KINDS, DONATION_LABEL, SOUND_KINDS, SOUND_LABEL, SAMPLE_DONATIONS, defaultAlert, normalizeAlert } from '../../core/donation.js'
import { playAlert, stopAlert, voices } from '../scene/alertSound.js'

const baseName = (p) => String(p ?? '').split(/[\\/]/).pop()

/** 소리·읽어 주기: 시험 버튼은 편집기에서 바로 들려 준다. */
function SoundSection({ s, set, field }) {
  const [vs, setVs] = useState(() => voices())
  useEffect(() => {
    const syn = window.speechSynthesis
    if (!syn) return
    const upd = () => setVs(voices())
    syn.addEventListener?.('voiceschanged', upd)
    upd()
    return () => syn.removeEventListener?.('voiceschanged', upd)
  }, [])
  const trial = () => {
    const d = SAMPLE_DONATIONS.find((x) => x.platform === 'youtube')
    playAlert(s, { id: 'trial', nick: d.nick, text: d.text, platform: d.platform, time: Date.now(), donation: { kind: d.kind, amount: d.amount, text: d.text, title: '' } })
  }
  const pickFile = async () => {
    const [p] = await api.pickMedia({ kind: 'sound' })
    if (p) set({ soundFile: p, sound: 'file' }, 'soundFile')
  }
  const voiceOpts = [['', '자동(한국어 목소리)'], ...vs.map((v) => [v.name, `${v.name} (${v.lang})`])]
  return (
    <Collapse id="alert-sound" title="YouTube 소리·읽어 주기" defaultOpen={false}>
      <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5, marginBottom: 6 }}>
        치지직·SOOP은 방송 사이트 위젯의 소리·TTS를 쓰세요. 여기 설정은 <b>YouTube 후원(슈퍼챗·슈퍼스티커·멤버십)</b>에만 적용됩니다.
      </div>
      <CheckRow label="알림 소리 내기" value={s.soundOn} onChange={field('soundOn')} />
      {s.soundOn && (
        <>
          <SelectRow label="소리" value={s.sound} options={SOUND_KINDS.map((k) => [k, SOUND_LABEL[k]])} onChange={field('sound')} />
          {s.sound === 'file' && (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button onClick={pickFile}>소리 파일 고르기</button>
              <span className="muted">{s.soundFile ? baseName(s.soundFile) : '고른 파일 없음'}</span>
            </div>
          )}
          <SliderRow label="소리 크기" value={s.soundVolume} min={0} max={1} step={0.05} onChange={field('soundVolume')} fmt={(v) => `${Math.round(v * 100)}%`} />
        </>
      )}
      <div style={{ height: 6 }} />
      <CheckRow label="후원 내용 읽어 주기(TTS)" value={s.ttsOn} onChange={field('ttsOn')} />
      {s.ttsOn && (
        <>
          <SelectRow label="목소리" value={s.ttsVoice} options={voiceOpts} onChange={field('ttsVoice')} />
          <SliderRow label="속도" value={s.ttsRate} min={0.5} max={2} step={0.05} onChange={field('ttsRate')} fmt={(v) => `${v.toFixed(2)}배`} />
          <SliderRow label="목소리 크기" value={s.ttsVolume} min={0} max={1} step={0.05} onChange={field('ttsVolume')} fmt={(v) => `${Math.round(v * 100)}%`} />
          <CheckRow label="닉네임 읽기" value={s.ttsNick} onChange={field('ttsNick')} />
          <CheckRow label="금액·종류 읽기" value={s.ttsAmount} onChange={field('ttsAmount')} />
          <CheckRow label="메시지 읽기" value={s.ttsMessage} onChange={field('ttsMessage')} />
          <SliderRow label="메시지 최대 글자" value={s.ttsMaxChars} min={10} max={300} step={5} onChange={field('ttsMaxChars')} fmt={(v) => `${Math.round(v)}자`} />
          <SliderRow label="읽는 최소 금액" value={s.ttsMinAmount} min={0} max={50000} step={500} onChange={field('ttsMinAmount')} fmt={(v) => (v ? `${Math.round(v)}` : '없음')} />
          <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>
            URL과 이모티콘은 읽지 않습니다. 읽는 중에는 알림이 끝까지 읽은 뒤에 사라집니다(최대 20초 더). 목소리는 윈도우에 설치된 음성입니다.
          </div>
        </>
      )}
      <div className="row" style={{ marginTop: 6 }}>
        <button className="accent" onClick={trial} disabled={!s.soundOn && !s.ttsOn}>소리 시험</button>
        <button onClick={() => stopAlert()}>멈추기</button>
      </div>
    </Collapse>
  )
}

/** 후원 기록 저장·내보내기, 문제 확인용 로그. 이 PC 밖으로는 나가지 않는다. */
function RecordSection() {
  const [st, setSt] = useState({ saveDonations: true, donationDebug: false })
  const [msg, setMsg] = useState('')
  useEffect(() => {
    api.getSettings().then((s) => setSt({ saveDonations: s.saveDonations !== false, donationDebug: s.donationDebug === true }))
  }, [])
  const flip = (k) => (v) => {
    setSt((p) => ({ ...p, [k]: v }))
    api.setSettings({ [k]: v })
  }
  const exportCsv = async () => {
    const r = await api.donation.exportCsv()
    setMsg(r?.ok ? `${r.count}건을 저장했습니다` : r?.empty ? '저장된 후원 기록이 없습니다' : '')
    setTimeout(() => setMsg(''), 4000)
  }
  return (
    <Collapse id="alert-record" title="후원 기록·문제 확인" defaultOpen={false}>
      <CheckRow label="후원 기록을 파일로 저장" value={st.saveDonations} onChange={flip('saveDonations')} />
      <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5, marginBottom: 6 }}>
        켜 두면 프로그램을 껐다 켜도 후원 리모컨에 기록이 남습니다. 이 PC에만 저장됩니다.
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button onClick={exportCsv} title="엑셀로 열 수 있는 CSV 파일로 저장">후원 기록 내보내기(CSV)</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <div style={{ height: 8 }} />
      <CheckRow label="받은 후원 원본을 로그로 남기기" value={st.donationDebug} onChange={flip('donationDebug')} />
      <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5, marginBottom: 6 }}>
        후원이 이상하게 보이거나 안 뜰 때만 켜세요. 시청자 닉네임·후원 내용이 파일에 들어 있으니, 개발자에게 보낼 때는 내용을 확인하고 보내세요.
      </div>
      <button onClick={() => api.donation.openRaw()}>로그 파일 위치 열기</button>
    </Collapse>
  )
}

/** 후원 알림 칸: 위치·크기는 미리보기에서 끌어 정하고, 여기서는 모양과 보여 줄 후원 종류를 고른다. */
export default function AlertPanel({ layer }) {
  const commit = useStore((s) => s.commit)
  const chzzk = useStore((s) => s.chzzk)
  const s = layer.alert
  const set = (patch, field) => {
    const st = useStore.getState()
    commit(st.layers.map((l) => (l.id === layer.id ? { ...l, alert: normalizeAlert({ ...l.alert, ...patch }) } : l)), { key: `alert:${layer.id}:${field ?? Object.keys(patch).join(',')}` })
  }
  const field = (k) => (v) => set({ [k]: v }, k)
  const toggleKind = (k) => set({ kinds: s.kinds.includes(k) ? s.kinds.filter((x) => x !== k) : [...s.kinds, k] }, 'kinds')

  return (
    <>
      <Collapse id="alert-info" title="후원 알림">
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5, marginBottom: 8 }}>
          이 칸 자리에 연결된 채팅의 후원이 차례로 뜹니다. 위치·크기는 미리보기에서 끌어서 정하세요.
        </div>
        {chzzk?.state === 'connected' && /후원 알림 권한 없음/.test(chzzk.text ?? '') && (
          <div style={{ whiteSpace: 'normal', lineHeight: 1.5, marginBottom: 6, padding: 8, borderRadius: 6, border: '1px solid #ffb020', color: '#ffcf6b' }}>
            치지직 후원이 오지 않는 상태입니다. 치지직 개발자 센터의 내 애플리케이션에서 <b>"후원 조회"</b> 권한을 켠 뒤 치지직을 다시 연결하세요. 채팅은 그대로 보입니다.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button className="accent" style={{ minHeight: 34 }} onClick={() => testAlerts()} title="가짜 후원 5개를 보냅니다. 방송 출력 창을 열어 두면 거기서 확인됩니다">알림 시험</button>
          <button style={{ minHeight: 34 }} onClick={() => api.remote.open()} title="후원 기록을 보고 다시 띄우는 창">후원 리모컨 열기</button>
        </div>
        <div className="muted" style={{ marginTop: 6, whiteSpace: 'normal', lineHeight: 1.5 }}>
          알림은 방송 출력 창에서만 움직입니다.
        </div>
      </Collapse>

      <Collapse id="alert-show" title="보여 줄 후원">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 8 }}>
          {DONATION_KINDS.map((k) => (
            <CheckRow key={k} label={DONATION_LABEL[k]} value={s.kinds.includes(k)} onChange={() => toggleKind(k)} />
          ))}
        </div>
        <SliderRow label="최소 금액" value={s.minAmount} min={0} max={50000} step={500} onChange={field('minAmount')} fmt={(v) => (v ? `${Math.round(v)}` : '없음')} />
        <div className="muted" style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>금액(원·개)이 이 값보다 작으면 알림을 띄우지 않습니다.</div>
      </Collapse>

      <Collapse id="alert-look" title="알림 모양·시간">
        <SelectRow label="배치" value={s.layout} options={ALERT_LAYOUTS.map((m) => [m, ALERT_LAYOUT_LABEL[m]])} onChange={field('layout')} />
        <SelectRow label="나타나는 방식" value={s.anim} options={ALERT_ANIMS.map((m) => [m, ALERT_ANIM_LABEL[m]])} onChange={field('anim')} />
        <SliderRow label="보여 주는 시간" value={s.seconds} min={2} max={30} onChange={field('seconds')} fmt={(v) => `${Math.round(v)}초`} />
        <SliderRow label="글자 크기" value={s.fontScale} min={0.5} max={2.5} step={0.05} onChange={field('fontScale')} fmt={(v) => `${Math.round(v * 100)}%`} />
        <CheckRow label="메시지 보이기" value={s.showMessage} onChange={field('showMessage')} />
      </Collapse>

      <Collapse id="alert-color" title="알림 글꼴·색" defaultOpen={false}>
        <FontSelect value={s.fontFamily} onChange={field('fontFamily')} />
        <CheckRow label="방송 사이트 색 쓰기" value={s.platformColor} onChange={field('platformColor')} />
        {!s.platformColor && <ColorRow label="강조 색" value={s.accentColor} onChange={field('accentColor')} />}
        <ColorRow label="글자 색" value={s.textColor} onChange={field('textColor')} />
        <ColorRow label="배경 색" value={s.bgColor} onChange={field('bgColor')} />
        <SliderRow label="배경 불투명도" value={s.bgOpacity} min={0} max={1} step={0.01} onChange={field('bgOpacity')} fmt={(v) => `${Math.round(v * 100)}%`} />
        <button style={{ marginTop: 4 }} onClick={() => set(defaultAlert())} title="알림 칸의 모든 설정(소리·읽어 주기 포함)을 처음 상태로">알림 설정 모두 초기화</button>
      </Collapse>

      <SoundSection s={s} set={set} field={field} />

      <RecordSection />
    </>
  )
}
