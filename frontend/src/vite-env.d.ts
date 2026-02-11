/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    "gmpx-api-loader": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { apiKey?: string; "solution-channel"?: string },
      HTMLElement
    >;
    "gmpx-place-picker": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { placeholder?: string; type?: string },
      HTMLElement
    >;
  }
}
