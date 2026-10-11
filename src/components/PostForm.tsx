'use client'
import { LinkIcon } from '@/components/LinkIcon'
import { ReactButtonIcon } from '@/components/ReactionIcon'
import { FellowAvatar } from '@/components/FellowAvatar'
import { creditFields } from '@/lib/collaborator-credits'
import { PostStory } from '@/components/PostStory'
import { normalizeProjectLink } from '@/lib/post-fields'
import { readWebsitePreview } from '@/lib/website-preview'
import { captureWebsitePreview } from '@/lib/capture-website-preview'
import type { ShareTarget } from '@/lib/share-destination'
import { MentionTextarea } from '@/components/MentionTextarea'

import { startTransition, useActionState, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPost, updatePost } from '@/app/(app)/posts/actions'
import { CollaboratorPicker } from '@/components/CollaboratorPicker'
import { InvitationFields } from '@/components/InvitationFields'
import { WebsitePreviewField } from '@/components/WebsitePreviewField'
import { readAttachment, MAX_ATTACHMENT_BYTES } from '@/lib/attachment-fields'
import { draftJson, draftKey, readDraft, snapshotDraft, hasDraftContent } from '@/lib/post-draft'
import type { PostDraft } from '@/lib/post-draft'
import { recoverableSave } from '@/lib/recoverable-save'
import { PROJECT_STATES } from '@/lib/post-status'
import { TOPICS } from '@/lib/topics'
import type { ActionState, Post } from '@/types'

const POST_TYPES = [
  { value: 'ask', label: 'Ask', description: 'I need help with...' },
  { value: 'offer', label: 'Offer', description: 'I can provide...' },
  { value: 'project', label: 'Project', description: 'Join me on...' },
  { value: 'built', label: 'Built here', description: 'Look what we made' },
] as const

type PostFormProps = { userId: string; post?: Post; initialBuilt?: boolean; author?: {name:string|null;avatar_path?:string|null;avatar_style?:string|null} }

const subscribeHydration = () => () => {}
export function PostForm(props: PostFormProps) {
  const ready = useSyncExternalStore(subscribeHydration, () => true, () => false)
  const key = draftKey(props.userId, props.post?.id)
  if (!ready) return <p role="status">Opening your editor…</p>
  return <DraftEditor key={key} {...props} storageKey={key} />
}
function DraftEditor(props: PostFormProps & {storageKey: string}) {
  const [loaded, setLoaded] = useState(() => {
    let draft: PostDraft | null = null
    try { draft = readDraft(sessionStorage.getItem(props.storageKey)) } catch { /* Storage can be disabled. */ }
    return {draft, id: draft?.submissionId ?? crypto.randomUUID()}
  })
  function discard() {
    try { sessionStorage.removeItem(props.storageKey) } catch { /* Storage can be disabled. */ }
    setLoaded({draft:null, id:crypto.randomUUID()})
  }
  return <PostEditor key={loaded.id} {...props} draft={loaded.draft} submissionId={loaded.id} onDiscard={discard} />
}

