'use client';

export default function PhysicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen">
      {children}
    </div>
  );
}
