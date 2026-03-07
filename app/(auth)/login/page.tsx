import { LoginContainer } from '@/components/login/LoginContainer';
import { CoreLogo } from '@/components/login/CoreLogo';

export default function LoginPage() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Ainova';
  return (
    <div className="w-full max-w-md px-6">
      <div className="mb-8 flex justify-center">
        <CoreLogo appName={appName} />
      </div>
      <LoginContainer />
    </div>
  );
}
