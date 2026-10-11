import { COMMUNITY } from '@/config/community'
import type { Metadata } from 'next'
import BoardPage from './board/page'

export const metadata: Metadata = { alternates: { canonical: `${COMMUNITY.canonicalOrigin}/` } }

export default function Home() {
  return <BoardPage />
}
