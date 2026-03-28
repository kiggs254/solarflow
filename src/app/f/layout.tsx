export default function PublicFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/80 via-background to-background dark:from-brand-950/20">
      {children}
    </div>
  );
}
