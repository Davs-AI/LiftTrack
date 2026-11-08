import "./globals.css";
export const metadata = { title: "LiftTrack", manifest: "/manifest.json", appleWebApp: { capable: true, title: "LiftTrack", statusBarStyle: "default" }, icons: { apple: "/icon-180.png" } };
export const viewport = { themeColor: "#58cc02", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" /></head><body>{children}</body></html>);
}
