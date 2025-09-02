import React, { useState, useMemo, useRef } from "react";
import QRCode from "react-qr-code";
import { Heart } from "lucide-react";

const DEFAULT_CONFIG = {
  bride: "Maitsa",
  groom: "Hipzi",
  date: "2025-12-14T09:00",
  venue: "Green Hunian Surya Mas",
  address: "Jl. Surya Mas Raya, Banjarmasin",
  maps: "https://maps.google.com/",
  wa: "628123456789",
  bank: "BCA 123456789 a.n Hipzi",
  note: "Terima kasih atas doa dan hadiahnya 🙏",
};

export default function App() {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("inv_config");
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });
  const [tab, setTab] = useState("preview");

  // cek admin dari URL
  const isAdmin = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.has("admin");
  }, []);

  // nama tamu dari URL
  const guestName = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("to") || "";
  }, []);

  // countdown
  const cd = useMemo(() => {
    const diff = new Date(config.date) - new Date();
    if (diff <= 0) return "Acara telah dimulai";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    return `${d} hari ${h} jam ${m} menit lagi`;
  }, [config.date]);

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-6">
      {/* Header */}
      <header className="w-full max-w-3xl flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <Heart className="text-rose-500" />
          <span className="font-semibold">Undangan Online</span>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setTab("preview")}
              className={`px-3 py-1 rounded ${
                tab === "preview" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setTab("editor")}
              className={`px-3 py-1 rounded ${
                tab === "editor" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Editor
            </button>
          </div>
        )}
      </header>

      {/* Konten */}
      <main className="w-full max-w-3xl bg-white rounded-xl shadow p-6">
        {isAdmin && tab === "editor" ? (
          <Editor config={config} setConfig={setConfig} />
        ) : (
          <Preview config={config} cd={cd} guestName={guestName} />
        )}
      </main>
    </div>
  );
}

function Preview({ config, cd, guestName }) {
  return (
    <div className="space-y-6 text-center">
      {guestName && (
        <p className="italic text-gray-600">
          Kepada Yth: <b>{guestName}</b>
        </p>
      )}
      <h1 className="text-3xl font-bold text-rose-600">
        {config.groom} & {config.bride}
      </h1>
      <p className="text-gray-700">{cd}</p>
      <p className="text-lg">
        <b>{config.date}</b>
      </p>
      <p>
        {config.venue}, {config.address}
      </p>
      <a
        href={config.maps}
        target="_blank"
        className="inline-block mt-2 text-blue-600 underline"
      >
        Lihat Maps
      </a>
      <p className="mt-4">{config.note}</p>
      <p className="mt-4 font-semibold">Hadiah / Transfer:</p>
      <p>{config.bank}</p>
      <div className="flex justify-center mt-4">
        <QRCode value={window.location.href} size={120} />
      </div>
    </div>
  );
}

function Editor({ config, setConfig }) {
  const update = (field, value) =>
    setConfig((c) => {
      const newCfg = { ...c, [field]: value };
      localStorage.setItem("inv_config", JSON.stringify(newCfg));
      return newCfg;
    });

  return (
    <div className="space-y-4 text-left">
      {Object.entries(config).map(([key, val]) => (
        <div key={key}>
          <label className="block font-semibold">{key}</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={val}
            onChange={(e) => update(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