function PostEditor({ post, initialBuilt = false, author = {name:null}, draft, submissionId, storageKey, onDiscard }: PostFormProps & {draft: PostDraft | null; submissionId: string; storageKey: string; onDiscard: () => void}) {
  const fields = draft?.fields
  const formRef = useRef<HTMLFormElement>(null)
  const saved = useRef(false)
  const capturedPreview=useRef<string>('')
  const previewRef=useRef<HTMLElement>(null)
  const [storageFailed, setStorageFailed] = useState(false)
  const missingAttachment = useRef(draft?.attachmentName ?? '')
  const [needsAttachment, setNeedsAttachment] = useState(!!draft?.attachmentName)
  function persist() {
    if (!formRef.current || saved.current) return
    try {
      const snapshot = snapshotDraft(new FormData(formRef.current), submissionId)
      if(readWebsitePreview(draftJson(capturedPreview.current),snapshot.fields.outcome_url))snapshot.fields.link_preview=capturedPreview.current
      if (!snapshot.attachmentName) snapshot.attachmentName = missingAttachment.current
      if (!post && !hasDraftContent(snapshot)) { sessionStorage.removeItem(storageKey); return }
      sessionStorage.setItem(storageKey, JSON.stringify(snapshot))
    } catch { setStorageFailed(true) }
  }
  useEffect(() => {
    const form = formRef.current
    if (!form) return
    // Hidden metadata changes when selecting collaborators, mentions, or previews.
    const observer = new MutationObserver(persist)
    observer.observe(form, {subtree:true, attributes:true, attributeFilter:['value','checked'], childList:true})
    const capture = () => { persist() }
    form.addEventListener('input', capture)
    form.addEventListener('change', capture)
    window.addEventListener('pagehide', capture)
    return () => {
      observer.disconnect()
      form.removeEventListener('input', capture)
      form.removeEventListener('change', capture)
      window.removeEventListener('pagehide', capture)
    }
    // The editor is seeded once from a stored draft; storageKey is fixed for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function clearSavedDraft() {
    saved.current = true
    try { sessionStorage.removeItem(storageKey) } catch { /* Saving still succeeds without storage. */ }
  }
  const existingAttachment = readAttachment(post?.attachment)
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentError, setAttachmentError] = useState('')
  const [previewPending, setPreviewPending] = useState(false)
  const [previewMessage,setPreviewMessage]=useState('')
  const [previewData, setPreviewData] = useState<FormData | null>(null)
  const [attachmentUrl,setAttachmentUrl]=useState<string|null>(null)
  const [website,setWebsite]=useState(fields?.website_url_draft ?? post?.outcome_url ?? '')
  const [removeFile,setRemoveFile]=useState(fields?.remove_attachment === 'on')
  const [shareTarget,setShareTarget]=useState(fields?.share_target ?? post?.share_target ?? '')
  const hasFile=!!attachmentName || (!!existingAttachment&&!removeFile)
  const chosenTarget:ShareTarget=shareTarget==='post'?'post':shareTarget==='attachment'&&hasFile?'attachment':shareTarget==='attachment'?'post':website.trim()?'website':'post'
  useEffect(()=>()=>{if(attachmentUrl)URL.revokeObjectURL(attachmentUrl)},[attachmentUrl])
  async function previewPost(){
    const form=formRef.current
    if(!form||!form.reportValidity()||previewPending||isPending)return
    persist()
    const data=new FormData(form)
    const link=normalizeProjectLink(String(data.get('outcome_url')||''))
    setPreviewPending(true)
    setPreviewMessage('')
    try {
      if(link&&!readWebsitePreview(draftJson(String(data.get('link_preview')||'')),link)) {
        const result=await captureWebsitePreview(link)
        if(result.preview)data.set('link_preview',JSON.stringify(result.preview))
        else setPreviewMessage(result.message)
      }
    } catch { setPreviewMessage('Website image unavailable. Retry the preview, or publish with the website link.') }
    finally {setPreviewPending(false)}
    capturedPreview.current=String(data.get('link_preview')||'')
    setPreviewData(data)
  }
  useEffect(()=>{if(previewData)previewRef.current?.focus()},[previewData])
  const previewCredits=previewData?creditFields(previewData):null
  const previewNames=previewCredits&&'names' in previewCredits?previewCredits.names:[]
  const previewFile=previewData?.get('attachment')
  const displayedAttachment=previewFile instanceof File&&previewFile.size?{path:`${'0'.repeat(8)}-0000-4000-8000-000000000000/00000000-0000-4000-8000-000000000000.${previewFile.type==='application/pdf'?'pdf':previewFile.type==='image/png'?'png':previewFile.type==='image/webp'?'webp':'jpg'}`,name:previewFile.name.slice(0,180),type:previewFile.type,size:previewFile.size}:removeFile?null:existingAttachment

  const [title, setTitle] = useState(fields?.title ?? post?.title ?? '')
  const [description, setDescription] = useState(fields?.description ?? post?.description ?? '')
  const [tags, setTags] = useState(fields?.tags ?? post?.tags?.join(', ') ?? '')
  const [topic, setTopic] = useState(fields?.topic ?? post?.topic ?? '')
  const [collaborationStatus, setCollaborationStatus] = useState(fields?.collaboration_status || 'open')
  const [kind, setKind] = useState(fields?.type || (post?.built_at || initialBuilt ? 'built' : 'ask'))
  const built = !!post?.built_at || kind === 'built'
  const action = post ? updatePost : createPost
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    (previous, data) => recoverableSave(action, previous, data, {online: navigator.onLine, onSaved: clearSavedDraft}),
    { status: 'idle' }
  )

  return (
    <form ref={formRef} onSubmit={event => {
      event.preventDefault()
      if (isPending || previewPending || attachmentError || needsAttachment) return
      if (!previewData) { void previewPost(); return }
      persist()
      const data = new FormData(event.currentTarget)
      const captured=previewData?.get('link_preview')
      if(captured&&readWebsitePreview(draftJson(String(captured)),String(data.get('outcome_url')||''))) data.set('link_preview',captured)
      // Dispatch explicitly so React does not reset radio and file inputs on failure.
      startTransition(() => formAction(data))
    }} className="space-y-4">
      {draft && <p role="status" className="rounded-xl bg-[var(--pounamu)]/10 p-4 text-sm">Your unsaved draft has been restored. <button type="button" onClick={onDiscard} disabled={isPending || previewPending} className="underline disabled:opacity-50">Discard draft and start over</button></p>}
      {storageFailed && <p role="alert" className="text-sm text-[var(--danger)]">This browser couldn’t store a recovery draft. Keep this page open until your post is saved.</p>}
      {!post && <input type="hidden" name="submission_id" value={submissionId} />}
      <input type="hidden" name="type" value={kind} />
      {post && <input type="hidden" name="id" value={post.id} />}

      <div hidden={!!previewData} inert={previewPending||isPending} className="space-y-4">
      {!post && (
        <fieldset>
          <legend className="text-sm font-medium mb-2">Type</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {POST_TYPES.map(({ value, label, description }) => (
              <label
                key={value}
                className="flex-1 cursor-pointer rounded-lg border border-[var(--obsidian)]/10 p-3 text-center has-[:checked]:border-[var(--pounamu)] has-[:checked]:bg-[var(--pounamu)]/5"
              >
                <input
                  type="radio"
                  name="post-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-[var(--obsidian-muted)]">
                  {description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {post && <div className="rounded-xl border border-[var(--border-control)] p-4 text-sm">
        {post.built_at ? <p>✨ Built here. Edit your story below; saving replaces the existing text.</p> : <label className="flex items-start gap-2"><input type="checkbox" checked={built} onChange={event => setKind(event.target.checked ? 'built' : 'ask')} />Share this post in Built here</label>}
        {!post.built_at && <p className="mt-2 text-[var(--obsidian-muted)]">Made something happen together? Update the description to tell the story. This keeps one post, with its existing connections and collaborator credits.</p>}
      </div>}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder={built ? 'What did you build together?' : 'What do you need or offer?'}
          className="w-full rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pounamu)]"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          {built ? 'What did you make happen?' : 'Description'}
        </label>
        <MentionTextarea name="description" value={description} onChange={setDescription} initialMentions={fields ? draftJson(fields.description_mentions) : post?.description_mentions} limit={built?1000:2000} placeholder={built?'Tell the story and the fellowship connection behind it…':'Add details so fellows know how to help or connect…'} />
      </div>

      {built && !post && <div className="space-y-2"><label htmlFor="collaboration_status" className="block text-sm font-medium">Where is the project now?</label><select id="collaboration_status" name="collaboration_status" value={collaborationStatus} onChange={event => setCollaborationStatus(event.target.value)} className="w-full rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 py-3 text-sm">{PROJECT_STATES.map(state => <option key={state.value} value={state.value}>{state.label}</option>)}</select><p className="text-xs text-[var(--obsidian-muted)]">Welcoming projects appear on both the active board and Built here. Every state keeps the story in Built here.</p></div>}

      <WebsitePreviewField label="Website or link (optional)" link={fields?.website_url_draft ?? fields?.outcome_url ?? post?.outcome_url ?? ''} preview={fields ? draftJson(fields.link_preview) : post?.link_preview} onPendingChange={setPreviewPending} onLinkChange={setWebsite} />
      {built && <p className="text-xs text-[var(--obsidian-muted)]">An earlier board post is not required. Celebrate something fellows built together.</p>}
      <div className="space-y-2 rounded-xl border border-[var(--border-control)] p-4">
        <label htmlFor="attachment" className="block text-sm font-medium">Media or document (optional)</label>
        <input id="attachment" name="attachment" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" aria-describedby="attachment-help" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--pounamu)]/10 file:px-4 file:py-2 file:font-medium file:text-[var(--pounamu)]" onChange={event => { const file = event.target.files?.[0]; setAttachmentName(file?.name ?? ''); setAttachmentUrl(file ? URL.createObjectURL(file) : null); if (file) { missingAttachment.current = ''; setNeedsAttachment(false) } setAttachmentError(file && file.size > MAX_ATTACHMENT_BYTES ? 'Choose a file up to 2 MB.' : '') }} />
        <p id="attachment-help" className="text-xs text-[var(--obsidian-muted)]">One PDF, JPEG, PNG, or WebP, up to 2 MB. Attachments are public with your post.</p>
        {needsAttachment && <p role="status" className="text-sm">Please reselect your attachment: {draft?.attachmentName}. <button type="button" className="underline" onClick={() => {missingAttachment.current = ''; setNeedsAttachment(false)}}>Continue without this attachment</button></p>}
        {attachmentName && <p role="status" className="text-xs">{attachmentName} — ready to save</p>}
        {existingAttachment && <><p className="text-sm">Current attachment: {existingAttachment.name}</p><label className="flex items-center gap-2 text-sm"><input name="remove_attachment" type="checkbox" checked={removeFile} onChange={event=>setRemoveFile(event.target.checked)} />Remove current attachment</label><p className="text-xs text-[var(--obsidian-muted)]">Choosing a new file replaces this attachment when you save.</p></>}
        {attachmentError && <p role="alert" className="text-sm text-[var(--danger)]">{attachmentError}</p>}
      </div>

      <div className="rounded-xl border border-[var(--border-control)] p-4 space-y-2">
        <label htmlFor="share_target" className="block text-sm font-medium">What should fellows share?</label>
        <select id="share_target" name="share_target" value={chosenTarget} onChange={event=>setShareTarget(event.target.value)} className="w-full rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 py-3 text-sm">
          {website.trim()&&<option value="website">Website — {website}</option>}
          {hasFile&&<option value="attachment">Attachment — {attachmentName||existingAttachment?.name}</option>}
          <option value="post">This public board post</option>
        </select>
        <p className="text-xs text-[var(--obsidian-muted)]">This destination supplies the featured preview and the Share link. Your board post is public; fellows sign in to participate. Removing the selected attachment switches sharing to this post.</p>
      </div>
      <InvitationFields initialDraft={fields} participation={post?.participation} sharing={post?.sharing} author={author} postType={post?.type ?? (kind === 'built' ? 'project' : kind)} />
      <CollaboratorPicker initialNamesDraft={fields?.collaborator_names_draft} canonical={fields ? draftJson(fields.collaborator_credits) : post?.collaborator_credits} legacy={post?.collaborators ?? []} />

      <div>
        <label htmlFor="tags" className="block text-sm font-medium mb-1">
          Tags <span className="font-normal text-[var(--obsidian-muted)]">(comma-separated, max 10)</span>
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          value={tags}
          onChange={event => setTags(event.target.value)}
          placeholder="climate, tech, mentorship"
          className="w-full rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pounamu)]"
        />
      </div>

      <div>
        <label htmlFor="topic" className="block text-sm font-medium mb-1">Topic island</label>
        <select name="topic" id="topic" value={topic} onChange={event => setTopic(event.target.value)} className="w-full rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-3 py-3 text-sm">
          <option value="">Suggest from my tags</option>
          {TOPICS.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}
        </select>
      </div>
      <p className="rounded-xl border border-[var(--border-control)] p-4 text-sm text-[var(--obsidian-muted)]">All asks, offers, and projects are public, including your name and Built here story. Introductions are private to you and the post author; emails are never public.</p>

      </div>
      {previewData && <section ref={previewRef} tabIndex={-1} className="post-editor-preview" aria-label="Post preview">
        <PostStory post={{id:post?.id??'preview',title,outcome_url:String(previewData.get('outcome_url')||''),link_preview:draftJson(String(previewData.get('link_preview')||'')),attachment:displayedAttachment,share_target:chosenTarget}} attachmentUrl={attachmentUrl??undefined}>
        <p className={`eyebrow kind-${built ? 'project' : post?.type ?? kind}`}>{built?'✨ Built here':post?.type??kind} · Preview · not published</p><h2>{title}</h2>
        <p className="preview-story">{description}</p>
        {previewMessage&&<div role="status" className="my-3 text-sm text-[var(--obsidian-muted)]"><p>{previewMessage}</p><button type="button" disabled={previewPending||isPending} onClick={previewPost} className="mt-2 underline disabled:opacity-50">{previewPending?'Capturing website image…':'Retry website preview'}</button></div>}
        {previewNames.length>0&&<p className="my-4 text-sm">In collaboration with {previewNames.join(', ')}</p>}
        <div className="flex flex-wrap gap-1 my-4">{tags.split(',').map(tag=>tag.trim()).filter(Boolean).map((tag,index)=><span key={index} className="rounded-full bg-[var(--limestone)] px-2 py-0.5 text-xs">{tag}</span>)}</div>
        <div className="flex items-center gap-2 text-sm text-[var(--obsidian-muted)]"><FellowAvatar name={author.name} path={author.avatar_path} style={author.avatar_style}/>Posted by {author.name||'this fellow'}</div>
        </PostStory>
        <div className="reaction-toolbar mt-4" aria-label="Preview social actions"><span className="inline-flex items-center gap-2"><ReactButtonIcon /> React</span><span><LinkIcon external /> {chosenTarget==='website'?'Share website':chosenTarget==='attachment'?(displayedAttachment?.type==='application/pdf'?'Share report':'Share image'):'Share post'}</span></div>
        <button type="button" onClick={()=>{setPreviewData(null);requestAnimationFrame(()=>formRef.current?.querySelector<HTMLInputElement>('#title')?.focus())}} className="mt-5 underline">Back to editing</button>
      </section>}
      {!previewData && <button type="button" onClick={previewPost} disabled={isPending||previewPending||!!attachmentError||needsAttachment} className="rounded-lg border border-[var(--border-control)] px-4 py-2 text-sm disabled:opacity-50">{previewPending?'Preparing preview…':'Preview your post'}</button>}
      {state.status === 'error'  && (
        <p role="alert" className="text-sm text-[var(--danger)]">{state.message} Your draft has been kept; you can correct it and try again.</p>
      )}

      <button
        hidden={!previewData}
        type="submit"
        disabled={isPending || previewPending || !!attachmentError || needsAttachment}
        className="primary-button hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : post ? 'Save changes' : built ? 'Share something built' : 'Publish post'}
      </button>
    </form>
  )
}
