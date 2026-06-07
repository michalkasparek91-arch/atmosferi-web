import { LucideProps } from "lucide-react";

// --- OUTLINE ICONS (Minimalist, unselected) ---

export function OutlineClipboardList(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

export function OutlineBriefcase(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <rect x="3" y="8" width="18" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OutlineChat(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

export function OutlineUsers(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

export function OutlineDocumentText(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

export function OutlineCalendar(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

export function OutlineSearch(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

// --- SOLID ICONS (Filled, selected) ---

export function SolidClipboardList(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M8.25 3.75H15.75C15.75 2.507 14.743 1.5 13.5 1.5H10.5C9.257 1.5 8.25 2.507 8.25 3.75ZM6 3.75C6 2.507 7.007 1.5 8.25 1.5H15.75C16.993 1.5 18 2.507 18 3.75V19.5C18 20.743 16.993 21.75 15.75 21.75H8.25C7.007 21.75 6 20.743 6 19.5V3.75ZM9 8.25C9 8.664 9.336 9 9.75 9H14.25C14.664 9 15 8.664 15 8.25C15 7.836 14.664 7.5 14.25 7.5H9.75C9.336 7.5 9 7.836 9 8.25ZM9 12.75C9 13.164 9.336 13.5 9.75 13.5H14.25C14.664 13.5 15 13.164 15 12.75C15 12.336 14.664 12 14.25 12H9.75C9.336 12 9 12.336 9 12.75ZM9 17.25C9 17.664 9.336 18 9.75 18H14.25C14.664 18 15 17.664 15 17.25C15 16.836 14.664 16.5 14.25 16.5H9.75C9.336 16.5 9 16.836 9 17.25Z" clipRule="evenodd" />
    </svg>
  );
}

export function SolidBriefcase(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" {...rest}>
      <rect x="3" y="8" width="18" height="13" rx="2" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SolidChat(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M5.337 21.718a6.707 6.707 0 01-.533-.074.75.75 0 01-.44-1.223 3.73 3.73 0 00.814-1.686c.023-.115-.022-.317-.254-.543C3.275 16.587 2.25 14.41 2.25 12c0-5.03 4.428-9 9.75-9s9.75 3.97 9.75 9c0 5.03-4.428 9-9.75 9-.833 0-1.643-.097-2.417-.279a6.721 6.721 0 01-3.583 1.029z" clipRule="evenodd" />
    </svg>
  );
}

export function SolidUsers(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
    </svg>
  );
}

export function SolidDocumentText(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
    </svg>
  );
}

export function SolidCalendar(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
      <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
    </svg>
  );
}

export function SolidSearch(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.75" {...props}>
      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
  );
}

export function OutlinePaperPlane(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <g transform="translate(12, 12) scale(0.95) translate(-12, -12)">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </g>
    </svg>
  );
}

export function SolidPaperPlane(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <defs>
        <mask id="paper-plane-cutout">
          <rect width="24" height="24" fill="white" />
          <g transform="translate(12, 12) scale(0.95) translate(-12, -12)">
            <path d="M22 2 11 13" stroke="black" strokeWidth="1.5" />
          </g>
        </mask>
      </defs>
      <g transform="translate(12, 12) scale(0.95) translate(-12, -12)" mask="url(#paper-plane-cutout)">
        <path d="m22 2-7 20-4-9-9-4Z" />
      </g>
    </svg>
  );
}

export function OutlineBullhorn(props: LucideProps) {
  const { strokeWidth = 1.5, ...rest } = props;
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6M5.436 13.683A4.001 4.001 0 0 1 7 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 0 1-1.564-.317z" />
    </svg>
  );
}

export function SolidBullhorn(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5.436 13.683A4.001 4.001 0 0 1 7 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 0 1-1.564-.317z" />
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6" />
    </svg>
  );
}
