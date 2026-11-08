"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase";
import { LIFTS, RANKS, score, rankOf } from "@/lib/ranks";

const day = (ms = 0) => new Date(Date.now() - ms).toLocaleDateString("en-CA");
const Badge = ({ s }: { s: number }) => { const [n, c] = RANKS[rankOf(s)]; return <span style={{ background: c }} className="text-white text-xs px-2 py-1 rounded-full uppercase">{n}</span>; };
const Bar = ({ pct }: { pct: number }) => <div className="h-3 rounded-full bg-gray-200"><div className="h-3 rounded-full" style={{ width: Math.min(100, pct) + "%", background: "var(--g)" }} /></div>;

const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} } };
const nextUp = (s: number) => { if (s >= 900) return "Top rank reached!"; const t = s < 200 ? 200 : (Math.floor(s / 100) + 1) * 100; return `${t - s} pts to ${RANKS[rankOf(t)][0]}`; };

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return null;
  return user ? <Main user={user} /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState("");
  const go = async (up: boolean) => {
    const { error } = up ? await sb.auth.signUp({ email, password: pw }) : await sb.auth.signInWithPassword({ email, password: pw });
    setMsg(error ? error.message : up ? "Account created! If asked, confirm your email, then log in." : "");
  };
  return (
    <main className="max-w-md mx-auto p-6 pt-20 text-center">
      <div className="text-6xl">🏋️</div>
      <h1 className="text-3xl font-black my-3" style={{ color: "var(--g)" }}>LiftTrack</h1>
      <input className="inp" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="inp" type="password" placeholder="Password (6+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button className="btn" onClick={() => go(false)}>Log in</button>
      <button className="btn blue mt-3" onClick={() => go(true)}>Create account</button>
      <p className="mt-3 text-sm" style={{ color: "var(--r)" }}>{msg}</p>
    </main>
  );
}

