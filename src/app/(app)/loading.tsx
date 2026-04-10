import { LoadingSpinner } from '@/components/loading-spinner';

export default function AppLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
