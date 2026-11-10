import "./globals.css";
export const metadata = { title: "Khata – Business Cashbook", description: "Simple cash in, cash out and business accounts" };
export default function RootLayout({ children }) {
  return (<html lang="en"><head><link rel="manifest" href="/manifest.json" /><meta name="theme-color" content="#12263A" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /></head><body>{children}</body></html>);
}
