export const RANKS = [["Wood","#a0764a"],["Bronze","#cd7f32"],["Silver","#9aa5b1"],["Gold","#f5b800"],["Platinum","#2bc4b4"],["Diamond","#1cb0f6"],["Champion","#a560e8"],["Titan","#ff4b4b"],["Olympian","#ff9600"]] as const;
// full = estimated 1RM / bodyweight needed for 1000 points (men). Edit these to tune ranks.
const L = (muscle: string, full: number) => ({ muscle, full });
export const LIFTS: Record<string, { muscle: string; full: number }> = {
  "Bench Press": L("Chest", 1.8), "Incline Press": L("Chest", 1.5), "Chest Press Machine": L("Chest", 2), "Cable Fly": L("Chest", 0.8),
  "Squat": L("Legs", 2.6), "Front Squat": L("Legs", 2.1), "Leg Press": L("Legs", 5), "Romanian Deadlift": L("Legs", 2.4), "Hip Thrust": L("Legs", 3),
  "Leg Extension": L("Legs", 1.8), "Leg Curl": L("Legs", 1.4), "Calf Raise": L("Legs", 3),
  "Deadlift": L("Back", 3), "Barbell Row": L("Back", 1.6), "Lat Pulldown": L("Back", 1.5), "Seated Cable Row": L("Back", 1.6),
  "Overhead Press": L("Shoulders", 1.15), "Shoulder Press Machine": L("Shoulders", 1.4), "Lateral Raise Machine": L("Shoulders", 0.6), "Face Pull": L("Shoulders", 0.8), "Rear Delt Fly": L("Shoulders", 0.8),
  "Barbell Curl": L("Arms", 0.85), "Cable Curl": L("Arms", 0.9), "Preacher Curl": L("Arms", 0.85), "Tricep Pushdown": L("Arms", 1.2), "Skull Crusher": L("Arms", 0.9), "Close-Grip Bench": L("Arms", 1.5),
};
export const score = (ex: string, w: number, r: number, bw: number, sex: string) => {
  const ratio = (w * (1 + r / 30)) / bw / (LIFTS[ex].full * (sex === "female" ? 0.65 : 1));
  return Math.max(1, Math.min(1000, Math.round(ratio * 1000)));
};
export const rankOf = (s: number) => (s < 200 ? 0 : Math.min(8, Math.floor(s / 100) - 1));
