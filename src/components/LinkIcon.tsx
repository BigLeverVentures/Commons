export function LinkIcon({ external = false }: { external?: boolean }) {
  return <svg className="link-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {external ? <><path d="M14 3h7v7M21 3l-10 10" /><path d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></> : <path d="M4 12h16M14 6l6 6-6 6" />}
  </svg>
}
