'use client'
import { useEffect } from 'react'
import { draftKey, readDraft } from '@/lib/post-draft'

// Also runs after a hard navigation, where the editor cannot observe success.
export function ClearPostDraft({userId, postId, updatedAt}: {userId:string; postId:string; updatedAt:string}) {
  useEffect(() => {
    try {
      const newKey = draftKey(userId)
      if (readDraft(sessionStorage.getItem(newKey))?.submissionId === postId) sessionStorage.removeItem(newKey)
      const editKey = draftKey(userId, postId)
      const edit = readDraft(sessionStorage.getItem(editKey))
      if (edit && edit.updatedAt <= Date.parse(updatedAt)) sessionStorage.removeItem(editKey)
    } catch { /* Storage can be disabled. */ }
  }, [userId, postId, updatedAt])
  return null
}
