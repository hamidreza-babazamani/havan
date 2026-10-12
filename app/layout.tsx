import type { Metadata } from "next";
import "./styles/chat.css";

export const metadata: Metadata = {
  title: "Haven — Private conversations",
  description: "A quiet space for your conversations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
