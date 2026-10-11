import Image from 'next/image'

/** Decorative companion to the hero copy; the selected artwork is shared by both themes. */
export function ConnectionIllustration() {
  return <Image
    className="connection-art"
    src="/images/commons-glass-discs.png"
    width={1327}
    height={1185}
    alt=""
    unoptimized
  />
}
