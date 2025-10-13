import { siDeepl, siOpenai, siBrevo, siMapbox } from 'simple-icons';

interface LogoProps {
  readonly className?: string;
  readonly withBackground?: boolean;
}

export function DeepLLogo({ className, withBackground = true }: LogoProps) {
  const content = (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={withBackground ? 'w-full h-full' : className}
      fill="currentColor"
    >
      <title>DeepL</title>
      <path d={siDeepl.path} />
    </svg>
  );

  if (!withBackground) return content;

  return (
    <div 
      className={`${className} p-1 text-white flex items-center justify-center`} 
      style={{ backgroundColor: `#${siDeepl.hex}` }}
    >
      {content}
    </div>
  );
}

export function OpenAILogo({ className, withBackground = true }: LogoProps) {
  const content = (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={withBackground ? 'w-full h-full' : className}
      fill="currentColor"
    >
      <title>OpenAI</title>
      <path d={siOpenai.path} />
    </svg>
  );

  if (!withBackground) return content;

  return (
    <div 
      className={`${className} p-1 text-white flex items-center justify-center`} 
      style={{ backgroundColor: `#${siOpenai.hex}` }}
    >
      {content}
    </div>
  );
}

export function BrevoLogo({ className, withBackground = true }: LogoProps) {
  const content = (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={withBackground ? 'w-full h-full' : className}
      fill="currentColor"
    >
      <title>Brevo</title>
      <path d={siBrevo.path} />
    </svg>
  );

  if (!withBackground) return content;

  return (
    <div 
      className={`${className} p-1 text-white flex items-center justify-center`} 
      style={{ backgroundColor: `#${siBrevo.hex}` }}
    >
      {content}
    </div>
  );
}

export function MapboxLogo({ className, withBackground = true }: LogoProps) {
  const content = (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={withBackground ? 'w-full h-full' : className}
      fill="currentColor"
    >
      <title>Mapbox</title>
      <path d={siMapbox.path} />
    </svg>
  );

  if (!withBackground) return content;

  return (
    <div 
      className={`${className} p-1 text-white flex items-center justify-center`} 
      style={{ backgroundColor: `#${siMapbox.hex}` }}
    >
      {content}
    </div>
  );
}
