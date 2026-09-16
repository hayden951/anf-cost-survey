import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Storage Risk Assessment",
  description: "2-minute storage risk assessment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
