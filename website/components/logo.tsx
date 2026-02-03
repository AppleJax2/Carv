import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <Link href="/" className={`group ${className}`}>
      <span className={`${sizes[size]} font-black tracking-tight`}>
        <span className="text-primary">C</span>
        <span className="text-foreground">arv</span>
      </span>
    </Link>
  );
}

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span className={`text-2xl font-black tracking-tight ${className}`}>
      <span className="text-primary">C</span>
      <span className="text-foreground">arv</span>
    </span>
  );
}
