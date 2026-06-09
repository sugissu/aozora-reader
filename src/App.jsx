import { useState, useEffect, useRef, useCallback } from "react";

// ── ローカルストレージキー ──
const LS_BOOKS = "aozora_books";
const LS_PROGRESS = "aozora_progress";

function loadBooks() {
  try { return JSON.parse(localStorage.getItem(LS_BOOKS)) || []; } catch { return []; }
}
function saveBooks(books) {
  localStorage.setItem(LS_BOOKS, JSON.stringify(books));
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(LS_PROGRESS)) || {}; } catch { return {}; }
}
function saveProgress(prog) {
  localStorage.setItem(LS_PROGRESS, JSON.stringify(prog));
}

// ── チャプター検出 ──
function detectChapters(text) {
  const lines = text.split("\n");
  const chapters = [];
  const patterns = [
    /^第[一二三四五六七八九十百千\d]+[章節話回]/,
    /^[一二三四五六七八九十]+[、。\s]/,
    /^\d+[\.、\s]/,
    /^【.+】/,
    /^［.+］/,
    /^＜.+＞/,
  ];
  let charOffset = 0;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed && patterns.some(p => p.test(trimmed))) {
      chapters.push({ title: trimmed.slice(0, 30), lineIndex: i, charOffset });
    }
    charOffset += line.length + 1;
  });
  if (chapters.length === 0) {
    // チャプターなし→全体を1チャプターとして扱う
    chapters.push({ title: "全文", lineIndex: 0, charOffset: 0 });
  }
  return chapters;
}

// ── 文節分割（読み上げ単位） ──
function splitSentences(text) {
  return text.match(/[^。！？\n]+[。！？\n]?/g) || [text];
}

// ── カラーパレット ──
const C = {
  bg: "#F9F6EF",
  paper: "#FFFDF7",
  ink: "#2A1F14",
  inkLight: "#6B5A4A",
  accent: "#8B5E3C",
  accentLight: "#C4956A",
  highlight: "#FFE5B4",
  border: "#DDD3C4",
  chip: "#EDE4D6",
};

