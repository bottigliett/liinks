export default function SlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Stack+Sans+Text:wght@200..700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
