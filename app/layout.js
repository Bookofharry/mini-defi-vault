import "./globals.css";

export const metadata = {
  title: "Mini DeFi Vault",
  description: "Deposit and withdraw Sepolia ETH",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

