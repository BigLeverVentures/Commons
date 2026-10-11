import type { Metadata } from 'next'
import BoardPage from './board/page'

export const metadata: Metadata = { alternates: { canonical: 'https://commons.example.org/' } }

export default function Home() {
  return <BoardPage />
}
