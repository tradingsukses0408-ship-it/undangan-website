import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Calendar, Copy, Heart, MapPin, Music, Pause, Phone, Send, Share2, Gift, Download, Image as ImageIcon, MessageCircle, Clock } from "lucide-react";

const formatDateLong = (iso, locale = "id-ID") => {
  try {
    return new Date(iso).toLocaleString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

const countdownTo = (dateIso) => {
  const t = new Date(dateIso).getTime() - Date.now();
  if (Number.isNaN(t)) return { d: 0, h: 0, m: 0, s: 0 };
  const d = Math.max(0, Math.floor(t / (1000 * 60 * 60 * 24)));
  const h = Math.max(0, Math.floor((t / (1000 * 60 * 60)) % 24));
  const m = Math.max(0, Math.floor((t / (1000 * 60)) % 60));
  const s = Math.max(0, Math.floor((t / 1000) % 60));
  return { d, h, m, s };
};

const toICS = ({ title, description, startIso, endIso, location }) => {
  const dt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Undangan Online//ID",
    "BEGIN:VEVENT",
    `UID:${crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}@undangan.local`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(startIso)}`,
    endIso ? `DTEND:${dt(endIso)}` : null,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, "\\n")}` : null,
    location ? `LOCATION:${location}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\n");
  return new Blob([body], { type: "text/calendar;charset=utf-8" });
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    alert("Tersalin ke clipboard ✨");
  } catch (e) {
    console.warn(e);
  }
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const THEMES = {
  classic: {
    name: "Classic",
    bg: "bg-gradient-to-b from-rose-50 via-white to-rose-50",
    card: "bg-white/80 backdrop-blur border border-rose-100",
    ring: "ring-rose-200",
    accent: "text-rose-600",
    btn: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  minimal: {
    name: "Minimal",
    bg: "bg-gradient-to-b from-slate-50 via-white to-slate-50",
    card: "bg-white/70 backdrop-blur border border-slate-100",
    ring: "ring-slate-200",
    accent: "text-slate-800",
    btn: "bg-slate-900 hover:bg-slate-800 text-white",
  },
  night: {
    name: "Night",
    bg: "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100",
    card: "bg-white/10 backdrop-blur border border-white/20",
    ring: "ring-slate-600",
    accent: "text-rose-300",
    btn: "bg-rose-500 hover:bg-rose-600 text-white",
  },
  floral: {
    name: "Floral",
    bg: "bg-gradient-to-b from-emerald-50 via-white to-emerald-50",
    card: "bg-white/80 backdrop-blur border border-emerald-100",
    ring: "ring-emerald-200",
    accent: "text-emerald-700",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
};

const DEFAULT_CONFIG = {
  slug: "hipzi-ayu-2025",
  couple: { a: "Hipzi", b: "Ayu" },
  quote: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan untukmu pasangan-pasangan dari jenismu sendiri... (QS. Ar-Rum: 21)",
  dateStartIso: "2025-12-14T09:00:00+08:00",
  dateEndIso: "2025-12-14T11:00:00+08:00",
  venue: {
    name: "Green Hunian Surya Mas",
    address: "Jl. Benua Anyar, Banjarmasin",
    mapsUrl: "https://maps.google.com/?q=Green+Hunian+Surya+Mas",
  },
  contact: { whatsapp: "+6285158553831" },
  gift: {
    bank: "BCA",
    accountName: "Hipziannor Anshari",
    accountNumber: "1234567890",
    note: "Terima kasih atas doa dan hadiahnya. 🙏",
    emoneyLink: "https://link.dana.id/standin",
  },
  gallery: [
    "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520975922284-8b456906c813?q=80&w=1200&auto=format&fit=crop",
  ],
  theme: "classic",
  musicUrl: "https://cdn.pixabay.com/audio/2022/03/10/audio_74d3f9b1b5.mp3",
  webhookUrl: "",
};

export default function WeddingInvitation() {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("inv_config");
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });
  const [tab, setTab] = useState("preview");
  const [guestName, setGuestName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const to = url.searchParams.get("to");
    if (to) setGuestName(decodeURIComponent(to));
  }, []);

  useEffect(() => {
    localStorage.setItem("inv_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    let t;
    const sync = () => setTick(Date.now());
    t = setInterval(sync, 1000);
    return () => clearInterval(t);
  }, []);
  const [, setTick] = useState(Date.now());

  const theme = THEMES[config.theme] || THEMES.classic;
  const cd = countdownTo(config.dateStartIso);

  const shareLinkFor = (name) => {
    const base = window.location.href.split("?")[0];
    return `${base}?to=${encodeURIComponent(name)}`;
  };

  const doShare = async () => {
    const url = shareLinkFor(guestName || "Sahabat");
    const title = `${config.couple.a} & ${config.couple.b} | Undangan`;
    const text = `Halo ${guestName || "Sahabat"}, kami mengundang ke pernikahan kami pada ${formatDateLong(config.dateStartIso)} di ${config.venue.name}.`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch {}
    } else {
      copyText(url);
    }
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${config.slug || "undangan"}.json`);
  };

  const downloadICS = () => {
    const ics = toICS({
      title: `${config.couple.a} & ${config.couple.b} – Akad & Resepsi`,
      description: `Undangan pernikahan ${config.couple.a} & ${config.couple.b}`,
      startIso: config.dateStartIso,
      endIso: config.dateEndIso,
      location: `${config.venue.name}, ${config.venue.address}`,
    });
    downloadBlob(ics, `${config.slug || "undangan"}.ics`);
  };

  const handleRSVP = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.guests = Number(payload.guests || 1);
    payload.timestamp = new Date().toISOString();
    const list = JSON.parse(localStorage.getItem("inv_rsvp") || "[]");
    list.push(payload);
    localStorage.setItem("inv_rsvp", JSON.stringify(list));

    if (config.webhookUrl) {
      try { await fetch(config.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "rsvp", data: payload, slug: config.slug }) }); } catch {}
    }
    alert("Terima kasih! RSVP kamu sudah terekam.");
    e.currentTarget.reset();
  };

  const handleGuestbook = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.timestamp = new Date().toISOString();
    const list = JSON.parse(localStorage.getItem("inv_guestbook") || "[]");
    list.unshift(payload);
    localStorage.setItem("inv_guestbook", JSON.stringify(list));

    if (config.webhookUrl) {
      try { await fetch(config.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "guestbook", data: payload, slug: config.slug }) }); } catch {}
    }
    e.currentTarget.reset();
  };

  const ImportedFile = () => (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          try { setConfig((c) => ({ ...c, ...JSON.parse(text) })); } catch { alert("File tidak valid"); }
        }}
      />
      <span className={`px-3 py-2 rounded-xl border ${theme.ring} ${theme.card}`}>Import Config JSON</span>
    </label>
  );

  const AudioControl = () => (
    <button
      onClick={() => {
        if (!audioRef.current) return;
        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
        else { audioRef.current.play(); setIsPlaying(true); }
      }}
      className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg border ${theme.ring} ${theme.btn}`}
      aria-label="Toggle music"
    >
      {isPlaying ? <Pause size={18} /> : <Music size={18} />}
    </button>
  );

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-500`}>
      <header className="sticky top-0 z-50 backdrop-blur bg-white/40 dark:bg-black/30 border-b border-white/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="text-rose-500" />
            <span className="font-semibold">Undangan Online</span>
            <span className="opacity-60 text-sm">by kamu ✨</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <select
              value={config.theme}
              onChange={(e) => setConfig((c) => ({ ...c, theme: e.target.value }))}
              className="px-3 py-2 rounded-xl border bg-white/80"
            >
              {Object.entries(THEMES).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
            <button onClick={() => setTab("preview")} className={`px-3 py-2 rounded-xl border ${tab === "preview" ? "bg-black text-white" : "bg-white"}`}>Preview</button>
            <button onClick={() => setTab("editor")} className={`px-3 py-2 rounded-xl border ${tab === "editor" ? "bg-black text-white" : "bg-white"}`}>Editor</button>
          </div>
        </div>
      </header>

      {tab === "editor" ? (
        <Editor config={config} setConfig={setConfig} theme={theme} exportConfig={exportConfig} downloadICS={downloadICS} ImportedFile={ImportedFile} />
      ) : (
        <Preview config={config} theme={theme} cd={cd} guestName={guestName} setGuestName={setGuestName} doShare={doShare} shareLinkFor={shareLinkFor} downloadICS={downloadICS} />
      )}

      <audio ref={audioRef} src={config.musicUrl} loop preload="none" />
      <AudioControl />

      <footer className="py-10 text-center opacity-60 text-sm">
        <p>© {new Date().getFullYear()} {config.couple.a} & {config.couple.b}. Dibuat dengan ❤️. Bisa dijual sebagai produk digital.</p>
      </footer>
    </div>
  );
}

