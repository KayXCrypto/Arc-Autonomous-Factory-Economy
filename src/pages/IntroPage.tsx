import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Lock, PackageCheck, ShieldCheck, Star, Scale, ArrowRight, ExternalLink } from 'lucide-react'
import { HREF_APP } from '../router'

const CONTRACT = '0xb100e1cfa8e261956f9c916ff9a96acc4ec2079d'
const EXPLORER = `https://explorer.testnet.arc.io/address/${CONTRACT}`

type Lang = 'vi' | 'en'
const STORAGE_KEY = 'intro-lang'

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45 },
}

const featureIcons = [Bot, Lock, Star, Scale, ShieldCheck, PackageCheck]

const t = {
  vi: {
    openApp: 'Mở ứng dụng',
    badge: 'Máy với máy · Chạy trên Arc Testnet',
    title: 'Nền kinh tế nhà máy tự vận hành',
    subtitle:
      'Agent AI tự lập đơn mua hàng, ký quỹ USDC, nhận hàng và thanh toán — tất cả minh bạch trên blockchain, không cần bên trung gian.',
    start: 'Bắt đầu ngay',
    viewContract: 'Xem hợp đồng',
    facts: [
      { label: 'Mạng', val: 'Arc Testnet' },
      { label: 'Phí nền tảng', val: '1%' },
      { label: 'Hạn khiếu nại', val: '7 ngày' },
      { label: 'Gas', val: 'USDC' },
    ],
    problemTitle: 'Khi máy cần mua hàng, ai đảm bảo hai bên tin nhau?',
    problemText:
      'Mua sắm giữa các máy móc và agent AI thường vướng ba vấn đề: không ai muốn trả tiền trước, không ai muốn giao hàng trước, và không có người để phân xử. Hợp đồng thông minh giữ tiền thay cả hai bên, áp dụng cùng một bộ quy tắc cho mọi đơn và ghi lại uy tín của từng agent.',
    stepsTitle: 'Một đơn hàng đi qua 5 bước',
    steps: [
      { title: 'Tạo đơn mua (PO)', desc: 'Agent AI của bên mua chọn nhà cung cấp, số tiền USDC và hạn chót chấp nhận / giao hàng.' },
      { title: 'Ký quỹ USDC', desc: 'Tiền được khóa trong hợp đồng thông minh — không bên nào tự ý rút được.' },
      { title: 'Nhà cung cấp chấp nhận', desc: 'Phải chấp nhận trước hạn, nếu không bên mua có thể nhận lại tiền.' },
      { title: 'Giao hàng', desc: 'Nhà cung cấp ghi thông tin vận chuyển lên chuỗi.' },
      { title: 'Xác nhận nhận hàng', desc: 'Bên mua xác nhận, USDC được giải phóng cho nhà cung cấp (trừ phí nền tảng 1%).' },
    ],
    featuresTitle: 'Vì sao đáng tin cậy',
    features: [
      { title: 'Máy tự mua hàng', desc: 'Agent AI tự tạo đơn khi phát hiện thiếu vật tư, không cần con người can thiệp từng bước.' },
      { title: 'Ký quỹ bằng USDC', desc: 'Tiền ổn định, khóa trong escrow và chỉ được giải phóng theo quy tắc của hợp đồng.' },
      { title: 'Điểm uy tín onchain', desc: 'Điểm 0–1000 tính từ tỷ lệ đơn hoàn thành, công khai và không thể chỉnh sửa.' },
      { title: 'Tranh chấp công bằng', desc: 'Bên mua có thể khiếu nại sau khi giao hàng; bên xác minh phân xử, hoặc tự hoàn tiền sau 7 ngày.' },
      { title: 'Chống kẹt tiền', desc: 'Quá hạn chấp nhận hoặc giao hàng, bên mua tự rút lại tiền. Quá hạn xác nhận 3 ngày, nhà cung cấp tự nhận tiền.' },
      { title: 'Minh bạch từng bước', desc: 'Mọi trạng thái đơn hàng đều là sự kiện onchain, kiểm chứng được trên explorer.' },
    ],
    ctaTitle: 'Sẵn sàng thử một đơn hàng?',
    ctaText: 'Kết nối ví, lấy USDC thử nghiệm và tạo Purchase Order đầu tiên trên Arc Testnet.',
    footer: 'Hợp đồng',
    footerNote: 'Chỉ dùng cho thử nghiệm',
  },
  en: {
    openApp: 'Open app',
    badge: 'Machine-to-machine · Live on Arc Testnet',
    title: 'The autonomous factory economy',
    subtitle:
      'AI agents create purchase orders, escrow USDC, receive goods and settle payment on their own — fully transparent onchain, with no middleman.',
    start: 'Get started',
    viewContract: 'View contract',
    facts: [
      { label: 'Network', val: 'Arc Testnet' },
      { label: 'Platform fee', val: '1%' },
      { label: 'Dispute window', val: '7 days' },
      { label: 'Gas', val: 'USDC' },
    ],
    problemTitle: 'When machines buy from machines, who makes sure both sides can trust each other?',
    problemText:
      'Procurement between machines and AI agents hits three problems: nobody wants to pay first, nobody wants to ship first, and there is no one to arbitrate. A smart contract holds the funds for both sides, applies the same rules to every order, and records each agent’s reputation.',
    stepsTitle: 'An order goes through 5 steps',
    steps: [
      { title: 'Create a PO', desc: 'The buyer’s AI agent picks a supplier, a USDC amount and accept / delivery deadlines.' },
      { title: 'Escrow USDC', desc: 'Funds are locked in the smart contract — neither side can withdraw them unilaterally.' },
      { title: 'Supplier accepts', desc: 'Must accept before the deadline, otherwise the buyer can reclaim the funds.' },
      { title: 'Ship goods', desc: 'The supplier records shipping and tracking info onchain.' },
      { title: 'Confirm delivery', desc: 'The buyer confirms and USDC is released to the supplier, minus the 1% platform fee.' },
    ],
    featuresTitle: 'Why it can be trusted',
    features: [
      { title: 'Machines that buy', desc: 'AI agents create orders themselves when they detect a shortage, with no human in every step.' },
      { title: 'USDC escrow', desc: 'Stable value, locked in escrow and only released according to the contract’s rules.' },
      { title: 'Onchain reputation', desc: 'A 0–1000 score based on the completion rate of orders, public and tamper-proof.' },
      { title: 'Fair disputes', desc: 'Buyers can dispute after shipping; a verifier arbitrates, or the buyer is refunded after 7 days.' },
      { title: 'No stuck funds', desc: 'If the accept or delivery deadline passes, the buyer reclaims funds. If the buyer stays silent 3 days past the deadline, the supplier claims payment.' },
      { title: 'Transparent at every step', desc: 'Every order state change is an onchain event you can verify on the explorer.' },
    ],
    ctaTitle: 'Ready to try an order?',
    ctaText: 'Connect your wallet, get test USDC and create your first Purchase Order on Arc Testnet.',
    footer: 'Contract',
    footerNote: 'For testing only',
  },
} as const

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'vi' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

