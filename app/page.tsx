"use client";
import { useEffect, useState, useCallback } from "react";
import { sb } from "@/lib/supabase";
import { LIFTS, RANKS, score, rankOf } from "@/lib/ranks";

const day = (ms = 0) => new Date(Date.now() - ms).toLocaleDateString("en-CA");
const ICON = ["🪵", "🥉", "🥈", "🥇", "💠", "💎", "🏆", "⚡", "👑"];
const MUSC: Record<string, string> = { Chest: "🛡️", Back: "🧗", Legs: "🦵", Shoulders: "🏔️", Arms: "💪" };
const ls = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} } };
const applyPref = (k: string, v: boolean) => { ls.set(k, v ? "1" : "0"); if (k === "dark") document.documentElement.dataset.theme = v ? "dark" : ""; else document.documentElement.classList.toggle("noanim", !v); };
const nextUp = (s: number) => { if (s >= 900) return "Top rank reached!"; const t = s < 200 ? 200 : (Math.floor(s / 100) + 1) * 100; return `${t - s} pts to ${RANKS[rankOf(t)][0]}`; };
const Badge = ({ s }: { s: number }) => { const i = rankOf(s); return <span style={{ background: RANKS[i][1] }} className="text-white text-xs font-black px-2 py-1 rounded-full whitespace-nowrap">{ICON[i]} {RANKS[i][0]}</span>; };
const Bar = ({ pct, c = "var(--g)" }: { pct: number; c?: string }) => <div className="bar"><i style={{ width: Math.min(100, pct) + "%", background: c }} /></div>;
const Ring = ({ pct, c, glow, children }: any) => <div className={"mx-auto w-40 h-40 rounded-full p-2 " + (glow ? "glow" : "")} style={{ background: `conic-gradient(${c} ${Math.min(100, pct)}%, var(--line) 0)`, ...({ "--rc": c + "88" } as any) }}><div className="w-full h-full rounded-full flex flex-col items-center justify-center text-center" style={{ background: "var(--card)" }}>{children}</div></div>;
const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => <div className="flex justify-between items-center py-2"><span>{label}</span><button onClick={() => set(!on)} className="w-14 h-8 rounded-full p-1 transition-colors" style={{ background: on ? "var(--g)" : "var(--line)" }}><span className="block w-6 h-6 rounded-full bg-white transition-transform" style={{ transform: on ? "translateX(24px)" : "none" }} /></button></div>;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = ls.get("dark") === "1" ? "dark" : "";
    document.documentElement.classList.toggle("noanim", ls.get("anim") === "0");
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
    <main className="max-w-md mx-auto p-6 pt-16 text-center rise">
      <div className="text-7xl bounce">🦍</div>
      <h1 className="text-4xl font-black mt-2" style={{ color: "var(--g)" }}>LiftTrack</h1>
      <p className="mute mb-6">Lift. Rank up. Beat your friends.</p>
      <div className="card">
        <input className="inp" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="inp" type="password" placeholder="Password (6+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn" onClick={() => go(false)}>Log in</button>
        <button className="btn blue mt-3" onClick={() => go(true)}>Create account</button>
      </div>
      <p className="text-sm" style={{ color: "var(--r)" }}>{msg}</p>
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
  const [mu, setMu] = useState("Chest"); const [ex, setEx] = useState("Bench Press"); const [w, setW] = useState(""); const [r, setR] = useState("");
  const [fn, setFn] = useState(""); const [fc, setFc] = useState(""); const [fp, setFp] = useState(""); const [fcb, setFcb] = useState(""); const [ff, setFf] = useState("");
  const [code, setCode] = useState("");
  const [up, setUp] = useState<number | null>(null); const [sort, setSort] = useState("xp"); const [claimed, setClaimed] = useState(false);
  const [dark, setDark] = useState(false); const [anim, setAnim] = useState(true);
  useEffect(() => { setClaimed(ls.get("claimed-" + day()) === "1"); setDark(ls.get("dark") === "1"); setAnim(ls.get("anim") !== "0"); }, []);

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

  const pop = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2200); };
  const save = async (k: string, v: any) => { await sb.from("profiles").update({ [k]: v }).eq("id", user.id); load(); };
  const pref = (k: string, v: boolean) => { applyPref(k, v); k === "dark" ? setDark(v) : setAnim(v); };
  const avg = (b: Record<string, number>) => { const v = Object.values(b); return v.length ? Math.round(v.reduce((a, c) => a + c, 0) / v.length) : 0; };

  const best: Record<string, number> = {};
  sets.forEach((s) => { const m = LIFTS[s.exercise]?.muscle; if (m) best[m] = Math.max(best[m] || 0, s.score); });
  const cals = foods.reduce((a, f) => a + f.calories, 0);
  const sum = (k: string) => foods.reduce((a, f) => a + (f[k] || 0), 0);
  const todaySets = sets.filter((s) => new Date(s.created_at).toLocaleDateString("en-CA") === day()).length;
  const quests = [{ t: "Log 3 sets", n: todaySets, g: 3 }, { t: "Log 2 meals", n: foods.length, g: 2 }, { t: "Hit your calorie goal (±15%)", n: cals >= me.calorie_goal * 0.85 && cals <= me.calorie_goal * 1.15 ? 1 : 0, g: 1 }];
  const allDone = quests.every((q) => q.n >= q.g);
  const msg = !sets.length ? "Let's log your first set!" : me.last_workout === day() ? "Nice work today! 🔥" : me.streak > 0 ? `Train today to keep your ${me.streak}-day streak!` : "Time to lift!";
  const rk = rankOf(me.rank_score), rc = RANKS[rk][1], lvl = Math.floor(me.xp / 100) + 1;
  const pv = +w && +r ? score(ex, +w, +r, me.bodyweight, me.sex) : 0;
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
  const copy = async () => { try { await navigator.clipboard.writeText(me.code); pop("Code copied!"); } catch { pop(me.code); } };
  const Lbl = ({ t }: { t: string }) => <div className="mute text-sm mb-1">{t}</div>;

  return (
    <main className="max-w-md mx-auto">
      <header className="sticky top-0 z-10 px-4 pb-3" style={{ background: "var(--bg)", paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}>
        <div className="flex justify-between items-center text-lg font-black">
          <span style={{ color: "var(--o)" }}><span className="flame">🔥</span> {me.streak}</span>
          <span style={{ color: "var(--b)" }}>Level {lvl}</span>
          <span style={{ color: "var(--g)" }}>⚡ {me.xp} XP</span>
        </div>
        <div className="mt-2"><Bar pct={me.xp % 100} c="var(--b)" /></div>
      </header>
      {up !== null && <div onClick={() => setUp(null)} className="fixed inset-0 z-30 flex flex-col items-center justify-center text-white text-center p-6 overflow-hidden" style={{ background: RANKS[up][1] }}>
        {Array.from({ length: 24 }).map((_, i) => <span key={i} className="conf" style={{ left: (i * 37) % 100 + "%", animationDelay: (i % 8) * 0.25 + "s" }}>{["🎉", "⭐", "✨", "💪"][i % 4]}</span>)}
        <div className="pop text-8xl">{ICON[up]}</div><div className="mt-4 uppercase tracking-widest">Rank up!</div><div className="pop text-5xl font-black my-2">{RANKS[up][0]}</div><div className="opacity-80">Tap to continue</div></div>}
      {toast && <div className="toast fixed inset-x-4 max-w-md mx-auto z-20 text-center text-white p-3 rounded-2xl font-black" style={{ top: "calc(env(safe-area-inset-top) + 10px)", background: "var(--g)", borderBottom: "4px solid var(--gd)" }}>{toast}</div>}

      <div key={tab} className="rise px-4 pt-2">
        {tab === "home" && <>
          <div className="card flex items-center gap-3"><span className="text-5xl bounce">🦍</span><span className="text-lg">{msg}</span></div>
          <div className="card text-center">
            <Ring pct={me.rank_score >= 900 ? 100 : me.rank_score < 200 ? me.rank_score / 2 : me.rank_score % 100} c={rc} glow>
              <div className="text-4xl">{ICON[rk]}</div><div className="font-black" style={{ color: rc }}>{RANKS[rk][0]}</div><div className="mute text-sm">{me.rank_score} / 1000</div>
            </Ring>
            <div className="mute text-sm mt-3">{nextUp(me.rank_score)}</div>
          </div>
          {Object.entries(best).map(([m, s]) => <div key={m} className="card"><div className="flex justify-between items-center mb-2"><span className="font-black">{MUSC[m]} {m}</span><Badge s={s} /></div><Bar pct={s < 200 ? s / 2 : s % 100} c={RANKS[rankOf(s)][1]} /></div>)}
          {!sets.length && <p className="text-center mute mb-3">Log a set in Train to get your first rank!</p>}
          <div className="card"><div className="font-black mb-3">Daily quests</div>
            {quests.map((q) => <div key={q.t} className="mb-3"><div className="flex justify-between text-sm mb-1"><span>{q.n >= q.g ? "✅" : "⬜"} {q.t}</span><span className="mute">{Math.min(q.n, q.g)}/{q.g}</span></div><Bar pct={(q.n / q.g) * 100} c="var(--o)" /></div>)}
            {allDone && !claimed && <button className="btn" onClick={claim}>Claim +25 XP</button>}
            {claimed && <div className="text-center text-sm" style={{ color: "var(--g)" }}>All done today! 🎉</div>}
          </div>
        </>}

        {tab === "train" && <>
          <div className="card">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">{Object.keys(MUSC).map((m) => <button key={m} data-on={mu === m} className="chip" onClick={() => { setMu(m); setEx(Object.keys(LIFTS).find((k) => LIFTS[k].muscle === m)!); }}>{MUSC[m]} {m}</button>)}</div>
            <select className="inp" value={ex} onChange={(e) => setEx(e.target.value)}>{Object.keys(LIFTS).filter((k) => LIFTS[k].muscle === mu).map((k) => <option key={k}>{k}</option>)}</select>
            <div className="flex gap-2"><input className="inp" type="number" placeholder="Weight (lb)" value={w} onChange={(e) => setW(e.target.value)} /><input className="inp" type="number" placeholder="Reps" value={r} onChange={(e) => setR(e.target.value)} /></div>
            {pv > 0 && <div className="flex justify-between items-center mb-3"><span className="mute text-sm">This set scores {pv}</span><Badge s={pv} /></div>}
            <button className="btn" onClick={logSet}>Log set</button>
          </div>
          {sets.slice(0, 10).map((s) => <div key={s.id} className="card flex justify-between items-center"><div><div className="font-black">{s.exercise}</div><div className="mute text-sm">{s.weight} lb × {s.reps}</div></div><span className="flex items-center gap-3"><Badge s={s.score} /><button className="mute" onClick={() => delSet(s.id)}>✕</button></span></div>)}
        </>}

        {tab === "food" && <>
          <div className="card text-center">
            <Ring pct={(cals / me.calorie_goal) * 100} c={cals > me.calorie_goal ? "var(--r)" : "var(--g)"}><div className="text-3xl font-black">{Math.abs(me.calorie_goal - cals)}</div><div className="mute text-sm">{cals > me.calorie_goal ? "cal over" : "cal left"}</div></Ring>
            <div className="flex justify-around mt-4 text-sm"><span>🥩 {sum("protein")}g</span><span>🍞 {sum("carbs")}g</span><span>🥑 {sum("fat")}g</span></div>
          </div>
          <div className="card">
            <input className="inp" placeholder="Food name" value={fn} onChange={(e) => setFn(e.target.value)} />
            <div className="flex gap-2"><input className="inp" type="number" placeholder="Calories" value={fc} onChange={(e) => setFc(e.target.value)} /><input className="inp" type="number" placeholder="Protein g" value={fp} onChange={(e) => setFp(e.target.value)} /></div>
            <div className="flex gap-2"><input className="inp" type="number" placeholder="Carbs g" value={fcb} onChange={(e) => setFcb(e.target.value)} /><input className="inp" type="number" placeholder="Fat g" value={ff} onChange={(e) => setFf(e.target.value)} /></div>
            <button className="btn" onClick={logFood}>Add food</button>
          </div>
          {foods.map((f) => <div key={f.id} className="card flex justify-between items-center"><div><div className="font-black">{f.name}</div><div className="mute text-sm">{f.protein}P · {f.carbs}C · {f.fat}F</div></div><span className="flex items-center gap-3">{f.calories} cal<button className="mute" onClick={() => delFood(f.id)}>✕</button></span></div>)}
        </>}

        {tab === "friends" && <>
          <div className="card text-center"><div className="mute text-sm">Your friend code</div><button onClick={copy} className="text-4xl font-black tracking-widest" style={{ color: "var(--b)" }}>{me.code}</button><div className="mute text-xs">Tap to copy</div></div>
          <div className="card"><input className="inp" placeholder="Enter a friend's code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn blue" onClick={addFriend}>Add friend</button></div>
          <div className="flex gap-2 mb-3">{[["xp", "⚡ XP"], ["rank_score", "🏅 Rank"]].map(([k, l]) => <button key={k} data-on={sort === k} className="chip" onClick={() => setSort(k)}>{l}</button>)}</div>
          {[...board].sort((a, b) => b[sort] - a[sort]).map((p, i) => <div key={p.id} className="card flex items-center justify-between" style={p.id === user.id ? { borderColor: "var(--b)" } : {}}><span className="font-black">{["🥇", "🥈", "🥉"][i] || i + 1 + "."} {p.username} {p.id === user.id && <span className="mute text-sm">(you)</span>}</span><span className="flex items-center gap-2"><Badge s={p.rank_score} /><span style={{ color: "var(--g)" }}>{p.xp} XP</span></span></div>)}
        </>}

        {tab === "settings" && <>
          <div className="card"><div className="font-black mb-3">Profile</div>
            <Lbl t="Username" /><input className="inp" defaultValue={me.username} onBlur={(e) => e.target.value.trim() && save("username", e.target.value.trim())} />
            <Lbl t="Bodyweight (lb)" /><input className="inp" type="number" defaultValue={me.bodyweight} onBlur={(e) => save("bodyweight", +e.target.value)} />
            <Lbl t="Sex (used for ranks)" /><select className="inp" defaultValue={me.sex} onChange={(e) => save("sex", e.target.value)}><option value="male">Male</option><option value="female">Female</option></select>
            <Lbl t="Daily calorie goal" /><input className="inp" type="number" defaultValue={me.calorie_goal} onBlur={(e) => save("calorie_goal", +e.target.value)} />
          </div>
          <div className="card"><div className="font-black mb-1">App</div><Toggle on={dark} set={(v) => pref("dark", v)} label="🌙 Dark mode" /><Toggle on={anim} set={(v) => pref("anim", v)} label="✨ Animations" /></div>
          <button className="btn blue" onClick={() => sb.auth.signOut()}>Log out</button>
        </>}
      </div>

      <nav className="fixed bottom-0 inset-x-0 flex justify-around pt-2 border-t-2" style={{ background: "var(--bg)", borderColor: "var(--line)", paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        {[["home", "🏠", "Home"], ["train", "🏋️", "Train"], ["food", "🍎", "Food"], ["friends", "👥", "Friends"], ["settings", "⚙️", "Settings"]].map(([k, i, l]) => <button key={k} data-on={tab === k} className="tab" onClick={() => setTab(k)}><span>{i}</span>{l}</button>)}
      </nav>
    </main>
  );
}
