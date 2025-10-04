import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Richieste Libere - BangerRequest',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LibereLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}