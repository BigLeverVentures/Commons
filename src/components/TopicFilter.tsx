'use client'

import { TOPICS } from '@/lib/topics'
import { SelectMenu } from './SelectMenu'

export function TopicFilter({ value, onChange, publicOnly }: { value: string; onChange: (value: string) => void; publicOnly: boolean }) {
  const options = [{ value: 'all', label: 'All topics' }, ...(!publicOnly ? [{ value: 'interests', label: 'My interests' }] : []), ...TOPICS.map(topic => ({ value: topic.id, label: topic.name }))]
  return <SelectMenu value={value} onChange={onChange} options={options} label="Topic" variant="filter" />
}
