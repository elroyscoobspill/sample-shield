import './globals.css';

export const metadata = {
  title: 'Sample Shield',
  description: 'Private sample-risk scanner for Elroy and ScoobRoc'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