export default function IntroPage() {
  const [lang, setLang] = useState<Lang>(initialLang)
  const c = t[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang])

  return (
    <div className="min-h-dvh bg-[var(--bg-gradient)] text-[var(--ink)]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[#0d1b2f]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <span className="display text-sm font-600 tracking-tight">Autonomous Factory</span>
          <div className="flex items-center gap-3">
            <div role="group" aria-label="Language" className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
              {(['vi', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`px-3 py-1.5 font-600 transition-colors ${
                    lang === l ? 'bg-[var(--accent)] text-[#0d1b2f]' : 'text-[var(--muted)] hover:bg-white/5'
                  }`}
                >
                  {l === 'vi' ? 'Tiếng Việt' : 'English'}
                </button>
              ))}
            </div>
            <a
              href={HREF_APP}
              className="hidden sm:block px-4 py-1.5 rounded-lg bg-[var(--accent)] text-[#0d1b2f] text-sm font-700 hover:bg-[var(--accent-hover)] transition-colors"
            >
              {c.openApp}
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="py-16 sm:py-24 text-center">
          <motion.div {...fade}>
            <span className="inline-block text-xs px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 font-medium">
              {c.badge}
            </span>
            <h1 className="display text-4xl sm:text-6xl font-700 tracking-tight mt-5 text-balance">{c.title}</h1>
            <p className="text-base sm:text-lg text-[var(--muted)] mt-5 max-w-2xl mx-auto text-pretty">{c.subtitle}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={HREF_APP}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-[#0d1b2f] font-700 hover:bg-[var(--accent-hover)] transition-colors"
              >
                {c.start} <ArrowRight size={16} />
              </a>
              <a
                href={EXPLORER}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-strong)] text-[var(--ink-2)] hover:bg-white/5 transition-colors"
              >
                {c.viewContract} <ExternalLink size={14} />
              </a>
            </div>
          </motion.div>

          <motion.div {...fade} className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {c.facts.map(f => (
              <div key={f.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--subtle)]">{f.label}</p>
                <p className="display text-lg font-700 mt-0.5">{f.val}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Problem / idea */}
        <section className="py-12 grid md:grid-cols-2 gap-8 items-center">
          <motion.h2 {...fade} className="display text-2xl sm:text-3xl font-700 tracking-tight text-balance">
            {c.problemTitle}
          </motion.h2>
          <motion.p {...fade} className="text-[var(--muted)] text-pretty">
            {c.problemText}
          </motion.p>
        </section>

        {/* How it works */}
        <section className="py-12">
          <motion.h2 {...fade} className="display text-2xl sm:text-3xl font-700 tracking-tight text-center">
            {c.stepsTitle}
          </motion.h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {c.steps.map((s, i) => (
              <motion.div
                key={s.title}
                {...fade}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-xs font-700">
                  {i + 1}
                </span>
                <h3 className="display text-sm font-700 mt-3">{s.title}</h3>
                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <motion.h2 {...fade} className="display text-2xl sm:text-3xl font-700 tracking-tight text-center">
            {c.featuresTitle}
          </motion.h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.features.map((f, i) => {
              const Icon = featureIcons[i]
              return (
                <motion.div key={f.title} {...fade} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
                    <Icon size={18} />
                  </div>
                  <h3 className="display text-base font-700 mt-4">{f.title}</h3>
                  <p className="text-sm text-[var(--muted)] mt-1.5 text-pretty">{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <motion.div {...fade} className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-8 sm:p-12 text-center">
            <h2 className="display text-2xl sm:text-3xl font-700 tracking-tight">{c.ctaTitle}</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-md mx-auto">{c.ctaText}</p>
            <a
              href={HREF_APP}
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-[var(--accent)] text-[#0d1b2f] font-700 hover:bg-[var(--accent-hover)] transition-colors"
            >
              {c.openApp} <ArrowRight size={16} />
            </a>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--subtle)]">
        {c.footer} <span className="mono">{CONTRACT.slice(0, 8)}…{CONTRACT.slice(-4)}</span> · Arc Testnet (5042002) · {c.footerNote}
      </footer>
    </div>
  )
}
