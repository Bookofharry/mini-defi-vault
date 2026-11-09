import "./globals.css";

export const metadata = {
  title: "MiniVault — Sepolia DeFi Vault",
  description: "Deposit and withdraw Sepolia ETH in a non-custodial on-chain vault.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1747b5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
};

// Applies the saved/system theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('mv-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=clash-display@500,600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
