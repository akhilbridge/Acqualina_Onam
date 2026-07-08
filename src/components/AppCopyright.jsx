export default function AppCopyright({ className = "" }) {
  const year = new Date().getFullYear();

  return (
    <p className={`app-copyright ${className}`.trim()}>
      &copy; {year} Aqualina Onam. All rights reserved.
    </p>
  );
}