function Hero({ config, theme, guestName, cd, downloadICS }) {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className={`rounded-3xl p-8 md:p-12 shadow-sm ${theme.card}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <p className={`uppercase tracking-widest text-xs opacity-70`}>Undangan Pernikahan</p>
              <h1 className={`text-4xl md:text-6xl font-extrabold ${theme.accent}`}>{config.couple.a} <span className="opacity-40">&</span> {config.couple.b}</h1>
              <p className="text-lg opacity-80">{config.quote}</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/70"><Calendar size={16}/> {formatDateLong(config.dateStartIso)}</span>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/70"><MapPin size={16}/> {config.venue.name}</span>
              </div>
              <div className="flex gap-2 flex-wrap pt-2">
                <button onClick={downloadICS} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${theme.btn}`}><Download size={16}/> Simpan ke Kalender</button>
                <a href={config.venue.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/70"><MapPin size={16}/> Lihat Peta</a>
              </div>
              {guestName && (
                <p className="mt-2 text-sm opacity-75">Kepada Yth: <span className="font-semibold">{guestName}</span></p>
              )}
            </div>
            <div className="w-full md:w-72">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Hari", val: cd.d },
                  { label: "Jam", val: cd.h },
                  { label: "Menit", val: cd.m },
                  { label: "Detik", val: cd.s },
                ].map((x) => (
                  <div key={x.label} className={`rounded-2xl p-3 border ${theme.ring} bg-white/70`}>
                    <div className="text-2xl font-bold">{x.val}</div>
                    <div className="text-xs opacity-70">{x.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm opacity-80"><Clock size={16}/> Menuju acara</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function About({ config, theme }) {
  return (
    <section>
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className={`rounded-3xl p-8 shadow-sm ${theme.card}`}>
          <h2 className="text-2xl font-bold mb-2">Dengan memohon rahmat Allah</h2>
          <p className="opacity-80">Kami bermaksud menyelenggarakan akad & resepsi pernikahan. Merupakan kehormatan bagi kami apabila <span className="font-semibold">Bapak/Ibu/Saudara/i</span> berkenan hadir.</p>
        </div>
      </div>
    </section>
  );
}

function Gallery({ config, theme }) {
  return (
    <section>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ImageIcon size={20}/> Galeri</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {config.gallery?.map((src, i) => (
            <img key={i} src={src} alt={`gallery-${i}`} className="w-full h-48 object-cover rounded-2xl border"/>
          ))}
        </div>
      </div>
    </section>
  );
}

function RSVP({ config, theme, onSubmit }) {
  return (
    <section>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Send size={20}/> RSVP Kehadiran</h2>
        <form onSubmit={onSubmit} className={`grid md:grid-cols-3 gap-3 rounded-2xl p-4 ${theme.card}`}>
          <input name="name" required placeholder="Nama" className="px-4 py-2 rounded-xl border"/>
          <select name="status" className="px-4 py-2 rounded-xl border">
            <option value="Hadir">Hadir</option>
            <option value="Tidak Hadir">Tidak Hadir</option>
            <option value="Ragu">Ragu</option>
          </select>
          <input name="guests" type="number" min="1" defaultValue="1" className="px-4 py-2 rounded-xl border"/>
          <input name="phone" placeholder="No. WhatsApp (opsional)" className="px-4 py-2 rounded-xl border md:col-span-2"/>
          <input name="note" placeholder="Ucapan untuk pasangan (opsional)" className="px-4 py-2 rounded-xl border md:col-span-3"/>
          <button className={`px-4 py-2 rounded-xl ${theme.btn} md:col-span-3`}>Kirim RSVP</button>
        </form>
      </div>
    </section>
  );
}

function GiftSection({ config, theme }) {
  const bankStr = `${config.gift.bank} • a.n. ${config.gift.accountName} • ${config.gift.accountNumber}`;
  return (
    <section>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Gift size={20}/> Kirim Hadiah</h2>
        <div className={`rounded-2xl p-6 space-y-3 ${theme.card}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-2 rounded-xl border bg-white/70">{bankStr}</div>
            <button onClick={() => copyText(bankStr)} className={`px-3 py-2 rounded-xl ${theme.btn} inline-flex items-center gap-2`}><Copy size={16}/> Salin</button>
          </div>
          {config.gift.emoneyLink && (
            <a href={config.gift.emoneyLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/70">Link e-Money</a>
          )}
          <p className="opacity-80 text-sm">{config.gift.note}</p>
        </div>
      </div>
    </section>
  );
}

function MapCard({ config, theme }) {
  return (
    <section>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><MapPin size={20}/> Lokasi</h2>
        <div className={`rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 ${theme.card}`}>
          <div className="flex-1">
            <div className="font-semibold">{config.venue.name}</div>
            <div className="opacity-80">{config.venue.address}</div>
            <div className="mt-3 flex gap-2">
              <a href={config.venue.mapsUrl} target="_blank" rel="noreferrer" className={`px-4 py-2 rounded-xl ${theme.btn} inline-flex items-center gap-2`}><MapPin size={16}/> Buka Maps</a>
              <button onClick={() => copyText(config.venue.mapsUrl)} className="px-4 py-2 rounded-xl border bg-white/70 inline-flex items-center gap-2"><Copy size={16}/> Salin Link</button>
            </div>
          </div>
          <div className="w-40 md:w-48">
            <QRCode value={config.venue.mapsUrl || "https://maps.google.com"} className="w-full h-auto"/>
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact({ config, theme }) {
  const wa = config.contact?.whatsapp?.replace(/[^0-9+]/g, "");
  const waLink = wa ? `https://wa.me/${wa.replace(/^\+/, "")}` : "#";
  return (
    <section>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className={`rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 ${theme.card}`}>
          <div className="text-sm opacity-80">Pertanyaan? Hubungi kami via WhatsApp.</div>
          <a href={waLink} target="_blank" rel="noreferrer" className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 ${theme.btn}`}><Phone size={16}/> Chat Panitia</a>
        </div>
      </div>
    </section>
  );
}

function Guestbook({ theme, onSubmit }) {
  const messages = useMemo(() => JSON.parse(localStorage.getItem("inv_guestbook") || "[]"), []);
  return (
    <section>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><MessageCircle size={20}/> Buku Tamu</h2>
        <form onSubmit={onSubmit} className={`rounded-2xl p-4 grid md:grid-cols-3 gap-3 ${theme.card}`}>
          <input name="name" required placeholder="Nama" className="px-4 py-2 rounded-xl border"/>
          <input name="city" placeholder="Kota (opsional)" className="px-4 py-2 rounded-xl border"/>
          <input name="wish" required placeholder="Ucapan & doa" className="px-4 py-2 rounded-xl border md:col-span-2"/>
          <button className={`px-4 py-2 rounded-xl ${theme.btn}`}>Kirim Ucapan</button>
        </form>
        <div className="mt-4 grid gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`rounded-2xl p-4 border ${theme.ring} bg-white/70`}>
              <div className="font-semibold">{m.name} {m.city ? <span className="opacity-60 text-sm">• {m.city}</span> : null}</div>
              <div className="opacity-80">{m.wish}</div>
            </div>
          ))}
          {messages.length === 0 && <div className="opacity-60">Belum ada ucapan. Jadilah yang pertama! ✨</div>}
        </div>
      </div>
    </section>
  );
}

function ShareStrip({ theme, guestName, doShare, link }) {
  return (
    <div className={`max-w-5xl mx-auto px-4 pb-8`}>
      <div className={`rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 ${theme.card}`}>
        <div className="text-sm opacity-80">Bagikan undangan untuk <span className="font-semibold">{guestName || "Sahabat"}</span></div>
        <div className="flex gap-2">
          <button onClick={doShare} className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 ${theme.btn}`}><Share2 size={16}/> Bagikan</button>
          <button onClick={() => copyText(link)} className="px-4 py-2 rounded-xl border bg-white/70 inline-flex items-center gap-2"><Copy size={16}/> Salin Link</button>
        </div>
      </div>
    </div>
  );
}

function Preview({ config, theme, cd, guestName, setGuestName, doShare, shareLinkFor, downloadICS }) {
  const link = typeof window !== "undefined" ? shareLinkFor(guestName || "Sahabat") : "";
  return (
    <main>
      <Hero config={config} theme={theme} guestName={guestName} cd={cd} downloadICS={downloadICS} />
      <About config={config} theme={theme} />
      <Gallery config={config} theme={theme} />
      <RSVP config={config} theme={theme} onSubmit={handleRSVPWrapper} />
      <GiftSection config={config} theme={theme} />
      <MapCard config={config} theme={theme} />
      <Guestbook theme={theme} onSubmit={handleGuestbookWrapper} />
      <ShareStrip theme={theme} guestName={guestName} doShare={doShare} link={link} />
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <div className={`rounded-2xl p-4 ${theme.card} flex flex-col md:flex-row items-center gap-3`}>
          <div className="flex-1">
            <div className="text-sm opacity-70">Buat link undangan personal</div>
            <input value={guestName} onChange={(e)=>setGuestName(e.target.value)} placeholder="Nama tamu (cth: Pak Duha)" className="mt-1 w-full px-4 py-2 rounded-xl border"/>
          </div>
          <button onClick={()=>copyText(link)} className={`px-4 py-2 rounded-xl ${theme.btn} inline-flex items-center gap-2`}><Share2 size={16}/> Salin Link</button>
        </div>
      </div>
    </main>
  );

  function handleRSVPWrapper(e){
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.guests = Number(payload.guests || 1);
    payload.timestamp = new Date().toISOString();
    const list = JSON.parse(localStorage.getItem("inv_rsvp") || "[]");
    list.push(payload);
    localStorage.setItem("inv_rsvp", JSON.stringify(list));
    if (config.webhookUrl) {
      fetch(config.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "rsvp", data: payload, slug: config.slug }) }).catch(()=>{});
    }
    alert("Terima kasih! RSVP kamu sudah terekam.");
    e.currentTarget.reset();
  }
  function handleGuestbookWrapper(e){
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.timestamp = new Date().toISOString();
    const list = JSON.parse(localStorage.getItem("inv_guestbook") || "[]");
    list.unshift(payload);
    localStorage.setItem("inv_guestbook", JSON.stringify(list));
    if (config.webhookUrl) {
      fetch(config.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "guestbook", data: payload, slug: config.slug }) }).catch(()=>{});
    }
    (e.currentTarget).reset();
  }
}