const styles = {
  root: {
    fontFamily: "'Noto Serif JP', 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif",
    background: C.bg,
    minHeight: "100vh",
    color: C.ink,
  },
  header: {
    background: C.paper,
    borderBottom: `2px solid ${C.accent}`,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: C.accent,
    letterSpacing: "0.05em",
    margin: 0,
    flex: 1,
  },
  btn: {
    background: C.accent,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnOutline: {
    background: "transparent",
    color: C.accent,
    border: `1.5px solid ${C.accent}`,
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnSmall: {
    background: C.chip,
    color: C.ink,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    padding: "5px 10px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  card: {
    background: C.paper,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    cursor: "pointer",
    transition: "box-shadow 0.15s",
  },
  input: {
    width: "100%",
    background: C.paper,
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 15,
    color: C.ink,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    background: C.paper,
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: C.ink,
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "vertical",
    lineHeight: 1.8,
  },
  label: {
    fontSize: 13,
    color: C.inkLight,
    marginBottom: 4,
    display: "block",
  },
};

// ════════════════════════════════
// 本棚画面
// ════════════════════════════════
function BookshelfScreen({ books, onSelect, onAdd, onDelete }) {
  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: C.accent }}>📚 本棚</h2>
        <button style={styles.btn} onClick={onAdd}>＋ 追加</button>
      </div>
      {books.length === 0 && (
        <div style={{ textAlign: "center", color: C.inkLight, padding: "40px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
          <div>本がありません。「追加」からテキストを登録してください。</div>
        </div>
      )}
      {books.map(book => (
        <div key={book.id} style={styles.card} onClick={() => onSelect(book)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{book.title}</div>
              <div style={{ fontSize: 12, color: C.inkLight }}>
                {book.text.length.toLocaleString()} 文字 ／ 登録日: {book.addedAt}
              </div>
            </div>
            <button
              style={{ ...styles.btnSmall, color: "#c0392b", background: "#fff0f0", border: "1px solid #ffc8c8" }}
              onClick={e => { e.stopPropagation(); onDelete(book.id); }}
            >削除</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════
// テキスト入力画面
// ════════════════════════════════
function AddBookScreen({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const handleSave = () => {
    if (!title.trim() || !text.trim()) return;
    onSave({ title: title.trim(), text: text.trim() });
  };

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ color: C.accent, marginTop: 0 }}>本を追加</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>タイトル</label>
        <input style={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="例：吾輩は猫である" />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={styles.label}>本文（青空文庫などからコピー＆ペースト）</label>
        <textarea
          style={{ ...styles.textarea, height: 300 }}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="ここにテキストを貼り付けてください..."
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={styles.btn} onClick={handleSave} disabled={!title.trim() || !text.trim()}>保存</button>
        <button style={styles.btnOutline} onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}

// ════════════════════════════════
// 読書画面
// ════════════════════════════════
function ReaderScreen({ book, onBack }) {
  const [chapters] = useState(() => detectChapters(book.text));
  const [sentences] = useState(() => splitSentences(book.text));
  const [currentSentIdx, setCurrentSentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showChapters, setShowChapters] = useState(false);
  const utteranceRef = useRef(null);
  const sentenceRefs = useRef([]);
  const progress = loadProgress();

  // 前回の続きから再開
  useEffect(() => {
    const saved = progress[book.id];
    if (saved !== undefined) setCurrentSentIdx(saved);
  }, []);

  // 音声一覧取得
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      const v = (synth.getVoices() || []).filter(v => v.lang.startsWith("ja"));
      setVoices(v);
      if (v.length > 0) setSelectedVoice(v[0]);
    };
    load();
    synth.onvoiceschanged = load;
    return () => { synth.cancel(); };
  }, []);

  // 文節が変わったらスクロール＆進捗保存
  useEffect(() => {
    sentenceRefs.current[currentSentIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    const prog = loadProgress();
    prog[book.id] = currentSentIdx;
    saveProgress(prog);
  }, [currentSentIdx]);

  const speakCurrent = useCallback((idx) => {
    const synth = window.speechSynthesis;
    if (!synth) { setIsPlaying(false); return; }
    synth.cancel();
    if (typeof SpeechSynthesisUtterance === "undefined") { setIsPlaying(false); return; }
    const utter = new SpeechSynthesisUtterance(sentences[idx]);
    utter.lang = "ja-JP";
    utter.rate = rate;
    utter.volume = volume;
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend = () => {
      const next = idx + 1;
      if (next < sentences.length) {
        setCurrentSentIdx(next);
        speakCurrent(next);
      } else {
        setIsPlaying(false);
      }
    };
    utter.onerror = () => setIsPlaying(false);
    utteranceRef.current = utter;
    synth.speak(utter);
  }, [sentences, rate, volume, selectedVoice]);

  const handlePlay = () => {
    setIsPlaying(true);
    speakCurrent(currentSentIdx);
  };

  const handlePause = () => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  };

  const handleStop = () => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setCurrentSentIdx(0);
  };

  const handleChapterJump = (ch) => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    // チャプターの文字オフセットから文節インデックスを探す
    let charCount = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (charCount >= ch.charOffset) {
        setCurrentSentIdx(i);
        break;
      }
      charCount += sentences[i].length;
    }
    setShowChapters(false);
  };

  // 再生中に速度/音量変更したら再スタート
  const applyRate = (v) => {
    setRate(v);
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setTimeout(() => speakCurrent(currentSentIdx), 50);
    }
  };

  const progressPct = sentences.length > 0 ? Math.round((currentSentIdx / sentences.length) * 100) : 0;

  const synthAvailable = typeof window !== "undefined" && !!window.speechSynthesis;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {!synthAvailable && (
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, margin: 16, padding: 12, fontSize: 13, color: "#856404" }}>
          ⚠️ このブラウザ／環境では音声読み上げに対応していません。スマホのブラウザ（Chrome / Safari）で直接開いてご利用ください。
        </div>
      )}
      {/* チャプターパネル */}
      {showChapters && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 200,
          display: "flex", justifyContent: "flex-end"
        }} onClick={() => setShowChapters(false)}>
          <div style={{
            width: "80%", maxWidth: 320, background: C.paper, height: "100%", overflowY: "auto",
            padding: 16, boxShadow: "-4px 0 16px rgba(0,0,0,0.2)"
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: C.accent, margin: "0 0 16px" }}>目次</h3>
            {chapters.map((ch, i) => (
              <div key={i}
                style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer", fontSize: 14 }}
                onClick={() => handleChapterJump(ch)}
              >
                {ch.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 本文エリア */}
      <div style={{ padding: "16px 16px 180px", lineHeight: 2, fontSize: 16 }}>
        <div style={{ marginBottom: 12, color: C.inkLight, fontSize: 13 }}>
          {progressPct}% 読了
          <div style={{
            marginTop: 4, height: 3, background: C.border, borderRadius: 2,
          }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: C.accentLight, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
        {sentences.map((s, i) => (
          <span
            key={i}
            ref={el => sentenceRefs.current[i] = el}
            style={{
              background: i === currentSentIdx ? C.highlight : "transparent",
              borderRadius: 3,
              transition: "background 0.2s",
              cursor: "pointer",
              padding: "0 1px",
            }}
            onClick={() => { window.speechSynthesis?.cancel(); setCurrentSentIdx(i); setIsPlaying(false); }}
          >{s}</span>
        ))}
      </div>

      {/* コントロールバー（固定フッター） */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.paper, borderTop: `2px solid ${C.accent}`,
        padding: "12px 16px", zIndex: 100,
      }}>
        {/* 再生コントロール */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 10 }}>
          <button style={{ ...styles.btnSmall, fontSize: 18, padding: "6px 14px" }} onClick={handleStop} title="最初から">⏮</button>
          {isPlaying
            ? <button style={{ ...styles.btn, fontSize: 18, padding: "6px 20px" }} onClick={handlePause}>⏸</button>
            : <button style={{ ...styles.btn, fontSize: 18, padding: "6px 20px" }} onClick={handlePlay}>▶</button>
          }
          <button style={{ ...styles.btnSmall, fontSize: 18, padding: "6px 14px" }} onClick={() => setShowChapters(true)} title="目次">☰</button>
        </div>

        {/* 速度 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.inkLight, width: 50 }}>速度 {rate.toFixed(1)}x</span>
          <input type="range" min="0.5" max="2.0" step="0.1" value={rate}
            onChange={e => applyRate(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: C.accent }} />
        </div>

        {/* 音量 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.inkLight, width: 50 }}>音量 {Math.round(volume * 100)}%</span>
          <input type="range" min="0" max="1" step="0.05" value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: C.accent }} />
        </div>

        {/* 音声選択 */}
        {voices.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.inkLight, width: 50 }}>音声</span>
            <select
              style={{ flex: 1, fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 6px", background: C.paper, color: C.ink }}
              value={selectedVoice?.name || ""}
              onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value))}
            >
              {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════
// メインApp
// ════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("shelf"); // shelf | add | reader
  const [books, setBooks] = useState(loadBooks);
  const [selectedBook, setSelectedBook] = useState(null);

  const handleAddBook = ({ title, text }) => {
    const newBook = {
      id: Date.now().toString(),
      title,
      text,
      addedAt: new Date().toLocaleDateString("ja-JP"),
    };
    const updated = [...books, newBook];
    setBooks(updated);
    saveBooks(updated);
    setScreen("shelf");
  };

  const handleDeleteBook = (id) => {
    const updated = books.filter(b => b.id !== id);
    setBooks(updated);
    saveBooks(updated);
    const prog = loadProgress();
    delete prog[id];
    saveProgress(prog);
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setScreen("reader");
  };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        {screen !== "shelf" && (
          <button style={{ ...styles.btnSmall, padding: "5px 10px" }} onClick={() => {
            window.speechSynthesis?.cancel();
            setScreen("shelf");
          }}>← 本棚</button>
        )}
        <h1 style={styles.headerTitle}>
          {screen === "shelf" && "青空文庫リーダー"}
          {screen === "add" && "本を追加"}
          {screen === "reader" && (selectedBook?.title || "")}
        </h1>
      </div>

      {screen === "shelf" && (
        <BookshelfScreen
          books={books}
          onSelect={handleSelectBook}
          onAdd={() => setScreen("add")}
          onDelete={handleDeleteBook}
        />
      )}
      {screen === "add" && (
        <AddBookScreen onSave={handleAddBook} onCancel={() => setScreen("shelf")} />
      )}
      {screen === "reader" && selectedBook && (
        <ReaderScreen book={selectedBook} onBack={() => setScreen("shelf")} />
      )}
    </div>
  );
}
