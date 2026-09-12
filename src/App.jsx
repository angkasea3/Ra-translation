import { useState, useEffect } from "react";
import { BookOpen, Plus, X, MessageCircle, Trash2, Pencil, ChevronLeft, ChevronRight, LogIn, LogOut, Send, ArrowLeft } from "lucide-react";
import { supabase } from "./supabaseClient";

// GANTI password ini sebelum di-deploy!
const ADMIN_PASSWORD = "ratranslation2026";

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
    .ra-root, .ra-root * { font-family: 'Inter', sans-serif; }
    .ra-serif { font-family: 'Fraunces', serif; }
  `}</style>
);

const COLORS = {
  paper: "#FBF6EF",
  paperDeep: "#F3EADD",
  blossom: "#E8AFC0",
  blossomDeep: "#D98FA6",
  jade: "#9DBBA8",
  jadeDeep: "#7FA48D",
  plum: "#5B4652",
  ink: "#4A3F42",
  inkSoft: "#8A7A80",
  gold: "#C9A468",
  line: "#E6DACB",
};

const READING_QUOTES = [
  { text: "A reader lives a thousand lives before he dies.", author: "George R.R. Martin" },
  { text: "Once you learn to read, you will be forever free.", author: "Frederick Douglass" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "A book is a dream that you hold in your hands.", author: "Neil Gaiman" },
  { text: "That is part of the beauty of all literature. You discover that your longings are universal longings.", author: "F. Scott Fitzgerald" },
  { text: "Sleep is good, and books are better.", author: "George R.R. Martin" },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function safeGet(key) {
  try {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).maybeSingle();
    if (error || !data) return null;
    return data.value;
  } catch (e) {
    return null;
  }
}
async function safeSet(key, value) {
  try {
    const { error } = await supabase.from("kv_store").upsert({ key, value, updated_at: new Date().toISOString() });
    return !error;
  } catch (e) {
    console.error("storage set failed", e);
    return false;
  }
}
async function safeDelete(key) {
  try {
    await supabase.from("kv_store").delete().eq("key", key);
  } catch (e) {
    /* ignore */
  }
}

const NOVELS_KEY = "ra:novels";
const chaptersKey = (novelId) => `ra:chapters:${novelId}`;
const commentsKey = (novelId) => `ra:comments:${novelId}`;
const paraKey = (novelId, chapterId) => `ra:para:${novelId}:${chapterId}`;

function Badge({ children, tone = "blossom" }) {
  const bg = tone === "blossom" ? COLORS.blossom : tone === "jade" ? COLORS.jade : COLORS.gold;
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mr-1.5 mb-1.5"
      style={{ background: bg + "33", color: COLORS.plum, border: `1px solid ${bg}66` }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, icon: Icon, style, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-transform active:scale-95 hover:brightness-105"
      style={{ background: COLORS.blossomDeep, color: "#fff", ...style }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, icon: Icon, danger }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        color: danger ? "#B4534F" : COLORS.plum,
        background: "transparent",
        border: `1px solid ${danger ? "#B4534F55" : COLORS.line}`,
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#3B2E33aa" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl p-6 max-h-[85vh] overflow-y-auto`}
        style={{ background: COLORS.paper, border: `1px solid ${COLORS.line}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="ra-serif text-xl" style={{ color: COLORS.plum }}>{title}</h3>
          <button onClick={onClose} style={{ color: COLORS.inkSoft }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium mb-1.5" style={{ color: COLORS.plum }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  border: `1px solid ${COLORS.line}`,
  background: "#fff",
  color: COLORS.ink,
};
const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2";

export default function App() {
  const [ra_loading, setLoading] = useState(true);
  const [ra_novels, setNovels] = useState([]);
  const [ra_view, setView] = useState("gallery"); // gallery | detail | reader
  const [ra_selectedNovelId, setSelectedNovelId] = useState(null);
  const [ra_chapters, setChapters] = useState([]);
  const [ra_selectedChapterIdx, setSelectedChapterIdx] = useState(null);
  const [ra_comments, setComments] = useState([]);
  const [ra_paraComments, setParaComments] = useState({});
  const [ra_activePara, setActivePara] = useState(null);

  const [ra_isAdmin, setIsAdmin] = useState(false);
  const [ra_showLogin, setShowLogin] = useState(false);
  const [ra_loginPw, setLoginPw] = useState("");
  const [ra_loginError, setLoginError] = useState("");

  const [ra_showNovelForm, setShowNovelForm] = useState(false);
  const [ra_editingNovel, setEditingNovel] = useState(null);
  const [ra_novelDraft, setNovelDraft] = useState({ title: "", author: "", cover: "", genres: "", type: "Ongoing", synopsis: "" });

  const [ra_showChapterForm, setShowChapterForm] = useState(false);
  const [ra_editingChapterIdx, setEditingChapterIdx] = useState(null);
  const [ra_chapterDraft, setChapterDraft] = useState({ title: "", content: "" });

  useEffect(() => {
    (async () => {
      const list = await safeGet(NOVELS_KEY, true);
      setNovels(list || []);
      setLoading(false);
    })();
  }, []);

  const selectedNovel = ra_novels.find((n) => n.id === ra_selectedNovelId) || null;
  const selectedChapter = ra_selectedChapterIdx !== null ? ra_chapters[ra_selectedChapterIdx] : null;

  async function persistNovels(next) {
    setNovels(next);
    await safeSet(NOVELS_KEY, next, true);
  }

  async function openNovel(id) {
    setSelectedNovelId(id);
    setView("detail");
    setLoading(true);
    const [ch, cm] = await Promise.all([
      safeGet(chaptersKey(id), true),
      safeGet(commentsKey(id), true),
    ]);
    setChapters(ch || []);
    setComments(cm || []);
    setLoading(false);
  }

  async function openChapter(idx) {
    setSelectedChapterIdx(idx);
    setView("reader");
    setActivePara(null);
    window.scrollTo(0, 0);
    const ch = ra_chapters[idx];
    const pc = await safeGet(paraKey(ra_selectedNovelId, ch.id), true);
    setParaComments(pc || {});
  }

  function backToGallery() {
    setView("gallery");
    setSelectedNovelId(null);
    setChapters([]);
    setComments([]);
  }
  function backToDetail() {
    setView("detail");
    setSelectedChapterIdx(null);
    setActivePara(null);
  }

  function tryLogin() {
    if (ra_loginPw === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginPw("");
      setLoginError("");
    } else {
      setLoginError("Password salah. Coba lagi.");
    }
  }

  function openNewNovelForm() {
    setEditingNovel(null);
    setNovelDraft({ title: "", author: "", cover: "", genres: "", type: "Ongoing", synopsis: "" });
    setShowNovelForm(true);
  }
  function openEditNovelForm(novel) {
    setEditingNovel(novel);
    setNovelDraft({
      title: novel.title,
      author: novel.author || "",
      cover: novel.cover,
      genres: (novel.genres || []).join(", "),
      type: novel.type,
      synopsis: novel.synopsis,
    });
    setShowNovelForm(true);
  }
  async function saveNovel() {
    if (!ra_novelDraft.title.trim()) return;
    const genresArr = ra_novelDraft.genres.split(",").map((g) => g.trim()).filter(Boolean);
    if (ra_editingNovel) {
      const next = ra_novels.map((n) =>
        n.id === ra_editingNovel.id
          ? { ...n, title: ra_novelDraft.title, author: ra_novelDraft.author, cover: ra_novelDraft.cover, genres: genresArr, type: ra_novelDraft.type, synopsis: ra_novelDraft.synopsis }
          : n
      );
      await persistNovels(next);
    } else {
      const newNovel = {
        id: uid(),
        title: ra_novelDraft.title,
        author: ra_novelDraft.author,
        cover: ra_novelDraft.cover,
        genres: genresArr,
        type: ra_novelDraft.type,
        synopsis: ra_novelDraft.synopsis,
        createdAt: Date.now(),
      };
      await persistNovels([newNovel, ...ra_novels]);
    }
    setShowNovelForm(false);
  }
  async function deleteNovel(novel) {
    if (!confirm(`Hapus novel "${novel.title}" beserta semua chapter dan komentarnya?`)) return;
    const next = ra_novels.filter((n) => n.id !== novel.id);
    await persistNovels(next);
    await safeDelete(chaptersKey(novel.id), true);
    await safeDelete(commentsKey(novel.id), true);
    if (ra_selectedNovelId === novel.id) backToGallery();
  }

  function openNewChapterForm() {
    setEditingChapterIdx(null);
    setChapterDraft({ title: `Chapter ${ra_chapters.length + 1}`, content: "" });
    setShowChapterForm(true);
  }
  function openEditChapterForm(idx) {
    setEditingChapterIdx(idx);
    setChapterDraft({ title: ra_chapters[idx].title, content: ra_chapters[idx].content });
    setShowChapterForm(true);
  }
  async function saveChapter() {
    if (!ra_chapterDraft.title.trim()) return;
    let next;
    if (ra_editingChapterIdx !== null) {
      next = ra_chapters.map((c, i) => (i === ra_editingChapterIdx ? { ...c, title: ra_chapterDraft.title, content: ra_chapterDraft.content } : c));
    } else {
      next = [...ra_chapters, { id: uid(), title: ra_chapterDraft.title, content: ra_chapterDraft.content, createdAt: Date.now() }];
    }
    setChapters(next);
    await safeSet(chaptersKey(ra_selectedNovelId), next, true);
    setShowChapterForm(false);
  }
  async function deleteChapter(idx) {
    const ch = ra_chapters[idx];
    if (!confirm(`Hapus "${ch.title}"?`)) return;
    const next = ra_chapters.filter((_, i) => i !== idx);
    setChapters(next);
    await safeSet(chaptersKey(ra_selectedNovelId), next, true);
    await safeDelete(paraKey(ra_selectedNovelId, ch.id), true);
  }

  async function addNovelComment(name, text) {
    if (!text.trim()) return;
    const next = [{ id: uid(), name: name.trim() || "Pembaca", text: text.trim(), createdAt: Date.now() }, ...ra_comments];
    setComments(next);
    await safeSet(commentsKey(ra_selectedNovelId), next, true);
  }

  async function addParaComment(idx, name, text) {
    if (!text.trim() || !selectedChapter) return;
    const list = ra_paraComments[idx] || [];
    const nextList = [...list, { id: uid(), name: name.trim() || "Pembaca", text: text.trim(), createdAt: Date.now() }];
    const next = { ...ra_paraComments, [idx]: nextList };
    setParaComments(next);
    await safeSet(paraKey(ra_selectedNovelId, selectedChapter.id), next, true);
  }

  return (
    <div className="ra-root min-h-screen w-full" style={{ background: COLORS.paper }}>
      {FONTS}
      <Header
        isAdmin={ra_isAdmin}
        onLogoClick={backToGallery}
        onLoginClick={() => setShowLogin(true)}
        onLogoutClick={() => setIsAdmin(false)}
      />

      {ra_loading ? (
        <div className="py-24 text-center" style={{ color: COLORS.inkSoft }}>Memuat…</div>
      ) : ra_view === "gallery" ? (
        <Gallery
          novels={ra_novels}
          isAdmin={ra_isAdmin}
          onOpen={openNovel}
          onAdd={openNewNovelForm}
          onEdit={openEditNovelForm}
          onDelete={deleteNovel}
        />
      ) : ra_view === "detail" && selectedNovel ? (
        <NovelDetail
          novel={selectedNovel}
          chapters={ra_chapters}
          comments={ra_comments}
          isAdmin={ra_isAdmin}
          onBack={backToGallery}
          onEdit={() => openEditNovelForm(selectedNovel)}
          onDelete={() => deleteNovel(selectedNovel)}
          onOpenChapter={openChapter}
          onAddChapter={openNewChapterForm}
          onEditChapter={openEditChapterForm}
          onDeleteChapter={deleteChapter}
          onAddComment={addNovelComment}
        />
      ) : ra_view === "reader" && selectedNovel && selectedChapter ? (
        <ChapterReader
          novel={selectedNovel}
          chapters={ra_chapters}
          idx={ra_selectedChapterIdx}
          chapter={selectedChapter}
          paraComments={ra_paraComments}
          activePara={ra_activePara}
          setActivePara={setActivePara}
          onBack={backToDetail}
          onNav={(newIdx) => openChapter(newIdx)}
          onAddParaComment={addParaComment}
        />
      ) : null}

      {ra_showLogin && (
        <Modal title="Masuk sebagai Admin" onClose={() => { setShowLogin(false); setLoginError(""); setLoginPw(""); }}>
          <Field label="Password">
            <input
              type="password"
              autoFocus
              className={inputClass}
              style={inputStyle}
              value={ra_loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            />
          </Field>
          {ra_loginError && <p className="text-sm mb-3" style={{ color: "#B4534F" }}>{ra_loginError}</p>}
          <PrimaryButton onClick={tryLogin} icon={LogIn}>Masuk</PrimaryButton>
        </Modal>
      )}

      {ra_showNovelForm && (
        <Modal title={ra_editingNovel ? "Edit Novel" : "Tambah Novel"} onClose={() => setShowNovelForm(false)} wide>
          <Field label="Judul novel">
            <input className={inputClass} style={inputStyle} value={ra_novelDraft.title} onChange={(e) => setNovelDraft({ ...ra_novelDraft, title: e.target.value })} />
          </Field>
          <Field label="Penulis asli">
            <input className={inputClass} style={inputStyle} placeholder="Nama author versi asli" value={ra_novelDraft.author} onChange={(e) => setNovelDraft({ ...ra_novelDraft, author: e.target.value })} />
          </Field>
          <Field label="URL gambar cover">
            <input className={inputClass} style={inputStyle} placeholder="https://…" value={ra_novelDraft.cover} onChange={(e) => setNovelDraft({ ...ra_novelDraft, cover: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Genre (pisahkan dengan koma)">
              <input className={inputClass} style={inputStyle} placeholder="Fantasi, Romance, Wuxia" value={ra_novelDraft.genres} onChange={(e) => setNovelDraft({ ...ra_novelDraft, genres: e.target.value })} />
            </Field>
            <Field label="Tipe">
              <select className={inputClass} style={inputStyle} value={ra_novelDraft.type} onChange={(e) => setNovelDraft({ ...ra_novelDraft, type: e.target.value })}>
                <option>Ongoing</option>
                <option>Tamat</option>
                <option>Hiatus</option>
                <option>Drop</option>
              </select>
            </Field>
          </div>
          <Field label="Sinopsis">
            <textarea rows={5} className={inputClass} style={inputStyle} value={ra_novelDraft.synopsis} onChange={(e) => setNovelDraft({ ...ra_novelDraft, synopsis: e.target.value })} />
          </Field>
          <PrimaryButton onClick={saveNovel}>Simpan</PrimaryButton>
        </Modal>
      )}

      {ra_showChapterForm && (
        <Modal title={ra_editingChapterIdx !== null ? "Edit Chapter" : "Tambah Chapter"} onClose={() => setShowChapterForm(false)} wide>
          <Field label="Judul chapter">
            <input className={inputClass} style={inputStyle} value={ra_chapterDraft.title} onChange={(e) => setChapterDraft({ ...ra_chapterDraft, title: e.target.value })} />
          </Field>
          <Field label="Isi chapter (pisahkan paragraf dengan baris baru)">
            <textarea rows={12} className={inputClass} style={inputStyle} value={ra_chapterDraft.content} onChange={(e) => setChapterDraft({ ...ra_chapterDraft, content: e.target.value })} />
          </Field>
          <PrimaryButton onClick={saveChapter}>Simpan</PrimaryButton>
        </Modal>
      )}
    </div>
  );
}

function Header({ isAdmin, onLogoClick, onLoginClick, onLogoutClick }) {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-sm px-6 py-4 flex items-center justify-between"
      style={{ background: COLORS.paper + "ee", borderBottom: `1px solid ${COLORS.line}` }}
    >
      <button onClick={onLogoClick} className="flex items-center gap-2.5">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center ra-serif text-lg"
          style={{ background: COLORS.blossom, color: "#fff" }}
        >
          R
        </span>
        <span className="ra-serif text-xl leading-none" style={{ color: COLORS.plum }}>
          Ra Translation
        </span>
      </button>
      {isAdmin ? (
        <GhostButton onClick={onLogoutClick} icon={LogOut}>Keluar Admin</GhostButton>
      ) : (
        <GhostButton onClick={onLoginClick} icon={LogIn}>Admin</GhostButton>
      )}
    </header>
  );
}

function Gallery({ novels, isAdmin, onOpen, onAdd, onEdit, onDelete }) {
  const [quote] = useState(() => READING_QUOTES[Math.floor(Math.random() * READING_QUOTES.length)]);
  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8 gap-6">
        <div>
          <h1 className="ra-serif text-3xl mb-2" style={{ color: COLORS.plum }}>Rak Novel</h1>
          <p className="ra-serif text-base italic leading-snug max-w-md" style={{ color: COLORS.blossomDeep }}>
            "{quote.text}"
            <span className="block not-italic text-xs mt-1" style={{ color: COLORS.inkSoft }}>— {quote.author}</span>
          </p>
        </div>
        {isAdmin && <PrimaryButton onClick={onAdd} icon={Plus}>Tambah Novel</PrimaryButton>}
      </div>

      {novels.length === 0 ? (
        <div className="text-center py-24 rounded-2xl" style={{ border: `1px dashed ${COLORS.line}` }}>
          <BookOpen className="mx-auto mb-3" size={28} style={{ color: COLORS.inkSoft }} />
          <p style={{ color: COLORS.inkSoft }}>Belum ada novel di rak ini.</p>
          {isAdmin && <div className="mt-4"><PrimaryButton onClick={onAdd} icon={Plus}>Tambah novel pertama</PrimaryButton></div>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {novels.map((n) => (
            <div key={n.id} className="group">
              <button onClick={() => onOpen(n.id)} className="block w-full text-left">
                <div
                  className="relative rounded-xl overflow-hidden mb-2.5"
                  style={{ aspectRatio: "2/3", background: COLORS.paperDeep, boxShadow: "0 6px 16px -6px rgba(91,70,82,0.25)" }}
                >
                  {n.cover ? (
                    <img src={n.cover} alt={n.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={28} style={{ color: COLORS.inkSoft }} />
                    </div>
                  )}
                  <span
                    className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: COLORS.plum + "cc", color: "#fff" }}
                  >
                    {n.type}
                  </span>
                </div>
                <h3 className="ra-serif text-sm leading-snug" style={{ color: COLORS.plum }}>{n.title}</h3>
                {n.author && <p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>oleh {n.author}</p>}
              </button>
              {isAdmin && (
                <div className="flex gap-1.5 mt-1.5">
                  <button onClick={() => onEdit(n)} style={{ color: COLORS.inkSoft }}><Pencil size={13} /></button>
                  <button onClick={() => onDelete(n)} style={{ color: "#B4534F" }}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function NovelDetail({ novel, chapters, comments, isAdmin, onBack, onEdit, onDelete, onOpenChapter, onAddChapter, onEditChapter, onDeleteChapter, onAddComment }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm mb-6" style={{ color: COLORS.inkSoft }}>
        <ArrowLeft size={15} /> Kembali ke rak
      </button>

      <div className="grid md:grid-cols-[220px_1fr] gap-8 mb-10">
        <div>
          <div
            className="rounded-xl overflow-hidden mb-3"
            style={{ aspectRatio: "2/3", background: COLORS.paperDeep, boxShadow: "0 10px 24px -8px rgba(91,70,82,0.3)" }}
          >
            {novel.cover ? (
              <img src={novel.cover} alt={novel.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><BookOpen size={32} style={{ color: COLORS.inkSoft }} /></div>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <GhostButton onClick={onEdit} icon={Pencil}>Edit</GhostButton>
              <GhostButton onClick={onDelete} icon={Trash2} danger>Hapus</GhostButton>
            </div>
          )}
        </div>

        <div>
          <span className="inline-block text-xs px-2.5 py-1 rounded-full mb-3" style={{ background: COLORS.jade + "33", color: COLORS.plum, border: `1px solid ${COLORS.jade}66` }}>
            {novel.type}
          </span>
          <h1 className="ra-serif text-3xl mb-1" style={{ color: COLORS.plum }}>{novel.title}</h1>
          {novel.author && <p className="text-sm mb-3" style={{ color: COLORS.inkSoft }}>oleh <span style={{ color: COLORS.plum }}>{novel.author}</span> · alih bahasa oleh Ra Translation</p>}
          <div className="mb-4">
            {(novel.genres || []).map((g) => <Badge key={g}>{g}</Badge>)}
          </div>
          <p className="text-sm leading-relaxed max-w-[70ch]" style={{ color: COLORS.ink, whiteSpace: "pre-line" }}>{novel.synopsis}</p>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="ra-serif text-xl" style={{ color: COLORS.plum }}>Daftar Chapter</h2>
          {isAdmin && <PrimaryButton onClick={onAddChapter} icon={Plus}>Tambah Chapter</PrimaryButton>}
        </div>
        {chapters.length === 0 ? (
          <p className="text-sm py-6" style={{ color: COLORS.inkSoft }}>Belum ada chapter.</p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.line}` }}>
            {chapters.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.02]"
                style={{ borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}` }}
              >
                <button onClick={() => onOpenChapter(i)} className="text-left flex-1 text-sm" style={{ color: COLORS.ink }}>
                  <span className="ra-serif" style={{ color: COLORS.plum }}>{i + 1}.</span> {c.title}
                </button>
                {isAdmin && (
                  <div className="flex gap-2 shrink-0 ml-3">
                    <button onClick={() => onEditChapter(i)} style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
                    <button onClick={() => onDeleteChapter(i)} style={{ color: "#B4534F" }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="ra-serif text-xl mb-4" style={{ color: COLORS.plum }}>Komentar ({comments.length})</h2>
        <CommentForm onSubmit={(n, t) => { onAddComment(n, t); setText(""); }} />
        <div className="mt-5 space-y-3">
          {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
        </div>
      </section>
    </main>
  );
}

function CommentForm({ onSubmit, compact }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  function submit() {
    if (!text.trim()) return;
    onSubmit(name, text);
    setText("");
  }
  return (
    <div className="space-y-2">
      {!compact && (
        <input
          className={inputClass}
          style={inputStyle}
          placeholder="Nama (opsional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <div className="flex gap-2">
        <textarea
          rows={compact ? 2 : 2}
          className={inputClass + " flex-1"}
          style={inputStyle}
          placeholder="Tulis komentar…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={submit}
          className="px-3 rounded-lg self-stretch flex items-center"
          style={{ background: COLORS.blossomDeep, color: "#fff" }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

function CommentItem({ comment }) {
  return (
    <div className="rounded-lg px-3.5 py-2.5" style={{ background: "#fff", border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-medium" style={{ color: COLORS.plum }}>{comment.name}</span>
        <span className="text-xs" style={{ color: COLORS.inkSoft }}>{new Date(comment.createdAt).toLocaleDateString("id-ID")}</span>
      </div>
      <p className="text-sm" style={{ color: COLORS.ink }}>{comment.text}</p>
    </div>
  );
}

function ChapterReader({ novel, chapters, idx, chapter, paraComments, activePara, setActivePara, onBack, onNav, onAddParaComment }) {
  const paragraphs = (chapter.content || "").split("\n").filter((p) => p.trim() !== "");
  const hasPrev = idx > 0;
  const hasNext = idx < chapters.length - 1;

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 relative">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm mb-6" style={{ color: COLORS.inkSoft }}>
        <ArrowLeft size={15} /> {novel.title}
      </button>

      <h1 className="ra-serif text-2xl mb-8" style={{ color: COLORS.plum }}>{chapter.title}</h1>

      <article className="space-y-4">
        {paragraphs.map((p, i) => {
          const count = (paraComments[i] || []).length;
          return (
            <div key={i} className="group relative flex items-start gap-2">
              <p className="text-[15px] leading-[1.9] flex-1" style={{ color: COLORS.ink, maxWidth: "68ch" }}>{p}</p>
              <button
                onClick={() => setActivePara(activePara === i ? null : i)}
                className="shrink-0 mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-opacity"
                style={{
                  color: count > 0 ? COLORS.blossomDeep : COLORS.inkSoft,
                  opacity: count > 0 ? 1 : undefined,
                  background: activePara === i ? COLORS.blossom + "22" : "transparent",
                }}
              >
                <MessageCircle size={14} />
                {count > 0 && <span>{count}</span>}
              </button>
              {activePara === i && (
                <ParaCommentPanel
                  paragraph={p}
                  comments={paraComments[i] || []}
                  onClose={() => setActivePara(null)}
                  onSubmit={(name, text) => onAddParaComment(i, name, text)}
                />
              )}
            </div>
          );
        })}
      </article>

      <div className="flex items-center justify-between mt-12 pt-6" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <GhostButton onClick={() => hasPrev && onNav(idx - 1)} icon={ChevronLeft}>{hasPrev ? chapters[idx - 1].title : "Awal"}</GhostButton>
        <GhostButton onClick={() => hasNext && onNav(idx + 1)}>{hasNext ? chapters[idx + 1].title : "Akhir"} <ChevronRight size={14} /></GhostButton>
      </div>
    </main>
  );
}

function ParaCommentPanel({ paragraph, comments, onClose, onSubmit }) {
  return (
    <div
      className="fixed sm:absolute right-4 sm:right-[-260px] top-auto sm:top-0 left-4 sm:left-auto bottom-4 sm:bottom-auto z-30 w-auto sm:w-64 rounded-xl p-4 max-h-[70vh] overflow-y-auto"
      style={{ background: "#fff", border: `1px solid ${COLORS.line}`, boxShadow: "0 12px 28px -10px rgba(91,70,82,0.35)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: COLORS.inkSoft }}>Komentar paragraf</span>
        <button onClick={onClose}><X size={14} style={{ color: COLORS.inkSoft }} /></button>
      </div>
      <p className="text-xs italic mb-3 line-clamp-2" style={{ color: COLORS.inkSoft }}>"{paragraph.slice(0, 80)}{paragraph.length > 80 ? "…" : ""}"</p>
      <div className="space-y-2 mb-3">
        {comments.length === 0 ? (
          <p className="text-xs" style={{ color: COLORS.inkSoft }}>Belum ada komentar di paragraf ini.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="text-xs rounded-lg px-2.5 py-2" style={{ background: COLORS.paper }}>
              <span className="font-medium" style={{ color: COLORS.plum }}>{c.name}</span>
              <p style={{ color: COLORS.ink }}>{c.text}</p>
            </div>
          ))
        )}
      </div>
      <CommentForm compact onSubmit={onSubmit} />
    </div>
  );
}