function Main({ user }: { user: any }) {
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState<any>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [board, setBoard] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [ex, setEx] = useState("Bench Press"); const [w, setW] = useState(""); const [r, setR] = useState("");
  const [fn, setFn] = useState(""); const [fc, setFc] = useState(""); const [fp, setFp] = useState("");
  const [code, setCode] = useState("");
  const [up, setUp] = useState<number | null>(null); const [sort, setSort] = useState("xp"); const [claimed, setClaimed] = useState(false);
  const [fcb, setFcb] = useState(""); const [ff, setFf] = useState("");
  useEffect(() => { setClaimed(ls.get("claimed-" + day()) === "1"); }, []);

  const load = useCallback(async () => {
    let { data: p } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!p) { const x = await sb.from("profiles").insert({ id: user.id, username: user.email.split("@")[0] }).select().single(); p = x.data; }
    setMe(p);
    setSets((await sb.from("sets").select("*").eq("user_id", user.id).order("created_at", { ascending: false })).data || []);
    setFoods((await sb.from("foods").select("*").eq("user_id", user.id).eq("day", day())).data || []);
    const { data: f } = await sb.from("friends").select("friend_id").eq("user_id", user.id);
    const ids = [user.id, ...(f || []).map((x: any) => x.friend_id)];
    setBoard((await sb.from("profiles").select("*").in("id", ids).order("xp", { ascending: false })).data || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);
  if (!me) return null;

  const pop = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2000); };
  const save = async (k: string, v: any) => { await sb.from("profiles").update({ [k]: v }).eq("id", user.id); load(); };
  const avg = (b: Record<string, number>) => { const v = Object.values(b); return v.length ? Math.round(v.reduce((a, c) => a + c, 0) / v.length) : 0; };

  const best: Record<string, number> = {};
  sets.forEach((s) => { const m = LIFTS[s.exercise]?.muscle; if (m) best[m] = Math.max(best[m] || 0, s.score); });
  const cals = foods.reduce((a, f) => a + f.calories, 0);
  const sum = (k: string) => foods.reduce((a, f) => a + (f[k] || 0), 0);
  const todaySets = sets.filter((s) => new Date(s.created_at).toLocaleDateString("en-CA") === day()).length;
  const quests = [{ t: "Log 3 sets", n: todaySets, g: 3 }, { t: "Log 2 meals", n: foods.length, g: 2 }, { t: "Hit your calorie goal (±15%)", n: cals >= me.calorie_goal * 0.85 && cals <= me.calorie_goal * 1.15 ? 1 : 0, g: 1 }];
  const allDone = quests.every((q) => q.n >= q.g);
  const msg = !sets.length ? "Let's log your first set!" : me.last_workout === day() ? "Nice work today! 🔥" : me.streak > 0 ? `Train today to keep your ${me.streak}-day streak!` : "Time to lift!";
  const claim = async () => { ls.set("claimed-" + day(), "1"); setClaimed(true); await sb.from("profiles").update({ xp: me.xp + 25 }).eq("id", user.id); pop("🎉 Daily quests done! +25 XP"); load(); };
  const delSet = async (id: number) => { await sb.from("sets").delete().eq("id", id); load(); };
  const delFood = async (id: number) => { await sb.from("foods").delete().eq("id", id); load(); };

  const logSet = async () => {
    const wt = +w, rp = +r; if (!wt || !rp) return pop("Enter weight and reps");
    const sc = score(ex, wt, rp, me.bodyweight, me.sex), m = LIFTS[ex].muscle;
    await sb.from("sets").insert({ exercise: ex, weight: wt, reps: rp, score: sc });
    const t = day(), streak = me.last_workout === t ? me.streak : me.last_workout === day(864e5) ? me.streak + 1 : 1;
    const rank_score = avg({ ...best, [m]: Math.max(best[m] || 0, sc) });
    await sb.from("profiles").update({ xp: me.xp + 10, streak, last_workout: t, rank_score }).eq("id", user.id);
    const prev = Math.max(0, ...sets.filter((s) => s.exercise === ex).map((s) => s.score));
    if (rankOf(rank_score) > rankOf(me.rank_score)) setUp(rankOf(rank_score));
    pop(`${prev && sc > prev ? "🏆 New PR! " : ""}+10 XP · set score ${sc}`); setW(""); setR(""); load();
  };
  const logFood = async () => {
    if (!fn || !+fc) return pop("Enter a name and calories");
    await sb.from("foods").insert({ name: fn, calories: +fc, protein: +fp || 0, carbs: +fcb || 0, fat: +ff || 0, day: day() });
    setFn(""); setFc(""); setFp(""); setFcb(""); setFf(""); pop("Food logged!"); load();
  };
  const addFriend = async () => {
    const { data: f } = await sb.from("profiles").select("id").eq("code", code.trim().toLowerCase()).maybeSingle();
    if (!f || f.id === user.id) return pop("Friend code not found");
    await sb.from("friends").insert({ user_id: user.id, friend_id: f.id });
    await sb.from("friends").insert({ user_id: f.id, friend_id: user.id });
    setCode(""); pop("Friend added!"); load();
  };

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex justify-between text-lg font-black mb-4">
        <span style={{ color: "var(--o)" }}>🔥 {me.streak}</span><span style={{ color: "var(--b)" }}>Level {Math.floor(me.xp / 100) + 1}</span><span style={{ color: "var(--g)" }}>⚡ {me.xp} XP</span>
      </div>
      {up !== null && <div onClick={() => setUp(null)} className="fixed inset-0 z-20 flex flex-col items-center justify-center text-white text-center p-6" style={{ background: RANKS[up][1] }}><div className="pop text-7xl">🎉</div><div className="mt-4">Rank up!</div><div className="pop text-5xl font-black my-2">{RANKS[up][0]}</div><div>Tap to continue</div></div>}
      {toast && <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-10 text-center text-white p-3 rounded-2xl" style={{ background: "var(--g)" }}>{toast}</div>}

      {tab === "home" && <>
        <div className="card flex items-center gap-3"><span className="text-4xl">🦍</span><span>{msg}</span></div>
        <div className="card text-center"><div className="text-gray-400">Overall rank</div><div className="my-2"><Badge s={me.rank_score} /></div><div className="text-4xl font-black">{me.rank_score}<span className="text-lg text-gray-400"> / 1000</span></div><div className="text-sm text-gray-400 mt-1">{nextUp(me.rank_score)}</div></div>
        {Object.entries(best).map(([m, s]) => <div key={m} className="card"><div className="flex justify-between mb-2"><span>{m}</span><Badge s={s} /></div><Bar pct={s < 200 ? s / 2 : s % 100} /></div>)}
        {!sets.length && <p className="text-center text-gray-400 mb-3">Log a set in the 🏋️ tab to get your first rank!</p>}
        <div className="card"><div className="mb-2">Daily quests</div>{quests.map((q) => <div key={q.t} className="mb-2"><div className="flex justify-between text-sm"><span>{q.n >= q.g ? "✅" : "⬜"} {q.t}</span><span>{Math.min(q.n, q.g)}/{q.g}</span></div><Bar pct={(q.n / q.g) * 100} /></div>)}{allDone && !claimed && <button className="btn mt-2" onClick={claim}>Claim +25 XP</button>}{claimed && <div className="text-center text-sm" style={{ color: "var(--g)" }}>All done today! 🎉</div>}</div>
        <div className="card">
          <div className="mb-2">Your stats</div>
          <label className="text-sm text-gray-400">Bodyweight (lb)</label><input className="inp" type="number" defaultValue={me.bodyweight} onBlur={(e) => save("bodyweight", +e.target.value)} />
          <label className="text-sm text-gray-400">Sex (used for ranks)</label><select className="inp" defaultValue={me.sex} onChange={(e) => save("sex", e.target.value)}><option value="male">Male</option><option value="female">Female</option></select>
          <label className="text-sm text-gray-400">Daily calorie goal</label><input className="inp" type="number" defaultValue={me.calorie_goal} onBlur={(e) => save("calorie_goal", +e.target.value)} />
        </div>
        <button className="btn blue" onClick={() => sb.auth.signOut()}>Log out</button>
      </>}

      {tab === "train" && <>
        <div className="card">
          <select className="inp" value={ex} onChange={(e) => setEx(e.target.value)}>{Object.keys(LIFTS).map((k) => <option key={k}>{k}</option>)}</select>
          <input className="inp" type="number" placeholder="Weight (lb)" value={w} onChange={(e) => setW(e.target.value)} />
          <input className="inp" type="number" placeholder="Reps" value={r} onChange={(e) => setR(e.target.value)} />
          <button className="btn" onClick={logSet}>Log set</button>
        </div>
        {sets.slice(0, 10).map((s) => <div key={s.id} className="card flex justify-between"><span>{s.exercise} · {s.weight} × {s.reps}</span><span className="flex items-center gap-2"><Badge s={s.score} /><button onClick={() => delSet(s.id)}>✕</button></span></div>)}
      </>}

      {tab === "food" && <>
        <div className="card"><div className="flex justify-between mb-2"><span>Today</span><span>{cals} / {me.calorie_goal} cal</span></div><Bar pct={(cals / me.calorie_goal) * 100} /><div className="text-sm text-gray-400 mt-2">Protein {sum("protein")}g · Carbs {sum("carbs")}g · Fat {sum("fat")}g</div></div>
        <div className="card">
          <input className="inp" placeholder="Food name" value={fn} onChange={(e) => setFn(e.target.value)} />
          <input className="inp" type="number" placeholder="Calories" value={fc} onChange={(e) => setFc(e.target.value)} />
          <input className="inp" type="number" placeholder="Protein (g)" value={fp} onChange={(e) => setFp(e.target.value)} />
          <input className="inp" type="number" placeholder="Carbs (g)" value={fcb} onChange={(e) => setFcb(e.target.value)} />
          <input className="inp" type="number" placeholder="Fat (g)" value={ff} onChange={(e) => setFf(e.target.value)} />
          <button className="btn" onClick={logFood}>Add food</button>
        </div>
        {foods.map((f) => <div key={f.id} className="card flex justify-between"><span>{f.name}</span><span>{f.calories} cal · {f.protein}P {f.carbs}C {f.fat}F <button onClick={() => delFood(f.id)}>✕</button></span></div>)}
      </>}

      {tab === "friends" && <>
        <div className="card text-center"><div className="text-gray-400">Your friend code</div><div className="text-3xl font-black tracking-widest" style={{ color: "var(--b)" }}>{me.code}</div></div>
        <div className="card"><input className="inp" placeholder="Enter a friend's code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn blue" onClick={addFriend}>Add friend</button></div>
        <div className="flex gap-2 mb-3">{[["xp", "⚡ XP"], ["rank_score", "🏅 Rank"]].map(([k, l]) => <button key={k} onClick={() => setSort(k)} className="px-3 py-1 rounded-full text-sm" style={{ background: sort === k ? "var(--b)" : "#eee", color: sort === k ? "#fff" : "inherit" }}>{l}</button>)}</div>
        {[...board].sort((a, b) => b[sort] - a[sort]).map((p, i) => <div key={p.id} className="card flex items-center justify-between"><span>{i + 1}. {p.username} {p.id === user.id && "(you)"}</span><span className="flex items-center gap-2"><Badge s={p.rank_score} /><span style={{ color: "var(--g)" }}>{p.xp} XP</span></span></div>)}
      </>}

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t-2 flex justify-around pt-2" style={{ borderColor: "var(--line)", paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        {[["home", "🏠"], ["train", "🏋️"], ["food", "🍎"], ["friends", "👥"]].map(([k, i]) => <button key={k} onClick={() => setTab(k)} className="text-3xl px-4 py-1 rounded-xl" style={{ background: tab === k ? "#ddf4ff" : "none", border: "2px solid " + (tab === k ? "var(--b)" : "transparent") }}>{i}</button>)}
      </nav>
    </main>
  );
}
