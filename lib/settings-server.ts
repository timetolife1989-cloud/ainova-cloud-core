import { getSetting } from '@/lib/settings';

export interface AppBranding {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string | null;
}

export async function getAppBranding(): Promise<AppBranding> {
  try {
    const [appName, primaryColor, secondaryColor, logoPath] = await Promise.all([
      getSetting('app_name'),
      getSetting('app_primary_color'),
      getSetting('app_secondary_color'),
      getSetting('app_logo_path'),
    ]);

    return {
      appName:        appName        ?? (process.env.NEXT_PUBLIC_APP_NAME ?? 'Ainova Cloud Core'),
      primaryColor:   primaryColor   ?? '#6366f1',
      secondaryColor: secondaryColor ?? '#8b5cf6',
      logoPath:       logoPath || null,
    };
  } catch {
    // DB unreachable — use env/defaults
    return {
      appName:        process.env.NEXT_PUBLIC_APP_NAME ?? 'Ainova Cloud Core',
      primaryColor:   '#6366f1',
      secondaryColor: '#8b5cf6',
      logoPath:       null,
    };
  }
}