function Editor({ config, setConfig, theme, exportConfig, downloadICS, ImportedFile }){
  const [local, setLocal] = useState(config);
  useEffect(()=>setLocal(config), [config]);

  const update = (path, value) => {
    setLocal((l)=> {
      const obj = JSON.parse(JSON.stringify(l));
      const keys = path.split(".");
      let cur = obj;
      while (keys.length > 1) cur = cur[keys.shift()];
      cur[keys[0]] = value;
      return obj;
    });
  };
  const save = () => setConfig(local);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className={`rounded-3xl p-6 space-y-6 ${theme.card}`}>
        <h2 className="text-2xl font-bold">Editor Konfigurasi</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Slug / Kode Undangan"><input value={local.slug} onChange={(e)=>update("slug", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Tema">
            <select value={local.theme} onChange={(e)=>update("theme", e.target.value)} className="px-3 py-2 rounded-xl border w-full">
              {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Nama Mempelai A"><input value={local.couple.a} onChange={(e)=>update("couple.a", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Nama Mempelai B"><input value={local.couple.b} onChange={(e)=>update("couple.b", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Kutipan"><textarea value={local.quote} onChange={(e)=>update("quote", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Mulai (ISO)"><input value={local.dateStartIso} onChange={(e)=>update("dateStartIso", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Selesai (ISO)"><input value={local.dateEndIso} onChange={(e)=>update("dateEndIso", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Tempat"><input value={local.venue.name} onChange={(e)=>update("venue.name", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Alamat"><input value={local.venue.address} onChange={(e)=>update("venue.address", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Link Google Maps"><input value={local.venue.mapsUrl} onChange={(e)=>update("venue.mapsUrl", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="WhatsApp Panitia"><input value={local.contact.whatsapp} onChange={(e)=>update("contact.whatsapp", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Musik (URL MP3)"><input value={local.musicUrl} onChange={(e)=>update("musicUrl", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Bank"><input value={local.gift.bank} onChange={(e)=>update("gift.bank", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Nama Rekening"><input value={local.gift.accountName} onChange={(e)=>update("gift.accountName", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="No. Rekening"><input value={local.gift.accountNumber} onChange={(e)=>update("gift.accountNumber", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Link e-Money (opsional)"><input value={local.gift.emoneyLink} onChange={(e)=>update("gift.emoneyLink", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
          <Field label="Catatan"><input value={local.gift.note} onChange={(e)=>update("gift.note", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/></Field>
        </div>

        <Field label="Galeri (maks 6, pisah baris)">
          <textarea value={(local.gallery||[]).join("\n")} onChange={(e)=>update("gallery", e.target.value.split(/\n+/).filter(Boolean).slice(0,6))} className="px-3 py-2 rounded-xl border w-full min-h-[120px]"/>
        </Field>

        <Field label="Webhook URL (opsional, untuk terima RSVP/Guestbook via POST JSON)">
          <input value={local.webhookUrl} onChange={(e)=>update("webhookUrl", e.target.value)} className="px-3 py-2 rounded-xl border w-full"/>
        </Field>

        <div className="flex flex-wrap gap-2">
          <button onClick={save} className={`px-4 py-2 rounded-xl ${theme.btn}`}>Simpan Perubahan</button>
          <button onClick={exportConfig} className="px-4 py-2 rounded-xl border bg-white/70 inline-flex items-center gap-2"><Download size={16}/> Export Config</button>
          <button onClick={downloadICS} className="px-4 py-2 rounded-xl border bg-white/70 inline-flex items-center gap-2"><Calendar size={16}/> Export .ICS</button>
          <ImportedFile />
        </div>
        <p className="text-sm opacity-70">Tip jualan: bikin beberapa tema, lalu tawarkan paket Custom Nama + Tanggal + Galeri + Musik + QR Maps + Link RSVP. File config bisa kamu kirim ke klien untuk diimport.</p>
      </div>
    </div>
  );
}

function Field({ label, children }){
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium opacity-80">{label}</div>
      {children}
    </label>
  );
}
