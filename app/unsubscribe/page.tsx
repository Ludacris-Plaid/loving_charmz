import { Container } from '@/components/ui/Container';
import { UnsubscribeForm } from './UnsubscribeForm';

export const metadata = {
  title: 'Unsubscribe — Loving Charmz',
};

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <Container className="py-16">
      <div className="max-w-md mx-auto text-center">
        <h1 className="font-display text-2xl font-semibold text-plum-900">Unsubscribe</h1>
        <p className="mt-3 text-sm text-ink-600">
          We&rsquo;ll remove you from our mailing list. You won&rsquo;t receive any more emails from us.
        </p>
        <div className="mt-8">
          <UnsubscribeForm defaultEmail={email || ''} />
        </div>
      </div>
    </Container>
  );
}
